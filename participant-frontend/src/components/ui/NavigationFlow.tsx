import React, { useState, useRef } from 'react';

interface ClickPoint {
    x: number;
    y: number;
    timestamp: number;
    isCorrect: boolean;
}

interface NavigationFlowProps {
    title?: string;
    description?: string;
}

export const NavigationFlow: React.FC<NavigationFlowProps> = ({ title, description }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [clickPoints, setClickPoints] = useState<ClickPoint[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const imageRef = useRef<HTMLDivElement>(null);

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

    const currentImage = mockImages[currentImageIndex];
    const isLastImage = currentImageIndex === mockImages.length - 1;

    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!imageRef.current || isComplete) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Check if click is within hitzone
        const hitzone = currentImage.hitzone;
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

        if (isInHitzone) {
            // Correct click - advance to next image or complete
            setTimeout(() => {
                if (isLastImage) {
                    setIsComplete(true);
                } else {
                    setCurrentImageIndex(prev => prev + 1);
                    setClickPoints([]); // Clear points for new image
                }
            }, 500);
        }
    };

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
                className={`relative w-full aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 ${isComplete ? 'border-green-500' : 'border-gray-300'
                    } ${!isComplete ? 'cursor-crosshair hover:border-blue-400' : ''} transition-colors overflow-hidden`}
            >
                {/* Mock interface representation */}
                <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="text-center">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-600 font-medium">{currentImage.name}</p>
                        <p className="text-xs text-gray-400 mt-2">Haz clic en el área correcta para continuar</p>
                    </div>
                </div>

                {/* Invisible hitzone (only visible on hover for demo) */}
                {!isComplete && (
                    <div
                        className="absolute bg-blue-500 bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 border-2 border-dashed border-transparent hover:border-blue-400"
                        style={{
                            left: `${currentImage.hitzone.x}%`,
                            top: `${currentImage.hitzone.y}%`,
                            width: `${currentImage.hitzone.width}%`,
                            height: `${currentImage.hitzone.height}%`,
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
