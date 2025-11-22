import { type InputHTMLAttributes, forwardRef, useState } from 'react';
import { cn } from './Button';

interface FileUploadProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: string;
    error?: string;
    description?: string;
    acceptedFormats?: string;
    maxSizeMB?: number;
    onFileSelect?: (file: File | null) => void;
}

const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
    ({ className, label, error, description, id, acceptedFormats, maxSizeMB, onFileSelect, ...props }, ref) => {
        const [fileName, setFileName] = useState<string>('');
        const [isDragging, setIsDragging] = useState(false);

        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
            const file = e.target.files?.[0] || null;
            setFileName(file?.name || '');
            onFileSelect?.(file);
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
            const file = e.dataTransfer.files?.[0] || null;
            if (file) {
                setFileName(file.name);
                onFileSelect?.(file);
            }
        };

        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
                        {label}
                    </label>
                )}
                <div
                    className={cn(
                        'relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
                        isDragging
                            ? 'border-blue-400 bg-blue-50'
                            : error
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300 bg-gray-50 hover:border-gray-400',
                        props.disabled && 'opacity-50 cursor-not-allowed',
                        className
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        id={id}
                        ref={ref}
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        {...props}
                    />
                    <label htmlFor={id} className="flex flex-col items-center cursor-pointer">
                        <svg
                            className="h-12 w-12 text-gray-400 mb-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        </svg>
                        <p className="text-sm text-gray-600 mb-1">
                            {fileName || (
                                <>
                                    <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                                </>
                            )}
                        </p>
                        {(acceptedFormats || maxSizeMB) && (
                            <p className="text-xs text-gray-500">
                                {acceptedFormats && `${acceptedFormats}`}
                                {acceptedFormats && maxSizeMB && ' • '}
                                {maxSizeMB && `Max ${maxSizeMB}MB`}
                            </p>
                        )}
                    </label>
                </div>
                {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            </div>
        );
    }
);

FileUpload.displayName = 'FileUpload';

export { FileUpload };
