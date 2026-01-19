/**
 * Seed script para módulos Smart VOC
 * Basado estrictamente en SMART_VOC_MODULES.md
 * 
 * Genera los siguientes módulos:
 * 1. CSAT (Customer Satisfaction Score)
 * 2. CES (Customer Effort Score)
 * 3. CV (Customer Value)
 * 4. NPS (Net Promoter Score)
 * 5. NEV (Net Emotional Value)
 * 6. VOC (Voice of Customer)
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
        type: 'input' | 'textarea' | 'select';
        label: string;
        defaultValue?: string;
        placeholder?: {
            enabled: boolean;
            text: string;
        };
        required?: boolean;
        order: number;
        options?: Array<{ value: string; label: string }>;
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
        settings?: {
            [key: string]: unknown;
        };
    }>;
}

const smartVOCModules: ModuleDefinition[] = [
    {
        name: 'Customer Satisfaction Score (CSAT)',
        description: 'Customer Satisfaction - Satisfacción del cliente',
        components: [
            {
                id: 'csat-title',
                type: 'input',
                label: 'Question',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Type your question here...'
                },
                required: true,
                order: 1
            },
            {
                id: 'csat-description',
                type: 'textarea',
                label: 'Description',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Enter an optional description...'
                },
                required: false,
                order: 2
            },
            {
                id: 'csat-instructions',
                type: 'textarea',
                label: 'Instructions',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Enter optional instructions...'
                },
                required: false,
                order: 3
            },
            {
                id: 'csat-display-type',
                type: 'select',
                label: 'Display Type',
                options: [
                    { value: 'stars', label: 'Stars (⭐⭐⭐⭐⭐)' },
                    { value: 'numbers', label: 'Numbers (1-5)' }
                ],
                required: true,
                order: 4
            }
        ]
    },
    {
        name: 'Customer Effort Score (CES)',
        description: 'Customer Effort Score - Esfuerzo del cliente',
        components: [
            {
                id: 'ces-title',
                type: 'input',
                label: 'Question',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Type your question here...'
                },
                required: true,
                order: 1
            },
            {
                id: 'ces-description',
                type: 'textarea',
                label: 'Description',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Enter an optional description...'
                },
                required: false,
                order: 2
            },
            {
                id: 'ces-instructions',
                type: 'textarea',
                label: 'Instructions',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Enter optional instructions...'
                },
                required: false,
                order: 3
            },
            {
                id: 'ces-scale',
                type: 'select',
                label: 'Scale',
                options: [
                    { value: '1-5', label: '1-5' },
                    { value: '1-7', label: '1-7' },
                    { value: '1-10', label: '1-10' }
                ],
                selectRange: {
                    type: 'predefined',
                    predefined: '1-7'
                },
                required: true,
                order: 4
            },
            {
                id: 'ces-start-label',
                type: 'input',
                label: 'Start Label',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Ex: Very Difficult'
                },
                required: false,
                order: 5
            },
            {
                id: 'ces-end-label',
                type: 'input',
                label: 'End Label',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Ex: Very Easy'
                },
                required: false,
                order: 6
            }
        ]
    },
    {
        name: 'Cognitive Value (CV)',
        description: 'Customer Value - Valor del cliente',
        components: [
            {
                id: 'cv-title',
                type: 'input',
                label: 'Question',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Type your question here...'
                },
                required: true,
                order: 1
            },
            {
                id: 'cv-description',
                type: 'textarea',
                label: 'Description',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Enter an optional description...'
                },
                required: false,
                order: 2
            },
            {
                id: 'cv-instructions',
                type: 'textarea',
                label: 'Instructions',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Enter optional instructions...'
                },
                required: false,
                order: 3
            },
            {
                id: 'cv-scale',
                type: 'select',
                label: 'Scale',
                options: [
                    { value: '1-5', label: '1-5' },
                    { value: '1-7', label: '1-7' },
                    { value: '1-10', label: '1-10' }
                ],
                required: true,
                order: 4
            },
            {
                id: 'cv-start-label',
                type: 'input',
                label: 'Start Label',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Ex: Worthless, Bad'
                },
                required: false,
                order: 5
            },
            {
                id: 'cv-end-label',
                type: 'input',
                label: 'End Label',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Ex: Worth, Excellent'
                },
                required: false,
                order: 6
            }
        ]
    },
    {
        name: 'Net Promoter Score (NPS)',
        description: 'Net Promoter Score - Puntuación de promotor neto',
        components: [
            {
                id: 'nps-title',
                type: 'input',
                label: 'Question',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'En una escala del 0 al 10, ¿qué tan probable es que recomiendes [nuestra empresa/producto/servicio] a un amigo o familiar?'
                },
                required: true,
                order: 1
            },
            {
                id: 'nps-description',
                type: 'textarea',
                label: 'Description',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Enter an optional description...'
                },
                required: false,
                order: 2
            },
            {
                id: 'nps-instructions',
                type: 'textarea',
                label: 'Instructions',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Enter optional instructions...'
                },
                required: false,
                order: 3
            },
            {
                id: 'nps-scale-range',
                type: 'input',
                label: 'Range',
                defaultValue: '0-10',
                placeholder: {
                    enabled: false,
                    text: ''
                },
                required: true,
                order: 4,
                settings: {
                    readonly: true,
                    defaultValue: '0-10'
                },
                // Explicitly ensure no options are added to this component
                options: undefined
            }
        ]
    },
    {
        name: 'Net Emotional Value (NEV)',
        description: 'Net Emotional Value - Valor emocional neto',
        components: [
            {
                id: 'nev-title',
                type: 'input',
                label: 'Question',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Type your question here...'
                },
                required: true,
                order: 1
            },
            {
                id: 'nev-description',
                type: 'textarea',
                label: 'Description',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Enter an optional description...'
                },
                required: false,
                order: 2
            },
            {
                id: 'nev-instructions',
                type: 'textarea',
                label: 'Instructions',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Enter optional instructions...'
                },
                required: false,
                order: 3
            }
        ]
    },
    {
        name: 'Voice of Costumer (VOC)',
        description: 'Voice of Customer - Voz del cliente',
        components: [
            {
                id: 'voc-title',
                type: 'input',
                label: 'Question',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Type your question here...'
                },
                required: true,
                order: 1
            },
            {
                id: 'voc-description',
                type: 'textarea',
                label: 'Description',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Enter an optional description...'
                },
                required: false,
                order: 2
            },
            {
                id: 'voc-instructions',
                type: 'textarea',
                label: 'Instructions',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Enter optional instructions...'
                },
                required: false,
                order: 3
            }
        ]
    }
];

const seedSmartVOCModules = async () => {
    const connection = await pool.getConnection();
    try {
        console.log('🌱 Starting seed for Smart VOC modules (based on SMART_VOC_MODULES.md)...\n');
        await connection.beginTransaction();


        // Get the Smart VOC stage template ID (if exists)
        const [stageTemplateRows] = await connection.query(
            'SELECT id FROM stage_templates WHERE name = ? AND is_active = true',
            ['Smart VOC']
        ) as any[];
        const stageTemplateId = stageTemplateRows.length > 0 ? stageTemplateRows[0].id : null;

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        for (let index = 0; index < smartVOCModules.length; index++) {
            const moduleDef = smartVOCModules[index];
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

            // Associate with Smart VOC stage template if it exists
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
        console.log(`\n✅ Smart VOC modules seed completed!`);
        console.log(`   Created: ${createdCount}`);
        console.log(`   Updated: ${updatedCount}`);
        console.log(`   Skipped: ${skippedCount}`);
        if (stageTemplateId) {
            console.log(`   Associated with Smart VOC stage template`);
        } else {
            console.log(`   ⚠️  Smart VOC stage template not found - modules not associated`);
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

seedSmartVOCModules();

