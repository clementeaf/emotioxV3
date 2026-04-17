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

export interface FileUploadAdvancedProps {
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
    /** When true, show only filename list instead of image previews */
    listOnly?: boolean;
    onUploadStart?: () => void;
    onUploadComplete?: () => void;
    onUploadError?: (error: Error) => void;
}
