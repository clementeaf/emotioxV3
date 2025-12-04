import type { ModuleConfig } from '../types/module';

export const MOCK_COGNITIVE_MODULES: Record<string, ModuleConfig> = {
    'short-text': {
        id: 'short-text-id',
        name: 'Short Text',
        description: 'Respuestas cortas de texto',
        structure: {
            components: [
                {
                    id: 'st-title',
                    name: 'Title',
                    type: 'input',
                    label: 'Question',
                    defaultValue: '¿Cuál es tu nombre?',
                    required: true,
                    order: 1,
                    settings: {}
                },
                {
                    id: 'st-description',
                    name: 'Description',
                    type: 'textarea',
                    label: 'Description',
                    defaultValue: 'Por favor ingresa tu nombre completo',
                    required: false,
                    order: 2,
                    settings: {}
                },
                {
                    id: 'st-answer',
                    name: 'Answer',
                    type: 'input',
                    label: 'Answer',
                    defaultValue: '',
                    placeholder: { enabled: true, text: 'Tu respuesta...' },
                    required: true,
                    order: 3,
                    settings: {}
                }
            ]
        }
    },
    'long-text': {
        id: 'long-text-id',
        name: 'Long Text',
        description: 'Respuestas largas de texto',
        structure: {
            components: [
                {
                    id: 'lt-title',
                    name: 'Title',
                    type: 'input',
                    label: 'Question',
                    defaultValue: 'Cuéntanos sobre ti',
                    required: true,
                    order: 1,
                    settings: {}
                },
                {
                    id: 'lt-description',
                    name: 'Description',
                    type: 'textarea',
                    label: 'Description',
                    defaultValue: 'Escribe una breve biografía',
                    required: false,
                    order: 2,
                    settings: {}
                },
                {
                    id: 'lt-answer',
                    name: 'Answer',
                    type: 'textarea',
                    label: 'Answer',
                    defaultValue: '',
                    placeholder: { enabled: true, text: 'Escribe aquí...' },
                    required: true,
                    order: 3,
                    settings: { maxLength: 1000 }
                }
            ]
        }
    },
    'single-choice': {
        id: 'single-choice-id',
        name: 'Single Choice',
        description: 'Selección única',
        structure: {
            components: [
                {
                    id: 'sc-title',
                    name: 'Title',
                    type: 'input',
                    label: 'Question',
                    defaultValue: '¿Cuál es tu color favorito?',
                    required: true,
                    order: 1,
                    settings: {}
                },
                {
                    id: 'sc-choice-1',
                    name: 'Choice 1',
                    type: 'input',
                    label: '',
                    defaultValue: 'Rojo',
                    required: false,
                    order: 3,
                    settings: { isChoice: true }
                },
                {
                    id: 'sc-choice-2',
                    name: 'Choice 2',
                    type: 'input',
                    label: '',
                    defaultValue: 'Azul',
                    required: false,
                    order: 4,
                    settings: { isChoice: true }
                },
                {
                    id: 'sc-choice-3',
                    name: 'Choice 3',
                    type: 'input',
                    label: '',
                    defaultValue: 'Verde',
                    required: false,
                    order: 5,
                    settings: { isChoice: true }
                }
            ]
        }
    },
    'multiple-choice': {
        id: 'multiple-choice-id',
        name: 'Multiple Choice',
        description: 'Selección múltiple',
        structure: {
            components: [
                {
                    id: 'mc-title',
                    name: 'Title',
                    type: 'input',
                    label: 'Question',
                    defaultValue: '¿Qué frutas te gustan?',
                    required: true,
                    order: 1,
                    settings: {}
                },
                {
                    id: 'mc-choice-1',
                    name: 'Choice 1',
                    type: 'input',
                    label: '',
                    defaultValue: 'Manzana',
                    required: false,
                    order: 3,
                    settings: { isChoice: true }
                },
                {
                    id: 'mc-choice-2',
                    name: 'Choice 2',
                    type: 'input',
                    label: '',
                    defaultValue: 'Banana',
                    required: false,
                    order: 4,
                    settings: { isChoice: true }
                },
                {
                    id: 'mc-choice-3',
                    name: 'Choice 3',
                    type: 'input',
                    label: '',
                    defaultValue: 'Naranja',
                    required: false,
                    order: 5,
                    settings: { isChoice: true }
                }
            ]
        }
    },
    'linear-scale': {
        id: 'linear-scale-id',
        name: 'Linear Scale',
        description: 'Escala lineal',
        structure: {
            components: [
                {
                    id: 'ls-title',
                    name: 'Title',
                    type: 'input',
                    label: 'Question',
                    defaultValue: '¿Qué tan de acuerdo estás?',
                    required: true,
                    order: 1,
                    settings: {}
                },
                {
                    id: 'ls-start-value',
                    name: 'Start Value',
                    type: 'input',
                    defaultValue: '1',
                    required: true,
                    order: 3,
                    settings: {}
                },
                {
                    id: 'ls-end-value',
                    name: 'End Value',
                    type: 'input',
                    defaultValue: '5',
                    required: true,
                    order: 4,
                    settings: {}
                },
                {
                    id: 'ls-start-label',
                    name: 'Start Label',
                    type: 'input',
                    defaultValue: 'Totalmente en desacuerdo',
                    required: false,
                    order: 5,
                    settings: {}
                },
                {
                    id: 'ls-end-label',
                    name: 'End Label',
                    type: 'input',
                    defaultValue: 'Totalmente de acuerdo',
                    required: false,
                    order: 6,
                    settings: {}
                }
            ]
        }
            ]
        }
    },
'ranking': {
    id: 'ranking-id',
        name: 'Ranking',
            description: 'Ordenar opciones por preferencia',
                structure: {
        components: [
            {
                id: 'rk-title',
                name: 'Title',
                type: 'input',
                label: 'Question',
                defaultValue: 'Ordena por preferencia',
                required: true,
                order: 1,
                settings: {}
            },
            {
                id: 'rk-slider',
                name: 'Ranking Slider',
                type: 'select',
                label: '',
                defaultValue: '3',
                required: true,
                order: 3,
                settings: {},
                selectRange: {
                    type: 'predefined',
                    predefined: '1-5',
                    variant: 'slider'
                }
            }
        ]
    }
}
};
