import { useWelcomeScreenData } from '@/api/domains/welcome-screen';
import type { WelcomeScreenModel, CreateWelcomeScreenRequest, UpdateWelcomeScreenRequest, WelcomeScreenFormData } from '@/api/domains/welcome-screen';
import { useResearchForm, type UseResearchFormResult } from '@/hooks/useResearchForm';
import { toastHelpers } from '@/utils/toast';

/**
 * Tipo de datos del formulario de WelcomeScreen
 */
interface WelcomeScreenData extends Record<string, unknown> {
  title: string;
  message: string;
  startButtonText: string;
  isEnabled: boolean;
}

/**
 * Resultado del hook de WelcomeScreen
 * Extiende el resultado del hook genérico con funcionalidad específica
 */
interface UseWelcomeScreenResult extends Omit<UseResearchFormResult<WelcomeScreenData>, 'handleSave'> {
  existingScreen: WelcomeScreenModel | null;
  handleSubmit: () => Promise<void>;
  handlePreview: () => void;
}

/**
 * Datos iniciales del formulario
 */
const INITIAL_FORM_DATA: WelcomeScreenData = {
  title: '',
  message: '',
  startButtonText: '',
  isEnabled: true
};

/**
 * Hook para WelcomeScreen usando el hook genérico useResearchForm
 */
export const useWelcomeScreen = (researchId: string): UseWelcomeScreenResult => {
  // Hook centralizado para obtener datos y operaciones CRUD
  const welcomeScreenData = useWelcomeScreenData(researchId);

  // Adaptar el hook centralizado a la interfaz ResearchDataHook
  const dataHook = {
    data: welcomeScreenData.data,
    isLoading: welcomeScreenData.isLoading,
    create: async (data: CreateWelcomeScreenRequest): Promise<WelcomeScreenModel> => {
      // El hook centralizado espera WelcomeScreenFormData, pero CreateWelcomeScreenRequest ya incluye researchId
      // Necesitamos adaptar la llamada convirtiendo CreateWelcomeScreenRequest a WelcomeScreenFormData
      const formData: WelcomeScreenFormData = {
        isEnabled: data.isEnabled,
        title: data.title,
        message: data.message,
        startButtonText: data.startButtonText,
        metadata: data.metadata ? {
          version: data.metadata.version || '1.0.0',
          lastUpdated: new Date(),
          lastModifiedBy: 'user'
        } : {
          version: '1.0.0',
          lastUpdated: new Date(),
          lastModifiedBy: 'user'
        }
      };
      return welcomeScreenData.createWelcomeScreen(formData);
    },
    update: async (researchId: string, data: UpdateWelcomeScreenRequest): Promise<WelcomeScreenModel> => {
      // El hook centralizado espera Partial<WelcomeScreenFormData>
      const formData: Partial<WelcomeScreenFormData> = {
        isEnabled: data.isEnabled,
        title: data.title,
        message: data.message,
        startButtonText: data.startButtonText,
        metadata: data.metadata ? {
          version: data.metadata.version || '1.0.0',
          lastUpdated: new Date(),
          lastModifiedBy: 'user'
        } : undefined
      };
      return welcomeScreenData.updateWelcomeScreen(researchId, formData);
    },
    delete: async (): Promise<void> => {
      return welcomeScreenData.deleteWelcomeScreen();
    },
    isCreating: welcomeScreenData.isCreating,
    isUpdating: welcomeScreenData.isUpdating,
    isDeleting: welcomeScreenData.isDeleting
  };

  // Función para mapear datos de API a formulario
  const mapDataToForm = (data: WelcomeScreenModel | null): WelcomeScreenData => {
    if (!data) {
      return INITIAL_FORM_DATA;
    }
    return {
      title: data.title || '',
      message: data.message || '',
      startButtonText: data.startButtonText || '',
      isEnabled: data.isEnabled ?? true
    };
  };

  // Función para mapear formulario a request de creación
  const mapFormToCreate = (formData: WelcomeScreenData, researchId: string): CreateWelcomeScreenRequest => {
    return {
      researchId,
      isEnabled: formData.isEnabled,
      title: formData.title,
      message: formData.message,
      startButtonText: formData.startButtonText
    };
  };

  // Función para mapear formulario a request de actualización
  const mapFormToUpdate = (formData: WelcomeScreenData, researchId: string): UpdateWelcomeScreenRequest => {
    return {
      isEnabled: formData.isEnabled,
      title: formData.title,
      message: formData.message,
      startButtonText: formData.startButtonText
    };
  };

  // Función de validación
  const validateForm = (formData: WelcomeScreenData): Record<string, string> | null => {
    const errors: Record<string, string> = {};
    if (!formData.title) {
      errors.title = 'El título es requerido';
    }
    if (!formData.message) {
      errors.message = 'El mensaje es requerido';
    }
    if (!formData.startButtonText) {
      errors.startButtonText = 'El texto del botón es requerido';
    }
    return Object.keys(errors).length > 0 ? errors : null;
  };

  // Usar el hook genérico
  const baseHook = useResearchForm<WelcomeScreenModel, WelcomeScreenData, CreateWelcomeScreenRequest, UpdateWelcomeScreenRequest>({
    researchId,
    dataHook,
    initialFormData: INITIAL_FORM_DATA,
    mapDataToForm,
    mapFormToCreate,
    mapFormToUpdate,
    validateForm
  });

  // Función específica de preview
  const handlePreview = () => {
    if (!baseHook.formData.title || !baseHook.formData.message || !baseHook.formData.startButtonText) {
      toastHelpers.error('Por favor completa todos los campos antes de previsualizar');
      return;
    }

    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      const { title, message, startButtonText } = baseHook.formData;
      const previewHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Vista previa - ${title}</title>
          <style>
            body { font-family: sans-serif; margin: 40px; background-color: #f4f4f4; display: flex; justify-content: center; align-items: center; min-height: calc(100vh - 80px); }
            .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; max-width: 600px; width: 90%; }
            h1 { color: #333; margin-bottom: 15px; }
            .message { color: #555; line-height: 1.6; margin-bottom: 25px; white-space: pre-wrap; }
            button { background-color: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 16px; }
            button:hover { background-color: #0056b3; }
            .badge { position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 4px 8px; font-size: 12px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="badge">Vista Previa</div>
          <div class="container">
            <h1>${title}</h1>
            <div class="message">${message.replace(/\n/g, '<br>')}</div>
            <button>${startButtonText}</button>
          </div>
        </body>
        </html>
      `;
      previewWindow.document.write(previewHtml);
      previewWindow.document.close();
    } else {
      toastHelpers.error('No se pudo abrir la ventana de vista previa');
    }
  };

  return {
    ...baseHook,
    existingScreen: welcomeScreenData.data,
    handleSubmit: baseHook.handleSave,
    handlePreview
  };
};
