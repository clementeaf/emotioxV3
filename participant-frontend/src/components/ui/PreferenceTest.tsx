import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { mediaService } from '../../services/media.service';
import { LazyImage } from './LazyImage';
import { useResponse } from '../../hooks/useResponse';

interface PreferenceTestProps {
    moduleId?: string;
    componentId?: string;
    title?: string;
    description?: string;
    images?: Array<{
        id: string;
        name?: string;
        s3Key?: string;
        url?: string;
    }>;
}

export const PreferenceTest: React.FC<PreferenceTestProps> = ({
    moduleId = 'preference-test',
    componentId = 'preference-test-component',
    title,
    description,
    images: propImages,
}) => {
    const { t } = useTranslation();
    const [selectedImage, setSelectedImage] = useState<number | null>(null);
    const [preferenceIntensity, setPreferenceIntensity] = useState<'slight' | 'strong' | null>(null);
    const [zoomImage, setZoomImage] = useState<number | null>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewHistory, setViewHistory] = useState<Array<{ imageId: number; timestamp: number; duration: number }>>([]);
    const [currentViewStart, setCurrentViewStart] = useState<number | null>(null);

    // Response hook for saving data
    const response = useResponse({ moduleId, componentId });

    // Mock images (in production, these would come from uploaded files)
    const mockImages = [
        { id: 1, label: 'Diseño A', color: 'from-blue-400 to-blue-600' },
        { id: 2, label: 'Diseño B', color: 'from-purple-400 to-purple-600' },
        { id: 3, label: 'Diseño C', color: 'from-pink-400 to-pink-600' }
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
    const images = propImages && propImages.length > 0 
        ? propImages.map((img, idx) => ({
            id: idx + 1,
            label: img.name || `Opción ${idx + 1}`,
            color: mockImages[idx % mockImages.length].color,
            s3Key: img.s3Key,
            url: imageUrls[idx] as string | undefined
        }))
        : mockImages.map(m => ({ ...m, url: undefined as string | undefined }));

    const handleImageSelect = (imageId: number): void => {
        setSelectedImage(imageId);
        setPreferenceIntensity(null); // Reset intensity on new selection
    };

    const handleIntensitySelect = (intensity: 'slight' | 'strong'): void => {
        setPreferenceIntensity(intensity);
        if (selectedImage !== null) {
            savePreferenceResponse(selectedImage, intensity);
        }
    };

    const handleZoomOpen = (imageId: number) => {
        setZoomImage(imageId);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setCurrentViewStart(Date.now());
    };

    const handleZoomClose = () => {
        // Track view duration before closing
        if (zoomImage !== null && currentViewStart !== null) {
            const duration = Date.now() - currentViewStart;
            setViewHistory(prev => [...prev, { 
                imageId: zoomImage, 
                timestamp: currentViewStart, 
                duration 
            }]);
        }
        setZoomImage(null);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setCurrentViewStart(null);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        let newZoom = zoom + (e.deltaY < 0 ? 0.15 : -0.15);
        newZoom = Math.max(1, Math.min(newZoom, 5));
        setZoom(newZoom);
    };

    const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        mouseDownPos.current = { x: e.clientX, y: e.clientY };
        setDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging || !dragStart) return;
        setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        const wasClick = mouseDownPos.current &&
            Math.abs(e.clientX - mouseDownPos.current.x) < 5 &&
            Math.abs(e.clientY - mouseDownPos.current.y) < 5;
        setDragging(false);
        setDragStart(null);
        mouseDownPos.current = null;
        // Close lightbox on click (not drag) outside the image
        if (wasClick && (e.target as HTMLElement).tagName !== 'IMG') {
            handleZoomClose();
        }
    };

    const handleZoomNav = (direction: 'prev' | 'next') => {
        if (zoomImage === null) return;
        
        // Track current image view duration
        if (currentViewStart !== null) {
            const duration = Date.now() - currentViewStart;
            setViewHistory(prev => [...prev, { 
                imageId: zoomImage, 
                timestamp: currentViewStart, 
                duration 
            }]);
        }

        const currentIdx = images.findIndex(img => img.id === zoomImage);
        if (direction === 'prev' && currentIdx > 0) {
            setZoomImage(images[currentIdx - 1].id);
            setZoom(1);
            setOffset({ x: 0, y: 0 });
            setCurrentViewStart(Date.now());
        } else if (direction === 'next' && currentIdx < images.length - 1) {
            setZoomImage(images[currentIdx + 1].id);
            setZoom(1);
            setOffset({ x: 0, y: 0 });
            setCurrentViewStart(Date.now());
        }
    };

    const currentZoomImage = images.find(img => img.id === zoomImage);

    // Save preference response
    const savePreferenceResponse = (imageId: number, intensity?: 'slight' | 'strong' | null) => {
        const responseData = {
            selectedImageId: imageId,
            selectedImageLabel: images.find(img => img.id === imageId)?.label || '',
            preferenceIntensity: intensity || 'strong',
            totalImages: images.length,
            viewHistory,
        };

        response.save(
            JSON.stringify(responseData),
            {
                imageViews: viewHistory.length,
                totalViewDuration: viewHistory.reduce((sum, v) => sum + v.duration, 0),
            }
        );
    };

    // Auto-save on unmount if selection exists
    useEffect(() => {
        return () => {
            if (selectedImage !== null) {
                savePreferenceResponse(selectedImage, preferenceIntensity);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="w-full space-y-4">
            {/* Title and description */}
            {title && (
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            )}
            {description && (
                <p className="text-gray-600">{description}</p>
            )}

            {loading && (
                <div className="flex items-center justify-center py-8">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                    <p className="ml-3 text-gray-600">{t('preferenceTest.loadingImages')}</p>
                </div>
            )}
            
            {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {images.map((image) => (
                    <div key={image.id} className="space-y-2">
                        <button
                            onClick={() => handleImageSelect(image.id)}
                            className={`relative aspect-square rounded-lg border-2 transition-all w-full overflow-hidden ${
                                selectedImage === image.id
                                    ? 'border-blue-600 ring-4 ring-blue-100 shadow-lg scale-105'
                                    : 'border-gray-300 hover:border-blue-400 hover:shadow-md'
                            }`}
                        >
                            {/* Render real image or mock */}
                            {image.url ? (
                                <LazyImage
                                    src={image.url}
                                    alt={image.label}
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                            ) : (
                                <div className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br ${image.color} rounded-lg`}>
                                    <svg className="w-12 h-12 text-white mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-sm font-medium text-white">{image.label}</p>
                                </div>
                            )}

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
                            {t('preferenceTest.viewDetail')}
                        </button>
                    </div>
                ))}
            </div>
            )}

            {/* Preference intensity selector — shown after selecting an image */}
            {selectedImage !== null && !loading && (
                <div className="flex items-center justify-center gap-3 pt-2">
                    <span className="text-sm text-gray-500">{t('preferenceTest.howMuch', 'How strong is your preference?')}</span>
                    <button
                        onClick={() => handleIntensitySelect('slight')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                            preferenceIntensity === 'slight'
                                ? 'bg-blue-100 border-blue-400 text-blue-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {t('preferenceTest.slightPreference', 'Slight')}
                    </button>
                    <button
                        onClick={() => handleIntensitySelect('strong')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                            preferenceIntensity === 'strong'
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {t('preferenceTest.strongPreference', 'Strong')}
                    </button>
                </div>
            )}

            {/* Zoom Modal */}
            {zoomImage !== null && currentZoomImage && (
                <div
                    role="dialog"
                    className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
                    onClick={(e) => { if (e.target === e.currentTarget) handleZoomClose(); }}
                    onKeyDown={(e) => { if (e.key === 'Escape') handleZoomClose(); }}
                >
                    <div className="relative w-full h-full flex flex-col">
                        {/* Header */}
                        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 p-4 flex items-center justify-between z-10">
                            <div className="text-white">
                                <p className="font-medium">{currentZoomImage.label}</p>
                                <p className="text-sm text-gray-300">{t('preferenceTest.zoomHint')}</p>
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
                            onMouseLeave={() => { setDragging(false); setDragStart(null); mouseDownPos.current = null; }}
                        >
                            {currentZoomImage.url ? (
                                <img
                                    src={currentZoomImage.url}
                                    alt={currentZoomImage.label}
                                    className="max-w-full max-h-full object-contain"
                                    style={{
                                        transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
                                        transition: dragging ? 'none' : 'transform 0.1s'
                                    }}
                                />
                            ) : (
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
                            )}
                        </div>

                        {/* Navigation arrows */}
                        {images.findIndex(img => img.id === zoomImage) > 0 && (
                            <button
                                onClick={() => handleZoomNav('prev')}
                                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        {images.findIndex(img => img.id === zoomImage) < images.length - 1 && (
                            <button
                                onClick={() => handleZoomNav('next')}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}

                        {/* Select button */}
                        <button
                            onClick={() => {
                                if (zoomImage !== null) {
                                    handleImageSelect(zoomImage);
                                    handleZoomClose();
                                }
                            }}
                            className={`absolute bottom-16 left-1/2 transform -translate-x-1/2 px-6 py-2.5 rounded-full font-medium transition-all ${
                                selectedImage === zoomImage
                                    ? 'bg-green-500 text-white'
                                    : 'bg-white text-gray-900 hover:bg-purple-600 hover:text-white'
                            }`}
                        >
                            {selectedImage === zoomImage
                                ? t('preferenceTest.selected')
                                : t('preferenceTest.selectThisImage')
                            }
                        </button>

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

        </div>
    );
};
