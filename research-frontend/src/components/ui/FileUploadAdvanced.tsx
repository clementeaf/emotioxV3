import { Upload, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';
import { useFileUpload } from './useFileUpload';
import { FileItemRow } from './FileItemRow';
import { FilePreviewGrid } from './FilePreviewGrid';
import type { FileUploadAdvancedProps } from './fileUploadAdvanced.types';

// Re-export types for consumers
export type { UploadedFile } from './fileUploadAdvanced.types';

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
    listOnly = false,
    onUploadStart,
    onUploadComplete,
    onUploadError,
}: FileUploadAdvancedProps) => {
    const {
        fileInputRef,
        isDragging,
        localFiles,
        handleFileChange,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleDelete,
        handleButtonClick,
        handleImageError,
    } = useFileUpload({
        files,
        multiple,
        maxSizeMB,
        acceptedFormats,
        researchId,
        onFilesChange,
        onUploadStart,
        onUploadComplete,
        onUploadError,
        onFileDelete,
    });

    const acceptString = acceptedFormats.join(',');

    return (
        <div className={cn('w-full min-w-0 space-y-3', className)}>
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}

            {description && (
                <p className="text-sm text-gray-500">{description}</p>
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

                {localFiles.length > 0 && !listOnly ? (
                    <div className="w-full space-y-3">
                        <div className="grid gap-3">
                            {localFiles.map((file) => (
                                <FileItemRow
                                    key={file.id}
                                    file={file}
                                    disabled={disabled}
                                    showHitzoneEditor={showHitzoneEditor}
                                    onHitzoneEdit={onHitzoneEdit}
                                    onDelete={handleDelete}
                                    onImageError={handleImageError}
                                />
                            ))}
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

            {error && (
                <p className="text-sm text-red-500">{error}</p>
            )}

            {/* listOnly: simple filename list with delete buttons */}
            {listOnly && localFiles.length > 0 && (
                <div className="space-y-1">
                    {localFiles.map((file, i) => {
                        const hasError = file.status === 'error';
                        return (
                            <div key={file.id} className="flex items-center justify-between py-1.5 text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-gray-400">📎</span>
                                    <span className={hasError ? 'text-red-500' : 'text-gray-700'}>{file.name || `File-${String(i + 1).padStart(2, '0')}`}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(file.id)}
                                    className="p-1 text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                                    title="Delete"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {localFiles.length > 0 && !listOnly && (
                <FilePreviewGrid
                    files={localFiles}
                    onImageError={handleImageError}
                />
            )}
        </div>
    );
};
