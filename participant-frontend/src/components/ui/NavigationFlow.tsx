import React, { useState } from 'react';

interface NavigationFlowProps {
    title?: string;
    description?: string;
}

export const NavigationFlow: React.FC<NavigationFlowProps> = ({ title, description }) => {
    const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);

    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setClickPosition({ x, y });
    };

    return (
        <div className="w-full space-y-6">
            {/* Placeholder image area */}
            <div
                onClick={handleImageClick}
                className="relative w-full aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-dashed border-gray-300 cursor-crosshair hover:border-blue-400 transition-colors"
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm font-medium">Haz clic en la imagen</p>
                        <p className="text-xs mt-1">Simula una imagen de interfaz</p>
                    </div>
                </div>

                {/* Click marker */}
                {clickPosition && (
                    <div
                        className="absolute w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 animate-ping"
                        style={{ left: `${clickPosition.x}%`, top: `${clickPosition.y}%` }}
                    />
                )}
                {clickPosition && (
                    <div
                        className="absolute w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${clickPosition.x}%`, top: `${clickPosition.y}%` }}
                    />
                )}
            </div>

            {/* Click info */}
            {clickPosition && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                        <span className="font-semibold">Clic registrado:</span> X: {clickPosition.x.toFixed(1)}%, Y: {clickPosition.y.toFixed(1)}%
                    </p>
                </div>
            )}

            <p className="text-sm text-gray-500 text-center italic">
                En producción, aquí se mostraría la imagen cargada por el investigador con zonas clicables
            </p>
        </div>
    );
};
