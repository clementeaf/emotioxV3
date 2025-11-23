export interface PlaceholderConfig {
    enabled: boolean;
    text: string;
}

export interface SelectRangeConfig {
    type: 'predefined' | 'custom';
    predefined?: '1-5' | '1-7' | '1-10';
    custom?: { min: number; max: number };
    startLabel?: string;
    endLabel?: string;
}

export interface FileUploadConfig {
    maxSizeMB: number;
}

export type ComponentType = 'input' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file-upload';

export interface ComponentConfig {
    id: string;
    type: ComponentType;
    label: string;

    // Type-specific configurations
    placeholder?: PlaceholderConfig;
    selectRange?: SelectRangeConfig;
    fileUpload?: FileUploadConfig;
    options?: { label: string; value: string }[];
}
