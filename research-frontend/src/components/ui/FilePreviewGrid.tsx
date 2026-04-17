import { shouldUseExistingPresignedUrl } from './useFileUpload';
import type { UploadedFile } from './fileUploadAdvanced.types';

interface FilePreviewGridProps {
    files: UploadedFile[];
    onImageError: (
        e: React.SyntheticEvent<HTMLImageElement>,
        file: UploadedFile,
        fallbackSvg: string,
    ) => Promise<void>;
}

const PREVIEW_FALLBACK_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f0f0f0"/><text x="100" y="100" font-family="Arial" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="%23999">Image not available</text></svg>';

export const FilePreviewGrid = ({ files, onImageError }: FilePreviewGridProps) => {
    return (
        <div className="bg-gray-50 p-3 border border-gray-200 rounded-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview - How participants will see this
                <span className="ml-2 text-xs font-normal text-red-500">(READ ONLY)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
                {files
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
                                        onError={(e) => onImageError(e, file, PREVIEW_FALLBACK_SVG)}
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
    );
};
