import toast from 'react-hot-toast';

/**
 * Duración por defecto de los toasts (en milisegundos)
 */
const DEFAULT_DURATION = 3000;

/**
 * Configuración de estilos para los toasts
 */
const TOAST_STYLES = {
  success: {
    duration: DEFAULT_DURATION,
    style: {
      background: '#fff',
      color: '#333',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
    iconTheme: {
      primary: '#10b981',
      secondary: '#fff',
    },
  },
  error: {
    duration: 4000,
    style: {
      background: '#fff',
      color: '#333',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
    iconTheme: {
      primary: '#ef4444',
      secondary: '#fff',
    },
  },
};

/**
 * Muestra un toast de éxito con mensaje personalizado
 */
export const showSuccessToast = (message: string) => {
  toast.success(message, TOAST_STYLES.success);
};

/**
 * Muestra un toast de error con mensaje personalizado
 */
export const showErrorToast = (message: string) => {
  toast.error(message, TOAST_STYLES.error);
};

/**
 * Muestra un toast genérico
 */
export const showToast = (message: string) => {
  toast(message, {
    duration: DEFAULT_DURATION,
    style: TOAST_STYLES.success.style,
  });
};

/**
 * Mensajes predefinidos para operaciones comunes
 */
export const TOAST_MESSAGES = {
  SAVE_SUCCESS: 'Configuración guardada correctamente',
  UPDATE_SUCCESS: 'Configuración actualizada correctamente',
  DELETE_SUCCESS: 'Configuración eliminada correctamente',
  SAVE_ERROR: 'Error al guardar la configuración',
  UPDATE_ERROR: 'Error al actualizar la configuración',
  DELETE_ERROR: 'Error al eliminar la configuración',
} as const;

/**
 * Utilidades para operaciones CRUD comunes
 */
export const toastHelpers = {
  saveSuccess: (entityName?: string) => {
    const message = entityName
      ? `${entityName} guardado correctamente`
      : TOAST_MESSAGES.SAVE_SUCCESS;
    showSuccessToast(message);
  },

  updateSuccess: (entityName?: string) => {
    const message = entityName
      ? `${entityName} actualizado correctamente`
      : TOAST_MESSAGES.UPDATE_SUCCESS;
    showSuccessToast(message);
  },

  deleteSuccess: (entityName?: string) => {
    const message = entityName
      ? `${entityName} eliminado correctamente`
      : TOAST_MESSAGES.DELETE_SUCCESS;
    showSuccessToast(message);
  },

  error: (customMessage?: string) => {
    showErrorToast(customMessage || 'Ha ocurrido un error');
  },
};