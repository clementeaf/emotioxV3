import React, { useState } from 'react';

interface PreferenceTestProps {
    title?: string;
    description?: string;
}

export const PreferenceTest: React.FC<PreferenceTestProps> = () => {
    const [selectedImage, setSelectedImage] = useState<number | null>(null);
    const [zoomImage, setZoomImage] = useState<number | null>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

    // Mock images (in production, these would come from uploaded files)
    const mockImages = [
        { id: 1, label: 'Diseño A', color: 'from-blue-400 to-blue-600' },
        { id: 2, label: 'Diseño B', color: 'from-purple-400 to-purple-600' },
        { id: 3, label: 'Diseño C', color: 'from-pink-400 to-pink-600' }
    ];

    const handleImageSelect = (imageId: number) => {
        setSelectedImage(imageId);
    };

    const handleZoomOpen = (imageId: number) => {
        setZoomImage(imageId);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    };

    const handleZoomClose = () => {
        setZoomImage(null);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        let newZoom = zoom + (e.deltaY < 0 ? 0.15 : -0.15);
        newZoom = Math.max(1, Math.min(newZoom, 5));
        setZoom(newZoom);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging || !dragStart) return;
        setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => {
        setDragging(false);
        setDragStart(null);
    };

    const handleZoomNav = (direction: 'prev' | 'next') => {
        if (zoomImage === null) return;
        const currentIdx = mockImages.findIndex(img => img.id === zoomImage);
        if (direction === 'prev' && currentIdx > 0) {
            setZoomImage(mockImages[currentIdx - 1].id);
            setZoom(1);
            setOffset({ x: 0, y: 0 });
        } else if (direction === 'next' && currentIdx < mockImages.length - 1) {
            setZoomImage(mockImages[currentIdx + 1].id);
            setZoom(1);
            setOffset({ x: 0, y: 0 });
        }
    };

    const currentZoomImage = mockImages.find(img => img.id === zoomImage);

    return (
        <div className="w-full space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mockImages.map((image) => (
                    <div key={image.id} className="space-y-2">
                        <button
                            onClick={() => handleImageSelect(image.id)}
                            className={`relative aspect-square rounded-lg border-2 transition-all w-full ${selectedImage === image.id
                                    ? 'border-blue-600 ring-4 ring-blue-100 shadow-lg scale-105'
                                    : 'border-gray-300 hover:border-blue-400 hover:shadow-md'
                                }`}
                        >
                            <div className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br ${image.color} rounded-lg`}>
                                <svg className="w-12 h-12 text-white mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-sm font-medium text-white">{image.label}</p>
                            </div>

                            {/* Selection indicator */}
                            {selectedImage === image.id && (
                                <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1.5 shadow-lg">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </button>

                        {/* Zoom button */}
                        <button
                            onClick={() => handleZoomOpen(image.id)}
                            className="w-full py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                            </svg>
                            Ver detalle
                        </button>
                    </div>
                ))}
            </div>

            {selectedImage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-green-800">
                        <span className="font-semibold">Seleccionado:</span> {mockImages.find(img => img.id === selectedImage)?.label}
                    </p>
                </div>
            )}

            {/* Zoom Modal */}
            {zoomImage !== null && currentZoomImage && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
                    <div className="relative w-full h-full flex flex-col">
                        {/* Header */}
                        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 p-4 flex items-center justify-between z-10">
                            <div className="text-white">
                                <p className="font-medium">{currentZoomImage.label}</p>
                                <p className="text-sm text-gray-300">Usa la rueda del mouse para hacer zoom</p>
                            </div>
                            <button
                                onClick={handleZoomClose}
                                className="text-white hover:text-gray-300 p-2"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Image container */}
                        <div
                            className="flex-1 flex items-center justify-center overflow-hidden cursor-move"
                            onWheel={handleWheel}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            <div
                                className={`bg-gradient-to-br ${currentZoomImage.color} rounded-lg shadow-2xl flex items-center justify-center`}
                                style={{
                                    width: '600px',
                                    height: '400px',
                                    transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
                                    transition: dragging ? 'none' : 'transform 0.1s'
                                }}
                            >
                                <div className="text-white text-center">
                                    <svg className="w-32 h-32 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-2xl font-bold">{currentZoomImage.label}</p>
                                </div>
                            </div>
                        </div>

                        {/* Navigation arrows */}
                        {mockImages.findIndex(img => img.id === zoomImage) > 0 && (
                            <button
                                onClick={() => handleZoomNav('prev')}
                                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        {mockImages.findIndex(img => img.id === zoomImage) < mockImages.length - 1 && (
                            <button
                                onClick={() => handleZoomNav('next')}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}

                        {/* Zoom controls */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 rounded-full px-4 py-2 flex items-center gap-4">
                            <button
                                onClick={() => setZoom(Math.max(1, zoom - 0.25))}
                                className="text-white hover:text-gray-300"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                                </svg>
                            </button>
                            <span className="text-white text-sm font-medium min-w-[60px] text-center">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                onClick={() => setZoom(Math.min(5, zoom + 0.25))}
                                className="text-white hover:text-gray-300"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <p className="text-sm text-gray-500 text-center italic">
                En producción, aquí se mostrarían las imágenes reales cargadas por el investigador
            </p>
        </div>
    );
};
