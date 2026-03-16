import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { mediaService } from '../../services/media.service';
import { LazyImage } from './LazyImage';
import { useResponse } from '../../hooks/useResponse';

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

    // Load images from S3
    useEffect(() => {
        const loadImages = async () => {
            if (!propImages || propImages.length === 0) {
                setLoading(false);
                return;
            }

            try {
                const urls = await Promise.all(
                    propImages.map(async (img) => {
                        if (img.s3Key) return await mediaService.getMediaUrl(img.s3Key);
                        if (img.url) return img.url;
                        return '';
                    })
                );
                setImageUrls(urls.filter(url => url !== ''));
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

    const currentImage = images[currentImageIndex];
    const currentImageUrl = imageUrls[currentImageIndex];
    const isLastImage = currentImageIndex === images.length - 1;

    /**
     * Normalizes a hitzone to percent coordinates (0-100) relative to the rendered image.
     * Supports ratios (0..1), percents (0..100), or pixels (requires natural size).
     * @param hz - Raw hitzone
     * @param natural - Natural image size
     * @returns Normalized hitzone in percent
     */
    const normalizeHitzoneToPercent = (hz: HitzoneRect, natural: { width: number; height: number } | null): HitzoneRect => {
        const looksLikeRatio = hz.width <= 1 && hz.height <= 1 && hz.x <= 1 && hz.y <= 1;
        if (looksLikeRatio) {
            return { ...hz, x: hz.x * 100, y: hz.y * 100, width: hz.width * 100, height: hz.height * 100 };
        }

        const looksLikePercent = hz.width <= 100 && hz.height <= 100 && hz.x <= 100 && hz.y <= 100;
        if (looksLikePercent) {
            return hz;
        }

        if (natural && natural.width > 0 && natural.height > 0) {
            return {
                ...hz,
                x: (hz.x / natural.width) * 100,
                y: (hz.y / natural.height) * 100,
                width: (hz.width / natural.width) * 100,
                height: (hz.height / natural.height) * 100,
            };
        }

        return hz;
    };

    const normalizedHitZones = useMemo((): HitzoneRect[] => {
        const zones = (currentImage.hitZones || []) as HitzoneRect[];
        return zones.map((z) => normalizeHitzoneToPercent(z, imgNatural));
    }, [currentImage.hitZones, imgNatural]);

    // Track the rendered image rect (object-contain aware) for hitzone positioning
    const [renderedRect, setRenderedRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

    const updateRenderedRect = useCallback(() => {
        const img = imgElRef.current;
        if (img) setRenderedRect(getRenderedImageRect(img));
    }, []);

    // Reset rendered rect and natural size when image changes so stale data from the previous
    // image is not used for hitzone positioning while the new image loads.
    useEffect(() => {
        setImgNatural(null);
        setRenderedRect(null);
    }, [currentImageIndex]);

    // Recompute rendered rect on resize / orientation change
    useEffect(() => {
        updateRenderedRect();
        window.addEventListener('resize', updateRenderedRect);
        return () => window.removeEventListener('resize', updateRenderedRect);
    }, [updateRenderedRect, currentImageIndex]);

    // Non-passive touch listeners so preventDefault works: avoids Safari/Chrome consuming the tap for scroll or delaying the click
    useEffect(() => {
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
    }, []);

    /**
     * Resolves the clickable image area in viewport coordinates.
     * When no img is rendered, img has not loaded yet (naturalWidth/Height 0), or rect is null, uses the container so taps/clicks still advance in all browsers.
     */
    const getClickableRect = useCallback((): { left: number; top: number; width: number; height: number } | null => {
        const img = imgElRef.current;
        if (img) {
            const rect = getRenderedImageRect(img);
            if (rect) return rect;
        }
        const container = imageRef.current;
        if (container) {
            const r = container.getBoundingClientRect();
            return { left: r.left, top: r.top, width: r.width, height: r.height };
        }
        return null;
    }, []);

    /** Process one pointer/click at (clientX, clientY). Used by both pointer and click so touch/pen work in Opera and others. */
    const processInteraction = (clientX: number, clientY: number): void => {
        if (isComplete) return;

        const rendered = getClickableRect();
        if (!rendered) return;

        const relX = clientX - rendered.left;
        const relY = clientY - rendered.top;

        if (relX < 0 || relY < 0 || relX > rendered.width || relY > rendered.height) return;

        const x = (relX / rendered.width) * 100;
        const y = (relY / rendered.height) * 100;

        // Last image: entire image is hitzone. When no hitzones configured, treat whole image as valid so flow advances in all browsers.
        const hasHitzones = normalizedHitZones.length > 0;
        const isInHitzone = isLastImage
            ? true
            : hasHitzones
                ? normalizedHitZones.some((hz) => (
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

        if (isInHitzone) {
            setClickPoints(prev => [...prev, clickPoint]);
            if (isLastImage) {
                setIsComplete(true);
                saveNavigationResponse(true);
                if (onComplete) setTimeout(() => onComplete(), 800);
            } else {
                setTimeout(() => {
                    setCurrentImageIndex(prev => prev + 1);
                    setClickPoints([]);
                }, 200);
            }
        }
    };

    const DEDUPE_MS = 150;

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>): void => {
        e.preventDefault();
        if (Date.now() - lastHandledAtRef.current < DEDUPE_MS) return;
        lastHandledAtRef.current = Date.now();
        processInteraction(e.clientX, e.clientY);
    };

    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>): void => {
        e.preventDefault();
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

    // Save when completed
    useEffect(() => {
        if (isComplete) {
            saveNavigationResponse(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isComplete]);

    return (
        <div
            className="fixed inset-0 z-40 bg-black flex flex-col"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            {/* Title and instructions above the image so hitzones at the top remain clickable */}
            {!isComplete && (
                <div className="flex-shrink-0 bg-black px-4 pt-4 pb-3">
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
                onPointerUp={handlePointerUp}
                onTouchEnd={handleTouchEnd}
                className={`relative flex-1 min-h-0 flex items-center justify-center select-none ${!isComplete ? 'cursor-pointer' : ''}`}
                onContextMenu={(e) => e.preventDefault()}
                style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent', WebkitTouchCallout: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
            >
                {/* Render real image or mock */}
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
                    </div>
                ) : currentImageUrl ? (
                    <LazyImage
                        src={currentImageUrl}
                        alt={currentImage.name || `Image ${currentImageIndex + 1}`}
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        draggable={false}
                        ref={imgElRef}
                        onLoad={(e) => {
                            const el = e.currentTarget;
                            // Skip placeholder (1x1 transparent GIF) — only update on real image load
                            if (el.naturalWidth <= 1 || el.naturalHeight <= 1) return;
                            setImgNatural({ width: el.naturalWidth, height: el.naturalHeight });
                            setRenderedRect(getRenderedImageRect(el));
                        }}
                    />
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

                {/* Hitzone overlays — positioned within the rendered image area (object-contain safe) */}
                {!isComplete && renderedRect && imageRef.current && normalizedHitZones.map((hz, i) => {
                    const containerRect = imageRef.current!.getBoundingClientRect();
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

                {/* Visual click points — positioned within the rendered image area */}
                {renderedRect && imageRef.current && clickPoints.map((point, index) => {
                    const containerRect = imageRef.current!.getBoundingClientRect();
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

                {/* Completion overlay */}
                {isComplete && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-lg font-semibold text-white">{t('navigationFlow.flowCompleted')}</p>
                            <p className="text-sm text-green-400 mt-2">{t('navigationFlow.flowCompletedDesc')}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
