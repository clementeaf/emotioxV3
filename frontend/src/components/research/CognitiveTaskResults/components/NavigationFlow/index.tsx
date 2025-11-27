import React, { useState, useRef, useEffect } from 'react';
import type { NavigationFlowResultsProps, NavigationMetrics, VisualClickPoint } from './types';

const NavigationFlowResults: React.FC<NavigationFlowResultsProps> = ({ 
  researchId, 
  data 
}) => {

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedParticipant, setSelectedParticipant] = useState<string>('all');
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [imgRenderSize, setImgRenderSize] = useState<{ width: number; height: number } | null>(null);

  // 🎯 Resetear tamaños de imagen cuando cambia la imagen seleccionada (igual que public-tests)
  useEffect(() => {
    setImageNaturalSize(null);
    setImgRenderSize(null);
  }, [selectedImageIndex]);

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        No hay datos de flujo de navegación disponibles
      </div>
    );
  }

  // 🎯 DEBUG: Log de datos recibidos
  console.log('[NavigationFlowResults] Datos recibidos:', {
    hasData: !!data,
    hasFiles: !!data.files,
    filesCount: data.files?.length || 0,
    hasVisualClickPoints: !!data.visualClickPoints,
    visualClickPointsCount: data.visualClickPoints?.length || 0,
    hasAllClicksTracking: !!data.allClicksTracking,
    allClicksTrackingCount: data.allClicksTracking?.length || 0,
    totalParticipants: data.totalParticipants,
    dataKeys: Object.keys(data)
  });

  const calculateMetrics = (): NavigationMetrics => {
    const allClicksTracking = data.allClicksTracking || [];
    const files = data.files || [];
    const totalParticipants = data.totalParticipants || 0;
    
    const totalClicks = allClicksTracking.length;
    const correctClicks = allClicksTracking.filter(click => click.isCorrectHitzone).length;
    const incorrectClicks = totalClicks - correctClicks;
    
    const timestamps = allClicksTracking.map(click => click.timestamp).sort((a, b) => a - b);
    const totalTime = timestamps.length > 1 ? (timestamps[timestamps.length - 1] - timestamps[0]) / 1000 : 0;
    const averageTimePerImage = files.length > 0 ? totalTime / files.length : 0;
    
    const completionRate = totalParticipants > 0 ? Math.round((correctClicks / totalParticipants) * 100) : 0;

    return {
      totalClicks,
      totalParticipants,
      correctClicks,
      incorrectClicks,
      averageTimePerImage: Math.round(averageTimePerImage * 10) / 10,
      completionRate
    };
  };

  const metrics = calculateMetrics();
  
  const participantIds = Array.from(
    new Set(data.visualClickPoints.map(point => point.participantId).filter(Boolean))
  ) as string[];

  const getFilteredClicksForCurrentImage = (): VisualClickPoint[] => {

    let clicks = data.visualClickPoints.filter(point => {
      const pointImageIndex = typeof point.imageIndex === 'string' ? parseInt(point.imageIndex) : point.imageIndex;
      return pointImageIndex === selectedImageIndex;
    });
    
    if (selectedParticipant !== 'all') {
      clicks = clicks.filter(point => point.participantId === selectedParticipant);
    }
    
    return clicks;
  };

  const currentImageClicks = getFilteredClicksForCurrentImage();

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    const { naturalWidth, naturalHeight, width, height } = e.currentTarget;
    setImageNaturalSize({ width: naturalWidth, height: naturalHeight });
    setImgRenderSize({ width, height });
  };

  const files = data.files || [];
  const currentImage = files[selectedImageIndex];
  
  interface ConvertedHitZone {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    originalCoords?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }

  const convertHitZonesToPercentageCoordinates = (
    hitZones: Array<{ id: string; region?: { x: number; y: number; width: number; height: number } }> | undefined
  ): ConvertedHitZone[] => {
    if (!hitZones || !Array.isArray(hitZones) || hitZones.length === 0) {
      return [];
    }

    return hitZones.map(zone => {
      const region = zone.region || { x: 0, y: 0, width: 0, height: 0 };
      const { x, y, width, height } = region;
      return {
        id: zone.id,
        x,
        y,
        width,
        height,
        originalCoords: {
          x,
          y,
          width,
          height
        }
      };
    });
  };

  // Obtener hitzones de la imagen actual (convertidos al formato de public-tests)
  const availableHitzones: ConvertedHitZone[] = currentImage?.hitZones
    ? convertHitZonesToPercentageCoordinates(currentImage.hitZones as Array<{ id: string; region?: { x: number; y: number; width: number; height: number } }>)
    : [];

  // 🎯 DEBUG: Log de hitzones y clicks para la imagen actual
  console.log('[NavigationFlowResults] Imagen actual:', {
    selectedImageIndex,
    currentImageName: currentImage?.name,
    currentImageUrl: currentImage?.url,
    hasHitzones: !!currentImage?.hitZones,
    hitzonesCount: currentImage?.hitZones?.length || 0,
    availableHitzonesCount: availableHitzones.length,
    currentImageClicksCount: currentImageClicks.length,
    visualClickPointsTotal: data.visualClickPoints?.length || 0
  });

  // Helper function to get image draw rect (exact same logic as public-tests)
  function getImageDrawRect(
    imgNatural: { width: number; height: number },
    imgRender: { width: number; height: number }
  ): { drawWidth: number; drawHeight: number; offsetX: number; offsetY: number } {
    const imgRatio = imgNatural.width / imgNatural.height;
    const renderRatio = imgRender.width / imgRender.height;
    let drawWidth = imgRender.width;
    let drawHeight = imgRender.height;
    let offsetX = 0;
    let offsetY = 0;
    
    if (imgRatio > renderRatio) {
      drawWidth = imgRender.width;
      drawHeight = imgRender.width / imgRatio;
      offsetY = (imgRender.height - drawHeight) / 2;
    } else {
      drawHeight = imgRender.height;
      drawWidth = imgRender.height * imgRatio;
      offsetX = (imgRender.width - drawWidth) / 2;
    }
    
    return { drawWidth, drawHeight, offsetX, offsetY };
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Resultados de Flujo de Navegación</h3>
          <p className="text-sm text-gray-600 mt-1">{data.question}</p>
        </div>
        
        {/* Participant Filter */}
        {participantIds.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Participante:</label>
            <select
              value={selectedParticipant}
              onChange={(e) => setSelectedParticipant(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos ({participantIds.length})</option>
              {participantIds.map(id => (
                <option key={id} value={id}>
                  {id.slice(-8).toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{metrics.totalClicks}</div>
          <div className="text-sm text-blue-600">Total Clicks</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{metrics.correctClicks}</div>
          <div className="text-sm text-green-600">Clicks Correctos</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{metrics.incorrectClicks}</div>
          <div className="text-sm text-red-600">Clicks Incorrectos</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{metrics.totalParticipants}</div>
          <div className="text-sm text-purple-600">Participantes</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{metrics.averageTimePerImage}s</div>
          <div className="text-sm text-orange-600">Tiempo/Imagen</div>
        </div>
        <div className="bg-teal-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-teal-600">{metrics.completionRate}%</div>
          <div className="text-sm text-teal-600">Tasa Éxito</div>
        </div>
      </div>

      {/* Image Navigation */}
      {files.length > 1 && (
        <div className="flex justify-center items-center gap-4 mb-6">
          <button
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
            disabled={selectedImageIndex === 0}
          >
            Anterior
          </button>
          <span className="text-sm text-gray-600">
            Imagen {selectedImageIndex + 1} de {files.length}
          </span>
          <button
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            onClick={() => setSelectedImageIndex(Math.min(files.length - 1, selectedImageIndex + 1))}
            disabled={selectedImageIndex === files.length - 1}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Image with Click Visualization */}
      {currentImage && (
        <div className="">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-lg font-medium text-gray-900">
              {currentImage.name || `Imagen ${selectedImageIndex + 1}`}
            </h4>
            <div className="text-sm text-gray-600">
              {currentImageClicks.length} clicks en esta imagen
              {selectedParticipant !== 'all' && ` (${selectedParticipant.slice(-8).toUpperCase()})`}
            </div>
          </div>
          
          <div
            className="relative w-[42vw] max-w-[33rem] max-h-[80vh] bg-white rounded-lg shadow-lg overflow-hidden flex items-center justify-center mx-auto"
          >
            {!currentImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <p className="text-gray-600">No hay imagen disponible</p>
              </div>
            )}
            {currentImage && !imageNaturalSize && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <p className="text-gray-600 mb-2">Cargando imagen...</p>
                  <p className="text-sm text-gray-400">{currentImage.name || 'Imagen'}</p>
                </div>
              </div>
            )}
            {currentImage && currentImage.url && (
              <img
                ref={imageRef}
                src={currentImage.url}
                alt={currentImage.name || `Imagen detallada ${selectedImageIndex + 1}`}
                className="max-w-full max-h-full w-auto h-auto object-contain bg-white"
                loading="eager"
                style={{ display: 'block' }}
                onLoad={handleImageLoad}
                crossOrigin="anonymous"
              />
            )}
            {imageNaturalSize && imgRenderSize && (
              (() => {
                const { drawWidth, drawHeight, offsetX, offsetY } = getImageDrawRect(imageNaturalSize, imgRenderSize);
                return (
                  <div
                    className="absolute top-0 left-0"
                    style={{ width: imgRenderSize.width, height: imgRenderSize.height, pointerEvents: 'none' }}
                  >
                    {availableHitzones.map((hitzone: ConvertedHitZone) => {
                      const left = offsetX + (hitzone.originalCoords?.x ?? 0) * (drawWidth / imageNaturalSize.width);
                      const top = offsetY + (hitzone.originalCoords?.y ?? 0) * (drawHeight / imageNaturalSize.height);
                      const width = (hitzone.originalCoords?.width ?? 0) * (drawWidth / imageNaturalSize.width);
                      const height = (hitzone.originalCoords?.height ?? 0) * (drawHeight / imageNaturalSize.height);
                      return (
                        <div
                          key={hitzone.id}
                          className="absolute transition-all duration-300 border-2 border-blue-400 bg-blue-200 bg-opacity-20"
                          style={{
                            left,
                            top,
                            width,
                            height,
                            pointerEvents: 'none',
                          }}
                          title={`Zona interactiva: ${hitzone.id}`}
                        >
                        </div>
                      );
                    })}
                    {availableHitzones.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg p-4 text-center">
                          <p className="text-gray-600">Esta imagen no tiene zonas interactivas configuradas.</p>
                        </div>
                      </div>
                    )}

                    {/* 🎯 PUNTOS VISUALES ROJOS/VERDES - PERSISTENTES (igual que public-tests) */}
                    {currentImageClicks.map((point, index) => (
                      <div
                        key={`${point.timestamp}-${index}`}
                        className={`absolute w-3 h-3 rounded-full border-2 border-white shadow-lg pointer-events-none ${
                          point.isCorrect ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{
                          left: point.x - 6,
                          top: point.y - 6,
                          zIndex: 10
                        }}
                        title={`Clic ${point.isCorrect ? 'correcto' : 'incorrecto'} - ${new Date(point.timestamp).toLocaleTimeString()}${
                          point.participantId ? ` - ${point.participantId.slice(-8).toUpperCase()}` : ''
                        }`}
                      />
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationFlowResults;