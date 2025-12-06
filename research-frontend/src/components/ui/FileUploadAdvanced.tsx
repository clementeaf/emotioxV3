import { useState, useRef, useEffect } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';
import { mediaService } from '../../services/media.service';

/**
 * Interfaz para archivos subidos
 */
export interface UploadedFile {
    id: string;
    name: string;
    size: number;
    type: string;
    url?: string;
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

    useEffect(() => {
        setLocalFiles(files);
    }, [files]);

    /**
     * Upload a single file to S3 and save metadata
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
            // 1. Request presigned URL from backend
            const { upload_url, s3_key } = await mediaService.generateUploadUrl({
                research_id: researchId,
                file_name: file.name,
                content_type: file.type,
            });

            // 2. Upload file to S3 using presigned URL
            const uploadResponse = await fetch(upload_url, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                },
            });

            if (!uploadResponse.ok) {
                throw new Error(`S3 upload failed: ${uploadResponse.statusText}`);
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

            // 4. Return uploaded file with S3 info
            return {
                id: fileId,
                name: file.name,
                size: file.size,
                type: file.type,
                s3Key: s3_key,
                mediaId: media.id,
                status: 'uploaded',
                hitZones: [],
            };
        } catch (error) {
            console.error('File upload error:', error);
            throw error;
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
        onFilesChange?.(updatedFiles);
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
                    onUploadError?.(error instanceof Error ? error : new Error('Upload failed'));
                    return {
                        ...newFiles[index],
                        status: 'error' as const,
                    };
                }
            });

            const uploadedFiles = (await Promise.all(uploadPromises)).filter((f): f is UploadedFile => f !== null);
            
            // Update with completed uploads
            const finalFiles = multiple ? [...localFiles, ...uploadedFiles] : uploadedFiles;
            setLocalFiles(finalFiles);
            onFilesChange?.(finalFiles);
            onUploadComplete?.();
        } catch (error) {
            console.error('Upload error:', error);
            onUploadError?.(error instanceof Error ? error : new Error('Upload failed'));
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

    const handleDelete = (fileId: string): void => {
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
                                const imageUrl = file.url || (file.s3Key ? `https://placeholder.com/${file.id}` : '');
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
                                                        onError={(e) => {
                                                            e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23f0f0f0"/><text x="32" y="32" font-family="Arial" font-size="8" text-anchor="middle" dominant-baseline="middle" fill="%23999">Error</text></svg>';
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
                                const imageUrl = file.url || (file.s3Key ? `https://placeholder.com/${file.id}` : '');
                                return (
                                    <div key={file.id} className="relative">
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt={file.name}
                                                className="w-full h-48 object-cover rounded border border-gray-200"
                                                onError={(e) => {
                                                    e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f0f0f0"/><text x="100" y="100" font-family="Arial" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="%23999">Image not available</text></svg>';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-48 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                                <span className="text-xs text-gray-400">Loading...</span>
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

