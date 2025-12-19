import { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';
import { mediaService } from '../../services/media.service';
import { getPresignedUrl } from '../../utils/presignedUrlCache';

/**
 * Interfaz para archivos subidos
 */
export interface UploadedFile {
    id: string;
    name: string;
    size: number;
    type: string;
    url?: string;
    urlExpiresAt?: number; // Timestamp de cuando expira la URL presigned
    s3Key?: string;
    mediaId?: string; // ID del registro en la tabla media (backend)
    hitZones?: Array<{
        id: string;
        name?: string;
        fileId: string;
        region: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    }>;
    status?: 'uploading' | 'uploaded' | 'error';
    progress?: number;
}

interface FileUploadAdvancedProps {
    label?: string;
    description?: string;
    error?: string;
    acceptedFormats?: string[];
    maxSizeMB?: number;
    multiple?: boolean;
    files?: UploadedFile[];
    onFilesChange?: (files: UploadedFile[]) => void;
    onFileDelete?: (fileId: string) => void;
    onHitzoneEdit?: (file: UploadedFile) => void;
    showHitzoneEditor?: boolean;
    disabled?: boolean;
    className?: string;
    researchId?: string; // For S3 upload
    onUploadStart?: () => void;
    onUploadComplete?: () => void;
    onUploadError?: (error: Error) => void;
}

/**
 * Componente avanzado de carga de archivos con soporte para múltiples archivos,
 * vista previa, y editor de hitzones para Navigation Flow
 */
export const FileUploadAdvanced = ({
    label,
    description,
    error,
    acceptedFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
    maxSizeMB = 5,
    multiple = true,
    files = [],
    onFilesChange,
    onFileDelete,
    onHitzoneEdit,
    showHitzoneEditor = false,
    disabled = false,
    className,
    researchId,
    onUploadStart,
    onUploadComplete,
    onUploadError,
}: FileUploadAdvancedProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [localFiles, setLocalFiles] = useState<UploadedFile[]>(files);
    const localFilesRef = useRef<UploadedFile[]>(files);
    const loadingUrlsRef = useRef<Set<string>>(new Set()); // Rastrear URLs que se están cargando
    const onFilesChangeRef = useRef(onFilesChange);
    const lastFilesRef = useRef<string>(''); // Para evitar actualizaciones innecesarias
    const loadUrlsTimeoutRef = useRef<number | null>(null); // Para debounce

    // Mantener la referencia actualizada sin causar re-renders
    useEffect(() => {
        onFilesChangeRef.current = onFilesChange;
    }, [onFilesChange]);

    useEffect(() => {
        // Solo actualizar si los files realmente cambiaron (comparar por JSON para evitar loops)
        const filesKey = JSON.stringify(files.map(f => ({ id: f.id, url: f.url, s3Key: f.s3Key })));
        if (filesKey !== lastFilesRef.current) {
            lastFilesRef.current = filesKey;
            setLocalFiles(files);
        }
    }, [files]);

    useEffect(() => {
        localFilesRef.current = localFiles;
    }, [localFiles]);

    /**
     * Identifica archivos que necesitan URL presigned o que necesitan refrescar su URL
     */
    const filesNeedingUrl = useMemo(() => {
        const now = Date.now();
        const refreshBuffer = 5 * 60 * 1000; // Refrescar 5 minutos antes de que expire
        
        return localFiles.filter((file) => {
            if (!file.s3Key) return false;
            if (file.status === 'uploading' || file.status === 'error') return false;
            
            // No intentar si ya se está cargando
            if (loadingUrlsRef.current.has(file.s3Key)) return false;
            
            // Necesita URL si no tiene una o está vacía
            if (!file.url || file.url === '') return true;
            
            // Necesita refrescar si la URL está por expirar o ya expiró
            if (file.urlExpiresAt) {
                return now >= (file.urlExpiresAt - refreshBuffer);
            }
            
            // Si no tiene urlExpiresAt, asumir que necesita refrescar (URL antigua)
            return true;
        });
    }, [localFiles]);

    /**
     * Determines whether it's safe to use a stored presigned URL for rendering.
     * If expiry is unknown (missing urlExpiresAt) or it's near expiry, we avoid using it to prevent noisy 403s.
     * @param file - Uploaded file
     * @returns true when the existing URL should be used as <img src>
     */
    const shouldUseExistingPresignedUrl = (file: UploadedFile): boolean => {
        if (!file.s3Key) {
            return true;
        }
        if (typeof file.urlExpiresAt !== 'number') {
            return false;
        }
        const refreshBufferMs = 5 * 60 * 1000;
        return Date.now() < (file.urlExpiresAt - refreshBufferMs);
    };

    /**
     * Efecto para obtener URLs presigned de archivos existentes que tienen s3Key pero no url
     */
    useEffect(() => {
        // Limpiar timeout anterior si existe
        if (loadUrlsTimeoutRef.current) {
            clearTimeout(loadUrlsTimeoutRef.current);
        }

        // Debounce: esperar 300ms antes de cargar URLs para evitar llamadas múltiples
        loadUrlsTimeoutRef.current = setTimeout(async () => {
            if (filesNeedingUrl.length === 0) {
                return;
            }

            // Filtrar archivos que ya se están cargando
            const filesToLoad = filesNeedingUrl.filter(
                (file) => file.s3Key && !loadingUrlsRef.current.has(file.s3Key)
            );

            if (filesToLoad.length === 0) {
                return;
            }

            // Marcar como cargando ANTES de hacer las peticiones
            filesToLoad.forEach((file) => {
                if (file.s3Key) {
                    loadingUrlsRef.current.add(file.s3Key);
                }
            });

            const updatedFiles = [...localFilesRef.current];

            await Promise.all(
                filesToLoad.map(async (file) => {
                    if (!file.s3Key) return;

                    try {
                        // Usar caché global para evitar peticiones duplicadas
                        const result = await getPresignedUrl(file.s3Key, () => 
                            mediaService.getMediaUrlByS3Key(file.s3Key!)
                        );
                        
                        const fileIndex = updatedFiles.findIndex((f) => f.id === file.id);
                        if (fileIndex !== -1) {
                            updatedFiles[fileIndex] = {
                                ...updatedFiles[fileIndex],
                                url: result.url,
                                urlExpiresAt: result.expiresAt,
                                mediaId: result.mediaId || updatedFiles[fileIndex].mediaId,
                            };
                        }
                    } catch (error) {
                        console.warn(`Failed to get presigned URL for file ${file.name} with s3Key ${file.s3Key}:`, error);
                    } finally {
                        // Remover de la lista de cargando
                        if (file.s3Key) {
                            loadingUrlsRef.current.delete(file.s3Key);
                        }
                    }
                })
            );

            // Solo actualizar si hay cambios
            const currentById = new Map(localFilesRef.current.map((f) => [f.id, f]));
            const hasChanges = updatedFiles.some((f) => {
                const oldFile = currentById.get(f.id);
                return (
                    !oldFile ||
                    f.url !== oldFile.url ||
                    f.urlExpiresAt !== oldFile.urlExpiresAt ||
                    f.mediaId !== oldFile.mediaId
                );
            });
            
            if (hasChanges) {
                setLocalFiles(updatedFiles);
                onFilesChangeRef.current?.(updatedFiles);
            }
        }, 300); // Debounce de 300ms

        return () => {
            if (loadUrlsTimeoutRef.current) {
                clearTimeout(loadUrlsTimeoutRef.current);
            }
        };
        // Solo disparar cuando cambian los s3Keys que necesitan URL
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filesNeedingUrl.map(f => f.s3Key).join(',')]);

    /**
     * Efecto para refrescar URLs automáticamente antes de que expiren
     */
    useEffect(() => {
        const refreshInterval = setInterval(() => {
            setLocalFiles(currentFiles => {
                const now = Date.now();
                const refreshBuffer = 5 * 60 * 1000; // Refrescar 5 minutos antes de que expire
                
                const filesToRefresh = currentFiles.filter(
                    (file) => file.s3Key && 
                             file.url && 
                             file.urlExpiresAt && 
                             now >= (file.urlExpiresAt - refreshBuffer)
                );

                if (filesToRefresh.length > 0) {
                    // Forzar actualización de filesNeedingUrl
                    const updatedFiles = [...currentFiles];
                    filesToRefresh.forEach((file) => {
                        const fileIndex = updatedFiles.findIndex((f) => f.id === file.id);
                        if (fileIndex !== -1) {
                            // Marcar como que necesita refrescar removiendo urlExpiresAt
                            updatedFiles[fileIndex] = {
                                ...updatedFiles[fileIndex],
                                urlExpiresAt: undefined,
                            };
                        }
                    });
                    return updatedFiles;
                }
                
                return currentFiles;
            });
        }, 60 * 1000); // Verificar cada minuto

        return () => clearInterval(refreshInterval);
    }, []); // Sin dependencias - el intervalo usa el estado actual

    /**
     * Upload a single file to S3 and save metadata
     * @param file - Archivo a subir
     * @param fileId - ID único del archivo
     * @returns Archivo subido con información de S3
     */
    const uploadFileToS3 = async (file: File, fileId: string): Promise<UploadedFile> => {
        if (!researchId) {
            // If no researchId, just use local blob URL (fallback to old behavior)
            return {
                id: fileId,
                name: file.name,
                size: file.size,
                type: file.type,
                url: URL.createObjectURL(file),
                status: 'uploaded',
                hitZones: [],
            };
        }

        try {
            // Validar que el archivo tenga un tipo MIME válido
            // Si no tiene tipo, usar 'application/octet-stream' como fallback
            const contentType = file.type || 'application/octet-stream';
            
            // 1. Request presigned URL from backend
            const { upload_url, s3_key } = await mediaService.generateUploadUrl({
                research_id: researchId,
                file_name: file.name,
                content_type: contentType,
            });

            // 2. Upload file to S3 using presigned URL
            // IMPORTANT: El Content-Type debe coincidir exactamente con el usado en la generación del presignedUrl
            // No incluir headers adicionales que no estén en la firma del presignedUrl
            // No usar credentials: 'include' ya que puede causar problemas de CORS con presignedUrls
            let uploadResponse: Response;
            try {
                uploadResponse = await fetch(upload_url, {
                    method: 'PUT',
                    body: file,
                    headers: {
                        // Usar el mismo contentType que se usó para generar el presignedUrl
                        'Content-Type': contentType,
                    },
                });
            } catch (fetchError) {
                // Error de red o CORS
                if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
                    throw new Error(`Network error or CORS issue: ${fetchError.message}. Please check S3 bucket CORS configuration.`);
                }
                throw fetchError;
            }

            // Verificar que el status code sea 200 (S3 devuelve 200 en éxito)
            if (uploadResponse.status !== 200) {
                let errorText: string;
                try {
                    errorText = await uploadResponse.text();
                } catch {
                    errorText = uploadResponse.statusText || 'Unknown error';
                }
                
                // Proporcionar mensaje de error más descriptivo
                if (uploadResponse.status === 403) {
                    throw new Error(`S3 upload forbidden (403). The presigned URL may have expired or the bucket policy is incorrect. Details: ${errorText}`);
                } else if (uploadResponse.status === 400) {
                    throw new Error(`S3 upload bad request (400). Content-Type mismatch or invalid request. Details: ${errorText}`);
                } else {
                    throw new Error(`S3 upload failed with status ${uploadResponse.status}: ${errorText}`);
                }
            }

            // 3. Save metadata to backend
            const { media } = await mediaService.saveMetadata({
                research_id: researchId,
                s3_key,
                metadata: {
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                },
            });

            // 4. Obtener URL de descarga para mostrar la imagen
            let imageUrl: string | undefined;
            let urlExpiresAt: number | undefined;
            try {
                const result = await mediaService.getMediaUrl(media.id);
                imageUrl = result.url;
                // Calcular cuándo expira la URL (expires_in está en segundos)
                const expiresIn = result.expires_in || 3600;
                urlExpiresAt = Date.now() + (expiresIn * 1000);
            } catch (urlError) {
                console.warn('Failed to get media URL, will use s3Key only:', urlError);
            }

            // 5. Return uploaded file with S3 info
            return {
                id: fileId,
                name: file.name,
                size: file.size,
                type: file.type,
                url: imageUrl,
                urlExpiresAt,
                s3Key: s3_key,
                mediaId: media.id,
                status: 'uploaded',
                hitZones: [],
            };
        } catch (error) {
            console.error('File upload error:', error);
            // Proporcionar más información sobre el error
            if (error instanceof Error) {
                throw new Error(`Failed to upload ${file.name}: ${error.message}`);
            }
            throw new Error(`Failed to upload ${file.name}: Unknown error`);
        }
    };

    const handleFileSelect = async (selectedFiles: FileList | null): Promise<void> => {
        if (!selectedFiles || selectedFiles.length === 0) return;

        const newFiles: UploadedFile[] = [];
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        const filesToUpload = Array.from(selectedFiles);

        // Validate files first
        for (const file of filesToUpload) {
            if (file.size > maxSizeBytes) {
                console.error(`File ${file.name} exceeds maximum size of ${maxSizeMB}MB`);
                continue;
            }

            if (acceptedFormats.length > 0 && !acceptedFormats.includes(file.type)) {
                console.error(`File ${file.name} is not an accepted format`);
                continue;
            }

            const fileId = crypto.randomUUID();
            
            // Create placeholder with uploading status
            newFiles.push({
                id: fileId,
                name: file.name,
                size: file.size,
                type: file.type,
                status: 'uploading',
                progress: 0,
                hitZones: [],
            });
        }

        // Update UI with uploading files immediately
        const updatedFiles = multiple ? [...localFiles, ...newFiles] : newFiles;
        setLocalFiles(updatedFiles);
        onFilesChangeRef.current?.(updatedFiles);
        onUploadStart?.();

        // Upload files to S3 in parallel
        try {
            const uploadPromises = filesToUpload.map(async (file, index) => {
                const fileId = newFiles[index]?.id;
                if (!fileId) return null;

                try {
                    const uploadedFile = await uploadFileToS3(file, fileId);
                    return uploadedFile;
                } catch (error) {
                    console.error(`Failed to upload ${file.name}:`, error);
                    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
                    onUploadError?.(error instanceof Error ? error : new Error(errorMessage));
                    
                    // Actualizar el archivo con estado de error
                    return {
                        ...newFiles[index],
                        status: 'error' as const,
                    };
                }
            });

            const uploadedFiles = (await Promise.all(uploadPromises)).filter((f): f is UploadedFile => f !== null);
            
            // Separar archivos exitosos y con error
            const successfulFiles = uploadedFiles.filter(f => f.status !== 'error');
            const failedFiles = uploadedFiles.filter(f => f.status === 'error');
            
            // Si hay archivos con error, mantenerlos en la lista pero marcados
            const finalFiles = multiple 
                ? [...localFiles.filter(f => !newFiles.some(nf => nf.id === f.id)), ...uploadedFiles]
                : uploadedFiles;
            
            setLocalFiles(finalFiles);
            onFilesChangeRef.current?.(finalFiles);
            
            // Solo llamar onUploadComplete si todos los archivos se subieron exitosamente
            if (failedFiles.length === 0) {
                onUploadComplete?.();
            } else if (successfulFiles.length > 0) {
                // Algunos archivos se subieron exitosamente
                console.warn(`${failedFiles.length} file(s) failed to upload, ${successfulFiles.length} succeeded`);
            }
        } catch (error) {
            console.error('Upload error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Upload failed';
            onUploadError?.(error instanceof Error ? error : new Error(errorMessage));
            
            // Marcar todos los archivos como error
            const errorFiles = newFiles.map(f => ({ ...f, status: 'error' as const }));
            const finalFiles = multiple ? [...localFiles, ...errorFiles] : errorFiles;
            setLocalFiles(finalFiles);
            onFilesChangeRef.current?.(finalFiles);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        handleFileSelect(e.target.files);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (): void => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    };

    const handleDelete = async (fileId: string): Promise<void> => {
        const fileToDelete = localFiles.find((f) => f.id === fileId);
        
        // Delete from S3 and backend if it has mediaId
        if (fileToDelete?.mediaId) {
            try {
                await mediaService.delete(fileToDelete.mediaId);
            } catch (error) {
                console.error('Failed to delete media from backend:', error);
            }
        }
        
        const updatedFiles = localFiles.filter((f) => f.id !== fileId);
        setLocalFiles(updatedFiles);
        onFilesChange?.(updatedFiles);
        onFileDelete?.(fileId);
    };

    const handleButtonClick = (): void => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const acceptString = acceptedFormats.join(',');

    return (
        <div className={cn('w-full space-y-3', className)}>
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}

            <div
                className={cn(
                    'relative border-2 border-dashed rounded-lg p-6 transition-colors',
                    isDragging
                        ? 'border-blue-400 bg-blue-50'
                        : error
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-300 bg-gray-50 hover:border-gray-400',
                    disabled && 'opacity-50 cursor-not-allowed',
                    localFiles.length > 0 && 'p-4'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    accept={acceptString}
                    multiple={multiple}
                    disabled={disabled}
                />

                {localFiles.length > 0 ? (
                    <div className="w-full space-y-3">
                        <div className="grid gap-3">
                            {localFiles.map((file) => {
                                const isImage = file.type?.startsWith('image/');
                                // Evitar usar URLs presigned viejas (para no disparar 403); esperar a refrescar por s3Key.
                                const imageUrl = shouldUseExistingPresignedUrl(file) ? (file.url || undefined) : undefined;
                                const isUploading = file.status === 'uploading';
                                const hasError = file.status === 'error';

                                return (
                                    <div
                                        key={file.id}
                                        className={cn(
                                            'flex items-center justify-between p-3 bg-white border rounded-lg transition-opacity',
                                            isUploading && 'opacity-60',
                                            hasError && 'border-red-300 bg-red-50'
                                        )}
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {isImage && imageUrl ? (
                                                <div className="relative w-16 h-16 flex-shrink-0">
                                                    <img
                                                        src={imageUrl}
                                                        alt={file.name}
                                                        className="w-16 h-16 object-cover rounded border border-gray-200"
                                                        crossOrigin="anonymous"
                                                        onError={async (e): Promise<void> => {
                                                            const imgEl = (e as unknown as { currentTarget: HTMLImageElement | null }).currentTarget;
                                                            if (!imgEl) {
                                                                return;
                                                            }

                                                            // Evitar múltiples intentos de refresco
                                                            if (imgEl.dataset.refreshing === 'true') {
                                                                return;
                                                            }
                                                            
                                                            console.error('Error loading image:', imageUrl);
                                                            
                                                            // Si la URL expiró, intentar refrescarla
                                                            if (file.s3Key && (!file.urlExpiresAt || Date.now() >= file.urlExpiresAt)) {
                                                                // Evitar múltiples requests simultáneos
                                                                if (loadingUrlsRef.current.has(file.s3Key)) {
                                                                    return;
                                                                }

                                                                // Marcar como refrescando para evitar múltiples intentos
                                                                imgEl.dataset.refreshing = 'true';
                                                                
                                                                loadingUrlsRef.current.add(file.s3Key);
                                                                
                                                                try {
                                                                    const result = await mediaService.getMediaUrlByS3Key(file.s3Key);
                                                                    const expiresIn = result.expires_in || 3600;
                                                                    const newUrlExpiresAt = Date.now() + (expiresIn * 1000);
                                                                    
                                                                    const fileIndex = localFiles.findIndex((f) => f.id === file.id);
                                                                    if (fileIndex !== -1) {
                                                                        const updatedFiles = [...localFiles];
                                                                        updatedFiles[fileIndex] = {
                                                                            ...updatedFiles[fileIndex],
                                                                            url: result.url,
                                                                            urlExpiresAt: newUrlExpiresAt,
                                                                        };
                                                                        setLocalFiles(updatedFiles);
                                                                        onFilesChangeRef.current?.(updatedFiles);
                                                                        // Recargar la imagen con la nueva URL
                                                                        imgEl.dataset.refreshing = 'false';
                                                                        imgEl.src = result.url;
                                                                        return;
                                                                    }
                                                                } catch (refreshError) {
                                                                    console.error('Failed to refresh expired URL:', refreshError);
                                                                    imgEl.dataset.refreshing = 'false';
                                                                } finally {
                                                                    loadingUrlsRef.current.delete(file.s3Key);
                                                                }
                                                            }
                                                            
                                                            // Si no se pudo refrescar, mostrar placeholder de error
                                                            imgEl.dataset.refreshing = 'false';
                                                            imgEl.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23f0f0f0"/><text x="32" y="32" font-family="Arial" font-size="8" text-anchor="middle" dominant-baseline="middle" fill="%23999">Error</text></svg>';
                                                        }}
                                                    />
                                                    {isUploading && (
                                                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded">
                                                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className={cn(
                                                    'w-16 h-16 flex items-center justify-center rounded flex-shrink-0',
                                                    hasError ? 'bg-red-100' : 'bg-blue-100'
                                                )}>
                                                    {isUploading ? (
                                                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                                                    ) : (
                                                        <span className={cn(
                                                            'text-xs font-medium',
                                                            hasError ? 'text-red-700' : 'text-blue-700'
                                                        )}>
                                                            {file.type?.split('/')[1]?.toUpperCase() || 'FILE'}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {file.name}
                                                </p>
                                                <p className={cn(
                                                    'text-xs',
                                                    hasError ? 'text-red-600' : 'text-gray-500'
                                                )}>
                                                    {isUploading ? 'Uploading to S3...' : hasError ? 'Upload failed' : `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                                                </p>
                                                {file.s3Key && (
                                                    <p className="text-xs text-green-600 mt-1">
                                                        ✓ Uploaded to S3
                                                    </p>
                                                )}
                                                {file.hitZones && file.hitZones.length > 0 && (
                                                    <p className="text-xs text-blue-600 mt-1">
                                                        {file.hitZones.length} hitzone{file.hitZones.length !== 1 ? 's' : ''} definido{file.hitZones.length !== 1 ? 's' : ''}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {showHitzoneEditor && isImage && (file.url || file.s3Key) && !isUploading && (
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => onHitzoneEdit?.(file)}
                                                    disabled={disabled || (!file.s3Key && !file.url)}
                                                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                    title={file.s3Key || file.url ? undefined : 'First upload or select an image file'}
                                                >
                                                    Edit Hitzone
                                                </Button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(file.id)}
                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                                disabled={disabled || isUploading}
                                                title="Delete file"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleButtonClick}
                            className="w-full"
                            disabled={disabled}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            {multiple ? 'Upload Another File' : 'Replace File'}
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-3">
                        <Upload className="h-12 w-12 text-gray-400" />
                        <div className="text-center">
                            <p className="text-sm text-gray-600 mb-1">
                                <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                            </p>
                            {(acceptedFormats.length > 0 || maxSizeMB) && (
                                <p className="text-xs text-gray-500">
                                    {acceptedFormats.length > 0 && acceptedFormats.join(', ')}
                                    {acceptedFormats.length > 0 && maxSizeMB && ' • '}
                                    {maxSizeMB && `Max ${maxSizeMB}MB`}
                                </p>
                            )}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleButtonClick}
                            disabled={disabled}
                        >
                            Select File{multiple ? 's' : ''}
                        </Button>
                    </div>
                )}
            </div>

            {description && (
                <p className="text-sm text-gray-500">{description}</p>
            )}

            {error && (
                <p className="text-sm text-red-500">{error}</p>
            )}

            {localFiles.length > 0 && (
                <div className="bg-gray-50 p-3 border border-gray-200 rounded-md">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preview - How participants will see this
                        <span className="ml-2 text-xs font-normal text-red-500">(READ ONLY)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {localFiles
                            .filter((f) => f.type?.startsWith('image/'))
                            .map((file) => {
                                const imageUrl = shouldUseExistingPresignedUrl(file) ? file.url : undefined;
                                return (
                                    <div key={file.id} className="relative">
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt={file.name}
                                                className="w-full h-48 object-cover rounded border border-gray-200"
                                                crossOrigin="anonymous"
                                                onError={async (e): Promise<void> => {
                                                    const imgEl = (e as unknown as { currentTarget: HTMLImageElement | null }).currentTarget;
                                                    if (!imgEl) {
                                                        return;
                                                    }

                                                    // Evitar múltiples intentos de refresco
                                                    if (imgEl.dataset.refreshing === 'true') {
                                                        return;
                                                    }
                                                    
                                                    console.error('Error loading preview image:', imageUrl);
                                                    
                                                    // Si la URL expiró, intentar refrescarla
                                                    if (file.s3Key && (!file.urlExpiresAt || Date.now() >= file.urlExpiresAt)) {
                                                        // Evitar múltiples requests simultáneos
                                                        if (loadingUrlsRef.current.has(file.s3Key)) {
                                                            return;
                                                        }

                                                        // Marcar como refrescando para evitar múltiples intentos
                                                        imgEl.dataset.refreshing = 'true';
                                                        
                                                        loadingUrlsRef.current.add(file.s3Key);
                                                        
                                                        try {
                                                            const result = await mediaService.getMediaUrlByS3Key(file.s3Key);
                                                            const expiresIn = result.expires_in || 3600;
                                                            const newUrlExpiresAt = Date.now() + (expiresIn * 1000);
                                                            
                                                            const fileIndex = localFiles.findIndex((f) => f.id === file.id);
                                                            if (fileIndex !== -1) {
                                                                const updatedFiles = [...localFiles];
                                                                updatedFiles[fileIndex] = {
                                                                    ...updatedFiles[fileIndex],
                                                                    url: result.url,
                                                                    urlExpiresAt: newUrlExpiresAt,
                                                                };
                                                                setLocalFiles(updatedFiles);
                                                                onFilesChangeRef.current?.(updatedFiles);
                                                                // Recargar la imagen con la nueva URL
                                                                imgEl.dataset.refreshing = 'false';
                                                                imgEl.src = result.url;
                                                                return;
                                                            }
                                                        } catch (refreshError) {
                                                            console.error('Failed to refresh expired URL:', refreshError);
                                                            imgEl.dataset.refreshing = 'false';
                                                        } finally {
                                                            loadingUrlsRef.current.delete(file.s3Key);
                                                        }
                                                    }
                                                    
                                                    // Si no se pudo refrescar, mostrar placeholder de error
                                                    imgEl.dataset.refreshing = 'false';
                                                    imgEl.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f0f0f0"/><text x="100" y="100" font-family="Arial" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="%23999">Image not available</text></svg>';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-48 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                                <span className="text-xs text-gray-400">
                                                    {file.status === 'uploading' ? 'Uploading...' : file.s3Key ? 'Loading image...' : 'No image available'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}
        </div>
    );
};

