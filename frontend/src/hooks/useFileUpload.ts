import { useState, useCallback } from 'react';
import s3Service from '../services/s3Service';
import { FileUploadParams } from '../services/s3Service';

interface FileUploadState {
  isUploading: boolean;
  progress: number;
  error: Error | null;
  uploadedUrl: string | null;
  fileKey: string | null;
}

interface UseFileUploadReturn extends FileUploadState {
  uploadFile: (file: File, researchId: string, folder?: string) => Promise<{ fileUrl: string; key: string }>;
  resetState: () => void;
  getDownloadUrl: (key: string) => Promise<string>;
  deleteFile: (key: string) => Promise<boolean>;
}

/**
 * Hook personalizado para gestionar la carga de archivos a S3
 * Proporciona estado de carga, progreso y funciones para subir, descargar y eliminar archivos
 */
export function useFileUpload(): UseFileUploadReturn {
  const [state, setState] = useState<FileUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    uploadedUrl: null,
    fileKey: null
  });

  const resetState = useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      uploadedUrl: null,
      fileKey: null
    });
  }, []);

  /**
   * Sube un archivo a S3
   * @param file - El archivo a subir
   * @param researchId - ID de la investigación asociada al archivo
   * @param folder - La carpeta opcional donde se almacenará el archivo
   * @returns Objeto con la URL del archivo subido y su clave en S3
   */
  const uploadFile = useCallback(async (
    file: File, 
    researchId: string, 
    folder?: string
  ): Promise<{ fileUrl: string; key: string }> => {
    try {
      setState(prev => ({ ...prev, isUploading: true, progress: 0, error: null }));
      
      // Actualizar el progreso durante la carga
      const progressCallback = (progress: number) => {
        setState(prev => ({ ...prev, progress }));
      };

      // Configurar callbacks para éxito y error
      const onSuccess = (fileUrl: string, key: string) => {
        setState(prev => ({ 
          ...prev, 
          isUploading: false, 
          progress: 100, 
          uploadedUrl: fileUrl,
          fileKey: key
        }));
      };

      const onError = (error: Error) => {
        setState(prev => ({ 
          ...prev, 
          isUploading: false, 
          error 
        }));
      };

      // Preparar parámetros para la subida
      const uploadParams: FileUploadParams = {
        file,
        researchId,
        folder,
        progressCallback,
        onSuccess,
        onError
      };

      // Subir el archivo
      return await s3Service.uploadFile(uploadParams);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Error al subir el archivo');
      setState(prev => ({ 
        ...prev, 
        isUploading: false, 
        error: err 
      }));
      throw err;
    }
  }, []);

  /**
   * Obtiene una URL para descargar un archivo
   * @param key - La clave del archivo en S3
   * @returns La URL de descarga
   */
  const getDownloadUrl = useCallback(async (key: string): Promise<string> => {
    try {
      return await s3Service.getDownloadUrl(key);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Error al obtener la URL de descarga');
      setState(prev => ({ ...prev, error: err }));
      throw err;
    }
  }, []);

  /**
   * Elimina un archivo de S3
   * @param key - La clave del archivo en S3
   * @returns true si la eliminación fue exitosa
   */
  const deleteFile = useCallback(async (key: string): Promise<boolean> => {
    try {
      await s3Service.deleteFile(key);
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Error al eliminar el archivo');
      setState(prev => ({ ...prev, error: err }));
      throw err;
    }
  }, []);

  return {
    ...state,
    uploadFile,
    resetState,
    getDownloadUrl,
    deleteFile,
  };
}

export default useFileUpload; 