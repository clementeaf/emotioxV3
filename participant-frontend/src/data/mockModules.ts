import type { ModuleConfig } from '../types/module';
import { MOCK_SMARTVOC_MODULES } from './mockSmartVOCModules';

export const MOCK_MODULES: Record<string, ModuleConfig> = {
    welcome: {
        id: 'welcome-module-id',
        name: 'Welcome Screen',
        description: 'Initial welcome screen with title, message, and start button',
        structure: {
            components: [
                {
                    id: 'title',
                    name: 'Title',
                    type: 'input',
                    label: 'Título',
                    defaultValue: 'Bienvenido a la Investigación',
                    placeholder: {
                        enabled: true,
                        text: 'Title of the screen'
                    },
                    required: false,
                    order: 1,
                    settings: {}
                },
                {
                    id: 'message',
                    name: 'Message',
                    type: 'textarea',
                    label: 'Mensaje',
                    defaultValue: 'Gracias por participar en este estudio. A continuación, responderás una serie de preguntas que nos ayudarán a comprender mejor tu experiencia.',
                    placeholder: {
                        enabled: true,
                        text: 'Message for the screen'
                    },
                    required: false,
                    order: 2,
                    settings: {
                        maxLength: 500,
                        autosize: true
                    }
                }
            ]
        }
    },
    'thank-you': {
        id: 'thank-you-module-id',
        name: 'Thank You Screen',
        description: 'Completion screen with title and message',
        structure: {
            components: [
                {
                    id: 'title',
                    name: 'Title',
                    type: 'input',
                    label: 'Título',
                    defaultValue: '¡Gracias por tu Participación!',
                    placeholder: {
                        enabled: true,
                        text: 'Title of the screen'
                    },
                    required: false,
                    order: 1,
                    settings: {}
                },
                {
                    id: 'message',
                    name: 'Message',
                    type: 'textarea',
                    label: 'Mensaje',
                    defaultValue: 'Hemos recibido tus respuestas correctamente. Tu contribución es muy valiosa para nuestra investigación.',
                    placeholder: {
                        enabled: true,
                        text: 'Message for the screen'
                    },
                    required: false,
                    order: 2,
                    settings: {
                        maxLength: 500,
                        autosize: true
                    }
                }
            ]
        }
    },
    // SmartVOC modules
    ...MOCK_SMARTVOC_MODULES
};
