/**
 * Seed script para módulos Cognitive Tasks
 * Basado estrictamente en COGNITIVE_TASKS_MODULES.md
 * 
 * Genera los siguientes módulos:
 * 1. Short Text (Texto Corto)
 * 2. Long Text (Texto Largo)
 * 3. Single Choice (Opción Única)
 * 4. Multiple Choice (Opción Múltiple)
 * 5. Linear Scale (Escala Lineal)
 * 6. Ranking (Clasificación)
 * 7. Navigation Flow (Flujo de Navegación)
 * 8. Preference Test (Prueba de Preferencia)
 */

import dotenv from 'dotenv';
import path from 'path';
import { createPool, Pool } from 'mysql2/promise';
import { randomUUID } from 'crypto';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: 10,
});

interface ModuleDefinition {
    name: string;
    description: string;
    components: Array<{
        id: string;
        name?: string;
        type: 'input' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file-upload';
        label: string;
        defaultValue?: string;
        placeholder?: {
            enabled: boolean;
            text: string;
        };
        required?: boolean;
        order: number;
        settings?: Record<string, any>;
        options?: Array<{ value: string; label: string }>;
        choices?: Array<{
            id: string;
            label: string;
            value: string;
            eligibility?: string;
        }>;
        selectRange?: {
            type: string;
            predefined: string;
            variant: string;
        };
        fileUpload?: {
            maxSizeMB: number;
            acceptedFormats: string[];
            recommendedResolution?: string;
            allowHitZones?: boolean;
            allowParticipantSelection?: boolean;
        };
    }>;
}

const cognitiveTasksModules: ModuleDefinition[] = [
    {
        name: 'Short Text',
        description: 'Respuestas cortas de texto',
        components: [
            {
                id: 'question-title',
                name: 'Question Title',
                type: 'input',
                label: 'Título de la pregunta',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe la pregunta aquí...'
                },
                required: true,
                order: 1,
                settings: {}
            },
            {
                id: 'question-description',
                name: 'Question Description',
                type: 'textarea',
                label: 'Descripción',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe una descripción opcional...'
                },
                required: false,
                order: 2,
                settings: {}
            },
            {
                id: 'answer-placeholder',
                name: 'Answer Placeholder',
                type: 'input',
                label: 'Placeholder de respuesta',
                defaultValue: 'Short text answer',
                placeholder: {
                    enabled: true,
                    text: 'Ej: Short text answer'
                },
                required: false,
                order: 3,
                settings: {}
            }
        ]
    },
    {
        name: 'Long Text',
        description: 'Respuestas largas de texto',
        components: [
            {
                id: 'question-title',
                name: 'Question Title',
                type: 'input',
                label: 'Título de la pregunta',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe la pregunta aquí...'
                },
                required: true,
                order: 1,
                settings: {}
            },
            {
                id: 'question-description',
                name: 'Question Description',
                type: 'textarea',
                label: 'Descripción',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe una descripción opcional...'
                },
                required: false,
                order: 2,
                settings: {
                    maxLength: 1000,
                    autosize: true
                }
            },
            {
                id: 'answer-placeholder',
                name: 'Answer Placeholder',
                type: 'input',
                label: 'Placeholder de respuesta',
                defaultValue: 'Long text answer',
                placeholder: {
                    enabled: true,
                    text: 'Ej: Long text answer'
                },
                required: false,
                order: 3,
                settings: {}
            }
        ]
    },
    {
        name: 'Single Choice',
        description: 'Seleccionar una opción',
        components: [
            {
                id: 'question-title',
                name: 'Question Title',
                type: 'input',
                label: 'Título de la pregunta',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe la pregunta aquí...'
                },
                required: true,
                order: 1,
                settings: {}
            },
            {
                id: 'question-description',
                name: 'Question Description',
                type: 'textarea',
                label: 'Descripción',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe una descripción opcional...'
                },
                required: false,
                order: 2,
                settings: {}
            },
            {
                id: 'choice-1',
                name: 'Choice 1',
                type: 'input',
                label: '',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe la opción 1...'
                },
                required: false,
                order: 3,
                settings: {
                    groupLabel: 'CHOICES',
                    isChoice: true
                }
            },
            {
                id: 'choice-2',
                name: 'Choice 2',
                type: 'input',
                label: '',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe la opción 2...'
                },
                required: false,
                order: 4,
                settings: {
                    groupLabel: 'CHOICES',
                    isChoice: true
                }
            },
            {
                id: 'choice-3',
                name: 'Choice 3',
                type: 'input',
                label: '',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe la opción 3...'
                },
                required: false,
                order: 5,
                settings: {
                    groupLabel: 'CHOICES',
                    isChoice: true
                }
            }
        ]
    },
    {
        name: 'Multiple Choice',
        description: 'Seleccionar múltiples opciones',
        components: [
            {
                id: 'question-title',
                name: 'Question Title',
                type: 'input',
                label: 'Título de la pregunta',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe la pregunta aquí...'
                },
                required: true,
                order: 1,
                settings: {}
            },
            {
                id: 'question-description',
                name: 'Question Description',
                type: 'textarea',
                label: 'Descripción',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe una descripción opcional...'
                },
                required: false,
                order: 2,
                settings: {}
            },
            {
                id: 'choice-1',
                name: 'Choice 1',
                type: 'input',
                label: '',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe la opción 1...'
                },
                required: false,
                order: 3,
                settings: {
                    groupLabel: 'CHOICES',
                    isChoice: true
                }
            },
            {
                id: 'choice-2',
                name: 'Choice 2',
                type: 'input',
                label: '',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe la opción 2...'
                },
                required: false,
                order: 4,
                settings: {
                    groupLabel: 'CHOICES',
                    isChoice: true
                }
            },
            {
                id: 'choice-3',
                name: 'Choice 3',
                type: 'input',
                label: '',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe la opción 3...'
                },
                required: false,
                order: 5,
                settings: {
                    groupLabel: 'CHOICES',
                    isChoice: true
                }
            }
        ]
    },
    {
        name: 'Linear Scale',
        description: 'Escala numérica',
        components: [
            {
                id: 'question-title',
                name: 'Question Title',
                type: 'input',
                label: 'Título de la pregunta',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe la pregunta aquí...'
                },
                required: true,
                order: 1,
                settings: {}
            },
            {
                id: 'question-description',
                name: 'Question Description',
                type: 'textarea',
                label: 'Descripción',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe una descripción opcional...'
                },
                required: false,
                order: 2,
                settings: {}
            },
            {
                id: 'scale-start-value',
                name: 'Scale Start Value',
                type: 'input',
                label: 'Valor inicial',
                defaultValue: '1',
                placeholder: {
                    enabled: true,
                    text: 'Ej: 1'
                },
                required: true,
                order: 3,
                settings: {
                    min: 0,
                    max: 100,
                    type: 'number'
                }
            },
            {
                id: 'scale-end-value',
                name: 'Scale End Value',
                type: 'input',
                label: 'Valor final',
                defaultValue: '5',
                placeholder: {
                    enabled: true,
                    text: 'Ej: 5'
                },
                required: true,
                order: 4,
                settings: {
                    min: 0,
                    max: 100,
                    type: 'number'
                }
            },
            {
                id: 'scale-start-label',
                name: 'Scale Start Label',
                type: 'input',
                label: 'Etiqueta valor inicial',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Ej: Muy insatisfecho'
                },
                required: false,
                order: 5,
                settings: {}
            },
            {
                id: 'scale-end-label',
                name: 'Scale End Label',
                type: 'input',
                label: 'Etiqueta valor final',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Ej: Muy satisfecho'
                },
                required: false,
                order: 6,
                settings: {}
            }
        ]
    },
    {
        name: 'Ranking',
        description: 'Ordenar opciones por preferencia',
        components: [
            {
                id: 'question-title',
                name: 'Question Title',
                type: 'input',
                label: 'Título de la pregunta',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe la pregunta aquí...'
                },
                required: true,
                order: 1,
                settings: {}
            },
            {
                id: 'question-description',
                name: 'Question Description',
                type: 'textarea',
                label: 'Descripción',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe una descripción opcional...'
                },
                required: false,
                order: 2,
                settings: {}
            },
            {
                id: 'ranking-slider',
                name: 'Ranking Slider',
                type: 'select',
                label: '',
                defaultValue: '',
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
    },
    {
        name: 'Navigation Flow',
        description: 'Prueba de flujo de navegación',
        components: [
            {
                id: 'question-title',
                name: 'Question Title',
                type: 'input',
                label: 'Título de la pregunta',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe la pregunta aquí...'
                },
                required: true,
                order: 1,
                settings: {}
            },
            {
                id: 'question-description',
                name: 'Question Description',
                type: 'textarea',
                label: 'Descripción',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe una descripción opcional...'
                },
                required: false,
                order: 2,
                settings: {}
            },
            {
                id: 'image-upload',
                name: 'Image Upload',
                type: 'file-upload',
                label: 'Subir archivos (imágenes)',
                required: false,
                order: 3,
                settings: {},
                fileUpload: {
                    maxSizeMB: 5,
                    acceptedFormats: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
                    recommendedResolution: '1000x1000px',
                    allowHitZones: true,
                    allowParticipantSelection: false
                }
            }
        ]
    },
    {
        name: 'Preference Test',
        description: 'Prueba A/B de preferencia',
        components: [
            {
                id: 'question-title',
                name: 'Question Title',
                type: 'input',
                label: 'Título de la pregunta',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe la pregunta aquí...'
                },
                required: true,
                order: 1,
                settings: {}
            },
            {
                id: 'question-description',
                name: 'Question Description',
                type: 'textarea',
                label: 'Descripción',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe una descripción opcional...'
                },
                required: false,
                order: 2,
                settings: {}
            },
            {
                id: 'image-upload',
                name: 'Image Upload',
                type: 'file-upload',
                label: 'Subir archivos (imágenes)',
                required: false,
                order: 3,
                settings: {},
                fileUpload: {
                    maxSizeMB: 5,
                    acceptedFormats: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
                    recommendedResolution: '1000x1000px'
                }
            }
        ]
    }
];

const seedCognitiveTasksModules = async () => {
    const connection = await pool.getConnection();
    try {
        console.log('🌱 Starting seed for Cognitive Tasks modules (based on COGNITIVE_TASKS_MODULES.md)...\n');
        await connection.beginTransaction();


        // Get the Cognitive Tasks stage template ID (if exists)
        const [stageTemplateRows] = await connection.query(
            'SELECT id FROM stage_templates WHERE name = ? AND is_active = true',
            ['Cognitive Tasks']
        ) as any[];
        const stageTemplateId = stageTemplateRows.length > 0 ? stageTemplateRows[0].id : null;

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        for (let index = 0; index < cognitiveTasksModules.length; index++) {
            const moduleDef = cognitiveTasksModules[index];
            // Check if module already exists
            const [checkRows] = await connection.query(
                'SELECT id FROM module_templates WHERE name = ?',
                [moduleDef.name]
            ) as any[];

            const structure = {
                components: moduleDef.components
            };

            let moduleId: string;

            if (checkRows.length > 0) {
                // Update existing module
                moduleId = checkRows[0].id;
                await connection.query(
                    `UPDATE module_templates 
                     SET description = ?, structure = ?, updated_at = NOW() 
                     WHERE id = ?`,
                    [moduleDef.description, JSON.stringify(structure), moduleId]
                );
                updatedCount++;
                console.log(`✓ Updated: ${moduleDef.name} (${moduleDef.components.length} components)`);
            } else {
                // Create new module
                moduleId = randomUUID();
                await connection.query(
                    `INSERT INTO module_templates (id, name, description, structure, is_active, created_at, updated_at)
                     VALUES (?, ?, ?, ?, true, NOW(), NOW())`,
                    [moduleId, moduleDef.name, moduleDef.description, JSON.stringify(structure)]
                );
                createdCount++;
                console.log(`✓ Created: ${moduleDef.name} (${moduleDef.components.length} components)`);
            }

            // Associate with Cognitive Tasks stage template if it exists
            if (stageTemplateId) {
                // Use the index as display_order to maintain the order from the array
                await connection.query(
                    `INSERT INTO stage_templates_module_templates (id, stage_template_id, module_template_id, display_order)
                     VALUES (UUID(), ?, ?, ?)
                     ON DUPLICATE KEY UPDATE display_order = ?`,
                    [stageTemplateId, moduleId, index, index]
                );
            }
        }

        await connection.commit();
        console.log(`\n✅ Cognitive Tasks modules seed completed!`);
        console.log(`   Created: ${createdCount}`);
        console.log(`   Updated: ${updatedCount}`);
        console.log(`   Skipped: ${skippedCount}`);
        if (stageTemplateId) {
            console.log(`   Associated with Cognitive Tasks stage template`);
        } else {
            console.log(`   ⚠️  Cognitive Tasks stage template not found - modules not associated`);
        }

    } catch (error) {
        await connection.rollback();
        console.error('❌ Seed failed:', error);
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
};

seedCognitiveTasksModules();

