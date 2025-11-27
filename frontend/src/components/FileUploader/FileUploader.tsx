import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useFileUpload } from '../../hooks/useFileUpload';

interface FileUploaderProps {
  researchId: string;
  folder?: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // en bytes
  onUploadComplete?: (fileData: { fileUrl: string; key: string }) => void;
  onUploadError?: (error: Error) => void;
}

// Clave para localStorage por investigación y carpeta
const getStorageKey = (researchId: string, folder: string) =>
  `fileuploader_selection_${researchId}_${folder}`;

const FileUploader: React.FC<FileUploaderProps> = ({
  researchId,
  folder = 'general',
  accept = '*/*',
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB por defecto
  onUploadComplete,
  onUploadError
}) => {
  const [dragging, setDragging] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isUploading,
    progress,
    error,
    uploadedUrl,
    fileKey,
    uploadFile,
    resetState
  } = useFileUpload();

  // Persistir archivos seleccionados en localStorage
  const persistSelectedFilesInfo = (files: File[]) => {
    try {
      // Solo podemos guardar información básica, no el archivo en sí
      const fileInfos = files.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      }));

      // Guardar en localStorage para recuperar la UI si el usuario navega fuera
      const storageKey = getStorageKey(researchId, folder);
      localStorage.setItem(storageKey, JSON.stringify({
        timestamp: new Date().toISOString(),
        files: fileInfos
      }));
    } catch (error) {
    }
  };

  // Cargar estado persistido al montar el componente
  useEffect(() => {
    try {
      const storageKey = getStorageKey(researchId, folder);
      const savedData = localStorage.getItem(storageKey);

      if (savedData) {
        const parsed = JSON.parse(savedData);

        // No podemos recuperar los File objects, pero podemos mostrar la UI
        // para indicar al usuario que tenía archivos seleccionados
        if (parsed.files?.length > 0) {
          // Solo actualizamos la UI si no hay archivos seleccionados ya
          if (selectedFiles.length === 0) {
            setSelectedFiles([]);
            // Agregar un mensaje indicando que debe reseleccionar los archivos
            setErrors(['Se encontraron selecciones previas. Por favor, selecciona los archivos nuevamente.']);
          }
        }
      }
    } catch (error) {
    }
  }, [researchId, folder, selectedFiles.length]);

  // Creamos la referencia en el nivel superior del componente
  const processedRef = useRef(false);

  // Este efecto maneja específicamente la recuperación de archivos completados
  useEffect(() => {
    if (!researchId || !folder || !onUploadComplete) {return;}

    // Ya no creamos la referencia aquí, usamos la creada en el nivel superior
    if (processedRef.current) {return;}

    const completedStorageKey = `fileuploader_completed_${researchId}_${folder}`;
    const processCompletedData = () => {
      if (processedRef.current) {return;}

      try {
        const completedData = localStorage.getItem(completedStorageKey);
        if (completedData) {
          const parsedData = JSON.parse(completedData);
          if (parsedData.fileUrl && parsedData.key) {
            // Marcamos como procesado antes de cualquier operación para evitar repetición
            processedRef.current = true;

            // Eliminamos del localStorage primero
            localStorage.removeItem(completedStorageKey);

            // Notificamos con pequeño retraso para dar tiempo al componente de estabilizarse
            setTimeout(() => {
              onUploadComplete(parsedData);
            }, 50);
          }
        }
      } catch (error) {
        localStorage.removeItem(completedStorageKey);
      }
    };

    // Ejecutamos la función después de un breve retraso para permitir que el componente
    // termine su renderizado inicial
    const timer = setTimeout(processCompletedData, 100);

    // Limpieza
    return () => {
      clearTimeout(timer);
    };
  }, [researchId, folder, onUploadComplete]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      validateAndSetFiles(files);
      // Persistir selección para recuperarla si el usuario navega fuera
      persistSelectedFilesInfo(files);
    }
  };

  const validateAndSetFiles = (files: File[]) => {
    const validFiles: File[] = [];
    const errorMessages: string[] = [];

    files.forEach(file => {
      // Validar tamaño
      if (file.size > maxSize) {
        errorMessages.push(`El archivo "${file.name}" excede el tamaño máximo permitido`);
        return;
      }

      // Validar tipo (solo si accept no es '*/*')
      if (accept !== '*/*') {
        const acceptTypes = accept.split(',').map(type => type.trim());
        const fileType = file.type || '';

        const matchesType = acceptTypes.some(type => {
          if (type.endsWith('/*')) {
            const baseType = type.split('/')[0];
            return fileType.startsWith(`${baseType}/`);
          }
          return type === fileType;
        });

        if (!matchesType) {
          errorMessages.push(`El archivo "${file.name}" no es un tipo permitido`);
          return;
        }
      }

      validFiles.push(file);
    });

    setSelectedFiles(validFiles);
    setErrors(errorMessages);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);

    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      validateAndSetFiles(files);
      // Persistir selección para recuperarla si el usuario navega fuera
      persistSelectedFilesInfo(files);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {return;}

    setErrors([]);
    resetState();

    try {
      // Para simplificar, tomamos solo el primer archivo si no es multiple
      const fileToUpload = selectedFiles[0];

      const result = await uploadFile(fileToUpload, researchId, folder);

      // Guardar el resultado en localStorage para garantizar que se procese
      // incluso si el usuario navega fuera antes de que se complete el callback
      const completedStorageKey = `fileuploader_completed_${researchId}_${folder}`;
      localStorage.setItem(completedStorageKey, JSON.stringify(result));

      if (onUploadComplete) {
        onUploadComplete(result);
        // Eliminar después de procesar exitosamente
        localStorage.removeItem(completedStorageKey);
      }

      // Limpiar selección después de subir exitosamente
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Limpiar localStorage para este researchId y folder
      try {
        const storageKey = getStorageKey(researchId, folder);
        localStorage.removeItem(storageKey);
      } catch (error) {
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido al subir');

      if (onUploadError) {
        onUploadError(error);
      }

      setErrors(prev => [...prev, error.message]);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="file-uploader">
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept={accept}
          multiple={multiple}
        />

        {selectedFiles.length > 0 ? (
          <div className="selected-files">
            <p>Archivos seleccionados:</p>
            <ul>
              {selectedFiles.map((file, index) => (
                <li key={index}>
                  {file.name} ({Math.round(file.size / 1024)} KB)
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="dropzone-placeholder">
            <p>Arrastra y suelta archivos aquí o haz clic para seleccionar</p>
            <small>
              {accept !== '*/*'
                ? `Tipos aceptados: ${accept}`
                : 'Todos los tipos de archivo'
              }
            </small>
            <small>Tamaño máximo: {Math.round(maxSize / (1024 * 1024))}MB</small>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div className="upload-errors">
          {errors.map((error, index) => (
            <p key={index} className="error-message">{error}</p>
          ))}
        </div>
      )}

      {isUploading ? (
        <div className="upload-progress">
          <div
            className="progress-bar"
            style={{ width: `${progress}%` }}
          />
          <span>{progress}%</span>
        </div>
      ) : (
        selectedFiles.length > 0 && (
          <button
            className="upload-button"
            onClick={handleUpload}
            disabled={isUploading}
          >
            Subir archivo
          </button>
        )
      )}

      {uploadedUrl && (
        <div className="upload-success">
          <p>¡Archivo subido con éxito!</p>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
