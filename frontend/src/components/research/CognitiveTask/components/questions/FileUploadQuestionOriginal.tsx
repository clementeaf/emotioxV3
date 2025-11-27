import { Trash2, Upload } from 'lucide-react';
import React, { useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { UploadedFile } from 'shared/interfaces/cognitive-task.interface';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import s3Service from '@/services/s3Service';

import { FileUploadQuestionProps } from '../../types';

import { LocalHitzoneEditor } from './LocalHitzoneEditor';

// Definir UIFile localmente extendiendo UploadedFile
interface UIFile extends UploadedFile {
  status?: 'uploading' | 'uploaded' | 'pending-delete' | 'error';
  progress?: number;
  isLoading?: boolean;
  questionId?: string;
}

const DEFAULT_TEXTS = {
  QUESTION_TITLE_PLACEHOLDER: 'Añadir pregunta',
  DESCRIPTION_LABEL: 'Descripción',
  DESCRIPTION_PLACEHOLDER: 'Introduce una descripción opcional',
  SHOW_CONDITIONALLY_LABEL: 'Mostrar condicionalmente',
  REQUIRED_LABEL: 'Obligatorio',
  UPLOAD_AREA_INSTRUCTION: 'Arrastra un archivo o',
  SELECT_FILE_BUTTON: 'Seleccionar archivo',
  UPLOAD_ANOTHER_FILE_BUTTON: 'Subir otro archivo',
  RESOLUTION_HINT: 'Resolución recomendada: 1000x1000px',
  UPLOADING_FILE_MESSAGE: 'Subiendo archivo...',
  PERCENTAGE_COMPLETE: '% completado',
  DEVICE_FRAME_LABEL: 'Marco de Dispositivo',
  WITH_FRAME: 'Con Marco',
  WITHOUT_FRAME: 'Sin Marco'
};

/**
 * Componente que maneja la configuración de preguntas con carga de archivos
 */
const FileUploadQuestionComponent: React.FC<FileUploadQuestionProps> = ({
  question,
  onQuestionChange,
  onFileUpload,
  onFileDelete,
  validationErrors,
  disabled,
  isUploading,
  uploadProgress
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para el modal de hitzones
  const [hitzoneModalOpen, setHitzoneModalOpen] = React.useState(false);
  const [hitzoneFile, setHitzoneFile] = React.useState<UIFile | null>(null);
  
  // Estado para URLs presignadas
  const [presignedUrls, setPresignedUrls] = React.useState<Record<string, string>>({});

  const titleError = validationErrors ? validationErrors['title'] : null;
  const descriptionError = validationErrors ? validationErrors['description'] : null;
  const filesError = validationErrors ? validationErrors['files'] : null;

  const isThisQuestionUploading = isUploading &&
    question.files?.some(file => (file as UIFile).isLoading);

  // Filtrar archivos con status 'error' antes de renderizar - memoizado
  const validFiles: UIFile[] = useMemo(
    () => question.files ? (question.files as UIFile[]).filter(f => f.status !== 'error') : [],
    [question.files]
  );

  // Generar un string estable de s3Keys para las dependencias
  const s3KeysString = useMemo(
    () => validFiles.map(f => f.s3Key || '').sort().join(','),
    [validFiles]
  );

  // Effect para obtener URLs presignadas para archivos con s3Key
  useEffect(() => {
    const fetchPresignedUrls = async () => {
      const newUrls: Record<string, string> = {};

      // Cargar URLs solo para archivos que no están en el estado de presignedUrls
      const filesToFetch = validFiles.filter(
        file => file.s3Key && file.type?.startsWith('image/') && !presignedUrls[file.id]
      );

      if (filesToFetch.length === 0) {
        return;
      }

      for (const file of filesToFetch) {
        try {
          const url = await s3Service.getDownloadUrl(file.s3Key!);
          newUrls[file.id] = url;
        } catch (error) {
          // Silenciar errores de carga de URLs
        }
      }

      if (Object.keys(newUrls).length > 0) {
        setPresignedUrls(prev => ({ ...prev, ...newUrls }));
      }
    };

    if (validFiles.length > 0) {
      fetchPresignedUrls();
    }
  }, [s3KeysString]) // Usar string estable memoizado

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onFileUpload) {
      // Procesar todos los archivos seleccionados
      onFileUpload(e.target.files);
      e.target.value = '';
    }
  };

  const openHitzoneEditor = async (file: UIFile) => {
    let url = '';
    
    // Priorizar fileUrl si está disponible
    if ((file as any).fileUrl) {
      url = (file as any).fileUrl;
    } else if (file.url?.startsWith('blob:')) {
      url = file.url;
    } else if (file.s3Key) {
      try {
        url = await s3Service.getDownloadUrl(file.s3Key);
      } catch (e) {
        url = '';
      }
    }

    // Usar SIEMPRE el campo 'hitZones' para las áreas iniciales
    const hitZones = (file as any).hitZones || [];
    console.log('openHitzoneEditor - file:', file);
    console.log('openHitzoneEditor - hitZones:', hitZones);

    setHitzoneFile({ ...file, url, hitZones } as any);
    setHitzoneModalOpen(true);
  };

  // Antes de mapear los archivos para renderizar - evitar duplicados (memoizado)
  const filesToShow: UIFile[] = useMemo(() => {
    const fileMap = new Map<string, UIFile>();

    // Procesar archivos en orden de prioridad
    validFiles.forEach(file => {
      const key = `${file.name}_${file.size}`;

      // Si ya existe un archivo con esta clave
      if (fileMap.has(key)) {
        const existing = fileMap.get(key)!;

        // Priorizar: uploaded > uploading > otros estados
        if (file.status === 'uploaded' && existing.status !== 'uploaded') {
          fileMap.set(key, file);
        } else if (file.status === 'uploading' && existing.status !== 'uploaded' && existing.status !== 'uploading') {
          fileMap.set(key, file);
        }
        // Si ambos tienen el mismo status, mantener el primero
      } else {
        // Si no existe, agregarlo
        fileMap.set(key, file);
      }
    });

    return Array.from(fileMap.values());
  }, [validFiles]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          placeholder={DEFAULT_TEXTS.QUESTION_TITLE_PLACEHOLDER}
          value={question.title || ''}
          onChange={(e) => onQuestionChange({ title: e.target.value })}
          className="w-full"
          disabled={disabled}
          error={!!titleError}
          helperText={titleError || undefined}
        />
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1 sr-only">
            {DEFAULT_TEXTS.DESCRIPTION_LABEL}
          </label>
          <Textarea
            value={question.description || ''}
            onChange={(e) => onQuestionChange({ description: e.target.value })}
            placeholder={DEFAULT_TEXTS.DESCRIPTION_PLACEHOLDER}
            rows={3}
            disabled={disabled}
            error={!!descriptionError}
          />
          {descriptionError && (
            <p className="mt-1 text-xs text-red-500">{descriptionError}</p>
          )}
        </div>
        {/* El input file oculto se mantiene para ser disparado por el botón inferior */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple // Permitir selección múltiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
          disabled={disabled || isThisQuestionUploading}
        />
      </div>

      <div className="p-6 border-2 border-dashed rounded-lg bg-neutral-50 flex flex-col items-center justify-center gap-3">
        {(filesToShow as UIFile[]).length > 0 ? (
          <div className="w-full space-y-3">
            {isThisQuestionUploading && (
              <div className="flex flex-col items-center gap-3 w-full mb-2">
                <p className="text-sm text-neutral-600">{DEFAULT_TEXTS.UPLOADING_FILE_MESSAGE}</p>
                <div className="w-full bg-neutral-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${uploadProgress || 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-neutral-500">{uploadProgress || 0}{DEFAULT_TEXTS.PERCENTAGE_COMPLETE}</p>
              </div>
            )}
            {(filesToShow as UIFile[]).map((file: UIFile, index) => {
              const isPendingDelete = file.status === 'pending-delete';
              const hasPresignedUrl = presignedUrls[file.id];
              const needsPresignedUrl = file.s3Key && file.type?.startsWith('image/') && !hasPresignedUrl;
              const imageUrl = hasPresignedUrl || (file as any).fileUrl || file.url;
              
              return (
                <div
                  key={`${file.id}_${index}`}
                  className={`flex items-center justify-between p-2 bg-white border rounded transition-opacity duration-300 ${isPendingDelete ? 'opacity-50 border-dashed border-amber-400' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {file.type?.startsWith('image/') ? (
                      <div className="relative w-10 h-10">
                        {needsPresignedUrl ? (
                          // Mostrar spinner mientras se carga la URL presignada
                          <div className="w-10 h-10 bg-gray-100 flex items-center justify-center rounded">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          <img
                            src={imageUrl}
                            alt={file.name}
                            loading="lazy"
                            className={`w-10 h-10 object-cover rounded ${file.isLoading ? 'opacity-50' : ''}`}
                            crossOrigin="anonymous"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" fill="%23f0f0f0"/><text x="20" y="20" font-family="Arial" font-size="8" text-anchor="middle" dominant-baseline="middle" fill="%23999">Error</text></svg>';
                            }}
                          />
                        )}
                        {file.isLoading && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-blue-100 flex items-center justify-center rounded">
                        <span className="text-xs text-blue-700">{file.type?.split('/')[1] || 'file'}</span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium truncate max-w-xs">{file.name}</p>
                      <p className="text-xs text-neutral-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {isPendingDelete && (
                        <p className="text-xs text-amber-600 italic">Pendiente de eliminar...</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPendingDelete && onFileDelete) {
                        onFileDelete(file.id);
                      }
                    }}
                    className={`p-1 rounded ${isPendingDelete ? 'text-gray-400 cursor-not-allowed' : 'text-red-500 hover:text-red-700 hover:bg-red-50'} delete-file-button transition-colors`}
                    disabled={disabled || isPendingDelete}
                    data-role="delete-file"
                    data-file-id={file.id}
                    data-question-id={question.id}
                    aria-label={isPendingDelete ? 'Archivo pendiente de eliminar' : 'Eliminar archivo'}
                  >
                    <Trash2 size={18} />
                  </button>
                  {file.type?.startsWith('image/') && !isPendingDelete && question.type === 'navigation_flow' && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => openHitzoneEditor(file)}
                      disabled={disabled || (!file.s3Key && !file.url?.startsWith('blob:'))}
                      title={file.s3Key || (file.url?.startsWith('blob:')) ? undefined : 'Primero sube o selecciona un archivo de imagen'}
                    >
                      Edit hitzone
                    </Button>
                  )}
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              onClick={handleButtonClick}
              className="w-full mt-3"
              disabled={disabled || isThisQuestionUploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {DEFAULT_TEXTS.UPLOAD_ANOTHER_FILE_BUTTON}
            </Button>
          </div>
        ) : (
          <>
            <Upload size={24} className="text-neutral-400" />
            <p className="text-sm text-neutral-600">{DEFAULT_TEXTS.UPLOAD_AREA_INSTRUCTION}</p>
            <Button
              type="button"
              variant="outline"
              onClick={handleButtonClick}
              disabled={disabled || isThisQuestionUploading}
            >
              {DEFAULT_TEXTS.SELECT_FILE_BUTTON}
            </Button>
            <p className="text-xs text-neutral-500">{DEFAULT_TEXTS.RESOLUTION_HINT}</p>
          </>
        )}
        {filesError && (
          <p className="mt-2 text-xs text-red-500 w-full text-center">{filesError}</p>
        )}
      </div>

      {/* VISTA PREVIA: No editable */}
      {filesToShow.length > 0 && (
        <div className="bg-neutral-50 p-3 border border-gray-300 rounded-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vista previa - Así verán esta pregunta los participantes
            <span className="ml-2 text-xs font-normal text-red-500">(NO EDITABLE)</span>
          </label>
          <div className="mt-2 text-sm text-gray-700 font-medium">{question.title || 'Título de la pregunta'}</div>
          {question.description && <div className="mt-1 text-xs text-gray-500">{question.description}</div>}

          <div className="mt-3 grid grid-cols-2 gap-3">
            {filesToShow.map((file) => {
              const imageUrl = presignedUrls[file.id] || (file as any).fileUrl || file.url;
              const needsPresignedUrl = file.s3Key && file.type?.startsWith('image/') && !presignedUrls[file.id];

              return (
                <div key={file.id} className="relative">
                  {file.type?.startsWith('image/') && imageUrl ? (
                    needsPresignedUrl ? (
                      <div className="w-full h-48 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <img
                        src={imageUrl}
                        alt={file.name}
                        loading="lazy"
                        className="w-full h-48 object-cover rounded border border-gray-200"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f0f0f0"/><text x="100" y="100" font-family="Arial" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="%23999">Imagen no disponible</text></svg>';
                        }}
                      />
                    )
                  ) : (
                    <div className="w-full h-48 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-400">Archivo: {file.name}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {question.type === 'preference_test' && filesToShow.length === 2 && (
            <div className="mt-3 text-center">
              <p className="text-xs text-gray-500 italic">Los participantes seleccionarán una de estas opciones</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de edición de hitzones */}
      {hitzoneModalOpen && hitzoneFile && (typeof window !== 'undefined' ? ReactDOM.createPortal(
        <div className="fixed inset-0 w-screen h-screen top-0 left-0 z-50 flex items-center justify-center bg-black bg-opacity-40 m-0 p-0">
          <div className="bg-white rounded-lg shadow-lg py-6 px-8 w-auto relative flex flex-col items-center">
            <h2 className="text-lg font-semibold mb-4 text-center">Editar hitzones para: {hitzoneFile.name}</h2>
            <LocalHitzoneEditor
              imageUrl={(hitzoneFile as any).fileUrl || hitzoneFile.url}
              initialAreas={((hitzoneFile as any).hitZones || []).map((hitZone: any) => {
                // Intentar diferentes estructuras de datos posibles
                const region = hitZone.region || hitZone;
                console.log('FileUploadQuestion - Processing hitZone:', hitZone);
                console.log('FileUploadQuestion - Resolved region:', region);
                const processedArea = {
                  id: hitZone.id || `hitzone_${Date.now()}_${Math.random()}`,
                  x: region.x || 0,
                  y: region.y || 0,
                  width: region.width || 0,
                  height: region.height || 0,
                };
                console.log('FileUploadQuestion - processedArea:', processedArea);
                return processedArea;
              })}
              onSave={(newAreas) => {
                const updatedFiles = question.files?.map(f => {
                  if (f.id === hitzoneFile.id) {
                    const hitZones = newAreas.map(area => {
                      const x = typeof area.x === 'number' && !isNaN(area.x) ? area.x : 0;
                      const y = typeof area.y === 'number' && !isNaN(area.y) ? area.y : 0;
                      const width = typeof area.width === 'number' && !isNaN(area.width) ? area.width : 0;
                      const height = typeof area.height === 'number' && !isNaN(area.height) ? area.height : 0;

                      return {
                        id: area.id,
                        name: '',
                        fileId: f.id,
                        region: { x, y, width, height },
                      };
                    });

                    return {
                      ...f,
                      hitZones
                    };
                  }
                  return f;
                }) || [];

                onQuestionChange({ files: updatedFiles });
                setHitzoneModalOpen(false);
              }}
              onClose={() => setHitzoneModalOpen(false)}
            />
          </div>
        </div>,
        document.body as Element
      ) : null)}
    </div>
  );
};

// Exportar el componente memoizado con comparación personalizada
export const FileUploadQuestion = React.memo(FileUploadQuestionComponent, (prevProps, nextProps) => {
  // Comparar solo las propiedades que realmente afectan el render
  return (
    prevProps.question.id === nextProps.question.id &&
    prevProps.question.title === nextProps.question.title &&
    prevProps.question.description === nextProps.question.description &&
    prevProps.question.type === nextProps.question.type &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.isUploading === nextProps.isUploading &&
    prevProps.uploadProgress === nextProps.uploadProgress &&
    JSON.stringify(prevProps.question.files?.map(f => ({
      id: f.id,
      s3Key: f.s3Key,
      status: (f as any).status,
      hitZones: (f as any).hitZones
    }))) ===
    JSON.stringify(nextProps.question.files?.map(f => ({
      id: f.id,
      s3Key: f.s3Key,
      status: (f as any).status,
      hitZones: (f as any).hitZones
    }))) &&
    JSON.stringify(prevProps.validationErrors) === JSON.stringify(nextProps.validationErrors)
  );
});
