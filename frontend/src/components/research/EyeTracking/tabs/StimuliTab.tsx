import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { EyeTrackingFormData, EyeTrackingStimulus } from 'shared/interfaces/eye-tracking.interface';

import FileUploader from '@/components/FileUploader/FileUploader';
import { useErrorLog } from '@/components/utils/ErrorLogger';

interface StimuliTabProps {
  formData: EyeTrackingFormData;
  researchId: string;
  removeStimulus: (id: string) => void;
  handleFileUploaderComplete: (fileData: { fileUrl: string; key: string }) => void;
}

export const StimuliTab: React.FC<StimuliTabProps> = ({ 
  formData, 
  researchId, 
  removeStimulus,
  handleFileUploaderComplete
}) => {
  // Mover useErrorLog al inicio del componente
  const logger = useErrorLog();
  
  const [uploadResult, setUploadResult] = useState<{ fileUrl: string; key: string } | null>(null);
  
  // Usar una ref para comparar cambios sin crear bucles de actualización
  const prevStimuliCountRef = useRef<number>(0);
  
  // Añadir esta referencia al inicio del componente, después de las otras constantes
  const recoveredItemsRef = useRef<boolean>(false);
  
  // Referencia para el formData para evitar dependencia en el useEffect
  const formDataRef = useRef(formData);
  
  // Referencia para el researchId para evitar dependencia en el useEffect
  const researchIdRef = useRef(researchId);
  
  // Referencia para trackear la última limpieza de localStorage
  const lastCleanupRef = useRef(false);
  
  // Actualizar las referencias cuando cambian las props
  useEffect(() => {
    formDataRef.current = formData;
    researchIdRef.current = researchId;
  }, [formData, researchId]);
  
  // Memoizar el conteo actual de estímulos para evitar cálculos repetitivos
  const stimuliCount = useMemo(() => {
    return formData.stimuli?.items?.length || 0;
  }, [formData.stimuli?.items?.length]);
  
  // Estabilizar la función de eliminación con useCallback
  const handleRemoveStimulus = useCallback((id: string) => {
    // Usar setTimeout para asegurar que no se ejecuta durante el renderizado
    setTimeout(() => {
      removeStimulus(id);
    }, 0);
  }, [removeStimulus]);
  
  // Estabilizar las funciones usando useCallback
  const handleUploadComplete = useCallback((fileData: { fileUrl: string; key: string }) => {
    const safeLog = () => {
      logger.debug('StimuliTab - handleUploadComplete recibido:', fileData);
    };
    
    // Usar setTimeout para evitar llamadas a logger durante el renderizado
    setTimeout(safeLog, 0);
    
    // Guardar el resultado de la última subida
    setUploadResult({
      fileUrl: fileData.fileUrl,
      key: fileData.key
    });
    
    // Persistir en localStorage para recuperar si se navega a otra vista - MEJORADO
    try {
      // Usar clave más específica
      const storageKey = `eye_tracking_fileuploader_${researchIdRef.current}`;
      
      // Extraer información del nombre del archivo desde la clave
      const fileName = fileData.key.split('/').pop() || 'archivo.jpg';
      const fileType = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Crear un nuevo ítem con la información necesaria para recrear el estímulo
      const newItem = {
        fileUrl: fileData.fileUrl,
        key: fileData.key,
        fileName,
        fileType,
        timestamp: new Date().toISOString()
      };
      
      // Guardar directamente, sin combinar con datos existentes para evitar duplicados
      localStorage.setItem(storageKey, JSON.stringify([newItem]));
      
      setTimeout(() => {
        logger.debug('StimuliTab - Guardado en localStorage:', {
          storageKey,
          item: newItem
        });
      }, 0);
    } catch (error) {
      setTimeout(() => {
        logger.error('StimuliTab - Error al guardar en localStorage:', error);
      }, 0);
    }
    
    // Pasar el resultado al manejador principal - usar setTimeout para mayor seguridad
    setTimeout(() => {
      logger.debug('StimuliTab - Llamando a handleFileUploaderComplete con:', fileData);
      handleFileUploaderComplete(fileData);
    }, 0);
  }, [logger, handleFileUploaderComplete]);

  // Manejar error en la subida con useCallback
  const handleUploadError = useCallback((error: any) => {
    setTimeout(() => {
      logger.error('StimuliTab - Error al cargar archivo:', error);
      alert(`Error al subir el archivo: ${error.message || 'Error desconocido'}`);
    }, 0);
  }, [logger]);
  
  // Combinar todos los efectos relacionados con formData y monitoreo en un solo efecto
  // con un mínimo de dependencias para evitar bucles
  useEffect(() => {
    // Para evitar ejecutar lógica en cada renderizado, usamos un setTimeout
    const timerId = setTimeout(() => {
      const currentFormData = formDataRef.current;
      const currentCount = currentFormData.stimuli?.items?.length || 0;
      
      // PARTE 1: Monitorear cambios en la cantidad de estímulos
      if (currentCount !== prevStimuliCountRef.current) {
        logger.debug('StimuliTab - Cambio en número de estímulos:', {
          prevCount: prevStimuliCountRef.current,
          newCount: currentCount
        });
        prevStimuliCountRef.current = currentCount;
        
        // PARTE 2: Verificar si hay subidas completas y limpiar localStorage si es necesario
        if (currentCount > 0 && !lastCleanupRef.current) {
          const hasCompletedUploads = currentFormData.stimuli.items.some(item => item.s3Key);
          
          if (hasCompletedUploads) {
            try {
              const storageKey = `eye_tracking_fileuploader_${researchIdRef.current}`;
              localStorage.removeItem(storageKey);
              lastCleanupRef.current = true;
              
              logger.debug('StimuliTab - Archivos guardados correctamente, limpiando localStorage', {
                itemCount: currentCount
              });
            } catch (error) {
              logger.error('StimuliTab - Error al limpiar localStorage:', error);
            }
          }
        }
      }
      
      // PARTE 3: Recuperar archivos de localStorage (solo una vez)
      if (!recoveredItemsRef.current) {
        recoveredItemsRef.current = true;
        
        try {
          const currentResearchId = researchIdRef.current;
          if (!currentResearchId) {return;}
          
          // Debemos comprobar la clave de localStorage para archivos ya subidos
          const stimuliTabStorageKey = `eye_tracking_fileuploader_${currentResearchId}`;
          
          // Primero intentamos con la clave del StimuliTab (archivos ya subidos a S3)
          const savedItemsJson = localStorage.getItem(stimuliTabStorageKey);
          
          logger.debug('StimuliTab - Verificando localStorage (una sola vez): ', {
            stimuliTabStorageKey,
            hasStimuli: !!savedItemsJson
          });
          
          if (savedItemsJson) {
            const savedItems = JSON.parse(savedItemsJson);
            logger.debug('StimuliTab - Archivos pendientes encontrados:', {
              count: savedItems.length
            });
            
            if (savedItems.length > 0) {
              // Para cada ítem guardado, verificar si ya existe en los estímulos actuales
              const itemsToRecover: Array<{fileUrl: string; key: string; fileName?: string; fileType?: string}> = [];
              
              for (const item of savedItems) {
                // Verificar si este ítem ya está en los estímulos actuales
                // Usar formDataRef.current en lugar de formData directamente
                const alreadyExists = currentFormData.stimuli.items.some(
                  stimulus => stimulus.s3Key === item.key
                );
                
                if (!alreadyExists) {
                  // Acumulamos los items a recuperar en vez de llamar al callback inmediatamente
                  itemsToRecover.push(item);
                }
              }
              
              // Si tenemos items para recuperar, los procesamos uno por uno con un retraso
              if (itemsToRecover.length > 0) {
                logger.debug('StimuliTab - Recuperando items pendientes:', {
                  count: itemsToRecover.length
                });
                
                // Procesar con retraso para evitar bucles infinitos
                setTimeout(() => {
                  itemsToRecover.forEach((item, index) => {
                    // Procesar cada item con un pequeño retraso incremental
                    setTimeout(() => {
                      handleFileUploaderComplete({
                        fileUrl: item.fileUrl,
                        key: item.key
                      });
                    }, index * 100); // 100ms de retraso entre items
                  });
                }, 500); // 500ms de retraso inicial
              }
            }
            
            // Limpiar datos de localStorage para evitar reprocesamiento
            localStorage.removeItem(stimuliTabStorageKey);
            logger.debug('StimuliTab - Limpiada clave de localStorage', {
              key: stimuliTabStorageKey
            });
          }
        } catch (error) {
          logger.error('StimuliTab - Error al recuperar archivos pendientes:', error);
        }
      }
    }, 0); // Usar un timeout de 0ms para asegurar que se ejecuta después del renderizado
    
    return () => clearTimeout(timerId);
  }, [logger, handleFileUploaderComplete, stimuliCount]); // Dependencias mínimas y estables

  // Renderizar componente de manera segura sin callbacks directos
  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-neutral-900">Estímulos</h3>
              <p className="text-xs text-neutral-500">
                Sube las imágenes que serán utilizadas como estímulos en el experimento de eye tracking.
              </p>
              
              {/* Debug info */}
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <p className="font-medium text-yellow-800">Información de depuración:</p>
                <p className="text-yellow-700">Número actual de estímulos: {stimuliCount}</p>
              </div>
              
              <div className="mt-4 space-y-4">
                <FileUploader 
                  researchId={researchId}
                  folder="eye-tracking-stimuli"
                  accept="image/*"
                  multiple={true}
                  maxSize={10 * 1024 * 1024} // 10MB
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                />

                {/* Uploaded files section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Estímulos seleccionados:</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {formData.stimuli.items.map((stimulus: EyeTrackingStimulus & { isLoading?: boolean; progress?: number }) => (
                      <div key={stimulus.id} className="border rounded-lg p-3 bg-neutral-50">
                        <div className="aspect-video bg-neutral-200 rounded-md mb-2 overflow-hidden relative">
                          {stimulus.fileUrl && (
                            <>
                              <img 
                                src={stimulus.fileUrl} 
                                alt={stimulus.fileName}
                                className="h-full w-full object-cover"
                              />
                              {stimulus.isLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-30">
                                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                                  {stimulus.progress !== undefined && (
                                    <div className="text-white text-xs mt-2 font-medium">{Math.round(stimulus.progress)}%</div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                          {!stimulus.fileUrl && (
                            <div className="h-full w-full flex items-center justify-center text-neutral-400">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs font-medium truncate" title={stimulus.fileName}>
                              {stimulus.fileName}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {Math.round((stimulus.fileSize || 0) / 1024)} KB
                            </div>
                            {stimulus.s3Key && !stimulus.isLoading && (
                              <div className="text-xs text-green-600">
                                ✓ Subido a S3
                              </div>
                            )}
                            {stimulus.isLoading && (
                              <div className="text-xs text-blue-600">
                                Cargando...
                              </div>
                            )}
                            {stimulus.error && (
                              <div className="text-xs text-red-600" title={stimulus.errorMessage || ''}>
                                ⚠️ Error al cargar
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveStimulus(stimulus.id)}
                            className="text-red-500 hover:text-red-700 focus:outline-none"
                            title="Eliminar estímulo"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Barra de progreso */}
                        {stimulus.isLoading && stimulus.progress !== undefined && (
                          <div className="mt-2">
                            <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 transition-all duration-200"
                                style={{ width: `${stimulus.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {stimuliCount === 0 && (
                      <div className="col-span-3 p-4 bg-neutral-50 rounded-lg text-center text-neutral-500">
                        No hay estímulos subidos aún. Usa el cargador para subir imágenes.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mostrar detalles del último archivo subido */}
      {uploadResult && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800">Último archivo subido:</h4>
          <div className="mt-2 text-xs text-blue-700 break-all">
            <p><strong>URL:</strong> {uploadResult.fileUrl}</p>
            <p><strong>Clave S3:</strong> {uploadResult.key}</p>
          </div>
        </div>
      )}
    </>
  );
}; 