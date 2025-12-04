import React, { useState } from 'react';

interface PreferenceTestProps {
    title?: string;
    description?: string;
}

export const PreferenceTest: React.FC<PreferenceTestProps> = ({ title, description }) => {
    const [selectedImage, setSelectedImage] = useState<number | null>(null);

    // Mock images (in production, these would come from uploaded files)
    const mockImages = [
        { id: 1, label: 'Diseño A' },
        { id: 2, label: 'Diseño B' },
        { id: 3, label: 'Diseño C' }
    ];

    return (
        <div className="w-full space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mockImages.map((image) => (
                    <button
                        key={image.id}
                        onClick={() => setSelectedImage(image.id)}
                        className={`relative aspect-square rounded-lg border-2 transition-all ${selectedImage === image.id
                                ? 'border-blue-600 ring-4 ring-blue-100 shadow-lg'
                                : 'border-gray-300 hover:border-blue-400 hover:shadow-md'
                            }`}
                    >
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg">
                            <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm font-medium text-gray-600">{image.label}</p>
                        </div>

                        {/* Selection indicator */}
                        {selectedImage === image.id && (
                            <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {selectedImage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                        <span className="font-semibold">Seleccionado:</span> Diseño {String.fromCharCode(64 + selectedImage)}
                    </p>
                </div>
            )}

            <p className="text-sm text-gray-500 text-center italic">
                En producción, aquí se mostrarían las imágenes reales cargadas por el investigador
            </p>
        </div>
    );
};
