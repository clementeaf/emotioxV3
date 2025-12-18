import React, { useState, useRef, useEffect, useMemo } from 'react';
import { mediaService } from '../../services/media.service';
import { LazyImage } from './LazyImage';
import { useResponse } from '../../hooks/useResponse';

interface ClickPoint {
    x: number;
    y: number;
    timestamp: number;
    isCorrect: boolean;
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
    images: propImages,
    onComplete
}) => {
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

    /**
     * Handles click on the navigation image.
     * Computes click coordinates relative to the actual rendered image rect (object-contain safe).
     * @param e - Mouse event
     */
    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>): void => {
        if (isComplete) return;

        const img = imgElRef.current;
        if (!img) return;

        const rect = img.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;

        // Ignore clicks outside the rendered image (letterbox area)
        if (relX < 0 || relY < 0 || relX > rect.width || relY > rect.height) {
            return;
        }

        const x = (relX / rect.width) * 100;
        const y = (relY / rect.height) * 100;

        if (normalizedHitZones.length === 0) return;

        const isInHitzone = normalizedHitZones.some((hz) => {
            return (
                x >= hz.x &&
                x <= hz.x + hz.width &&
                y >= hz.y &&
                y <= hz.y + hz.height
            );
        });

        const clickPoint: ClickPoint = {
            x,
            y,
            timestamp: Date.now(),
            isCorrect: isInHitzone
        };

        setClickPoints(prev => [...prev, clickPoint]);
        setAllClicks(prev => [...prev, { ...clickPoint, imageId: currentImage.id }]);

        if (isInHitzone) {
            // Correct click - advance to next image or complete
            setTimeout(() => {
                if (isLastImage) {
                    setIsComplete(true);
                    // Save final response
                    saveNavigationResponse(true);
                    // Trigger navigation to next step after a short delay
                    if (onComplete) {
                        setTimeout(() => {
                            onComplete();
                        }, 1000);
                    }
                } else {
                    setCurrentImageIndex(prev => prev + 1);
                    setClickPoints([]); // Clear points for new image
                }
            }, 500);
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
        <div className="w-full space-y-3">
            {/* Progress indicator */}
            <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Imagen {currentImageIndex + 1} de {images.length}</span>
                <span className="text-xs text-gray-400">{currentImage.name}</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${((currentImageIndex + 1) / images.length) * 100}%` }}
                />
            </div>

            {/* Image area with click tracking */}
            <div
                ref={imageRef}
                onClick={handleImageClick}
                className={`relative w-full aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 ${
                    isComplete ? 'border-green-500' : 'border-gray-300'
                } ${!isComplete ? 'cursor-crosshair hover:border-blue-400' : ''} transition-colors overflow-hidden`}
            >
                {/* Render real image or mock */}
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                    </div>
                ) : currentImageUrl ? (
                    <LazyImage
                        src={currentImageUrl}
                        alt={currentImage.name || `Image ${currentImageIndex + 1}`}
                        className="absolute inset-0 w-full h-full object-contain"
                        ref={imgElRef}
                        onLoad={(e) => {
                            const el = e.currentTarget;
                            setImgNatural({ width: el.naturalWidth, height: el.naturalHeight });
                        }}
                    />
                ) : (
                    /* Mock interface representation */
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                        <div className="text-center">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <p className="text-gray-600 font-medium">{currentImage.name}</p>
                            <p className="text-xs text-gray-400 mt-2">Haz clic en el área correcta para continuar</p>
                        </div>
                    </div>
                )}

                {/* Invisible hitzone (only visible on hover for demo) */}
                {!isComplete && normalizedHitZones[0] && (
                    <div
                        className="absolute bg-blue-500 bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 border-2 border-dashed border-transparent hover:border-blue-400"
                        style={{
                            left: `${normalizedHitZones[0].x}%`,
                            top: `${normalizedHitZones[0].y}%`,
                            width: `${normalizedHitZones[0].width}%`,
                            height: `${normalizedHitZones[0].height}%`,
                            pointerEvents: 'none'
                        }}
                    />
                )}

                {/* Visual click points */}
                {clickPoints.map((point, index) => (
                    <React.Fragment key={index}>
                        {/* Ping animation */}
                        <div
                            className={`absolute w-6 h-6 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-ping ${point.isCorrect ? 'bg-green-500' : 'bg-red-500'
                                }`}
                            style={{
                                left: `${point.x}%`,
                                top: `${point.y}%`,
                                animationDuration: '1s'
                            }}
                        />
                        {/* Static point */}
                        <div
                            className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 ${point.isCorrect ? 'bg-green-500' : 'bg-red-500'
                                }`}
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

                {/* Completion overlay */}
                {isComplete && (
                    <div className="absolute inset-0 bg-green-50 bg-opacity-95 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-lg font-semibold text-green-800">¡Flujo completado!</p>
                            <p className="text-sm text-green-600 mt-2">Has navegado exitosamente por todas las pantallas</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                    <span className="font-semibold">Instrucción:</span> Haz clic en las áreas interactivas para avanzar.
                    {clickPoints.length > 0 && !isComplete && (
                        <span className="block mt-1 text-blue-600">
                            {clickPoints.filter(p => !p.isCorrect).length > 0
                                ? '❌ Intenta en otra área'
                                : '✓ ¡Bien! Avanzando...'}
                        </span>
                    )}
                </p>
            </div>
        </div>
    );
};
