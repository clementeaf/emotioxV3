import React, { useState, useRef, useEffect } from 'react';
import { mediaService } from '../../services/media.service';
import { LazyImage } from './LazyImage';
import { useResponse } from '../../hooks/useResponse';

interface ClickPoint {
    x: number;
    y: number;
    timestamp: number;
    isCorrect: boolean;
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
}

export const NavigationFlow: React.FC<NavigationFlowProps> = ({ 
    moduleId = 'navigation-flow',
    componentId = 'navigation-flow-component',
    images: propImages 
}) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [clickPoints, setClickPoints] = useState<ClickPoint[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [startTime] = useState(Date.now());
    const [allClicks, setAllClicks] = useState<ClickPoint[]>([]);
    const imageRef = useRef<HTMLDivElement>(null);

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

    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!imageRef.current || isComplete) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Check if click is within any hitzone
        const hitZones = currentImage.hitZones || [];
        const hitzone = hitZones[0]; // Use first hitzone for now
        
        if (!hitzone) return;

        const isInHitzone =
            x >= hitzone.x &&
            x <= hitzone.x + hitzone.width &&
            y >= hitzone.y &&
            y <= hitzone.y + hitzone.height;

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
                <span>Imagen {currentImageIndex + 1} de {mockImages.length}</span>
                <span className="text-xs text-gray-400">{currentImage.name}</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${((currentImageIndex + 1) / mockImages.length) * 100}%` }}
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
                {!isComplete && currentImage.hitZones && currentImage.hitZones[0] && (
                    <div
                        className="absolute bg-blue-500 bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 border-2 border-dashed border-transparent hover:border-blue-400"
                        style={{
                            left: `${currentImage.hitZones[0].x}%`,
                            top: `${currentImage.hitZones[0].y}%`,
                            width: `${currentImage.hitZones[0].width}%`,
                            height: `${currentImage.hitZones[0].height}%`,
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
