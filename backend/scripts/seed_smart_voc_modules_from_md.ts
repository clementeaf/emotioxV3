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
import { Pool } from 'pg';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
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
                label: 'Título de la pregunta',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe el título de la pregunta...'
                },
                required: true,
                order: 1
            },
            {
                id: 'csat-description',
                type: 'textarea',
                label: 'Descripción',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe una descripción opcional...'
                },
                required: false,
                order: 2
            },
            {
                id: 'csat-instructions',
                type: 'textarea',
                label: 'Instrucciones',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe instrucciones opcionales...'
                },
                required: false,
                order: 3
            },
            {
                id: 'csat-display-type',
                type: 'select',
                label: 'Tipo de visualización',
                options: [
                    { value: 'stars', label: 'Estrellas (⭐⭐⭐⭐⭐)' },
                    { value: 'numbers', label: 'Números (1-5)' }
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
                label: 'Título',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe el título de la pregunta...'
                },
                required: true,
                order: 1
            },
            {
                id: 'ces-description',
                type: 'textarea',
                label: 'Descripción',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe una descripción opcional...'
                },
                required: false,
                order: 2
            },
            {
                id: 'ces-instructions',
                type: 'textarea',
                label: 'Instrucciones',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe instrucciones opcionales...'
                },
                required: false,
                order: 3
            },
            {
                id: 'ces-scale',
                type: 'select',
                label: 'Escala',
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
                label: 'Etiqueta inicial',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Ej: Muy difícil'
                },
                required: false,
                order: 5
            },
            {
                id: 'ces-end-label',
                type: 'input',
                label: 'Etiqueta final',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Ej: Muy fácil'
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
                label: 'Título',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe el título de la pregunta...'
                },
                required: true,
                order: 1
            },
            {
                id: 'cv-description',
                type: 'textarea',
                label: 'Descripción',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe una descripción opcional...'
                },
                required: false,
                order: 2
            },
            {
                id: 'cv-instructions',
                type: 'textarea',
                label: 'Instrucciones',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe instrucciones opcionales...'
                },
                required: false,
                order: 3
            },
            {
                id: 'cv-scale',
                type: 'select',
                label: 'Escala',
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
                label: 'Etiqueta inicial',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Ej: Worthless, Malo'
                },
                required: false,
                order: 5
            },
            {
                id: 'cv-end-label',
                type: 'input',
                label: 'Etiqueta final',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Ej: Worth, Excelente'
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
                label: 'Título',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe el título de la pregunta...'
                },
                required: true,
                order: 1
            },
            {
                id: 'nps-description',
                type: 'textarea',
                label: 'Descripción',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe una descripción opcional...'
                },
                required: false,
                order: 2
            },
            {
                id: 'nps-instructions',
                type: 'textarea',
                label: 'Instrucciones',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe instrucciones opcionales...'
                },
                required: false,
                order: 3
            },
            {
                id: 'nps-scale',
                type: 'select',
                label: 'Escala',
                options: [
                    { value: '0-10', label: '0-10 (Estándar NPS)' },
                    { value: '1-10', label: '1-10' }
                ],
                selectRange: {
                    type: 'custom',
                    custom: {
                        min: 0,
                        max: 10
                    },
                    startLabel: 'Nada probable',
                    endLabel: 'Muy probable',
                    variant: 'scale'
                },
                required: true,
                order: 4
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
                label: 'Título',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe el título de la pregunta...'
                },
                required: true,
                order: 1
            },
            {
                id: 'nev-description',
                type: 'textarea',
                label: 'Descripción',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe una descripción opcional...'
                },
                required: false,
                order: 2
            },
            {
                id: 'nev-instructions',
                type: 'textarea',
                label: 'Instrucciones',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe instrucciones opcionales...'
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
                label: 'Título',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe el título de la pregunta...'
                },
                required: true,
                order: 1
            },
            {
                id: 'voc-description',
                type: 'textarea',
                label: 'Descripción',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe una descripción opcional...'
                },
                required: false,
                order: 2
            },
            {
                id: 'voc-instructions',
                type: 'textarea',
                label: 'Instrucciones',
                defaultValue: '',
                placeholder: {
                    enabled: true,
                    text: 'Escribe instrucciones opcionales...'
                },
                required: false,
                order: 3
            }
        ]
    }
];

const seedSmartVOCModules = async () => {
    const client = await pool.connect();
    try {
        console.log('🌱 Starting seed for Smart VOC modules (based on SMART_VOC_MODULES.md)...\n');
        await client.query('BEGIN');

        // Get a user ID to use as created_by
        const userRes = await client.query('SELECT id FROM users LIMIT 1');
        const userId = userRes.rows[0]?.id;

        if (!userId) {
            console.log('❌ No users found. Cannot seed modules without a creator.');
            await client.query('ROLLBACK');
            return;
        }

        // Get the Smart VOC stage template ID (if exists)
        const stageTemplateRes = await client.query(
            'SELECT id FROM stage_templates WHERE name = $1 AND is_active = true',
            ['Smart VOC']
        );
        const stageTemplateId = stageTemplateRes.rows.length > 0 ? stageTemplateRes.rows[0].id : null;

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        for (let index = 0; index < smartVOCModules.length; index++) {
            const moduleDef = smartVOCModules[index];
            // Check if module already exists
            const checkRes = await client.query(
                'SELECT id FROM module_templates WHERE name = $1',
                [moduleDef.name]
            );

            const structure = {
                components: moduleDef.components
            };

            let moduleId: string;

            if (checkRes.rows.length > 0) {
                // Update existing module
                moduleId = checkRes.rows[0].id;
                await client.query(
                    `UPDATE module_templates 
                     SET description = $1, structure = $2, updated_at = NOW() 
                     WHERE id = $3`,
                    [moduleDef.description, JSON.stringify(structure), moduleId]
                );
                updatedCount++;
                console.log(`✓ Updated: ${moduleDef.name} (${moduleDef.components.length} components)`);
            } else {
                // Create new module
                const insertRes = await client.query(
                    `INSERT INTO module_templates (name, description, structure, is_active, created_at, updated_at, created_by)
                     VALUES ($1, $2, $3, true, NOW(), NOW(), $4)
                     RETURNING id`,
                    [moduleDef.name, moduleDef.description, JSON.stringify(structure), userId]
                );
                moduleId = insertRes.rows[0].id;
                createdCount++;
                console.log(`✓ Created: ${moduleDef.name} (${moduleDef.components.length} components)`);
            }

            // Associate with Smart VOC stage template if it exists
            if (stageTemplateId) {
                // Use the index as display_order to maintain the order from the array
                await client.query(
                    `INSERT INTO stage_templates_module_templates (stage_template_id, module_template_id, display_order)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (stage_template_id, module_template_id) 
                     DO UPDATE SET display_order = $3`,
                    [stageTemplateId, moduleId, index]
                );
            }
        }

        await client.query('COMMIT');
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
        await client.query('ROLLBACK');
        console.error('❌ Seed failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
};

seedSmartVOCModules();

