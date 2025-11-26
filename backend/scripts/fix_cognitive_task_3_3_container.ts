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

/**
 * Actualiza la estructura del módulo 3.3 para tener un componente contenedor
 * "Single Choice" que agrupe las opciones con inputs y selectores de elegibility
 */
(async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const moduleRes = await client.query(
            'SELECT id, structure FROM module_templates WHERE name = $1',
            ['3.3']
        );
        
        if (moduleRes.rows.length === 0) {
            console.log('Module 3.3 not found.');
            await client.query('ROLLBACK');
            return;
        }
        
        const moduleId = moduleRes.rows[0].id;
        let structure = moduleRes.rows[0].structure;
        
        if (typeof structure === 'string') {
            structure = JSON.parse(structure);
        }
        
        // Update structure with container approach
        structure.components = [
            {
                id: 'question-title',
                name: 'Question Title',
                type: 'input',
                label: 'Question',
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
                id: 'single-choice-container',
                name: 'Single Choice',
                type: 'radio',
                label: 'Choices',
                required: true,
                order: 2,
                settings: {
                    allowAddOptions: true,
                    allowDeleteOptions: true,
                    showOtherOption: false
                },
                choices: [
                    {
                        id: 'choice-1',
                        label: 'Option 1',
                        value: 'option-1',
                        eligibility: 'Qualify'
                    },
                    {
                        id: 'choice-2',
                        label: 'Option 2',
                        value: 'option-2',
                        eligibility: 'Disqualify'
                    },
                    {
                        id: 'choice-3',
                        label: 'Option 3',
                        value: 'option-3',
                        eligibility: 'Disqualify'
                    }
                ]
            },
            {
                id: 'image-upload',
                name: 'Image Upload',
                type: 'file-upload',
                label: 'Upload (optional)',
                required: false,
                order: 3,
                settings: {},
                fileUpload: {
                    maxSizeMB: 5,
                    acceptedFormats: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
                    recommendedResolution: '1000x1000px'
                }
            },
            {
                id: 'show-other-option',
                name: 'Show Other Option',
                type: 'checkbox',
                label: 'Show "Other" option',
                required: false,
                order: 4,
                settings: {}
            }
        ];
        
        await client.query(
            'UPDATE module_templates SET structure = $1 WHERE id = $2',
            [JSON.stringify(structure), moduleId]
        );
        
        await client.query('COMMIT');
        console.log('✓ Updated module 3.3 structure with container approach:');
        console.log('  - Question Title (input)');
        console.log('  - Single Choice Container (radio) with 3 initial choices');
        console.log('    Each choice has: input + eligibility selector');
        console.log('    Button to add more choices');
        console.log('  - Image Upload (file-upload)');
        console.log('  - Show Other Option (checkbox)');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
})();

