import type { ModuleConfig } from '../types/module';

// Mock data simulando la estructura que vendrá del backend
export const MOCK_SMARTVOC_MODULES: Record<string, ModuleConfig> = {
    csat: {
        id: 'csat-module-id',
        name: 'Customer Satisfaction Score (CSAT)',
        description: 'Customer Satisfaction - Satisfacción del cliente',
        structure: {
            components: [
                {
                    id: 'csat-title',
                    name: 'Title',
                    type: 'input',
                    label: 'Question',
                    defaultValue: '¿Qué tan satisfecho estás con nuestro servicio?',
                    placeholder: { enabled: true, text: 'Type your question here...' },
                    required: true,
                    order: 1,
                    settings: {}
                },
                {
                    id: 'csat-description',
                    name: 'Description',
                    type: 'textarea',
                    label: 'Description',
                    defaultValue: 'Por favor, califica tu nivel de satisfacción',
                    placeholder: { enabled: true, text: 'Enter an optional description...' },
                    required: false,
                    order: 2,
                    settings: {}
                },
                {
                    id: 'csat-instructions',
                    name: 'Instructions',
                    type: 'textarea',
                    label: 'Instructions',
                    defaultValue: 'Selecciona de 1 a 5 estrellas',
                    placeholder: { enabled: true, text: 'Enter optional instructions...' },
                    required: false,
                    order: 3,
                    settings: {}
                },
                {
                    id: 'csat-display-type',
                    name: 'Display Type',
                    type: 'select',
                    label: 'Display Type',
                    defaultValue: 'stars', // 'stars' or 'numbers'
                    options: [
                        { value: 'stars', label: 'Stars' },
                        { value: 'numbers', label: 'Numbers (1-5)' }
                    ],
                    required: true,
                    order: 4,
                    settings: {}
                }
            ]
        }
    },

    nps: {
        id: 'nps-module-id',
        name: 'Net Promoter Score (NPS)',
        description: 'Net Promoter Score - Puntuación de promotor neto',
        structure: {
            components: [
                {
                    id: 'nps-title',
                    name: 'Title',
                    type: 'input',
                    label: 'Question',
                    defaultValue: '¿Qué tan probable es que recomiendes nuestro producto a un amigo?',
                    placeholder: { enabled: true, text: 'Type your question here...' },
                    required: true,
                    order: 1,
                    settings: {}
                },
                {
                    id: 'nps-description',
                    name: 'Description',
                    type: 'textarea',
                    label: 'Description',
                    defaultValue: '',
                    placeholder: { enabled: true, text: 'Enter an optional description...' },
                    required: false,
                    order: 2,
                    settings: {}
                },
                {
                    id: 'nps-instructions',
                    name: 'Instructions',
                    type: 'textarea',
                    label: 'Instructions',
                    defaultValue: 'Donde 0 es "No lo recomendaría" y 10 es "Definitivamente lo recomendaría"',
                    placeholder: { enabled: true, text: 'Enter optional instructions...' },
                    required: false,
                    order: 3,
                    settings: {}
                },
                {
                    id: 'nps-scale-range',
                    name: 'Range',
                    type: 'input',
                    label: 'Range',
                    defaultValue: '0-10',
                    placeholder: { enabled: false, text: '' },
                    required: true,
                    order: 4,
                    settings: { readonly: true }
                }
            ]
        }
    },

    nev: {
        id: 'nev-module-id',
        name: 'Net Emotional Value (NEV)',
        description: 'Net Emotional Value - Valor emocional neto',
        structure: {
            components: [
                {
                    id: 'nev-title',
                    name: 'Title',
                    type: 'input',
                    label: 'Question',
                    defaultValue: 'Selecciona las emociones que mejor describen tu experiencia',
                    placeholder: { enabled: true, text: 'Type your question here...' },
                    required: true,
                    order: 1,
                    settings: {}
                },
                {
                    id: 'nev-description',
                    name: 'Description',
                    type: 'textarea',
                    label: 'Description',
                    defaultValue: '',
                    placeholder: { enabled: true, text: 'Enter an optional description...' },
                    required: false,
                    order: 2,
                    settings: {}
                },
                {
                    id: 'nev-instructions',
                    name: 'Instructions',
                    type: 'textarea',
                    label: 'Instructions',
                    defaultValue: 'Puedes seleccionar múltiples emociones',
                    placeholder: { enabled: true, text: 'Enter optional instructions...' },
                    required: false,
                    order: 3,
                    settings: {}
                }
            ]
        }
    },

    voc: {
        id: 'voc-module-id',
        name: 'Voice of Customer (VOC)',
        description: 'Voice of Customer - Voz del cliente',
        structure: {
            components: [
                {
                    id: 'voc-title',
                    name: 'Title',
                    type: 'input',
                    label: 'Question',
                    defaultValue: '¿Qué podemos mejorar en nuestro servicio?',
                    placeholder: { enabled: true, text: 'Type your question here...' },
                    required: true,
                    order: 1,
                    settings: {}
                },
                {
                    id: 'voc-description',
                    name: 'Description',
                    type: 'textarea',
                    label: 'Description',
                    defaultValue: 'Comparte tus comentarios y sugerencias',
                    placeholder: { enabled: true, text: 'Enter an optional description...' },
                    required: false,
                    order: 2,
                    settings: {}
                },
                {
                    id: 'voc-instructions',
                    name: 'Instructions',
                    type: 'textarea',
                    label: 'Instructions',
                    defaultValue: 'Sé lo más específico posible',
                    placeholder: { enabled: true, text: 'Enter optional instructions...' },
                    required: false,
                    order: 3,
                    settings: {}
                }
            ]
        }
    },

    ces: {
        id: 'ces-module-id',
        name: 'Customer Effort Score (CES)',
        description: 'Customer Effort Score - Esfuerzo del cliente',
        structure: {
            components: [
                {
                    id: 'ces-title',
                    name: 'Title',
                    type: 'input',
                    label: 'Question',
                    defaultValue: '¿Qué tan fácil fue resolver tu problema?',
                    placeholder: { enabled: true, text: 'Type your question here...' },
                    required: true,
                    order: 1,
                    settings: {}
                },
                {
                    id: 'ces-description',
                    name: 'Description',
                    type: 'textarea',
                    label: 'Description',
                    defaultValue: '',
                    placeholder: { enabled: true, text: 'Enter an optional description...' },
                    required: false,
                    order: 2,
                    settings: {}
                },
                {
                    id: 'ces-instructions',
                    name: 'Instructions',
                    type: 'textarea',
                    label: 'Instructions',
                    defaultValue: 'Califica el esfuerzo requerido',
                    placeholder: { enabled: true, text: 'Enter optional instructions...' },
                    required: false,
                    order: 3,
                    settings: {}
                },
                {
                    id: 'ces-scale',
                    name: 'Scale',
                    type: 'select',
                    label: 'Scale',
                    defaultValue: '1-7',
                    selectRange: {
                        type: 'predefined',
                        predefined: '1-7'
                    },
                    options: [
                        { value: '1-5', label: '1-5' },
                        { value: '1-7', label: '1-7' },
                        { value: '1-10', label: '1-10' }
                    ],
                    required: true,
                    order: 4,
                    settings: {}
                },
                {
                    id: 'ces-start-label',
                    name: 'Start Label',
                    type: 'input',
                    label: 'Start Label',
                    defaultValue: 'Muy difícil',
                    placeholder: { enabled: true, text: 'Ex: Very Difficult' },
                    required: false,
                    order: 5,
                    settings: {}
                },
                {
                    id: 'ces-end-label',
                    name: 'End Label',
                    type: 'input',
                    label: 'End Label',
                    defaultValue: 'Muy fácil',
                    placeholder: { enabled: true, text: 'Ex: Very Easy' },
                    required: false,
                    order: 6,
                    settings: {}
                }
            ]
        }
    },

    cv: {
        id: 'cv-module-id',
        name: 'Cognitive Value (CV)',
        description: 'Customer Value - Valor del cliente',
        structure: {
            components: [
                {
                    id: 'cv-title',
                    name: 'Title',
                    type: 'input',
                    label: 'Question',
                    defaultValue: '¿Qué tan valioso consideras nuestro producto?',
                    placeholder: { enabled: true, text: 'Type your question here...' },
                    required: true,
                    order: 1,
                    settings: {}
                },
                {
                    id: 'cv-description',
                    name: 'Description',
                    type: 'textarea',
                    label: 'Description',
                    defaultValue: '',
                    placeholder: { enabled: true, text: 'Enter an optional description...' },
                    required: false,
                    order: 2,
                    settings: {}
                },
                {
                    id: 'cv-instructions',
                    name: 'Instructions',
                    type: 'textarea',
                    label: 'Instructions',
                    defaultValue: 'Califica el valor percibido',
                    placeholder: { enabled: true, text: 'Enter optional instructions...' },
                    required: false,
                    order: 3,
                    settings: {}
                },
                {
                    id: 'cv-scale',
                    name: 'Scale',
                    type: 'select',
                    label: 'Scale',
                    defaultValue: '1-5',
                    options: [
                        { value: '1-5', label: '1-5' },
                        { value: '1-7', label: '1-7' },
                        { value: '1-10', label: '1-10' }
                    ],
                    required: true,
                    order: 4,
                    settings: {}
                },
                {
                    id: 'cv-start-label',
                    name: 'Start Label',
                    type: 'input',
                    label: 'Start Label',
                    defaultValue: 'Sin valor',
                    placeholder: { enabled: true, text: 'Ex: Worthless, Bad' },
                    required: false,
                    order: 5,
                    settings: {}
                },
                {
                    id: 'cv-end-label',
                    name: 'End Label',
                    type: 'input',
                    label: 'End Label',
                    defaultValue: 'Muy valioso',
                    placeholder: { enabled: true, text: 'Ex: Worth, Excellent' },
                    required: false,
                    order: 6,
                    settings: {}
                }
            ]
        }
    }
};
