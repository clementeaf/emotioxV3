import { DEFAULT_EYE_TRACKING_CONFIG, EyeTrackingConfig, EyeTrackingFormData, EyeTrackingStimulus } from '@shared/interfaces/eye-tracking.interface';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { QuestionType } from '../../../../../../shared/interfaces/question-types.enum';

import { useErrorLog } from '@/components/utils/ErrorLogger';
import { useFileUpload } from '@/hooks';
import { useEyeTrackingBuild } from '@/api/domains/eye-tracking';
import type { EyeTrackingBuildRequest, EyeTrackingBuildUpdateRequest } from '@/api/domains/eye-tracking';

// Interfaz extendida que incluye propiedades de UI para la experiencia de carga
interface EyeTrackingStimulusWithUI extends EyeTrackingStimulus {
  isLoading?: boolean;
  progress?: number;
}

// Función para generar un ID único
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export interface UseEyeTrackingFormProps {
  researchId: string;
  onSave?: (data: EyeTrackingFormData) => void;
  autoSync?: boolean;
}

export interface UseEyeTrackingFormReturn {
  formData: EyeTrackingFormData;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSaving: boolean;
  isUploading: boolean;
  eyeTrackingId: string | null;
  updateFormData: (path: string, value: any) => void;
  handleConfigChange: (key: keyof EyeTrackingConfig, value: boolean | number) => void;
  handleFileUpload: (files: FileList) => void;
  addAreaOfInterest: () => void;
  removeStimulus: (id: string) => void;
  removeAreaOfInterest: (id: string) => void;
  handleSave: () => Promise<EyeTrackingFormData | null>;
  handleFileUploaderComplete: (fileData: { fileUrl: string; key: string }) => void;
  validateStimuliData: () => boolean;
  isEmpty: boolean;
}

export function useEyeTrackingForm({
  researchId,
  onSave,
  autoSync = true
}: UseEyeTrackingFormProps): UseEyeTrackingFormReturn {
  // Sistema de logs
  const logger = useErrorLog();

  // Estados principales
  const [activeTab, setActiveTab] = useState('setup');
  const [formData, setFormData] = useState<EyeTrackingFormData>({
    ...DEFAULT_EYE_TRACKING_CONFIG,
    researchId
  });
  const [isUploading, setIsUploading] = useState(false);
  const [eyeTrackingId, setEyeTrackingId] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);

  // Referencias para evitar bucles de actualización
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // Hook para subir archivos (solo el hook, no usamos el estado directamente)
  const { uploadFile } = useFileUpload();

  // Función para actualizar una propiedad anidada en formData
  const updateFormData = useCallback((path: string, value: any) => {
    setFormData(prevData => {
      const newData = { ...prevData };
      const pathArray = path.split('.');
      let current: any = newData;

      // Navegar a la propiedad anidada
      for (let i = 0; i < pathArray.length - 1; i++) {
        if (!current[pathArray[i]]) {
          current[pathArray[i]] = {};
        }
        current = current[pathArray[i]];
      }

      // Actualizar el valor
      current[pathArray[pathArray.length - 1]] = value;
      return newData;
    });
  }, []);

  // Función para actualizar configuraciones específicas
  const handleConfigChange = useCallback((key: keyof EyeTrackingConfig, value: boolean | number) => {
    updateFormData(`config.${key}`, value);
  }, [updateFormData]);

  // La función handleFileUpload con modificaciones
  const handleFileUpload = useCallback((files: FileList) => {
    if (!researchId) {
      toast.error('Se requiere ID de investigación para cargar archivos');
      return;
    }

    setIsUploading(true);

    // Convertir FileList a Array para procesamiento
    const fileArray = Array.from(files);
    const totalFiles = fileArray.length;
    let processedFiles = 0;
    let errorCount = 0;

    // Procesamiento temporal para mostrar vistas previas inmediatas
    const tempStimuli: EyeTrackingStimulusWithUI[] = fileArray.map((file, index) => {
      const id = generateId();

      // Crear un estímulo básico primero (cumpliendo con la interfaz original)
      const baseStimulus: EyeTrackingStimulus = {
        id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl: URL.createObjectURL(file), // URL temporal para vista previa
        order: formDataRef.current.stimuli.items.length + index + 1
      };

      // Luego extenderlo con propiedades de UI
      const tempStimulus: EyeTrackingStimulusWithUI = {
        ...baseStimulus,
        isLoading: true,
        progress: 0
      };

      return tempStimulus;
    });

    // Actualizar estado con URLs temporales para mostrar vista previa inmediata
    setFormData((prevData) => {
      // Realizamos un casting para que TypeScript no se queje
      // En runtime, esto es seguro porque solo agregamos propiedades extra
      const updatedItems = [...prevData.stimuli.items, ...tempStimuli] as EyeTrackingStimulus[];

      const updatedData = {
        ...prevData,
        stimuli: {
          ...prevData.stimuli,
          items: updatedItems
        }
      };

      // Guardar en localStorage para persistencia temporal
      saveToLocalStorage(updatedData);

      return updatedData;
    });

    // Procesar carga real a S3 en segundo plano
    const uploadPromises = fileArray.map(async (file, index) => {
      const stimulus = tempStimuli[index];

      try {
        // Simulamos progreso con actualizaciones manuales
        const updateProgress = (progress: number) => {
          // Actualizar el progreso del estímulo
          setFormData((prevData) => {
            const items = prevData.stimuli.items;
            const itemIndex = items.findIndex(item => item.id === stimulus.id);

            if (itemIndex !== -1) {
              // Hacemos copia de los elementos
              const updatedItems = [...items];

              // Obtenemos el ítem y lo convertimos al tipo extendido
              const currentItem = { ...updatedItems[itemIndex] } as EyeTrackingStimulusWithUI;

              // Actualizamos propiedades de UI en nuestra copia local
              currentItem.progress = progress;
              currentItem.isLoading = progress < 100;

              // Asignamos la copia actualizada de vuelta al array
              updatedItems[itemIndex] = currentItem as EyeTrackingStimulus;

              const updatedData = {
                ...prevData,
                stimuli: {
                  ...prevData.stimuli,
                  items: updatedItems
                }
              };

              // No guardamos en localStorage en cada actualización de progreso para evitar sobrecarga
              if (progress === 100) {
                saveToLocalStorage(updatedData);
              }

              return updatedData;
            }

            return prevData;
          });
        };

        // Simular progreso inmediato al 10%
        updateProgress(10);

        // Usar la función uploadFile del hook
        const result = await uploadFile(file, researchId, 'eye-tracking-stimuli');

        // Actualizar el estímulo con la URL real de S3
        setFormData((prevData) => {
          const updatedItems = [...prevData.stimuli.items];
          const itemIndex = updatedItems.findIndex(item => item.id === stimulus.id);

          if (itemIndex !== -1) {
            // Creamos un objeto con las propiedades requeridas por la interfaz
            const updatedStimulus: EyeTrackingStimulus = {
              ...updatedItems[itemIndex],
              fileUrl: result.fileUrl,
              s3Key: result.key
            };

            // Lo asignamos al array
            updatedItems[itemIndex] = updatedStimulus;

            // Simulamos progreso completado
            updateProgress(100);
          }

          const updatedData = {
            ...prevData,
            stimuli: {
              ...prevData.stimuli,
              items: updatedItems
            }
          };

          // Guardar en localStorage para persistencia temporal
          saveToLocalStorage(updatedData);

          return updatedData;
        });

        processedFiles++;

        // Mostrar progreso de carga
        if (processedFiles + errorCount === totalFiles) {
          setIsUploading(false);
          if (errorCount === 0) {
            toast.success(`${totalFiles} estímulos cargados correctamente`);
          } else {
            toast.error(`${processedFiles} estímulos cargados con ${errorCount} errores`);
          }
        }

        return true;
      } catch (error) {
        logger.error('[EyeTrackingForm] Error al cargar archivo:', error);
        errorCount++;

        // Actualizar el estado para indicar error en este estímulo
        setFormData((prevData) => {
          const updatedItems = [...prevData.stimuli.items];
          const itemIndex = updatedItems.findIndex(item => item.id === stimulus.id);

          if (itemIndex !== -1) {
            // Creamos un objeto actualizado con las propiedades de error
            const updatedStimulus: EyeTrackingStimulus = {
              ...updatedItems[itemIndex],
              error: true,
              errorMessage: error instanceof Error ? error.message : 'Error desconocido'
            };

            // Lo asignamos al array
            updatedItems[itemIndex] = updatedStimulus;
          }

          const updatedData = {
            ...prevData,
            stimuli: {
              ...prevData.stimuli,
              items: updatedItems
            }
          };

          // Guardar en localStorage para persistencia temporal
          saveToLocalStorage(updatedData);

          return updatedData;
        });

        if (processedFiles + errorCount === totalFiles) {
          setIsUploading(false);
          toast.error(`Error al cargar algunos estímulos: ${errorCount} errores`);
        }

        return false;
      }
    });

    // En caso de error general con todas las cargas
    Promise.all(uploadPromises).catch(() => {
      setIsUploading(false);
      toast.error('Error al cargar los estímulos');
    });
  }, [researchId, uploadFile, logger]);

  // Función para guardar datos en localStorage
  const saveToLocalStorage = useCallback((data: EyeTrackingFormData) => {
    try {
      if (!researchId) { return; }

      // Generamos un objeto simplificado para localStorage
      const stimuli = data.stimuli.items.map(item => ({
        id: item.id,
        fileName: item.fileName,
        fileType: item.fileType,
        fileSize: item.fileSize,
        fileUrl: item.fileUrl,
        s3Key: item.s3Key,
        order: item.order,
        error: item.error,
        errorMessage: item.errorMessage
      }));

      // Guardar solo los estímulos en localStorage
      const storageKey = `eye_tracking_temp_stimuli_${researchId}`;
      localStorage.setItem(storageKey, JSON.stringify(stimuli));

      logger.debug('[EyeTrackingForm] Guardados estímulos temporalmente en localStorage', {
        count: stimuli.length
      });
    } catch (error) {
      logger.error('[EyeTrackingForm] Error al guardar en localStorage:', error);
    }
  }, [researchId, logger]);

  // Hook centralizado para obtener datos y operaciones CRUD
  const {
    data: eyeTrackingData,
    isLoading: isLoadingEyeTracking,
    createEyeTrackingBuild,
    updateEyeTrackingBuild,
    deleteEyeTrackingBuild,
    isCreating,
    isUpdating,
    isDeleting
  } = useEyeTrackingBuild(researchId);
  
  // Usar estados del hook centralizado para isSaving
  const isSavingFromHook = isCreating || isUpdating;

  // Cargar datos cuando cambie la respuesta del hook centralizado
  useEffect(() => {
    if (isLoadingEyeTracking) return;

    setIsEmpty(false);

    if (!eyeTrackingData) {
      setIsEmpty(true);
      return;
    }

    // Si hay datos, usar la estructura por defecto y actualizar lo que sea posible
    const baseFormData = {
      ...DEFAULT_EYE_TRACKING_CONFIG,
      researchId: researchId || ''
    };
    
    // Actualizar con datos del build config
    if (eyeTrackingData.researchId) {
      baseFormData.researchId = eyeTrackingData.researchId;
    }
    
    setFormData(baseFormData);
    setEyeTrackingId(eyeTrackingData.id || null);
  }, [eyeTrackingData, isLoadingEyeTracking]);

  // Limpiar localStorage después de guardar exitosamente
  useEffect(() => {
    // Limpiar cuando se completa el guardado
    if (!isSavingFromHook && eyeTrackingId && researchId) {
      const storageKey = `eye_tracking_temp_stimuli_${researchId}`;
      localStorage.removeItem(storageKey);
      logger.debug('[EyeTrackingForm] Limpiando estímulos temporales de localStorage después de guardar');
    }
  }, [isSavingFromHook, eyeTrackingId, researchId, logger]);

  // Manejador para el componente FileUploader
  const handleFileUploaderComplete = useCallback((fileData: { fileUrl: string; key: string }) => {
    logger.debug('handleFileUploaderComplete llamado con datos:', fileData);

    if (!fileData || !fileData.fileUrl || !fileData.key) {
      logger.error('Datos de archivo incompletos recibidos en handleFileUploaderComplete');
      return null;
    }

    // Extraer información del nombre del archivo
    const fileName = fileData.key.split('/').pop() || 'archivo.jpg';
    const fileType = fileName.split('.').pop()?.toLowerCase() || 'jpg';

    // Verificar si este archivo ya existe para evitar duplicados
    // Utilizamos una referencia al estado actual para evitar dependencias cíclicas
    const fileExists = formDataRef.current.stimuli.items.some(
      item => item.s3Key === fileData.key
    );

    if (fileExists) {
      logger.debug('handleFileUploaderComplete: Archivo ya existe, ignorando:', {
        key: fileData.key,
        fileName
      });
      return null; // No hacemos nada si ya existe
    }

    // Crear un nuevo estímulo
    const newStimulus: EyeTrackingStimulus = {
      id: generateId(),
      fileName: fileName,
      fileUrl: fileData.fileUrl,
      fileType: fileType,
      s3Key: fileData.key,
      fileSize: 0,
      order: formDataRef.current.stimuli.items.length + 1
    };

    // Mostrar información de depuración para diagnóstico
    logger.debug('handleFileUploaderComplete: Creando nuevo estímulo:', {
      id: newStimulus.id,
      fileName: newStimulus.fileName,
      order: newStimulus.order,
      s3Key: newStimulus.s3Key
    });

    // Actualizar el array de estímulos de forma segura
    setFormData(prevData => {
      const updatedData = {
        ...prevData,
        stimuli: {
          ...prevData.stimuli,
          items: [...prevData.stimuli.items, newStimulus]
        }
      };

      // Mostrar el nuevo estado después de la actualización
      logger.debug('handleFileUploaderComplete: Estado actualizado:', {
        newCount: updatedData.stimuli.items.length,
        lastItem: updatedData.stimuli.items[updatedData.stimuli.items.length - 1]
      });

      return updatedData;
    });

    // Mostrar confirmación al usuario
    toast.success(`Estímulo añadido: ${fileName}`);

    return newStimulus;
  }, [logger]);

  // Eliminar un estímulo
  const removeStimulus = useCallback((id: string) => {
    setFormData(prevData => ({
      ...prevData,
      stimuli: {
        ...prevData.stimuli,
        items: prevData.stimuli.items.filter(item => item.id !== id)
      }
    }));
  }, []);

  // Añadir un área de interés
  const addAreaOfInterest = useCallback(() => {
    const newId = generateId();

    setFormData(prevData => {
      // Asegurarnos que areasOfInterest existe y tiene la estructura correcta
      const areasOfInterest = prevData.areasOfInterest || {
        enabled: true,
        areas: []
      };

      return {
        ...prevData,
        areasOfInterest: {
          ...areasOfInterest,
          areas: [
            ...areasOfInterest.areas,
            {
              id: newId,
              name: `Área ${areasOfInterest.areas.length + 1}`,
              stimulusId: '',
              region: { x: 0, y: 0, width: 100, height: 100 }
            }
          ]
        }
      };
    });
  }, []);

  // Eliminar un área de interés
  const removeAreaOfInterest = useCallback((id: string) => {
    setFormData(prevData => {
      // Asegurarnos que areasOfInterest existe y tiene la estructura correcta
      const areasOfInterest = prevData.areasOfInterest || {
        enabled: true,
        areas: []
      };

      return {
        ...prevData,
        areasOfInterest: {
          ...areasOfInterest,
          areas: areasOfInterest.areas.filter(area => area.id !== id)
        }
      };
    });
  }, []);

  // Función para validar que todos los estímulos tienen correctamente los datos
  const validateStimuliData = useCallback(() => {
    logger.debug('useEyeTrackingForm.validateStimuliData - Validando estímulos...');

    const currentFormData = formDataRef.current;

    if (!currentFormData.stimuli || !Array.isArray(currentFormData.stimuli.items)) {
      logger.error('useEyeTrackingForm.validateStimuliData - No hay estímulos para validar');
      return false;
    }

    const items = currentFormData.stimuli.items;
    logger.debug('useEyeTrackingForm.validateStimuliData - Número de estímulos:', items.length);

    if (items.length === 0) {
      // No hay estímulos, es válido pero advertimos
      logger.warn('useEyeTrackingForm.validateStimuliData - No hay estímulos');
      return true;
    }

    // Verificar cada estímulo
    let isValid = true;
    const invalidItems: Array<{ id: string, reason: string }> = [];

    items.forEach((item, index) => {
      if (!item.id) {
        logger.error(`useEyeTrackingForm.validateStimuliData - Estímulo ${index} sin ID`);
        isValid = false;
        invalidItems.push({ id: `unknown-${index}`, reason: 'Sin ID' });
      }

      if (!item.fileUrl) {
        logger.error(`useEyeTrackingForm.validateStimuliData - Estímulo ${index} (${item.id}) sin fileUrl`);
        isValid = false;
        invalidItems.push({ id: item.id, reason: 'Sin URL' });
      }

      if (!item.s3Key) {
        logger.error(`useEyeTrackingForm.validateStimuliData - Estímulo ${index} (${item.id}) sin s3Key`);
        isValid = false;
        invalidItems.push({ id: item.id, reason: 'Sin clave S3' });
      }
    });

    if (!isValid) {
      logger.error('useEyeTrackingForm.validateStimuliData - Estímulos inválidos:', invalidItems);
    } else {
      logger.debug('useEyeTrackingForm.validateStimuliData - Todos los estímulos son válidos');
    }

    return isValid;
  }, [logger]);

  // Función para guardar los datos
  const handleSave = useCallback(async (): Promise<EyeTrackingFormData | null> => {
    logger.debug('Iniciando proceso de guardado...');

    // Verificar que los datos del formulario sean válidos
    if (!validateStimuliData()) {
      toast.error('Por favor corrija los errores antes de guardar');
      return null;
    }

    // No necesitamos setIsSaving porque usamos isCreating/isUpdating del hook

    try {
      // Preparar datos para guardar
      const dataToSave = {
        ...formDataRef.current,
        questionKey: QuestionType.DEMOGRAPHICS // Forzar siempre el valor correcto
      };

      // Verificar si hay imágenes temporales
      const tempItems = dataToSave.stimuli?.items?.filter(
        s => (s.fileUrl && s.fileUrl.startsWith('blob:')) || (!s.s3Key && s.fileUrl)
      ) || [];

      if (tempItems.length > 0) {
        toast.error('Hay imágenes sin procesar. Por favor espere a que se completen las cargas.');
        return null;
      }

      // Si autoSync está desactivado, no enviamos al backend
      if (!autoSync) {
        logger.debug('autoSync desactivado: No se enviarán datos al backend automáticamente.');
        toast.success('Datos listos para guardar (modo sin sincronización)');

        // Llamar al callback con los datos
        if (onSave) {
          onSave(dataToSave);
        }

        // Devolver los datos sin enviar al backend
        return dataToSave;
      }

      // Enviar solicitud al backend solo si autoSync está activado
      // Transform stimuli data to match API expectations
      const apiData: EyeTrackingBuildRequest = {
        ...dataToSave,
        researchId, // Include researchId for create requests
        stimuli: dataToSave.stimuli?.items?.map(stimulus => ({
          url: stimulus.fileUrl,
          type: stimulus.fileType,
          duration: dataToSave.stimuli?.durationPerStimulus
        })) || []
      } as EyeTrackingBuildRequest;

      let response;
      if (eyeTrackingId) {
        // Actualizar existente
        response = await updateEyeTrackingBuild(eyeTrackingId, apiData as EyeTrackingBuildUpdateRequest);
      } else {
        // Crear nuevo
        response = await createEyeTrackingBuild(apiData);

        if (response && response.id) {
          setEyeTrackingId(response.id);
        }
      }

      toast.success('Configuración guardada con éxito');

      // Llamar al callback
      if (onSave) {
        onSave(dataToSave);
      }

      // Devolver los datos guardados
      return dataToSave;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      logger.error('Error al guardar configuración:', error);
      toast.error(`Error al guardar: ${errorMessage}`);
      return null;
    }
  }, [researchId, eyeTrackingId, onSave, logger, autoSync, validateStimuliData, createEyeTrackingBuild, updateEyeTrackingBuild]);

  return {
    // Estado general del formulario
    formData,
    activeTab,
    setActiveTab,
    isSaving: isSavingFromHook,
    isUploading,
    eyeTrackingId,
    isEmpty,

    // Manejadores de formulario general
    updateFormData,
    handleConfigChange,
    handleSave,

    // Manejadores de archivos
    handleFileUpload,
    handleFileUploaderComplete,
    removeStimulus,

    // Manejadores de áreas de interés
    addAreaOfInterest,
    removeAreaOfInterest,

    // Validador de datos
    validateStimuliData
  };
}

/**
 * Hook para manejar la lógica de autenticación específica para el formulario de Eye Tracking
 */
export function useEyeTrackingAuth() {
  // Simplificamos todo este hook
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage] = useState({
    title: '',
    message: '',
    type: 'error'
  });

  // Verifica si el usuario está autenticado - siempre devuelve true
  const verifyAuth = useCallback(async () => {
    return true;
  }, []);

  // Función para cerrar el modal
  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false);
  }, []);

  // Función para redirigir a login
  const goToLogin = useCallback(() => {
    window.location.href = '/login';
  }, []);

  // Función para recargar la página
  const reloadPage = useCallback(() => {
    window.location.reload();
  }, []);

  return {
    isAuthenticated: true,
    verifyAuth,
    showAuthModal,
    authModalMessage,
    closeAuthModal,
    goToLogin,
    reloadPage
  };
}
