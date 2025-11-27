import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import {
  CognitiveTaskFormData,
  HitZone,
  UploadedFile
} from 'shared/interfaces/cognitive-task.interface';

import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/api/config';
import { useCognitiveTaskData } from '@/api/domains/cognitive-task';
import type { Question, UICognitiveTaskFormData, UseCognitiveTaskFormResult, ValidationErrors, ErrorModalData } from '../types';
import { filterValidQuestionsLocal, ensureCognitiveTaskQuestionKeys } from '../utils';

// Tipos y utilidades para file upload
interface HitzoneArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UIFile extends UploadedFile {
  status?: 'uploading' | 'uploaded' | 'pending-delete' | 'error';
  progress?: number;
  isLoading?: boolean;
  questionId?: string;
  hitZones?: any;
}

function mapHitZonesToHitzoneAreas(hitZones?: HitZone[] | HitzoneArea[]): HitzoneArea[] | undefined {
  if (!hitZones) {return undefined;}
  if ((hitZones as HitzoneArea[])[0]?.x !== undefined) {
    return hitZones as HitzoneArea[];
  }

  return (hitZones as HitZone[]).map(hz => ({
    id: hz.id,
    x: hz.region.x,
    y: hz.region.y,
    width: hz.region.width,
    height: hz.region.height
  }));
}

const asUIFile = (file: any): UIFile => ({
  id: file.id || uuidv4(),
  name: file.name || file.fileName || '',
  size: file.size || 0,
  type: file.type || file.contentType || '',
  url: file.fileUrl || file.url || '',
  s3Key: file.s3Key,
  status: file.status || 'uploaded',
  progress: file.progress,
  error: file.error,
  isLoading: file.isLoading,
  questionId: file.questionId,
  hitZones: mapHitZonesToHitzoneAreas(file.hitZones)
});

function normalizeFileName(name: string): string {
  return name
    .normalize('NFD').replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/\.+/g, '.')
    .toLowerCase();
}

// Constante para el estado inicial por defecto con las 8 preguntas originales (3.1-3.8)
const DEFAULT_STATE: UICognitiveTaskFormData = {
  researchId: '', // El researchId vendrá de props o se establecerá después
  questions: [
    {
      id: '3.1',
      type: 'short_text',
      title: '',
      description: '',
      required: false,
      showConditionally: false,
      deviceFrame: false,
      files: []
    },
    {
      id: '3.2',
      type: 'long_text',
      title: '',
      required: false,
      showConditionally: false,
      deviceFrame: false,
      files: []
    },
    {
      id: '3.3',
      type: 'single_choice',
      title: '',
      required: false,
      showConditionally: false,
      choices: [
        { id: '1', text: '', isQualify: false, isDisqualify: false },
        { id: '2', text: '', isQualify: false, isDisqualify: false },
        { id: '3', text: '', isQualify: false, isDisqualify: false }
      ],
      deviceFrame: false,
      files: []
    },
    {
      id: '3.4',
      type: 'multiple_choice',
      title: '',
      required: false,
      showConditionally: false,
      choices: [
        { id: '1', text: '', isQualify: false, isDisqualify: false },
        { id: '2', text: '', isQualify: false, isDisqualify: false },
        { id: '3', text: '', isQualify: false, isDisqualify: false }
      ],
      deviceFrame: false,
      files: []
    },
    {
      id: '3.5',
      type: 'linear_scale',
      title: '',
      required: false,
      showConditionally: false,
      scaleConfig: {
        startValue: 1,
        endValue: 5,
        startLabel: '',
        endLabel: ''
      },
      deviceFrame: false,
      files: []
    },
    {
      id: '3.6',
      type: 'ranking',
      title: '',
      required: false,
      showConditionally: false,
      choices: [
        { id: '1', text: '', isQualify: false, isDisqualify: false },
        { id: '2', text: '', isQualify: false, isDisqualify: false },
        { id: '3', text: '', isQualify: false, isDisqualify: false }
      ],
      deviceFrame: false,
      files: []
    },
    {
      id: '3.7',
      type: 'navigation_flow',
      title: '',
      required: false,
      showConditionally: false,
      files: [],
      deviceFrame: true
    },
    {
      id: '3.8',
      type: 'preference_test',
      title: '',
      description: '',
      required: false,
      showConditionally: false,
      files: [],
      deviceFrame: true
    }
  ],
  randomizeQuestions: false
};

export const useCognitiveTaskForm = (researchId?: string): UseCognitiveTaskFormResult => {
  const { token } = useAuth();

  // Estados principales
  const [formData, setFormData] = useState<UICognitiveTaskFormData>(DEFAULT_STATE);
  const [cognitiveTaskId, setCognitiveTaskId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors | null>(null);
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);

  // Hook centralizado para obtener datos y operaciones CRUD
  const {
    data: existingData,
    isLoading,
    createCognitiveTask,
    updateCognitiveTask,
    deleteCognitiveTask,
    isCreating,
    isUpdating,
    isDeleting
  } = useCognitiveTaskData(researchId || '');

  // Estados de modales (integrados)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalError, setModalError] = useState<ErrorModalData | null>(null);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [jsonToSend, setJsonToSend] = useState('');
  const [pendingAction, setPendingAction] = useState<'save' | 'preview' | null>(null);
  const [showInteractivePreview, setShowInteractivePreview] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Estados de file upload (integrados)
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [totalFiles, setTotalFiles] = useState<number>(0);

  // Funciones de modales (integradas)
  const showErrorModal = useCallback((error: ErrorModalData) => {
    setModalError(error);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setShowJsonPreview(false);
    setShowInteractivePreview(false);
    setIsDeleteModalOpen(false);
    setModalError(null);
    setPendingAction(null);
  }, []);

  const openJsonModal = useCallback((jsonData: object, action: 'save' | 'preview') => {
    setJsonToSend(JSON.stringify(jsonData, null, 2));
    setPendingAction(action);
    setShowJsonPreview(true);
  }, []);

  const closeJsonModal = useCallback(() => {
    setShowJsonPreview(false);
    setPendingAction(null);
  }, []);

  const openInteractivePreview = useCallback(() => {
    setShowInteractivePreview(true);
  }, []);

  const closeInteractivePreview = useCallback(() => {
    setShowInteractivePreview(false);
  }, []);

  const openDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  // Funciones de file upload (integradas)
  const saveFilesToLocalStorage = useCallback((questions: Question[]) => {
    if (!researchId) {return;}
    try {
      const filesMap: Record<string, UIFile[]> = {};
      questions.forEach(question => {
        if (question.files && question.files.length > 0) {
          const validFiles = (question.files as any[]).map(asUIFile).filter((f: UIFile) => f.status !== 'error') as UIFile[];
          if (validFiles.length > 0) {
            filesMap[question.id] = validFiles;
          }
        }
      });
      if (Object.keys(filesMap).length > 0) {
        const storageKey = `cognitive_task_temp_files_${researchId}`;
        localStorage.setItem(storageKey, JSON.stringify(filesMap));
      }
    } catch (error) {
      // Silently fail
    }
  }, [researchId]);

  const loadFilesFromLocalStorage = useCallback((): Record<string, UIFile[]> | null => {
    if (!researchId) {return null;}
    try {
      const storageKey = `cognitive_task_temp_files_${researchId}`;
      const savedFilesJson = localStorage.getItem(storageKey);
      if (!savedFilesJson) {return null;}
      const savedFiles = JSON.parse(savedFilesJson) as Record<string, any[]>;
      const filesMapResult: Record<string, UIFile[]> = {};
      Object.keys(savedFiles).forEach(questionId => {
        filesMapResult[questionId] = (savedFiles[questionId] as any[]).map(asUIFile).filter((f: UIFile) => f.status !== 'error') as UIFile[];
      });
      return filesMapResult;
    } catch (error) {
      return null;
    }
  }, [researchId]);

  // Cargar datos existentes - optimizado para evitar procesamiento innecesario
  useEffect(() => {
    if (!researchId) {
      setFormData(prev => ({ ...prev, researchId: '' }));
      setCognitiveTaskId(null);
      return;
    }

    if (existingData) {
      // 🎯 Solo procesar si realmente hay cambios en los datos
      // Normalizar tipos de preguntas antiguos (file_upload -> navigation_flow)
      const normalizedData = {
        ...existingData,
        questions: existingData.questions.map((q: Question) => {
          if (q.type === 'file_upload') {
            return { ...q, type: 'navigation_flow' };
          }
          return q;
        })
      };
      
      // 🎯 Solo actualizar si los datos realmente cambiaron
      setFormData(prev => {
        if (prev.researchId === researchId && prev.questions.length === normalizedData.questions.length) {
          return prev; // Evitar actualización innecesaria
        }
        return normalizedData;
      });
      setCognitiveTaskId('existing');
    } else {
      setFormData(prev => {
        if (prev.researchId === researchId) {
          return prev; // Ya está configurado, no actualizar
        }
        return { ...prev, researchId: researchId || '' };
      });
      setCognitiveTaskId(null);
    }
  }, [existingData, researchId]);

  // Función para manejar cambios en preguntas
  const handleQuestionChange = useCallback((questionId: string, updates: Partial<Question>) => {
    setFormData(prevData => ({
      ...prevData,
      questions: prevData.questions.map(q =>
        q.id === questionId ? { ...q, ...updates } : q
      )
    }));
  }, []);

  // Función para agregar una opción a una pregunta
  const handleAddChoice = useCallback((questionId: string) => {
    setFormData(prevData => ({
      ...prevData,
      questions: prevData.questions.map(q =>
        q.id === questionId && q.choices
          ? {
            ...q,
            choices: [
              ...q.choices,
              { id: String(q.choices.length + 1), text: '', isQualify: false, isDisqualify: false }
            ]
          }
          : q
      )
    }));
  }, []);

  // Función para eliminar una opción de una pregunta
  const handleRemoveChoice = useCallback((questionId: string, choiceId: string) => {
    setFormData(prevData => ({
      ...prevData,
      questions: prevData.questions.map(q =>
        q.id === questionId && q.choices
          ? {
            ...q,
            choices: q.choices.filter(c => c.id !== choiceId)
          }
          : q
      )
    }));
  }, []);

  // Función para controlar el aleatorizado de preguntas
  const handleRandomizeChange = useCallback((checked: boolean) => {
    setFormData(prevData => ({
      ...prevData,
      randomizeQuestions: checked
    }));
  }, []);

  // Función para agregar pregunta
  const handleAddQuestion = useCallback((type: string) => {
    const newQuestion: Question = {
      id: `question_${Date.now()}`,
      type,
      title: '',
      required: false,
      showConditionally: false,
      deviceFrame: false,
      files: []
    };

    setFormData(prevData => ({
      ...prevData,
      questions: [...prevData.questions, newQuestion]
    }));

    setIsAddQuestionModalOpen(false);
  }, []);

  // Funciones de file upload (implementación completa)
  const handleFileUpload = useCallback(async (questionId: string, files: FileList) => {
    if (!researchId || files.length === 0 || !token) {
      toast.error('No se pudo iniciar la subida. Falta información necesaria o autenticación.');
      return;
    }

    setFormData((prevData: UICognitiveTaskFormData): UICognitiveTaskFormData => {
      const updatedQuestions = prevData.questions.map(q => {
        if (q.id === questionId && q.files && q.files.length > 0) {
          const cleanedFiles = q.files.filter(f => {
            const fileInfo = asUIFile(f);
            return fileInfo.status !== 'error' &&
                            !(fileInfo.status === 'uploading' && fileInfo.isLoading);
          });

          const uniqueFileMap = new Map<string, any>();
          cleanedFiles.forEach(f => {
            const fileInfo = asUIFile(f);
            if (fileInfo.status === 'uploaded') {
              const key = `${fileInfo.name}_${fileInfo.size}`;
              if (!uniqueFileMap.has(key) ||
                              (!uniqueFileMap.get(key).url && fileInfo.url)) {
                uniqueFileMap.set(key, f);
              }
            } else {
              uniqueFileMap.set(fileInfo.id, f);
            }
          });

          return { ...q, files: Array.from(uniqueFileMap.values()) };
        }
        return q;
      });
      return { ...prevData, questions: updatedQuestions };
    });

    const filesToUploadInput = Array.from(files);
    const initialFileCount = filesToUploadInput.length;

    let currentFilesForQuestion: UIFile[] = [];
    const questionIndex = formData.questions.findIndex(q => q.id === questionId);
    if (questionIndex !== -1 && formData.questions[questionIndex].files) {
      currentFilesForQuestion = formData.questions[questionIndex].files
        .map(asUIFile)
        .filter(f => f.status !== 'pending-delete' && f.status !== 'error');
    }

    const filesToProcess = filesToUploadInput.filter(newFile => {
      const isDuplicate = currentFilesForQuestion.some(existingFile => {
        const nameMatch = existingFile.name === newFile.name;
        const sizeMatch = existingFile.size === newFile.size;
        return nameMatch && sizeMatch;
      });
      return !isDuplicate;
    });
    const processedFileCount = filesToProcess.length;
    const skippedFileCount = initialFileCount - processedFileCount;

    if (skippedFileCount > 0) {
      toast(`${skippedFileCount} archivo(s) omitido(s) por ser duplicado(s).`);
    }

    if (filesToProcess.length === 0) {
      return;
    }

    setIsUploading(true);
    setTotalFiles(filesToProcess.length);
    setCurrentFileIndex(0);
    setUploadProgress(0);

    const tempFilesMap = new Map<string, UIFile>();
    filesToProcess.forEach(file => {
      const normalizedFileName = normalizeFileName(file.name);
      const tempFile: UIFile = {
        id: `${questionId}_${uuidv4()}`,
        name: normalizedFileName,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        s3Key: '',
        status: 'uploading',
        progress: 0,
        isLoading: true,
        questionId: questionId,
        hitZones: 'hitZones' in file ? mapHitZonesToHitzoneAreas((file as any).hitZones) : undefined
      };
      tempFilesMap.set(tempFile.id, tempFile);
    });
    const tempFilesArray = Array.from(tempFilesMap.values());

    setFormData((prevData: UICognitiveTaskFormData): UICognitiveTaskFormData => {
      const updatedQuestions = [...prevData.questions];
      const questionIndex = updatedQuestions.findIndex(q => q.id === questionId);
      if (questionIndex === -1) {return prevData;}
      const existingFiles = (updatedQuestions[questionIndex].files || []).map(asUIFile);
      const filteredExistingFiles = existingFiles.filter(
        f =>
          !(
            (f.status === 'uploading' || f.isLoading === true) &&
                filesToProcess.some(
                  file => file.name === f.name && file.size === f.size
                )
          )
      );
      updatedQuestions[questionIndex].files = [...filteredExistingFiles, ...tempFilesArray];
      return { ...prevData, questions: updatedQuestions };
    });

    let successfulUploads = 0;
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const tempFileId = tempFilesArray[i].id;
      const normalizedFileName = tempFilesArray[i].name;
      const fileToUpload = new File([file], normalizedFileName, { type: file.type });
      setCurrentFileIndex(i + 1);

      let finalUploadedFile: UIFile | null = null;
      let uploadError = false;

      try {
        if (token) {
          apiClient.setAuthToken(token);
        }

        const result = await apiClient.post('cognitiveTask', 'getUploadUrl', {
          fileName: normalizedFileName,
          fileSize: file.size,
          fileType: file.type,
          mimeType: file.type,
          contentType: file.type,
          questionId: questionId
        }, { researchId });
        if (!result || !result.uploadUrl || !result.file || !result.file.s3Key) {
          throw new Error('Respuesta inválida del servidor al obtener URL de subida.');
        }

        const { uploadUrl, file: backendFileInfo } = result;
        finalUploadedFile = backendFileInfo;

        const s3Response = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': fileToUpload.type
          },
          body: fileToUpload
        });

        if (!s3Response.ok) {
          throw new Error(`Error subiendo archivo: ${s3Response.status === 403 ? 'URL expirada' : 'Error del servidor'}`);
        }

        successfulUploads++;

      } catch (error: any) {
        toast.error(`Error subiendo ${file.name}: ${error.message || 'Error desconocido'}`);
        uploadError = true;
        setFormData((prevData: UICognitiveTaskFormData): UICognitiveTaskFormData => {
          const updatedQuestions = prevData.questions.map(q => {
            if (q.id === questionId && q.files) {
              const filesAsInfo: UIFile[] = q.files.map(asUIFile);
              const updatedFiles = filesAsInfo.map(f =>
                f.id === tempFileId ? { ...f, status: 'error' as const, isLoading: false, progress: 0 } : f
              );
              return { ...q, files: updatedFiles };
            }
            return q;
          });
          return { ...prevData, questions: updatedQuestions };
        });
      }

      if (!uploadError && finalUploadedFile) {
        const finalFileState: UIFile = {
          ...asUIFile(finalUploadedFile),
          id: tempFileId,
          url: (finalUploadedFile as any).fileUrl || finalUploadedFile.url,
          status: 'uploaded',
          isLoading: false,
          progress: 100,
          questionId: questionId,
          hitZones: mapHitZonesToHitzoneAreas(finalUploadedFile.hitZones)
        };

        setFormData((prevData: UICognitiveTaskFormData): UICognitiveTaskFormData => {
          const updatedQuestions = [...prevData.questions];
          const questionIndex = updatedQuestions.findIndex(q => q.id === questionId);
          if (questionIndex !== -1 && updatedQuestions[questionIndex].files) {
            let currentFiles = updatedQuestions[questionIndex].files.map(asUIFile);
            currentFiles = currentFiles.filter(f => f.id !== tempFileId);
            currentFiles = currentFiles.filter(f => {
              if (
                (f.status === 'uploading' || f.isLoading === true) &&
                            f.name === finalFileState.name &&
                            f.size === finalFileState.size
              ) {
                return false;
              }
              return true;
            });
            const mergedFile = {
              ...finalFileState,
              status: 'uploaded',
              isLoading: false
            } as UIFile;
            updatedQuestions[questionIndex].files = [...currentFiles, mergedFile];
          }
          return { ...prevData, questions: updatedQuestions };
        });
      }
      setUploadProgress(((i + 1) / filesToProcess.length) * 100);
    }

    setIsUploading(false);

    if (successfulUploads > 0) {
      setFormData((prevData: UICognitiveTaskFormData): UICognitiveTaskFormData => {
        const updatedQuestions = prevData.questions.map(q => {
          if (q.id === questionId && q.files && q.files.length > 0) {
            const uniqueFileMap = new Map<string, UIFile>();
            const filesAsInfo = q.files.map(asUIFile)
              .sort((a, b) => {
                if (a.status === 'uploaded' && b.status !== 'uploaded') {return -1;}
                if (a.status !== 'uploaded' && b.status === 'uploaded') {return 1;}
                return 0;
              });
            filesAsInfo.forEach(file => {
              if (file.status === 'uploaded') {
                const key = `${file.name}_${file.size}`;
                if (!uniqueFileMap.has(key) || !uniqueFileMap.get(key)?.url) {
                  uniqueFileMap.set(key, file);
                }
              } else if (file.status === 'pending-delete') {
                uniqueFileMap.set(file.id, file);
              } else {
                const key = `${file.name}_${file.size}`;
                if (!uniqueFileMap.has(key)) {
                  uniqueFileMap.set(file.id, file);
                }
              }
            });
            return { ...q, files: Array.from(uniqueFileMap.values()) };
          }
          return q;
        });
        saveFilesToLocalStorage(updatedQuestions);
        return { ...prevData, questions: updatedQuestions };
      });
    }

    if (successfulUploads === filesToProcess.length) {
      // All files uploaded successfully
    } else if (successfulUploads > 0) {
      toast(`${successfulUploads}/${filesToProcess.length} archivos subidos. Algunos fallaron. ⚠️`);
    }
  }, [researchId, token, formData.questions, saveFilesToLocalStorage]);

  const handleMultipleFilesUpload = useCallback(async (questionId: string, files: FileList) => {
    await handleFileUpload(questionId, files);
  }, [handleFileUpload]);

  const handleFileDelete = useCallback(async (questionId: string, fileId: string) => {
    const fileToDelete = formData.questions
      .find((q: Question) => q.id === questionId)
      ?.files?.find((f: UIFile) => f.id === fileId);

    if (!fileToDelete) {
      return;
    }

    setFormData((prevData: UICognitiveTaskFormData): UICognitiveTaskFormData => {
      const updatedQuestions = prevData.questions.map((q: Question) => {
        if (q.id === questionId && q.files) {
          const updatedFiles = q.files.filter((f: UIFile) => f.id !== fileId);
          return { ...q, files: updatedFiles };
        }
        return q;
      });

      saveFilesToLocalStorage(updatedQuestions);

      if (researchId) {
        const storageKey = `cognitive_task_temp_files_${researchId}`;
        const savedFilesJson = localStorage.getItem(storageKey);
        if (savedFilesJson) {
          const savedFiles = JSON.parse(savedFilesJson);
          if (savedFiles[questionId]) {
            savedFiles[questionId] = savedFiles[questionId].filter((f: UIFile) => f.id !== fileId);
            if (savedFiles[questionId].length === 0) {
              delete savedFiles[questionId];
            }
            if (Object.keys(savedFiles).length === 0) {
              localStorage.removeItem(storageKey);
            } else {
              localStorage.setItem(storageKey, JSON.stringify(savedFiles));
            }
          }
        }
      }

      return { ...prevData, questions: updatedQuestions };
    });

    toast.success(`Archivo ${fileToDelete.name} eliminado correctamente.`);
  }, [formData.questions, saveFilesToLocalStorage, researchId]);

  // Función para abrir/cerrar modal de agregar pregunta
  const openAddQuestionModal = useCallback(() => {
    setIsAddQuestionModalOpen(true);
  }, []);

  const closeAddQuestionModal = useCallback(() => {
    setIsAddQuestionModalOpen(false);
  }, []);

  // Función de validación
  const validateForm = useCallback((): boolean => {
    const errors: ValidationErrors = {};

    if (!researchId) {
      errors.researchId = 'El ID de investigación es obligatorio';
    }

    const questionsWithTitle = formData.questions.filter(q => q.title && q.title.trim() !== '');
    if (questionsWithTitle.length === 0) {
      errors.questions = 'Debe haber al menos una pregunta con título';
    }

    setValidationErrors(Object.keys(errors).length > 0 ? errors : null);
    return Object.keys(errors).length === 0;
  }, [formData, researchId]);

  // Función para guardar
  const handleSave = useCallback(async () => {
    try {
      const dataToSave = filterValidQuestionsLocal(formData);
      
      // Asegurar que todas las preguntas tengan questionKey antes de enviar
      const questionsWithKeys = ensureCognitiveTaskQuestionKeys(dataToSave.questions);
      
      // Convertir a los tipos del domain y normalizar tipos antiguos
      const domainData: CognitiveTaskFormData = {
        ...dataToSave,
        questions: questionsWithKeys.map((q: Question) => ({
          ...q,
          // Normalizar file_upload a navigation_flow para compatibilidad
          type: (q.type === 'file_upload' ? 'navigation_flow' : q.type) as any,
          // Preservar questionKey explícitamente
          questionKey: q.questionKey
        }))
      };
      
      if (cognitiveTaskId) {
        await updateCognitiveTask(domainData);
      } else {
        await createCognitiveTask(domainData);
      }
    } catch (error) {
      showErrorModal({
        title: 'Error al guardar',
        message: 'No se pudo guardar la configuración',
        type: 'error'
      });
    }
  }, [validateForm, formData, cognitiveTaskId, researchId, updateCognitiveTask, createCognitiveTask, showErrorModal]);

  // Función para vista previa
  const handlePreview = useCallback(() => {
    openJsonModal(formData, 'preview');
  }, [formData, openJsonModal]);

  // Función para eliminar
  const handleDelete = useCallback(async () => {
    if (!cognitiveTaskId) return;

    try {
      await deleteCognitiveTask();
      setFormData(DEFAULT_STATE);
      setCognitiveTaskId(null);
      closeDeleteModal(); // Cerrar el modal después de eliminar exitosamente
      // El toast se muestra en el hook de la API (useCognitiveTaskData)
    } catch (error) {
      showErrorModal({
        title: 'Error al eliminar',
        message: 'No se pudo eliminar la configuración',
        type: 'error'
      });
      closeDeleteModal(); // Cerrar el modal incluso si hay error
    }
  }, [cognitiveTaskId, deleteCognitiveTask, showErrorModal, closeDeleteModal]);

  // Función para inicializar preguntas por defecto
  const initializeDefaultQuestions = useCallback((defaultQuestions: Question[]) => {
    setFormData(prevData => ({
      ...prevData,
      questions: defaultQuestions
    }));
  }, []);

  // Tipos de preguntas disponibles
  const questionTypes = [
    { id: 'short_text', label: 'Texto Corto', description: 'Respuestas cortas de texto' },
    { id: 'long_text', label: 'Texto Largo', description: 'Respuestas largas de texto' },
    { id: 'single_choice', label: 'Opción Única', description: 'Seleccionar una opción' },
    { id: 'multiple_choice', label: 'Opción Múltiple', description: 'Seleccionar múltiples opciones' },
    { id: 'linear_scale', label: 'Escala Lineal', description: 'Escala numérica' },
    { id: 'ranking', label: 'Ranking', description: 'Ordenar opciones por preferencia' },
    { id: 'navigation_flow', label: 'Flujo de Navegación', description: 'Prueba de flujo de navegación' },
    { id: 'preference_test', label: 'Prueba de Preferencia', description: 'Prueba A/B de preferencia' }
  ];

  return {
    formData,
    cognitiveTaskId,
    isLoading,
    isSaving: isCreating || isUpdating,
    modalError,
    modalVisible,
    isAddQuestionModalOpen,
    isUploading,
    uploadProgress,
    currentFileIndex,
    totalFiles,
    questionTypes,
    validationErrors,

    // Métodos de gestión
    handleQuestionChange,
    handleAddChoice,
    handleRemoveChoice,
    handleFileUpload,
    handleMultipleFilesUpload,
    handleFileDelete,
    handleAddQuestion,
    handleRandomizeChange,
    openAddQuestionModal,
    closeAddQuestionModal,

    // Métodos de acción
    handleSave,
    handlePreview,
    handleDelete,
    validateForm,
    closeModal,
    initializeDefaultQuestions,

    // Nuevas propiedades para el modal JSON
    showJsonPreview,
    jsonToSend,
    pendingAction,
    openJsonModal,
    closeJsonModal,
    isEmpty: formData.questions.length === 0,

    // Modal de previsualización interactiva
    showInteractivePreview,
    openInteractivePreview,
    closeInteractivePreview,

    // Modal de confirmación para eliminar datos
    isDeleteModalOpen,
    openDeleteModal,
    closeDeleteModal
  };
};