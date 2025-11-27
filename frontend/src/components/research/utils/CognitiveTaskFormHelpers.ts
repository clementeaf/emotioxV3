import { CognitiveTaskFormData, Question, QuestionType, UploadedFile } from 'shared/interfaces/cognitive-task.interface';

// Definición de UIUploadedFile para tipado local
export interface UIUploadedFile extends UploadedFile {
  status?: 'uploaded' | 'uploading' | 'error' | 'pending-delete';
  isLoading?: boolean;
  progress?: number;
  questionId?: string;
}

// Definición de FileInfo para tipado de archivos provenientes de localStorage o backend
export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  s3Key?: string;
  hitZones?: any;
}

// Helper para limpieza profunda de archivos en error
export const cleanupErrorFiles = (questions: Question[]): Question[] => {
  return questions.map(q => {
    if (!q.files) {return q;}
    const keptFiles = (q.files as UIUploadedFile[]).filter(f => f.status !== 'error');
    return { ...q, files: keptFiles };
  });
};

// Helper para limpieza profunda de archivos pendientes de eliminación
export const cleanupPendingDeleteFiles = (questions: Question[]): Question[] => {
  return questions.map(q => {
    if (!q.files) {return q;}
    const keptFiles = (q.files as UIUploadedFile[]).filter(f => f.status !== 'pending-delete');
    return { ...q, files: keptFiles };
  });
};

// Helper para revertir archivos pendientes de eliminación
export const revertPendingDeleteFiles = (questions: Question[]): Question[] => {
  return questions.map((q: Question) => {
    if (!q.files) {return q;}
    const revertedFiles = (q.files as UIUploadedFile[]).map((f: UIUploadedFile) => {
      if (f.status === 'pending-delete') {
        const { status, ...restOfFile } = f;
        if (f.s3Key) {
          return { ...restOfFile, status: 'uploaded' as const };
        }
        return restOfFile;
      }
      return f;
    });
    return { ...q, files: revertedFiles as UIUploadedFile[] };
  });
};

// Helper para diagnóstico
export const logFormDebugInfo = (
  context: string,
  data: CognitiveTaskFormData | null,
  error?: any,
  extraInfo?: Record<string, any>
) => {
    // timestamp: new Date().toISOString(),
    // hasData: !!data,
    // dataInfo: data ? {
      // researchId: data.researchId,
      // id: (data as any).id,
      // questionCount: data.questions?.length || 0,
      // questionsWithFiles: data.questions?.filter((q: Question) => q.files && q.files.length > 0).length || 0
    // } : null,
    // error: error ? {
      // name: error?.name,
      // message: error?.message,
      // statusCode: error?.statusCode,
      // stack: error?.stack
    // } : null,
    // ...extraInfo
  // });
};

// Helper para filtrar preguntas que tienen título (DEPRECATED)
// @deprecated Use filterValidQuestions from utils instead
export const filterQuestionsWithTitle = (formData: CognitiveTaskFormData): CognitiveTaskFormData => {
  // filterValidQuestions debe importarse donde se use este helper
  return formData;
};

// Modularización de la fusión de datos del useEffect principal
export function mergeCognitiveTaskFormData(
  prev: CognitiveTaskFormData,
  cognitiveTaskData: CognitiveTaskFormData | null,
  filesFromLocalStorage: Record<string, FileInfo[]> | null,
  researchId: string | undefined,
  setCognitiveTaskId: (id: string | null) => void
): CognitiveTaskFormData {
  let finalQuestions: Question[] = [];
  let finalRandomize = false;
  let finalDataFromBackend: Partial<CognitiveTaskFormData> = {};

  if (!cognitiveTaskData) {
    const defaultQuestions = [
      {
        id: '3.1',
        type: 'short_text' as QuestionType,
        title: '',
        description: '',
        required: false,
        showConditionally: false,
        deviceFrame: false,
        files: [],
        answerPlaceholder: ''
      },
      {
        id: '3.2',
        type: 'long_text' as QuestionType,
        title: '',
        required: false,
        showConditionally: false,
        deviceFrame: false,
        files: []
      },
      {
        id: '3.3',
        type: 'single_choice' as QuestionType,
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
        type: 'multiple_choice' as QuestionType,
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
        type: 'linear_scale' as QuestionType,
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
        type: 'ranking' as QuestionType,
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
        type: 'navigation_flow' as QuestionType,
        title: '',
        required: false,
        showConditionally: false,
        files: [],
        deviceFrame: true
      },
      {
        id: '3.8',
        type: 'preference_test' as QuestionType,
        title: '',
        description: '',
        required: false,
        showConditionally: false,
        files: [],
        deviceFrame: true
      }
    ];
    finalQuestions = prev.questions.length > 0 ? prev.questions as Question[] : defaultQuestions;
    finalRandomize = false;
    setCognitiveTaskId(null);
  } else {
    const existingData = cognitiveTaskData as CognitiveTaskFormData;
    finalDataFromBackend = existingData;
    finalRandomize = existingData.randomizeQuestions ?? false;
    setCognitiveTaskId((existingData as any).id || null);
    finalQuestions = existingData.questions || [];
  }

  finalQuestions = finalQuestions.map(question => {
    const backendFiles = (finalDataFromBackend.questions?.find((q: Question) => q.id === question.id)?.files || []) as (FileInfo)[];
    const localStorageFiles = filesFromLocalStorage ? (filesFromLocalStorage[question.id] || []) : [];
    const allFilesMap = new Map<string, FileInfo>();
    backendFiles.forEach((file) => {
      if (file && file.id && file.name) {
        allFilesMap.set(file.id, file);
      } else {
        // eslint-disable-next-line no-console
      }
    });
    localStorageFiles.forEach((file) => {
      if (file && file.id && file.name) {
        if (!allFilesMap.has(file.id)) {
          allFilesMap.set(file.id, file);
        }
      } else {
        // eslint-disable-next-line no-console
      }
    });
    const validFiles = Array.from(allFilesMap.values())
      .filter((file: FileInfo) => {
        // ✅ FIX: Permitir archivos con size 0 o undefined, solo validar que existan id, name y s3Key/url
        const isValid = file && file.id && file.name && (file.url || file.s3Key);
        if (!isValid) {
          // eslint-disable-next-line no-console
        }
        return isValid;
      })
      .map((file: FileInfo) => ({
        ...file,
        // ✅ FIX: Asegurar que size tenga un valor por defecto si no existe
        size: file.size || 0,
        url: file.url || `https://placehold.co/300x300/gray/white?text=${encodeURIComponent(file.name)}`,
        type: file.type || 'image/jpeg',
        status: (file as any).status || 'uploaded',
        s3Key: file.s3Key,
        hitZones: file.hitZones
      }));
    return {
      ...question,
      files: validFiles
    };
  });

  const finalState: CognitiveTaskFormData = {
    ...(prev || {}),
    ...finalDataFromBackend,
    researchId: researchId || (finalDataFromBackend as any).researchId || '',
    questions: finalQuestions,
    randomizeQuestions: finalRandomize,
  };
  finalState.questions = cleanupErrorFiles(finalState.questions);
  return finalState;
}

// Acción: Guardar CognitiveTask
export function saveCognitiveTask({
  researchId,
  validateCurrentForm,
  confirmAndSave,
  modals
}: {
  researchId?: string;
  validateCurrentForm: () => any;
  confirmAndSave: () => void;
  modals: any;
}) {
  // eslint-disable-next-line no-console
  const errorsFound = validateCurrentForm();
  const isValid = errorsFound === null;
  // eslint-disable-next-line no-console
  // eslint-disable-next-line no-console
  if (isValid) {
    confirmAndSave();
  } else {
    let errorMessage = 'Por favor, corrija los errores en el formulario.';
    if (errorsFound && errorsFound.questions && Object.keys(errorsFound).length === 1) {
      errorMessage = errorsFound.questions;
    }
    modals.showModal({
      title: 'Formulario Inválido',
      message: errorMessage,
      type: 'warning'
    });
  }
}

// Acción: Previsualizar CognitiveTask
export function previewCognitiveTask({
  formData,
  validateCurrentForm,
  modals
}: {
  formData: CognitiveTaskFormData;
  validateCurrentForm: () => any;
  modals: any;
}) {
  if (validateCurrentForm()) {
    const previewData = JSON.parse(JSON.stringify(formData));
    const jsonData = JSON.stringify(previewData, null, 2);
    modals.showJsonModal(jsonData, 'preview');
  } else {
    modals.showModal({
      title: 'Formulario Inválido',
      message: 'Por favor, corrija los errores antes de previsualizar.',
      type: 'warning'
    });
  }
}

// Acción: Eliminar CognitiveTask
export async function deleteCognitiveTask({
  researchId,
  cognitiveTaskFixedAPI,
  setCognitiveTaskId,
  setFormData,
  queryClient,
  modals
}: {
  researchId?: string;
  cognitiveTaskFixedAPI: any;
  setCognitiveTaskId: (id: string | null) => void;
  setFormData: (fn: (prev: CognitiveTaskFormData) => CognitiveTaskFormData) => void;
  queryClient: any;
  modals: any;
}) {
  if (!window.confirm('⚠️ ¿Estás seguro de que quieres eliminar TODOS los datos de Cognitive Tasks de esta investigación?\n\nEsta acción no se puede deshacer.')) {
    return;
  }
  try {
    if (!researchId) {
      throw new Error('No se puede eliminar: falta research ID');
    }
    await cognitiveTaskFixedAPI.deleteByResearchId(researchId);
    setCognitiveTaskId(null);
    setFormData((prev: CognitiveTaskFormData) => ({
      ...prev,
      questions: [
        {
          id: 'short-text-default',
          type: 'short_text' as QuestionType,
          title: 'Pregunta de texto corto',
          required: true,
          showConditionally: false,
          deviceFrame: false
        },
        {
          id: 'long-text-default',
          type: 'long_text' as QuestionType,
          title: 'Pregunta de texto largo',
          required: true,
          showConditionally: false,
          deviceFrame: false
        },
        {
          id: 'single-choice-default',
          type: 'single_choice' as QuestionType,
          title: 'Pregunta de opción única',
          required: true,
          showConditionally: false,
          deviceFrame: false,
          choices: [
            { id: '1', text: 'Opción 1' },
            { id: '2', text: 'Opción 2' },
            { id: '3', text: 'Opción 3' }
          ]
        },
        {
          id: 'multiple-choice-default',
          type: 'multiple_choice' as QuestionType,
          title: 'Pregunta de opción múltiple',
          required: true,
          showConditionally: false,
          deviceFrame: false,
          choices: [
            { id: '1', text: 'Opción 1' },
            { id: '2', text: 'Opción 2' },
            { id: '3', text: 'Opción 3' }
          ]
        },
        {
          id: 'linear-scale-default',
          type: 'linear_scale' as QuestionType,
          title: 'Pregunta de escala lineal',
          required: true,
          showConditionally: false,
          deviceFrame: false,
          scaleConfig: { startValue: 1, endValue: 5 }
        },
        {
          id: 'ranking-default',
          type: 'ranking' as QuestionType,
          title: 'Pregunta de ranking',
          required: true,
          showConditionally: false,
          deviceFrame: false,
          choices: [
            { id: '1', text: 'Opción 1' },
            { id: '2', text: 'Opción 2' },
            { id: '3', text: 'Opción 3' }
          ]
        },
        {
          id: 'preference-test-default',
          type: 'preference_test' as QuestionType,
          title: 'Pregunta de test de preferencia',
          required: true,
          showConditionally: false,
          deviceFrame: false,
          files: []
        }
      ]
    }));
    queryClient.invalidateQueries({ queryKey: ['cognitive-task', researchId] });
    modals.showModal({
      title: 'Éxito',
      message: 'Datos de Cognitive Tasks eliminados correctamente',
      type: 'success'
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    modals.showModal({
      title: 'Error',
      message: error.message || 'Error al eliminar los datos de Cognitive Tasks',
      type: 'error'
    });
  }
}
