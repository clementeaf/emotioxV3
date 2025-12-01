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
    variant?: 'dropdown' | 'scale' | 'slider';
}

export interface FileUploadConfig {
    maxSizeMB: number;
    acceptedFormats?: string[];
    allowHitZones?: boolean;
    allowParticipantSelection?: boolean;
}

export interface ChoiceOption {
    id: string;
    label: string;
    eligibility: 'Qualify' | 'Disqualify';
}

export interface ChoicesConfig {
    choiceType: 'single' | 'multiple';
    required: boolean;
    choices: ChoiceOption[];
    disqualifyRedirectUrl?: string;
}

export interface ValidationRule {
    type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'minFiles' | 'maxFiles';
    value?: string | number | boolean;
    message?: string; // Custom error message
}

export interface ValidationConfig {
    rules: ValidationRule[];
}

export type ComponentType = 'input' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file-upload' | 'choices';

export interface ComponentConfig {
    id: string;
    type: ComponentType;
    label: string;

    // Type-specific configurations
    placeholder?: PlaceholderConfig;
    selectRange?: SelectRangeConfig;
    fileUpload?: FileUploadConfig;
    choicesConfig?: ChoicesConfig;
    options?: { label: string; value: string }[];
    editableFields?: string[];
    hidden?: boolean;
    settings?: Record<string, unknown>;
    order?: number;
    validation?: ValidationConfig;
}

export interface StageTemplate {
    id: string;
    name: string;
    description: string | null;
    created_by: string | null;
    is_active: boolean;
    stage_type?: 'single_module' | 'module_collection';
    created_at: string;
    updated_at: string;
}

export interface ModuleTemplateBasic {
    id: string;
    name: string;
    description: string | null;
    display_order: number;
}

export interface StageTemplateWithModules extends StageTemplate {
    modules: ModuleTemplateBasic[];
}

