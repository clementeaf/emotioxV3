import React, { useRef, useState } from 'react';
import { CognitiveTaskFormData } from 'shared/interfaces/cognitive-task.interface';
import { Question } from '../types'; // Usar Question local

import { HitZoneViewer } from '@/components/common/hitzone';

interface NavigationFlowPreviewProps {
  config: CognitiveTaskFormData;
  onClose: () => void;
}

export const NavigationFlowPreview: React.FC<NavigationFlowPreviewProps> = ({ config, onClose }) => {
  const navigationQuestion = config?.questions?.find((q: Question) => q.type === 'navigation_flow');
  const imageFiles = navigationQuestion?.files || [];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedHitzone, setSelectedHitzone] = useState<string | null>(null);
  const [selectedHitzones, setSelectedHitzones] = useState<string[]>([]); // Nuevo: para múltiples hitzones
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const [imgNatural, setImgNatural] = useState<{ width: number; height: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  if (imageFiles.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
        <div className="bg-white p-8 rounded-lg shadow-2xl text-center" onClick={e => e.stopPropagation()}>
          <h2 className="text-xl font-bold text-neutral-800 mb-4">Sin imágenes</h2>
          <p className="text-neutral-600 mb-6">No hay imágenes configuradas para la previsualización.</p>
          <button onClick={onClose} className="px-6 py-2 bg-neutral-600 text-white rounded hover:bg-neutral-700">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const selectedImage = imageFiles[currentImageIndex];
  const availableHitzones = selectedImage?.hitZones || [];

  const getImageDrawRect = (imgNatural: { width: number, height: number }, container: { width: number, height: number }) => {
    const imgRatio = imgNatural.width / imgNatural.height;
    const containerRatio = container.width / container.height;
    let drawWidth = container.width;
    let drawHeight = container.height;
    let offsetX = 0;
    let offsetY = 0;
    if (imgRatio > containerRatio) {
      drawWidth = container.width;
      drawHeight = container.width / imgRatio;
      offsetY = (container.height - drawHeight) / 2;
    } else {
      drawHeight = container.height;
      drawWidth = container.height * imgRatio;
      offsetX = (container.width - drawWidth) / 2;
    }
    return { drawWidth, drawHeight, offsetX, offsetY };
  };

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height, naturalWidth, naturalHeight } = e.currentTarget;
    setImgSize({ width, height });
    setImgNatural({ width: naturalWidth, height: naturalHeight });
  };

  const handleHitzoneClick = (hitzoneId: string) => {
    setSelectedHitzone(hitzoneId);
    setShowSuccessModal(true);
  };

  // Nuevo: Handler para múltiples hitzones
  const handleMultipleHitzoneClick = (hitzoneIds: string[]) => {
    setSelectedHitzones(hitzoneIds);
    // Mantener compatibilidad con funcionalidad existente
    if (hitzoneIds.length > 0) {
      setSelectedHitzone(hitzoneIds[0]);
    }
    setShowSuccessModal(true);
  };

  const handleNext = () => {
    setShowSuccessModal(false);
    setSelectedHitzone(null);
    setSelectedHitzones([]); // Limpiar también las múltiples hitzones
    if (currentImageIndex < imageFiles.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    } else {
      onClose(); // Cerrar el preview al finalizar
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full h-full p-4 md:p-8 lg:p-12" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-white drop-shadow-md">
            {navigationQuestion?.title || 'Vista Previa de Flujo de Navegación'}
          </h1>
          <p className="text-neutral-200 drop-shadow-md">
            {navigationQuestion?.description || 'Haz clic en el área correcta para continuar.'}
          </p>
        </div>
        <div className="relative max-w-5xl mx-auto bg-neutral-800 rounded-lg shadow-2xl overflow-hidden ring-1 ring-white/20">
          <img
            ref={imgRef}
            src={selectedImage.url}
            alt={selectedImage.name || 'Imagen de previsualización'}
            className="w-full h-auto max-h-[80vh] object-contain bg-transparent"
            loading="lazy"
            onLoad={handleImgLoad}
          />
          {imgSize && imgNatural && availableHitzones.length > 0 && (
            <HitZoneViewer
              hitzones={availableHitzones}
              imageNaturalSize={imgNatural}
              imageRenderedSize={imgSize}
              enableClicks={true} // Nuevo: habilitar clicks
              onHitzoneClick={handleMultipleHitzoneClick} // Nuevo: usar handler de múltiples hitzones
            />
          )}
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/20 text-white rounded-full p-2 hover:bg-white/30 transition-colors"
          aria-label="Cerrar vista previa"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {showSuccessModal && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
            <h2 className="text-xl font-bold mb-4 text-green-700">
              {selectedHitzones.length > 1 ? '¡Múltiples áreas detectadas!' : '¡Área seleccionada!'}
            </h2>

            {selectedHitzones.length > 1 ? (
              <div className="mb-6">
                <p className="text-neutral-600 mb-3">
                  Se detectaron <strong>{selectedHitzones.length} hitzones superpuestas</strong>:
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-left space-y-2">
                    {selectedHitzones.map((hitzoneId, index) => {
                      const hitzone = availableHitzones.find(hz => hz.id === hitzoneId);
                      return (
                        <div key={hitzoneId} className="text-sm">
                          <span className="font-medium">#{index + 1}:</span> {hitzone?.name || hitzoneId}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p className="text-xs text-neutral-500 mt-3">
                  En una prueba real, todas estas áreas serían registradas como activadas.
                </p>
              </div>
            ) : (
              <p className="text-neutral-600 mb-6">En una prueba real, esto registraría la respuesta del participante.</p>
            )}

            <button
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
              onClick={handleNext}
            >
              {currentImageIndex < imageFiles.length - 1 ? 'Siguiente Imagen' : 'Finalizar Previsualización'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
