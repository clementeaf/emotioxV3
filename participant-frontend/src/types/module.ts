export interface ModuleComponent {
    id: string;
    name: string;
    type: 'input' | 'textarea' | 'select' | 'file-upload' | 'checkbox' | 'radio';
    label: string;
    defaultValue: string;
    value?: string;
    placeholder?: {
        enabled: boolean;
        text: string;
    };
    required: boolean;
    order: number;
    settings?: Record<string, unknown>;
    options?: Array<{
        value: string;
        label: string;
    }>;
    selectRange?: {
        type: 'predefined' | 'custom';
        predefined?: string;
        custom?: {
            min: number;
            max: number;
        };
        startLabel?: string;
        endLabel?: string;
        variant?: string;
    };
}

export interface ModuleStructure {
    components: ModuleComponent[];
}

export interface ModuleConfig {
    id: string;
    name: string;
    description: string;
    structure: ModuleStructure;
    config?: Record<string, unknown>;
}
