import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { mediaService } from '../../services/media.service';
// NOTE: LazyImage is NOT used here — NavigationFlow is fullscreen so the image
// must load eagerly.  Using IntersectionObserver caused a race condition where
// imgNatural was never set, blocking all hitzone clicks in Opera / DuckDuckGo.
//
// Production (cPanel) hitzone checklist if clicks fail or feel wrong:
// - Hitzones are stored in PIXELS (natural image size) by research-frontend;
//   we convert to percent here. Same image dimensions must be served in editor and participant.
// - img.decode() ensures dimensions are set only after decode (avoids 0x0 in some browsers).
// - containerRect/renderedRect are kept in state to avoid reading getBoundingClientRect during render.
// - onError clears dimensions so we never use stale values from a failed/previous image.
import { useResponse } from '../../hooks/useResponse';
import { usePreviewMode } from '../../hooks/usePreviewMode';

interface ClickPoint {
    x: number;
    y: number;
    timestamp: number;
    isCorrect: boolean;
}

/**
 * Computes the actual rendered image rect inside an object-contain img element.
 * Safari and other browsers report getBoundingClientRect() for the full img element,
 * not the visible image content — this function returns the content area.
 */
function getRenderedImageRect(img: HTMLImageElement): { left: number; top: number; width: number; height: number } | null {
    if (!img.naturalWidth || !img.naturalHeight) return null;
    const elemRect = img.getBoundingClientRect();
    if (elemRect.width <= 0 || elemRect.height <= 0) return null;

    const naturalRatio = img.naturalWidth / img.naturalHeight;
    const containerRatio = elemRect.width / elemRect.height;

    let renderWidth: number, renderHeight: number, offsetX: number, offsetY: number;

    if (naturalRatio > containerRatio) {
        // Image wider than container — fits width, letterbox top/bottom
        renderWidth = elemRect.width;
        renderHeight = elemRect.width / naturalRatio;
        offsetX = 0;
        offsetY = (elemRect.height - renderHeight) / 2;
    } else {
        // Image taller than container — fits height, letterbox left/right
        renderHeight = elemRect.height;
        renderWidth = elemRect.height * naturalRatio;
        offsetX = (elemRect.width - renderWidth) / 2;
        offsetY = 0;
    }

    return {
        left: elemRect.left + offsetX,
        top: elemRect.top + offsetY,
        width: renderWidth,
        height: renderHeight,
    };
}

interface HitzoneRect {
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
}

/** Convert hitzone from pixel coordinates to percent (0-100) relative to natural image size. */
function convertPixelsToPercent(hz: HitzoneRect, natural: { width: number; height: number }): HitzoneRect {
    return {
        ...hz,
        x: (hz.x / natural.width) * 100,
        y: (hz.y / natural.height) * 100,
        width: (hz.width / natural.width) * 100,
        height: (hz.height / natural.height) * 100,
    };
}

interface NavigationFlowProps {
    moduleId?: string;
    componentId?: string;
    title?: string;
    description?: string;
    images?: Array<{
        id: string;
        name?: string;
        s3Key?: string;
        url?: string;
        hitZones?: Array<{
            x: number;
            y: number;
            width: number;
            height: number;
            label?: string;
        }>;
    }>;
    onComplete?: () => void;
}

export const NavigationFlow: React.FC<NavigationFlowProps> = ({
    moduleId = 'navigation-flow',
    componentId = 'navigation-flow-component',
    title,
    description,
    images: propImages,
    onComplete
}) => {
    const { t } = useTranslation();
    const { isPreviewMode } = usePreviewMode();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [clickPoints, setClickPoints] = useState<ClickPoint[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [startTime] = useState(Date.now());
    const [allClicks, setAllClicks] = useState<ClickPoint[]>([]);
    const imageRef = useRef<HTMLDivElement>(null);
    const imgElRef = useRef<HTMLImageElement>(null);
    const [imgNatural, setImgNatural] = useState<{ width: number; height: number } | null>(null);
    /** Dedupe pointerup + click so we only advance once per interaction (Opera and others fire both). */
    const lastHandledAtRef = useRef<number>(0);

    // Mobile scroll mode: image fills width with vertical scroll for portrait images
    const [isMobileScroll, setIsMobileScroll] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

    // Preview mode: Esc key to skip
    useEffect(() => {
        if (!isPreviewMode || isComplete) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsComplete(true);
                onComplete?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPreviewMode, isComplete, onComplete]);

    // Track viewport width for mobile scroll mode
    useEffect(() => {
        const handleResize = () => setIsMobileScroll(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    /** Count failed clicks on current image — after 3 misses the flow auto-completes. */
    const MAX_ATTEMPTS_PER_IMAGE = 3;
    const [failedClicks, setFailedClicks] = useState(0);

    // Response hook for saving data
    const response = useResponse({ moduleId, componentId });

    // Mock images sequence (in production, these would come from uploaded files with hitzones)
    const mockImages = [
        {
            id: 1,
            name: 'Pantalla Principal',
            hitzone: { x: 60, y: 40, width: 30, height: 15 } // % coordinates
        },
        {
            id: 2,
            name: 'Página de Producto',
            hitzone: { x: 50, y: 70, width: 40, height: 12 }
        },
        {
            id: 3,
            name: 'Carrito de Compras',
            hitzone: { x: 70, y: 80, width: 25, height: 10 }
        }
    ];

    // Load images from S3 — keep array aligned with propImages (no filtering)
    useEffect(() => {
        const loadImages = async () => {
            if (!propImages || propImages.length === 0) {
                setLoading(false);
                return;
            }

            try {
                const urls = await Promise.all(
                    propImages.map(async (img) => {
                        try {
                            if (img.s3Key) return await mediaService.getMediaUrl(img.s3Key);
                            if (img.url) return img.url;
                        } catch (err) {
                            console.warn('Failed to resolve image URL:', err);
                        }
                        return '';
                    })
                );
                // Keep all entries so indices align with propImages
                setImageUrls(urls);
            } catch (error) {
                console.error('Failed to load images:', error);
            } finally {
                setLoading(false);
            }
        };

        loadImages();
    }, [propImages]);

    // Use prop images or fallback to mock
    const images = propImages && propImages.length > 0 ? propImages : mockImages.map(m => ({
        id: String(m.id),
        name: m.name,
        hitZones: [m.hitzone]
    }));

    const currentImage = images[currentImageIndex] ?? images[images.length - 1];
    const currentImageUrl = imageUrls[currentImageIndex];
    const isLastImage = currentImageIndex >= images.length - 1;

    // Whether the current image has hitzone definitions (regardless of imgNatural).
    const rawHitZones = useMemo(
        () => (currentImage?.hitZones || []) as HitzoneRect[],
        [currentImage?.hitZones],
    );
    const hasHitzoneDefs = rawHitZones.length > 0;

    // Only compute percent hitzones when imgNatural is available.
    // While the image hasn't loaded, normalizedHitZones is empty.
    const normalizedHitZones = useMemo((): HitzoneRect[] => {
        if (!imgNatural) return [];
        return rawHitZones.map((z) => convertPixelsToPercent(z, imgNatural));
    }, [rawHitZones, imgNatural]);

    // Track the rendered image rect (object-contain aware) for hitzone positioning.
    // containerRect is stored in state so we don't read getBoundingClientRect during render
    // (avoids layout thrashing and stale values in production/cache-heavy loads).
    const [renderedRect, setRenderedRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
    const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
    const [imageError, setImageError] = useState(false);

    const updateRenderedRect = useCallback(() => {
        const img = imgElRef.current;
        const container = imageRef.current;
        if (container) setContainerRect(container.getBoundingClientRect());
        if (img) setRenderedRect(getRenderedImageRect(img));
    }, []);

    // Reset rendered rect, container rect and natural size when image changes so stale data
    // from the previous image is not used for hitzone positioning while the new image loads.
    // Also poll briefly for cached images where onLoad may fire before React updates refs.
    useEffect(() => {
        setImgNatural(null);
        setRenderedRect(null);
        setContainerRect(null);
        setImageError(false);
        setFailedClicks(0);

        // Safety net: if onLoad already fired (cached image) or fires during render,
        // poll the img ref briefly to pick up naturalWidth/Height.
        let attempts = 0;
        const pollId = setInterval(() => {
            attempts++;
            const img = imgElRef.current;
            if (img && img.naturalWidth > 1 && img.naturalHeight > 1) {
                setImgNatural({ width: img.naturalWidth, height: img.naturalHeight });
                setRenderedRect(getRenderedImageRect(img));
                const container = imageRef.current;
                if (container) setContainerRect(container.getBoundingClientRect());
                clearInterval(pollId);
            }
            if (attempts >= 20) clearInterval(pollId); // stop after 2s
        }, 100);

        return () => clearInterval(pollId);
    }, [currentImageIndex]);

    // Recompute rendered rect on resize / orientation change
    useEffect(() => {
        updateRenderedRect();
        window.addEventListener('resize', updateRenderedRect);
        return () => window.removeEventListener('resize', updateRenderedRect);
    }, [updateRenderedRect, currentImageIndex]);

    // Non-passive touch listeners so preventDefault works: avoids Safari/Chrome consuming the tap for scroll or delaying the click.
    // In mobile scroll mode we WANT default touch behavior (scrolling), so skip prevention.
    useEffect(() => {
        if (isMobileScroll) return;
        const el = imageRef.current;
        if (!el) return;
        const prevent = (e: TouchEvent): void => {
            e.preventDefault();
        };
        el.addEventListener('touchstart', prevent, { passive: false });
        el.addEventListener('touchend', prevent, { passive: false });
        return () => {
            el.removeEventListener('touchstart', prevent);
            el.removeEventListener('touchend', prevent);
        };
    }, [isMobileScroll]);

    /** Process one pointer/click at (clientX, clientY). Used by both pointer and click so touch/pen work in Opera and others. */
    const processInteraction = (clientX: number, clientY: number): void => {
        if (isComplete) return;

        // Try to get the REAL rendered image rect (accounts for object-contain letterboxing).
        // The container fallback MUST NOT be used when hitzones exist because the
        // percentage coordinates would be wrong (container ≠ image content area).
        const img = imgElRef.current;
        let rendered: { left: number; top: number; width: number; height: number } | null = null;

        if (img) {
            if (isMobileScroll) {
                // In scroll mode, image fills width — no letterboxing, use rect directly
                const r = img.getBoundingClientRect();
                if (r.width > 0 && r.height > 0) {
                    rendered = { left: r.left, top: r.top, width: r.width, height: r.height };
                }
            } else {
                rendered = getRenderedImageRect(img);
            }
        }

        // If we couldn't get the rendered image rect but there are hitzones,
        // we must NOT fall back to container — it would make ALL clicks incorrect.
        if (!rendered) {
            if (hasHitzoneDefs) {
                // Image not ready yet — count as failed attempt
                setFailedClicks(prev => {
                    const next = prev + 1;
                    if (next >= MAX_ATTEMPTS_PER_IMAGE) {
                        setTimeout(() => {
                            setIsComplete(true);
                            if (onComplete) setTimeout(() => onComplete(), 800);
                        }, 400);
                    }
                    return next;
                });
                return;
            }
            // No hitzones defined — any click advances, so container fallback is fine
            const container = imageRef.current;
            if (container) {
                const r = container.getBoundingClientRect();
                rendered = { left: r.left, top: r.top, width: r.width, height: r.height };
            }
            if (!rendered) return;
        }

        const relX = clientX - rendered.left;
        const relY = clientY - rendered.top;

        // Clicks outside the rendered image area (letterboxing bars) count as failed
        // attempts so the user is never stuck if they can't find the hitzone.
        if (relX < 0 || relY < 0 || relX > rendered.width || relY > rendered.height) {
            if (hasHitzoneDefs) {
                setFailedClicks(prev => {
                    const next = prev + 1;
                    if (next >= MAX_ATTEMPTS_PER_IMAGE) {
                        setTimeout(() => {
                            setIsComplete(true);
                            saveNavigationResponse(false);
                            if (onComplete) setTimeout(() => onComplete(), 800);
                        }, 400);
                    }
                    return next;
                });
            }
            return;
        }

        const x = (relX / rendered.width) * 100;
        const y = (relY / rendered.height) * 100;

        // Resolve hitzones: prefer memoized normalizedHitZones, but fall back to
        // computing from the img ref directly if state hasn't caught up yet
        // (race condition in Opera / DuckDuckGo where onLoad fires but setState
        // hasn't re-rendered).
        let hitzonesToCheck = normalizedHitZones;
        if (hasHitzoneDefs && hitzonesToCheck.length === 0) {
            if (img && img.naturalWidth > 1 && img.naturalHeight > 1) {
                const natural = { width: img.naturalWidth, height: img.naturalHeight };
                hitzonesToCheck = rawHitZones.map(z => convertPixelsToPercent(z, natural));
                // Sync state so subsequent clicks use the fast path
                setImgNatural(natural);
            } else {
                // Image truly not loaded yet — count as failed attempt
                setFailedClicks(prev => {
                    const next = prev + 1;
                    if (next >= MAX_ATTEMPTS_PER_IMAGE) {
                        setTimeout(() => {
                            setIsComplete(true);
                            if (onComplete) setTimeout(() => onComplete(), 800);
                        }, 400);
                    }
                    return next;
                });
                return;
            }
        }

        const isInHitzone = isLastImage
            ? true
            : hitzonesToCheck.length > 0
                ? hitzonesToCheck.some((hz) => (
                    x >= hz.x && x <= hz.x + hz.width && y >= hz.y && y <= hz.y + hz.height
                ))
                : true;


        const clickPoint: ClickPoint = {
            x,
            y,
            timestamp: Date.now(),
            isCorrect: isInHitzone
        };

        setAllClicks(prev => [...prev, { ...clickPoint, imageId: currentImage.id }]);
        // Always show visual feedback (green dot for correct, red for incorrect)
        setClickPoints(prev => [...prev, clickPoint]);

        if (isInHitzone) {
            if (isLastImage) {
                setIsComplete(true);
                saveNavigationResponse(true);
                if (onComplete) setTimeout(() => onComplete(), 800);
            } else {
                setTimeout(() => {
                    setCurrentImageIndex(prev => prev + 1);
                    setClickPoints([]);
                    setFailedClicks(0);
                }, 200);
            }
        } else {
            const newFailed = failedClicks + 1;
            setFailedClicks(newFailed);
            if (newFailed >= MAX_ATTEMPTS_PER_IMAGE) {
                // 3 misses on this image — end the flow, move to next question
                setTimeout(() => {
                    setIsComplete(true);
                    saveNavigationResponse(false);
                    if (onComplete) setTimeout(() => onComplete(), 800);
                }, 400);
            }
        }
    };

    const DEDUPE_MS = 150;

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation(); // Prevent outer handler from completing flow in preview mode
        if (Date.now() - lastHandledAtRef.current < DEDUPE_MS) return;
        lastHandledAtRef.current = Date.now();
        processInteraction(e.clientX, e.clientY);
    };

    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation(); // Prevent outer handler from completing flow in preview mode
        if (Date.now() - lastHandledAtRef.current < DEDUPE_MS) return;
        lastHandledAtRef.current = Date.now();
        processInteraction(e.clientX, e.clientY);
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>): void => {
        const t = e.changedTouches?.[0];
        if (t) {
            if (Date.now() - lastHandledAtRef.current < DEDUPE_MS) return;
            lastHandledAtRef.current = Date.now();
            processInteraction(t.clientX, t.clientY);
        }
    };

    // Save navigation response to store
    const saveNavigationResponse = (completed: boolean) => {
        const totalDuration = Date.now() - startTime;
        const correctClicks = allClicks.filter(c => c.isCorrect).length;
        const incorrectClicks = allClicks.filter(c => !c.isCorrect).length;

        const responseData = {
            completed,
            totalClicks: allClicks.length,
            correctClicks,
            incorrectClicks,
            totalDuration,
            imagesNavigated: currentImageIndex + 1,
            totalImages: images.length,
            clickSequence: allClicks.map(c => ({
                x: c.x,
                y: c.y,
                timestamp: c.timestamp,
                isCorrect: c.isCorrect,
                imageId: (c as ClickPoint & { imageId?: string }).imageId,
            })),
        };

        response.save(
            JSON.stringify(responseData),
            {
                duration: totalDuration,
                interactions: allClicks.length,
                completionRate: ((currentImageIndex + 1) / images.length) * 100,
            }
        );
    };

    // Auto-save on unmount or when user navigates away
    useEffect(() => {
        return () => {
            if (allClicks.length > 0 && !isComplete) {
                saveNavigationResponse(false);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // NOTE: save on complete is handled inline at each completion path
    // (success → saveNavigationResponse(true), failure → saveNavigationResponse(false)).
    // A useEffect here would overwrite completed=false with true on failed flows.

    return (
        <div
            className="fixed inset-0 z-40 bg-black flex flex-col"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={(e) => {
                if (!isPreviewMode || isComplete) return;
                // Skip if click is on the image itself (let handleImageClick handle it)
                if (imgElRef.current && imgElRef.current.contains(e.target as Node)) return;
                // Click on any dark area (header, sides, etc.) → skip
                setIsComplete(true);
                onComplete?.();
            }}
        >
            {/* Title and instructions above the image so hitzones at the top remain clickable */}
            {!isComplete && (
                <div className="flex-shrink-0 bg-black px-4 pt-4 pb-3">
                    {isPreviewMode && (
                        <span className="absolute top-4 right-4 z-50 text-white/50 text-xs hidden md:inline">
                            Press Esc or click dark area to skip
                        </span>
                    )}
                    {title && (
                        <h2 className="text-lg md:text-xl font-semibold text-white text-center">{title}</h2>
                    )}
                    {description && (
                        <p className="text-sm text-white/80 text-center mt-1">{description}</p>
                    )}
                    <div className="flex items-center justify-center text-xs text-white/70 mt-3 max-w-md mx-auto">
                        <span>{t('navigationFlow.imageOf', { current: currentImageIndex + 1, total: images.length })}</span>
                    </div>
                    <div className="w-full max-w-md mx-auto bg-white/20 rounded-full h-1 mt-1.5">
                        <div
                            className="bg-white h-1 rounded-full transition-all duration-300"
                            style={{ width: `${((currentImageIndex + 1) / images.length) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Image area below header: full area clickable, no overlay on image */}
            <div
                ref={imageRef}
                data-testid="navigation-flow-click-area"
                onClick={handleImageClick}
                onPointerUp={isMobileScroll ? undefined : handlePointerUp}
                onTouchEnd={isMobileScroll ? undefined : handleTouchEnd}
                className={`relative flex-1 min-h-0 select-none ${isMobileScroll ? 'overflow-y-auto overflow-x-hidden' : 'flex items-center justify-center'} ${!isComplete ? 'cursor-pointer' : ''}`}
                onContextMenu={(e) => e.preventDefault()}
                style={{ touchAction: isMobileScroll ? 'pan-y' : 'none', WebkitTapHighlightColor: 'transparent', WebkitTouchCallout: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
            >
                {/* Render real image or mock */}
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
                    </div>
                ) : currentImageUrl ? (
                    isMobileScroll ? (
                        /* ─── Mobile scroll layout: image fills width, vertical scroll ─── */
                        <div className="relative w-full">
                            <img
                                ref={imgElRef}
                                src={currentImageUrl}
                                alt={currentImage.name || `Image ${currentImageIndex + 1}`}
                                className="w-full h-auto block pointer-events-none"
                                draggable={false}
                                onLoad={(e) => {
                                    const el = e.currentTarget;
                                    if (el.naturalWidth <= 1 || el.naturalHeight <= 1) return;
                                    setImageError(false);
                                    const applyDimensions = (): void => {
                                        setImgNatural({ width: el.naturalWidth, height: el.naturalHeight });
                                        setRenderedRect(getRenderedImageRect(el));
                                        const container = imageRef.current;
                                        if (container) setContainerRect(container.getBoundingClientRect());
                                    };
                                    if (typeof el.decode === 'function') {
                                        const timeout = new Promise<void>((_, reject) => setTimeout(() => reject(new Error('decode timeout')), 1000));
                                        Promise.race([el.decode(), timeout]).then(applyDimensions).catch(() => applyDimensions());
                                    } else {
                                        applyDimensions();
                                    }
                                }}
                                onError={() => {
                                    setImgNatural(null);
                                    setRenderedRect(null);
                                    setContainerRect(null);
                                    setImageError(true);
                                }}
                            />
                            {imageError && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                                    <p className="text-white text-center px-4">{t('navigationFlow.imageLoadError', 'The image could not be loaded. Please try again or continue.')}</p>
                                </div>
                            )}
                            {/* Mobile hitzones — % positioned within image wrapper */}
                            {!isComplete && normalizedHitZones.map((hz, i) => (
                                <div
                                    key={i}
                                    className="absolute bg-blue-500 bg-opacity-0 border-2 border-dashed border-transparent"
                                    style={{
                                        left: `${hz.x}%`,
                                        top: `${hz.y}%`,
                                        width: `${hz.width}%`,
                                        height: `${hz.height}%`,
                                        pointerEvents: 'none'
                                    }}
                                />
                            ))}
                            {/* Mobile click points — % positioned within image wrapper */}
                            {clickPoints.map((point, index) => (
                                <React.Fragment key={index}>
                                    <div
                                        className={`absolute w-6 h-6 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-ping ${point.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}
                                        style={{ left: `${point.x}%`, top: `${point.y}%`, animationDuration: '1s' }}
                                    />
                                    <div
                                        className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 ${point.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}
                                        style={{ left: `${point.x}%`, top: `${point.y}%` }}
                                    >
                                        {point.isCorrect && (
                                            <svg className="w-3 h-3 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    ) : (
                        /* ─── Desktop object-contain layout ─── */
                        <>
                            <img
                                ref={imgElRef}
                                src={currentImageUrl}
                                alt={currentImage.name || `Image ${currentImageIndex + 1}`}
                                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                                draggable={false}
                                onLoad={(e) => {
                                    const el = e.currentTarget;
                                    if (el.naturalWidth <= 1 || el.naturalHeight <= 1) return;
                                    setImageError(false);
                                    const applyDimensions = (): void => {
                                        setImgNatural({ width: el.naturalWidth, height: el.naturalHeight });
                                        setRenderedRect(getRenderedImageRect(el));
                                        const container = imageRef.current;
                                        if (container) setContainerRect(container.getBoundingClientRect());
                                    };
                                    if (typeof el.decode === 'function') {
                                        const timeout = new Promise<void>((_, reject) => setTimeout(() => reject(new Error('decode timeout')), 1000));
                                        Promise.race([el.decode(), timeout]).then(applyDimensions).catch(() => applyDimensions());
                                    } else {
                                        applyDimensions();
                                    }
                                }}
                                onError={() => {
                                    setImgNatural(null);
                                    setRenderedRect(null);
                                    setContainerRect(null);
                                    setImageError(true);
                                }}
                            />
                            {imageError && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                                    <p className="text-white text-center px-4">{t('navigationFlow.imageLoadError', 'The image could not be loaded. Please try again or continue.')}</p>
                                </div>
                            )}
                        </>
                    )
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                        <div className="text-center">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <p className="text-gray-400 font-medium">{currentImage.name}</p>
                            <p className="text-xs text-gray-500 mt-2">{t('navigationFlow.clickCorrectArea')}</p>
                        </div>
                    </div>
                )}

                {/* Desktop hitzone overlays — px positioned from renderedRect (object-contain safe) */}
                {!isMobileScroll && !isComplete && renderedRect && containerRect && normalizedHitZones.map((hz, i) => {
                    const offsetLeft = renderedRect.left - containerRect.left;
                    const offsetTop = renderedRect.top - containerRect.top;
                    return (
                        <div
                            key={i}
                            className="absolute bg-blue-500 bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 border-2 border-dashed border-transparent hover:border-blue-400"
                            style={{
                                left: `${offsetLeft + (hz.x / 100) * renderedRect.width}px`,
                                top: `${offsetTop + (hz.y / 100) * renderedRect.height}px`,
                                width: `${(hz.width / 100) * renderedRect.width}px`,
                                height: `${(hz.height / 100) * renderedRect.height}px`,
                                pointerEvents: 'none'
                            }}
                        />
                    );
                })}

                {/* Desktop click points — px positioned from renderedRect */}
                {!isMobileScroll && renderedRect && containerRect && clickPoints.map((point, index) => {
                    const pxLeft = (renderedRect.left - containerRect.left) + (point.x / 100) * renderedRect.width;
                    const pxTop = (renderedRect.top - containerRect.top) + (point.y / 100) * renderedRect.height;
                    return (
                        <React.Fragment key={index}>
                            <div
                                className={`absolute w-6 h-6 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-ping ${point.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ left: `${pxLeft}px`, top: `${pxTop}px`, animationDuration: '1s' }}
                            />
                            <div
                                className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 ${point.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ left: `${pxLeft}px`, top: `${pxTop}px` }}
                            >
                                {point.isCorrect && (
                                    <svg className="w-3 h-3 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        </React.Fragment>
                    );
                })}

                {/* Completion overlay — auto-advances after 2s as safety net */}
                {isComplete && (
                    <div
                        className={`${isMobileScroll ? 'fixed inset-0 z-50' : 'absolute inset-0'} bg-black/80 flex items-center justify-center cursor-pointer`}
                        onClick={() => onComplete?.()}
                    >
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-lg font-semibold text-white">{t('navigationFlow.flowCompleted')}</p>
                            <p className="text-sm text-green-400 mt-2">{t('navigationFlow.flowCompletedDesc')}</p>
                            <button
                                className="mt-6 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                onClick={(e) => { e.stopPropagation(); onComplete?.(); }}
                            >
                                {t('navigationFlow.tapToContinue', 'Tap to continue')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
