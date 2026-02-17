/**
 * Master seed script for all module_templates using PostgreSQL
 * This script seeds all the module templates needed for the application
 */
import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
});

interface ModuleTemplate {
    name: string;
    description: string;
    structure: object;
}

const moduleTemplates: ModuleTemplate[] = [
    // Welcome Screen
    {
        name: 'Welcome Screen',
        description: 'Initial welcome screen with title, message, and start button',
        structure: {
            components: [
                { id: 'title', name: 'Title', type: 'input', label: 'Title', defaultValue: '', placeholder: { enabled: true, text: 'Title of the screen' }, required: false, order: 1, settings: {} },
                { id: 'message', name: 'Message', type: 'textarea', label: 'Message', defaultValue: '', placeholder: { enabled: true, text: 'Message for the screen' }, required: false, order: 2, settings: { maxLength: 100, autosize: true } },
                { id: 'start_button_text', name: 'Start button text', type: 'input', label: 'Start button text', defaultValue: '', placeholder: { enabled: true, text: 'Name the button to start the test' }, required: false, order: 3, settings: {} }
            ]
        }
    },
    // Thank You Screen
    {
        name: 'Thank You Screen',
        description: 'Final thank you screen with title, message, and redirect options',
        structure: {
            components: [
                { id: 'title', name: 'Title', type: 'input', label: 'Title', defaultValue: '', placeholder: { enabled: true, text: 'Title of the thank you screen' }, required: false, order: 1, settings: {} },
                { id: 'message', name: 'Message', type: 'textarea', label: 'Message', defaultValue: '', placeholder: { enabled: true, text: 'Thank you message' }, required: false, order: 2, settings: { maxLength: 500, autosize: true } },
                { id: 'redirect_url', name: 'Redirect URL', type: 'input', label: 'Redirect URL (optional)', defaultValue: '', placeholder: { enabled: true, text: 'URL to redirect after completion' }, required: false, order: 3, settings: {} }
            ]
        }
    },
    // Research Configuration
    {
        name: 'Research Configuration',
        description: 'Research settings and recruitment configuration',
        structure: {
            components: [
                { id: 'target_responses', name: 'Target Responses', type: 'number', label: 'Target number of responses', defaultValue: 100, required: true, order: 1, settings: { min: 1, max: 10000 } },
                { id: 'estimated_duration', name: 'Estimated Duration', type: 'number', label: 'Estimated duration (minutes)', defaultValue: 10, required: true, order: 2, settings: { min: 1, max: 120 } }
            ]
        }
    },
    // Voice of Customer (VOC)
    {
        name: 'Voice of Costumer (VOC)',
        description: 'Voice of Customer feedback module for collecting qualitative feedback',
        structure: {
            components: [
                { id: 'voc-title', type: 'input', label: 'Question Title', placeholder: { enabled: true, text: 'Enter the question title' }, required: true, order: 1 },
                { id: 'voc-description', type: 'textarea', label: 'Description (optional)', placeholder: { enabled: true, text: 'Enter an optional description' }, required: false, order: 2 },
                { id: 'voc-response', type: 'textarea', label: 'Response', placeholder: { enabled: true, text: 'Customer response area' }, required: true, order: 3, settings: { maxLength: 1000 } }
            ]
        }
    },
    // Net Promoter Score (NPS)
    {
        name: 'Net Promoter Score (NPS)',
        description: 'Standard NPS metric to measure customer loyalty',
        structure: {
            components: [
                { id: 'nps-title', type: 'input', label: 'Question Title', placeholder: { enabled: true, text: 'How likely are you to recommend us?' }, required: true, order: 1 },
                { id: 'nps-description', type: 'textarea', label: 'Description (optional)', placeholder: { enabled: true, text: 'Enter an optional description' }, required: false, order: 2 },
                { id: 'nps-scale', type: 'scale', label: 'NPS Scale', required: true, order: 3, settings: { min: 0, max: 10, labels: { 0: 'Not at all likely', 10: 'Extremely likely' } } }
            ]
        }
    },
    // Customer Satisfaction Score (CSAT)
    {
        name: 'Customer Satisfaction Score (CSAT)',
        description: 'Standard CSAT metric to measure customer satisfaction',
        structure: {
            components: [
                { id: 'csat-title', type: 'input', label: 'Question Title', placeholder: { enabled: true, text: 'How satisfied are you?' }, required: true, order: 1 },
                { id: 'csat-description', type: 'textarea', label: 'Description (optional)', placeholder: { enabled: true, text: 'Enter an optional description' }, required: false, order: 2 },
                { id: 'csat-scale', type: 'scale', label: 'CSAT Scale', required: true, order: 3, settings: { min: 1, max: 5, labels: { 1: 'Very dissatisfied', 5: 'Very satisfied' } } }
            ]
        }
    },
    // Customer Effort Score (CES)
    {
        name: 'Customer Effort Score (CES)',
        description: 'Standard CES metric to measure how much effort a customer had to exert',
        structure: {
            components: [
                { id: 'ces-title', type: 'input', label: 'Question Title', placeholder: { enabled: true, text: 'How easy was it to solve your issue?' }, required: true, order: 1 },
                { id: 'ces-description', type: 'textarea', label: 'Description (optional)', placeholder: { enabled: true, text: 'Enter an optional description' }, required: false, order: 2 },
                { id: 'ces-scale', type: 'scale', label: 'CES Scale', required: true, order: 3, settings: { min: 1, max: 7, labels: { 1: 'Very difficult', 7: 'Very easy' } } }
            ]
        }
    },
    // Cognitive Value (CV)
    {
        name: 'Cognitive Value (CV)',
        description: 'Cognitive Value assessment module',
        structure: {
            components: [
                { id: 'cv-title', type: 'input', label: 'Question Title', placeholder: { enabled: true, text: 'Enter the question' }, required: true, order: 1 },
                { id: 'cv-description', type: 'textarea', label: 'Description (optional)', placeholder: { enabled: true, text: 'Enter an optional description' }, required: false, order: 2 },
                { id: 'cv-scale', type: 'scale', label: 'CV Scale', required: true, order: 3, settings: { min: 1, max: 10 } }
            ]
        }
    },
    // Net Emotional Value (NEV)
    {
        name: 'Net Emotional Value (NEV)',
        description: 'Net Emotional Value assessment module',
        structure: {
            components: [
                { id: 'nev-title', type: 'input', label: 'Question Title', placeholder: { enabled: true, text: 'How do you feel about this experience?' }, required: true, order: 1 },
                { id: 'nev-description', type: 'textarea', label: 'Description (optional)', placeholder: { enabled: true, text: 'Enter an optional description' }, required: false, order: 2 },
                { id: 'nev-emotions', type: 'emotion-picker', label: 'Select emotions', required: true, order: 3, settings: { emotions: ['happy', 'sad', 'surprised', 'angry', 'fearful', 'disgusted', 'neutral'] } }
            ]
        }
    },
    // Cognitive Tasks - Short Text
    {
        name: 'Short Text',
        description: 'Short text response question',
        structure: {
            components: [
                { id: 'question-title', type: 'input', label: 'Question', placeholder: { enabled: true, text: 'Enter your question' }, required: true, order: 1 },
                { id: 'response', type: 'input', label: 'Response', placeholder: { enabled: true, text: 'Short answer' }, required: true, order: 2, settings: { maxLength: 255 } }
            ]
        }
    },
    // Cognitive Tasks - Long Text
    {
        name: 'Long Text',
        description: 'Long text response question',
        structure: {
            components: [
                { id: 'question-title', type: 'input', label: 'Question', placeholder: { enabled: true, text: 'Enter your question' }, required: true, order: 1 },
                { id: 'response', type: 'textarea', label: 'Response', placeholder: { enabled: true, text: 'Detailed answer' }, required: true, order: 2, settings: { maxLength: 2000, autosize: true } }
            ]
        }
    },
    // Cognitive Tasks - Single Choice
    {
        name: 'Single Choice',
        description: 'Single choice question with multiple options',
        structure: {
            components: [
                { id: 'question-title', type: 'input', label: 'Question', placeholder: { enabled: true, text: 'Enter your question' }, required: true, order: 1 },
                { id: 'options', type: 'option-list', label: 'Options', required: true, order: 2, settings: { minOptions: 2, maxOptions: 10, allowOther: true } }
            ]
        }
    },
    // Cognitive Tasks - Multiple Choice
    {
        name: 'Multiple Choice',
        description: 'Multiple choice question allowing several selections',
        structure: {
            components: [
                { id: 'question-title', type: 'input', label: 'Question', placeholder: { enabled: true, text: 'Enter your question' }, required: true, order: 1 },
                { id: 'options', type: 'checkbox-list', label: 'Options', required: true, order: 2, settings: { minOptions: 2, maxOptions: 10, minSelections: 1, maxSelections: null } }
            ]
        }
    },
    // Cognitive Tasks - Linear Scale
    {
        name: 'Linear Scale',
        description: 'Linear scale question for rating responses',
        structure: {
            components: [
                { id: 'question-title', type: 'input', label: 'Question', placeholder: { enabled: true, text: 'Enter your question' }, required: true, order: 1 },
                { id: 'scale', type: 'linear-scale', label: 'Scale', required: true, order: 2, settings: { min: 1, max: 10, minLabel: '', maxLabel: '' } }
            ]
        }
    },
    // Cognitive Tasks - Ranking
    {
        name: 'Ranking',
        description: 'Ranking question to order items by preference',
        structure: {
            components: [
                { id: 'question-title', type: 'input', label: 'Question', placeholder: { enabled: true, text: 'Rank the following items' }, required: true, order: 1 },
                { id: 'items', type: 'ranking-list', label: 'Items to rank', required: true, order: 2, settings: { minItems: 2, maxItems: 10 } }
            ]
        }
    },
    // Cognitive Tasks - Navigation Flow
    {
        name: 'Navigation Flow',
        description: 'Navigation flow task for usability testing',
        structure: {
            components: [
                { id: 'task-title', type: 'input', label: 'Task Title', placeholder: { enabled: true, text: 'Describe the navigation task' }, required: true, order: 1 },
                { id: 'task-url', type: 'input', label: 'Starting URL', placeholder: { enabled: true, text: 'https://example.com' }, required: true, order: 2 },
                { id: 'task-instructions', type: 'textarea', label: 'Instructions', placeholder: { enabled: true, text: 'Detailed instructions for the participant' }, required: true, order: 3 }
            ]
        }
    },
    // Cognitive Tasks - Preference Test
    {
        name: 'Preference Test',
        description: 'Preference test to compare two or more options',
        structure: {
            components: [
                { id: 'question-title', type: 'input', label: 'Question', placeholder: { enabled: true, text: 'Which option do you prefer?' }, required: true, order: 1 },
                { id: 'options', type: 'image-comparison', label: 'Options to compare', required: true, order: 2, settings: { minOptions: 2, maxOptions: 4 } }
            ]
        }
    }
];

const seedAllModuleTemplates = async () => {
    const client = await pool.connect();
    try {
        console.log('🌱 Starting seed for all module templates...\n');
        await client.query('BEGIN');

        // Get a user ID to use as created_by
        const userRes = await client.query('SELECT id FROM users LIMIT 1');
        const userId = userRes.rows[0]?.id;

        if (!userId) {
            console.log('❌ No users found. Cannot seed modules without a creator.');
            await client.query('ROLLBACK');
            return;
        }

        let created = 0;
        let skipped = 0;

        for (const module of moduleTemplates) {
            // Check if module already exists
            const checkRes = await client.query(
                'SELECT id FROM module_templates WHERE name = $1',
                [module.name]
            );

            if (checkRes.rows.length > 0) {
                console.log(`⏭️  Skipped (exists): ${module.name}`);
                skipped++;
                continue;
            }

            // Insert the module template
            await client.query(
                `INSERT INTO module_templates (name, description, structure, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, true, NOW(), NOW())`,
                [module.name, module.description, JSON.stringify(module.structure)]
            );
            console.log(`✅ Created: ${module.name}`);
            created++;
        }

        await client.query('COMMIT');
        console.log(`\n🎉 Seed completed! Created: ${created}, Skipped: ${skipped}`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Seed failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
};

seedAllModuleTemplates();
