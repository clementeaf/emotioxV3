import { Upload, UploadCloud } from 'lucide-react';
import React, { useState, useRef } from 'react';

import { Button } from '@/components/ui/Button';

interface FileUploaderProps {
  questionId: string;
  onFileUpload: (questionId: string, files: FileList) => void;
  isUploading: boolean;
  accept?: string;
  multiple?: boolean;
  className?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  questionId,
  onFileUpload,
  isUploading,
  accept = 'image/*',
  multiple = false,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {setIsDragging(true);}
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(questionId, e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(questionId, e.target.files);
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      className={`relative ${className}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isUploading}
      />
      
      <div 
        className={`
          border-2 border-dashed rounded-lg p-6 
          flex flex-col items-center justify-center 
          transition-colors duration-200 cursor-pointer
          ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/60 hover:bg-gray-50'}
        `}
        onClick={handleButtonClick}
      >
        <div className="flex flex-col items-center text-center">
          <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
          <p className="text-sm font-medium">
            {multiple ? 'Arrastra tus archivos aquí o haz clic para seleccionarlos' : 'Arrastra tu archivo aquí o haz clic para seleccionarlo'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {accept === 'image/*' ? 'PNG, JPG, GIF hasta 10MB' : 'Archivos hasta 10MB'}
          </p>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3" 
            type="button"
            disabled={isUploading}
            onClick={(e) => {
              e.stopPropagation();
              handleButtonClick();
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Subir {multiple ? 'archivos' : 'archivo'}
          </Button>
        </div>
      </div>
    </div>
  );
}; 