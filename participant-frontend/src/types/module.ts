interface ModuleComponentSettings {
    readonly?: boolean;
    defaultValue?: string;
    isChoice?: boolean;
    [key: string]: unknown;
}

export interface ModuleComponent {
    id: string;
    name?: string;
    type: 'input' | 'textarea' | 'select' | 'file-upload' | 'checkbox' | 'radio' | 'choices';
    label?: string;
    /**
     * Legacy field. In the current backend contract, readonly defaults are typically in settings.defaultValue.
     */
    defaultValue?: string;
    value?: unknown;
    placeholder?: {
        enabled: boolean;
        text: string;
    };
    required?: boolean;
    order?: number;
    settings?: ModuleComponentSettings;
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
