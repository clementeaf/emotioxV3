import React, { useEffect, useRef, useState } from 'react';
import { useFormDataStore } from '../../../stores/useFormDataStore';
import { useStepStore } from '../../../stores/useStepStore';
import { PreferenceFile, PreferenceTestTaskProps } from '../types/types';

interface BackendResponse {
  questionKey: string;
  response: {
    selectedValue?: string;
    textValue?: string;
    [key: string]: unknown;
  };
}

const PreferenceTestTask: React.FC<PreferenceTestTaskProps> = ({
  stepConfig,
  selectedImageId: externalSelectedImageId = null,
  onImageSelect,
  currentQuestionKey
}) => {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(externalSelectedImageId);
  const [error, setError] = useState<string | null>(null);
  const { setFormData, getFormData } = useFormDataStore();

  // Estado para zoom modal
  const [zoomImage, setZoomImage] = useState<PreferenceFile | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const imgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentQuestionKey) {
      const store = useStepStore.getState();
      const backendResponse = store.backendResponses.find(
        (r: unknown): r is BackendResponse => (r as BackendResponse).questionKey === currentQuestionKey
      );

      if (backendResponse?.response) {
        const responseData = backendResponse.response as { selectedValue?: string; textValue?: string };
        if (responseData.selectedValue) {
          setSelectedImageId(responseData.selectedValue);
        }
        return;
      }

      // 2. Si no hay respuesta del backend, cargar del store local
      const localData = getFormData(currentQuestionKey);
      
      if (localData?.selectedValue) {
        setSelectedImageId(localData.selectedValue as string);
      }
    }
  }, [currentQuestionKey, getFormData]); // Incluir getFormData para asegurar sincronización

  // Extraer la configuración de la pregunta
  let preferenceQuestion: Record<string, unknown> | null = null;

  if (stepConfig && typeof stepConfig === 'object') {
    if ('questions' in stepConfig && Array.isArray((stepConfig as Record<string, unknown>).questions)) {
      const config = stepConfig as { questions: Record<string, unknown>[] };
      preferenceQuestion = config.questions.find(q => (q as Record<string, unknown>).type === 'preference_test') as Record<string, unknown> | undefined || null;
    }
    else if ('type' in stepConfig && (stepConfig as Record<string, unknown>).type === 'preference_test') {
      preferenceQuestion = stepConfig;
    }
    else if ('config' in stepConfig) {
      preferenceQuestion = (stepConfig as Record<string, unknown>).config as Record<string, unknown>;
    }
  }

  const config = preferenceQuestion || stepConfig;
  const images = (config?.files as PreferenceFile[]) || [];

  const localData = getFormData(currentQuestionKey || '');
  const effectiveSelectedImageId = localData?.selectedValue as string || selectedImageId;

  useEffect(() => {
    if (externalSelectedImageId !== selectedImageId) {
      setSelectedImageId(externalSelectedImageId);
    }
  }, [externalSelectedImageId, selectedImageId]);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
    setDragStart(null);
  }, [zoomImage]);

  const handleImageSelect = (imageId: string) => {
    if (currentQuestionKey) {
      setFormData(currentQuestionKey, {
        selectedValue: imageId
      });
    }

    setSelectedImageId(imageId);
    setError(null);

    onImageSelect?.(imageId);
  };

  const handleZoomNav = (direction: 'prev' | 'next') => {
    if (!zoomImage) return;
    const currentIdx = images.findIndex((img: PreferenceFile) => img.id === zoomImage.id);
    if (direction === 'prev' && currentIdx > 0) {
      setZoomImage(images[currentIdx - 1]);
    } else if (direction === 'next' && currentIdx < images.length - 1) {
      setZoomImage(images[currentIdx + 1]);
    }
  };

  // Zoom con scroll
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    let newZoom = zoom + (e.deltaY < 0 ? 0.15 : -0.15);
    newZoom = Math.max(1, Math.min(newZoom, 5));
    setZoom(newZoom);
  };

  // Pan con drag
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

  // Touch events para mobile (pinch y pan)
  const lastTouch = useRef<{ x: number; y: number; dist?: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouch.current = { x: 0, y: 0, dist };
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!lastTouch.current) return;
    if (e.touches.length === 1 && lastTouch.current.dist === undefined) {
      setOffset({ x: e.touches[0].clientX - lastTouch.current.x, y: e.touches[0].clientY - lastTouch.current.y });
    } else if (e.touches.length === 2 && lastTouch.current.dist !== undefined) {
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      let newZoom = zoom * (newDist / (lastTouch.current.dist || 1));
      newZoom = Math.max(1, Math.min(newZoom, 5));
      setZoom(newZoom);
      lastTouch.current.dist = newDist;
    }
  };
  const handleTouchEnd = () => {
    lastTouch.current = null;
  };

  if (!images || images.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-lg text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Error de Configuración</h2>
          <p className="text-gray-600">No se encontraron imágenes para esta pregunta de preferencia.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            {(config?.title as string) || 'Pregunta de Preferencia'}
          </h1>
          {(config?.description as string) && (
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {config.description as string}
            </p>
          )}
        </div>

        {/* Images Grid */}
        <div className="flex flex-row gap-4 justify-center mb-8">
          {images.map((image: PreferenceFile, index: number) => {
            const isSelected = effectiveSelectedImageId === image.id;
            return (
            <div
              key={image.id}
              className={`relative rounded-lg shadow-lg overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${isSelected
                  ? 'ring-4 ring-blue-500 shadow-2xl scale-[1.02] bg-blue-50'
                  : 'hover:shadow-xl'
                }`}
              style={{ width: '300px', height: '400px' }}
              onClick={() => handleImageSelect(image.id)}
            >
              {/* Botón de zoom (lupa) */}
              <button
                type="button"
                className="absolute top-3 right-3 z-20 bg-white bg-opacity-80 rounded-full p-2 shadow hover:bg-opacity-100 focus:outline-none"
                style={{ border: 'none' }}
                onClick={e => { e.stopPropagation(); setZoomImage(image); }}
                title="Ver grande"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 z-10 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-lg">
                  ✓
                </div>
              )}

              {/* Option label */}
              <div className="absolute top-4 left-4 z-10 bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm font-medium text-gray-700 shadow-sm">
                Opción {index + 1}
              </div>

              {/* Image */}
              <div className="w-full h-full overflow-hidden flex items-center justify-center">
                <img
                  src={image.url}
                  alt={image.name || `Opción ${index + 1}`}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                />
              </div>
            </div>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="text-center mb-4">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Zoom Modal */}
        {zoomImage && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close button */}
              <button
                type="button"
                className="absolute top-4 right-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 text-white transition-all"
                onClick={() => setZoomImage(null)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Navigation buttons */}
              {images.findIndex((img: PreferenceFile) => img.id === zoomImage.id) > 0 && (
                <button
                  type="button"
                  className="absolute left-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 text-white transition-all"
                  onClick={() => handleZoomNav('prev')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <polyline points="15,18 9,12 15,6" />
                  </svg>
                </button>
              )}

              {images.findIndex((img: PreferenceFile) => img.id === zoomImage.id) < images.length - 1 && (
                <button
                  type="button"
                  className="absolute right-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 text-white transition-all"
                  onClick={() => handleZoomNav('next')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <polyline points="9,18 15,12 9,6" />
                  </svg>
                </button>
              )}

              {/* Image container */}
              <div
                ref={imgContainerRef}
                className="relative w-full h-full flex items-center justify-center overflow-hidden"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  src={zoomImage.url}
                  alt={zoomImage.name}
                  className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing"
                  style={{
                    transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
                    transition: dragging ? 'none' : 'transform 0.1s ease-out'
                  }}
                  draggable={false}
                />
              </div>

              {/* Zoom controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-black bg-opacity-50 rounded-lg p-2 flex items-center gap-2">
                <button
                  type="button"
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded p-2 text-white"
                  onClick={() => setZoom(Math.max(1, zoom - 0.5))}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <span className="text-white text-sm px-2">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded p-2 text-white"
                  onClick={() => setZoom(Math.min(5, zoom + 0.5))}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreferenceTestTask;
