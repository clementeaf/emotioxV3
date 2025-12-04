import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useFormDataStore } from '../../../stores/useFormDataStore';
import { useStepStore } from '../../../stores/useStepStore';
import { useTestStore } from '../../../stores/useTestStore';
import { useSaveModuleResponseMutation, useModuleResponsesQuery, useAvailableFormsQuery } from '../../../hooks/useApiQueries';
import { useResponseTiming } from '../../../hooks/useResponseTiming';
import { useUserJourneyTracking } from '../../../hooks/useUserJourneyTracking';
import { useEyeTrackingConfigQuery } from '../../../hooks/useEyeTrackingConfigQuery';
import { useOptimizedMonitoringWebSocket } from '../../../hooks/useOptimizedMonitoringWebSocket';
import { buildTimingMetadata } from '../../../utils/timingMetadata';
import { buildUserJourneyMetadata } from '../../../utils/userJourneyMetadata';
import { formatResponseData, optimizeFormData } from '../../../utils/responseFormatter';
import { CreateModuleResponseDto } from '../../../lib/types';
import NavigationFlowDebugger from '../../debug/NavigationFlowDebugger';
import { coordinateFidelityTester, injectFidelityTest } from '../../../utils/coordinate-fidelity-test';

interface BackendResponse {
  questionKey: string;
  response: {
    selectedHitzone?: string;
    selectedImageIndex?: number;
    imageSelections?: Record<string, unknown>;
    clickPosition?: {
      x: number;
      y: number;
      hitzoneWidth: number;
      hitzoneHeight: number;
    };
    visualClickPoints?: VisualClickPoint[];
    [key: string]: unknown;
  };
}

interface ClickPosition {
  x: number;
  y: number;
  hitzoneWidth: number;
  hitzoneHeight: number;
}

interface ClickTrackingData {
  x: number;
  y: number;
  timestamp: number;
  hitzoneId?: string;
  imageIndex: number;
  isCorrectHitzone: boolean;
}

interface VisualClickPoint {
  x: number;
  y: number;
  timestamp: number;
  isCorrect: boolean;
  imageIndex: number;
}

interface HitZone {
  id: string;
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

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

interface ImageFile {
  id: string;
  name: string;
  url: string;
  hitZones?: HitZone[];
}

interface NavigationQuestion {
  id: string | number;
  type: string;
  title: string;
  description: string;
  files: ImageFile[];
}

interface NavigationFlowTaskProps {
  stepConfig: NavigationQuestion;
  formData?: Record<string, unknown>;
  currentQuestionKey?: string;
}

const convertHitZonesToPercentageCoordinates = (
  hitZones: HitZone[] | undefined
): ConvertedHitZone[] => {
  if (!hitZones || !Array.isArray(hitZones) || hitZones.length === 0) {
    return [];
  }

  return hitZones.map(zone => {
    const { x, y, width, height } = zone.region;
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

export const NavigationFlowTask: React.FC<NavigationFlowTaskProps> = ({ stepConfig, currentQuestionKey }) => {
  const navigationQuestion = stepConfig;

  const title = navigationQuestion.title || 'Flujo de Navegación';
  const description = navigationQuestion.description || '¿En cuál de las siguientes pantallas encuentras el objetivo indicado?';
  const imageFiles: ImageFile[] = navigationQuestion.files || [];

  const [localSelectedImageIndex, setLocalSelectedImageIndex] = useState<number>(0);
  const [, setLocalSelectedHitzone] = useState<string | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [imgRenderSize, setImgRenderSize] = useState<{ width: number; height: number } | null>(null);
  const [imageSelections, setImageSelections] = useState<Record<string, { hitzoneId: string, click: ClickPosition }>>({});
  const [allClicksTracking, setAllClicksTracking] = useState<ClickTrackingData[]>([]);
  const [visualClickPoints, setVisualClickPoints] = useState<Record<number, VisualClickPoint[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const images: ImageFile[] = imageFiles;

  const { researchId, participantId } = useTestStore();
  const { goToNextStep } = useStepStore();
  const { getFormData } = useFormDataStore();

  const { data: eyeTrackingConfig } = useEyeTrackingConfigQuery(researchId || '');
  const shouldTrackTiming = eyeTrackingConfig?.parameterOptions?.saveResponseTimes || false;
  const shouldTrackUserJourney = eyeTrackingConfig?.parameterOptions?.saveUserJourney || false;

  const { data: moduleResponses } = useModuleResponsesQuery(
    researchId || '',
    participantId || ''
  );

  const { data: formsData } = useAvailableFormsQuery(researchId || '');

  const { sendParticipantResponseSaved } = useOptimizedMonitoringWebSocket();

  const { endTiming, getTimingData } = useResponseTiming({
    questionKey: currentQuestionKey || '',
    enabled: shouldTrackTiming
  });

  const { trackStepVisit, getJourneyData } = useUserJourneyTracking({
    enabled: shouldTrackUserJourney,
    researchId
  });

  const saveMutation = useSaveModuleResponseMutation({
    onSuccess: () => {
      const { updateBackendResponses } = useStepStore.getState();
      const currentBackendResponses = useStepStore.getState().backendResponses;
      
      const formData = getFormData(currentQuestionKey || '') || {};
      const newResponse = {
        questionKey: currentQuestionKey || '',
        response: formData
      };
      
      const updatedResponses = [
        ...currentBackendResponses.filter((r: unknown) => (r as { questionKey?: string }).questionKey !== currentQuestionKey),
        newResponse
      ];
      
      updateBackendResponses(updatedResponses);
      
      if (participantId && currentQuestionKey && formsData?.steps) {
        const steps = formsData.steps;
        const currentStepIndex = steps.findIndex((step: string) => step === currentQuestionKey);
        const progress = Math.round(((currentStepIndex + 1) / steps.length) * 100);

        sendParticipantResponseSaved(
          participantId,
          currentQuestionKey,
          formData,
          currentStepIndex + 1,
          steps.length,
          progress
        );
      }

      setIsSaving(false);
      
      setTimeout(() => {
        const store = useStepStore.getState();
        const currentStep = store.currentQuestionKey;
    
        if (currentStep === currentQuestionKey) {
          goToNextStep();
        }
      }, 300);
    },
    onError: () => {
      setIsSaving(false);
    }
  });

  useEffect(() => {
    if (currentQuestionKey) {

      const store = useStepStore.getState();
      const backendResponse = store.backendResponses.find(
        (r: unknown): r is BackendResponse => (r as BackendResponse).questionKey === currentQuestionKey
      );

      if (backendResponse?.response) {
        const responseData = backendResponse.response as {
          selectedImageIndex?: number;
          selectedHitzone?: string;
          imageSelections?: Record<string, unknown>;
          visualClickPoints?: unknown[];
        };

        if (responseData.selectedImageIndex !== undefined) {
          setLocalSelectedImageIndex(responseData.selectedImageIndex);
        }
        if (responseData.selectedHitzone) {
          setLocalSelectedHitzone(responseData.selectedHitzone);
        }
        if (responseData.imageSelections) {
          setImageSelections(responseData.imageSelections as Record<string, { hitzoneId: string, click: ClickPosition }>);
        }

        if (responseData.visualClickPoints && Array.isArray(responseData.visualClickPoints)) {
          const pointsByImage: Record<number, VisualClickPoint[]> = {};
          responseData.visualClickPoints.forEach((point: unknown) => {
            const typedPoint = point as VisualClickPoint;
            const imageIndex = typedPoint.imageIndex || 0;
            if (!pointsByImage[imageIndex]) {
              pointsByImage[imageIndex] = [];
            }
            pointsByImage[imageIndex].push(typedPoint);
          });
          setVisualClickPoints(pointsByImage);
        }
      }
    }
  }, [currentQuestionKey]);

  // 🎯 Resetear tamaños de imagen cuando cambia la imagen seleccionada
  useEffect(() => {
    setImageNaturalSize(null);
    setImgRenderSize(null);
  }, [localSelectedImageIndex]);

  useEffect(() => {
    if (currentQuestionKey && allClicksTracking.length > 0) {

      const { setFormData } = useFormDataStore.getState();
      setFormData(currentQuestionKey, {
        ...useFormDataStore.getState().formData[currentQuestionKey],
        allClicksTracking: allClicksTracking
      });
    }
  }, [allClicksTracking, currentQuestionKey]);


  useEffect(() => {
    injectFidelityTest();
  }, []);

  const persistVisualClickPoints = () => {
    if (currentQuestionKey) {
      const { setFormData } = useFormDataStore.getState();
      const allPoints: VisualClickPoint[] = [];
      Object.entries(visualClickPoints).forEach(([imageIndex, points]) => {
        points.forEach(point => {
          allPoints.push({
            ...point,
            imageIndex: parseInt(imageIndex)
          });
        });
      });

      setFormData(currentQuestionKey, {
        ...useFormDataStore.getState().formData[currentQuestionKey],
        visualClickPoints: allPoints
      });
    }
  };

  /**
   * Guarda automáticamente en el backend cuando se hace click en un hitzone de la última imagen
   */
  const saveToBackend = useCallback(async () => {
    if (!currentQuestionKey || isSaving) return;

    setIsSaving(true);
    endTiming();
    trackStepVisit(currentQuestionKey, 'complete');

    try {
      const formData = getFormData(currentQuestionKey) || {};
      const timestamp = new Date().toISOString();
      const now = new Date().toISOString();
      const timingData = getTimingData();
      const enhancedMetadata = buildTimingMetadata(currentQuestionKey, timingData, {});
      const journeyData = getJourneyData();
      const finalMetadata = buildUserJourneyMetadata(journeyData, enhancedMetadata);

      const safeMetadata = Object.keys(finalMetadata).length > 0 ? finalMetadata : {
        deviceInfo: {
          deviceType: 'desktop' as const,
          userAgent: navigator.userAgent,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          platform: navigator.platform,
          language: navigator.language
        },
        timingInfo: {
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 0
        }
      };

      const formattedResponse = formatResponseData(formData, currentQuestionKey, undefined);
      const optimizedResponse = optimizeFormData(formattedResponse as Record<string, unknown>);

      const createData: CreateModuleResponseDto = {
        researchId: researchId || '',
        participantId: participantId || '',
        questionKey: currentQuestionKey,
        responses: [{
          questionKey: currentQuestionKey,
          response: optimizedResponse,
          timestamp,
          createdAt: now
        }],
        metadata: safeMetadata
      };

      await saveMutation.mutateAsync(createData);
    } catch (error) {
      console.error('[NavigationFlowTask] Error guardando en backend:', error);
      setIsSaving(false);
    }
  }, [currentQuestionKey, isSaving, endTiming, trackStepVisit, getFormData, getTimingData, getJourneyData, researchId, participantId, saveMutation]);

  const handleHitzoneClick = (hitzoneId: string, clickPos?: ClickPosition): void => {
    if (clickPos && typeof clickPos.hitzoneWidth === 'number' && typeof clickPos.hitzoneHeight === 'number') {
      setImageSelections(prev => ({
        ...prev,
        [localSelectedImageIndex.toString()]: { hitzoneId, click: clickPos }
      }));

      if (currentQuestionKey) {
        const { setFormData } = useFormDataStore.getState();
        setFormData(currentQuestionKey, {
          selectedImageIndex: localSelectedImageIndex,
          selectedHitzone: hitzoneId,
          clickPosition: clickPos,
          imageSelections: {
            ...imageSelections,
            [localSelectedImageIndex.toString()]: { hitzoneId, click: clickPos }
          },
          allClicksTracking: allClicksTracking
        });
      }

      const isLastImage = localSelectedImageIndex === images.length - 1;

      if (isLastImage) {
        // Si es la última imagen, guardar automáticamente y avanzar al siguiente step
        saveToBackend();
      } else {
        // Si no es la última imagen, avanzar a la siguiente imagen
        setTimeout(() => {
          setLocalSelectedImageIndex(localSelectedImageIndex + 1);
          setLocalSelectedHitzone(null);
        }, 500);
      }
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>): void => {
    if (!imageRef.current || !imageNaturalSize) return;

    const imgRect = imageRef.current.getBoundingClientRect();
    const clickX = e.clientX - imgRect.left;
    const clickY = e.clientY - imgRect.top;
    const timestamp = Date.now();

    const testId = `nav-flow-${currentQuestionKey}-img-${localSelectedImageIndex}-${timestamp}`;
    coordinateFidelityTester.startTest(testId);
    coordinateFidelityTester.recordOriginalClick(
      testId,
      e.nativeEvent,
      imageRef.current,
      imageNaturalSize,
      imgRenderSize!
    );

    let hitzoneId: string | undefined;
    let isCorrectHitzone = false;

    if (availableHitzones.length > 0) {
      for (const hitzone of availableHitzones) {
        const { drawWidth, drawHeight, offsetX, offsetY } = getImageDrawRect(imageNaturalSize, imgRenderSize!);
        const left = offsetX + (hitzone.originalCoords?.x ?? 0) * (drawWidth / imageNaturalSize.width);
        const top = offsetY + (hitzone.originalCoords?.y ?? 0) * (drawHeight / imageNaturalSize.height);
        const width = (hitzone.originalCoords?.width ?? 0) * (drawWidth / imageNaturalSize.width);
        const height = (hitzone.originalCoords?.height ?? 0) * (drawHeight / imageNaturalSize.height);

        if (clickX >= left && clickX <= left + width && clickY >= top && clickY <= top + height) {
          hitzoneId = hitzone.id;
          isCorrectHitzone = true;
          break;
        }
      }
    }

    const clickData: ClickTrackingData = {
      x: clickX,
      y: clickY,
      timestamp,
      hitzoneId,
      imageIndex: localSelectedImageIndex,
      isCorrectHitzone
    };

    setAllClicksTracking(prev => [...prev, clickData]);
    const visualPoint: VisualClickPoint = {
      x: clickX,
      y: clickY,
      timestamp,
      isCorrect: isCorrectHitzone,
      imageIndex: localSelectedImageIndex
    };

    coordinateFidelityTester.recordProcessedClick(testId, visualPoint);

    setVisualClickPoints(prev => {
      const newPoints = {
        ...prev,
        [localSelectedImageIndex]: [...(prev[localSelectedImageIndex] || []), visualPoint]
      };

      setTimeout(() => persistVisualClickPoints(), 0);

      return newPoints;
    });

    if (isCorrectHitzone && hitzoneId) {
      const { drawWidth, drawHeight, offsetX, offsetY } = getImageDrawRect(imageNaturalSize, imgRenderSize!);
      const relX = clickX - (offsetX + (availableHitzones.find(h => h.id === hitzoneId)?.originalCoords?.x ?? 0) * (drawWidth / imageNaturalSize.width));
      const relY = clickY - (offsetY + (availableHitzones.find(h => h.id === hitzoneId)?.originalCoords?.y ?? 0) * (drawHeight / imageNaturalSize.height));
      const width = (availableHitzones.find(h => h.id === hitzoneId)?.originalCoords?.width ?? 0) * (drawWidth / imageNaturalSize.width);
      const height = (availableHitzones.find(h => h.id === hitzoneId)?.originalCoords?.height ?? 0) * (drawHeight / imageNaturalSize.height);

      handleHitzoneClick(hitzoneId, { x: relX, y: relY, hitzoneWidth: width, hitzoneHeight: height });
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    const { naturalWidth, naturalHeight, width, height } = e.currentTarget;
    setImageNaturalSize({ width: naturalWidth, height: naturalHeight });
    setImgRenderSize({ width, height });
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    console.error('❌ [NavigationFlowTask] Error cargando imagen:', {
      url: selectedImage?.url || 'undefined',
      error: e.nativeEvent
    });
  };


  // 🎯 VERIFICACIÓN DE SEGURIDAD PARA EVITAR ERRORES
  const isValidImageIndex = localSelectedImageIndex >= 0 && localSelectedImageIndex < images.length;
  const selectedImage: ImageFile | undefined = isValidImageIndex ? images[localSelectedImageIndex] : undefined;
  const availableHitzones: ConvertedHitZone[] = selectedImage?.hitZones
    ? convertHitZonesToPercentageCoordinates(selectedImage.hitZones)
    : [];

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

  const currentImageClickPoints = visualClickPoints[localSelectedImageIndex] || [];

  return (
    <div className="flex flex-col bg-white p-6" data-testid="navigation-flow-task">
      <div className="w-full flex flex-col items-center">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            {title}
          </h1>
          <p className="text-gray-600 mb-2">
            {description}
          </p>
        </div>

        {images.length > 1 && (
          <div className="flex justify-center items-center mb-4">
            <span className="text-sm text-gray-600">
              Imagen {localSelectedImageIndex + 1} de {images.length}
            </span>
          </div>
        )}

        <div
          className="relative w-[42vw] max-w-[33rem] max-h-[80vh] bg-white rounded-lg shadow-lg overflow-hidden flex items-center justify-center"
        >
          {!selectedImage && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <p className="text-gray-600">No hay imagen disponible</p>
            </div>
          )}
          {selectedImage && !imageNaturalSize && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <p className="text-gray-600 mb-2">Cargando imagen...</p>
                <p className="text-sm text-gray-400">{selectedImage.name || 'Imagen'}</p>
              </div>
            </div>
          )}
          {selectedImage && selectedImage.url && (
            <img
              ref={imageRef}
              src={selectedImage.url}
              alt={selectedImage.name || `Imagen detallada ${localSelectedImageIndex + 1}`}
              className="max-w-full max-h-full w-auto h-auto object-contain bg-white"
              loading="eager"
              style={{ display: 'block' }}
              onLoad={handleImageLoad}
              onError={handleImageError}
              onClick={handleImageClick}
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
                        className="absolute transition-all duration-300"
                        style={{
                          left,
                          top,
                          width,
                          height,
                          pointerEvents: 'auto',
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          const imgRect = imageRef.current?.getBoundingClientRect();
                          const clickX = e.clientX - (imgRect?.left ?? 0);
                          const clickY = e.clientY - (imgRect?.top ?? 0);

                          const timestamp = Date.now();
                          const visualPoint: VisualClickPoint = {
                            x: clickX,
                            y: clickY,
                            timestamp,
                            isCorrect: true,
                            imageIndex: localSelectedImageIndex
                          };

                          setVisualClickPoints(prev => {
                            const newPoints = {
                              ...prev,
                              [localSelectedImageIndex]: [...(prev[localSelectedImageIndex] || []), visualPoint]
                            };

                            setTimeout(() => persistVisualClickPoints(), 0);

                            return newPoints;
                          });

                          const clickData: ClickTrackingData = {
                            x: clickX,
                            y: clickY,
                            timestamp,
                            hitzoneId: hitzone.id,
                            imageIndex: localSelectedImageIndex,
                            isCorrectHitzone: true
                          };

                          setAllClicksTracking(prev => [...prev, clickData]);

                          // 2. Posición del hitzone dentro de la imagen renderizada
                          const left = offsetX + (hitzone.originalCoords?.x ?? 0) * (drawWidth / imageNaturalSize.width);
                          const top = offsetY + (hitzone.originalCoords?.y ?? 0) * (drawHeight / imageNaturalSize.height);
                          const width = (hitzone.originalCoords?.width ?? 0) * (drawWidth / imageNaturalSize.width);
                          const height = (hitzone.originalCoords?.height ?? 0) * (drawHeight / imageNaturalSize.height);
                          // 3. Posición relativa al hitzone (en píxeles dentro delclear
                          //  hitzone renderizado)
                          const relX = clickX - left;
                          const relY = clickY - top;
                          handleHitzoneClick(hitzone.id, { x: relX, y: relY, hitzoneWidth: width, hitzoneHeight: height });
                        }}
                        title={`Zona interactiva: ${hitzone.id}`}
                      >
                        {/* 🎯 PUNTOS ROJOS ELIMINADOS - SIN FEEDBACK VISUAL */}
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

                  {/* 🎯 PUNTOS VISUALES ROJOS - PERSISTENTES */}
                  {currentImageClickPoints.map((point, index) => (
                    <div
                      key={`${point.timestamp}-${index}`}
                      className={`absolute w-3 h-3 rounded-full border-2 border-white shadow-lg pointer-events-none ${point.isCorrect ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      style={{
                        left: point.x - 6,
                        top: point.y - 6,
                        zIndex: 10
                      }}
                      title={`Clic ${point.isCorrect ? 'correcto' : 'incorrecto'} - ${new Date(point.timestamp).toLocaleTimeString()}`}
                    />
                  ))}
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
};

export default NavigationFlowTask;
