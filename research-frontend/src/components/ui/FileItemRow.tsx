import { Trash2 } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';
import { shouldUseExistingPresignedUrl } from './useFileUpload';
import type { UploadedFile } from './fileUploadAdvanced.types';

interface FileItemRowProps {
    file: UploadedFile;
    disabled: boolean;
    showHitzoneEditor: boolean;
    onHitzoneEdit?: (file: UploadedFile) => void;
    onDelete: (fileId: string) => void;
    onImageError: (
        e: React.SyntheticEvent<HTMLImageElement>,
        file: UploadedFile,
        fallbackSvg: string,
    ) => Promise<void>;
}

const THUMBNAIL_FALLBACK_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23f0f0f0"/><text x="32" y="32" font-family="Arial" font-size="8" text-anchor="middle" dominant-baseline="middle" fill="%23999">Error</text></svg>';

export const FileItemRow = ({
    file,
    disabled,
    showHitzoneEditor,
    onHitzoneEdit,
    onDelete,
    onImageError,
}: FileItemRowProps) => {
    const isImage = file.type?.startsWith('image/');
    // Evitar usar URLs presigned viejas (para no disparar 403); esperar a refrescar por s3Key.
    const imageUrl = shouldUseExistingPresignedUrl(file) ? (file.url || undefined) : undefined;
    const isUploading = file.status === 'uploading';
    const hasError = file.status === 'error';

    return (
        <div
            className={cn(
                'flex items-center justify-between p-3 bg-white border rounded-lg transition-opacity min-w-0 overflow-hidden',
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
                            onError={(e) => onImageError(e, file, THUMBNAIL_FALLBACK_SVG)}
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
                    onClick={() => onDelete(file.id)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    disabled={disabled || isUploading}
                    title="Delete file"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};
