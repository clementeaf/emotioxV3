// Script to create Research Configuration module template and stage template
import { createPool, Pool } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: 10,
});

async function seedResearchConfigurationModule() {
    const connection = await pool.getConnection();
    try {
        console.log('🌱 Creating Research Configuration module and stage...');
        await connection.beginTransaction();

        // 1. Create Module Template for Research Configuration
        const moduleStructure = {
            components: [
                {
                    id: 'demographic_questions',
                    type: 'section',
                    label: 'Demographic Questions',
                    description: 'Configure demographic screening questions',
                    config: {
                        collapsible: true,
                        fields: [
                            { name: 'age', type: 'toggle', label: 'Age' },
                            { name: 'country', type: 'toggle', label: 'Country' },
                            { name: 'gender', type: 'toggle', label: 'Gender' },
                            { name: 'educationLevel', type: 'toggle', label: 'Education level' },
                            { name: 'annualIncome', type: 'toggle', label: 'Annual household income' },
                            { name: 'employmentStatus', type: 'toggle', label: 'Employment status' },
                            { name: 'dailyHoursOnline', type: 'toggle', label: 'Daily hours online' },
                            { name: 'technicalProficiency', type: 'toggle', label: 'Technical proficiency' }
                        ]
                    }
                },
                {
                    id: 'link_configuration',
                    type: 'section',
                    label: 'Link Configuration',
                    description: 'Configure survey access settings',
                    config: {
                        collapsible: true,
                        fields: [
                            { name: 'allowMobile', type: 'toggle', label: 'Allow respondents to take survey via mobile devices' },
                            { name: 'trackLocation', type: 'toggle', label: 'Track respondents location' },
                            { name: 'allowMultiple', type: 'toggle', label: 'It can be taken multiple times within a single session' }
                        ]
                    }
                },
                {
                    id: 'participant_limit',
                    type: 'section',
                    label: 'Limit Number of Participants',
                    description: 'Stop accepting responses after this number of participants',
                    config: {
                        collapsible: true,
                        fields: [
                            { name: 'limit', type: 'number', label: 'Participant limit', placeholder: '50', min: 1 }
                        ]
                    }
                },
                {
                    id: 'backlinks',
                    type: 'section',
                    label: 'A. Backlinks',
                    description: 'Please use @id parameters to transmit respondents ID\'s into your system',
                    config: {
                        fields: [
                            { 
                                name: 'complete', 
                                type: 'url', 
                                label: 'Link for complete interviews',
                                placeholder: 'www.useremotion.com/'
                            },
                            { 
                                name: 'disqualified', 
                                type: 'url', 
                                label: 'Link for disqualified interviews',
                                placeholder: 'www.useremotion.com/'
                            },
                            { 
                                name: 'overquota', 
                                type: 'url', 
                                label: 'Link for overquota interviews',
                                placeholder: 'www.useremotion.com/'
                            }
                        ]
                    }
                },
                {
                    id: 'research_url',
                    type: 'section',
                    label: 'B. Research\'s link to share',
                    description: 'Third-party invitation system should substitute {your respondent id here} parameter with individual respondent ID.',
                    config: {
                        fields: [
                            { 
                                name: 'url', 
                                type: 'url', 
                                label: 'Research URL',
                                placeholder: 'www.useremotion.com/sysgd-jye746?respondent={your_id}',
                                buttons: [
                                    { id: 'preview', label: 'Link Preview', icon: 'external-link' },
                                    { id: 'qr', label: 'Generate QR', icon: 'qr-code' }
                                ]
                            }
                        ]
                    }
                },
                {
                    id: 'parameters',
                    type: 'section',
                    label: 'C. Research\'s parameters to save',
                    description: 'Please specify parameters that you want to save (comma separated keys)',
                    config: {
                        fields: [
                            { 
                                name: 'params', 
                                type: 'tags', 
                                label: 'Parameters',
                                placeholder: 'Parameters',
                                suggestions: ['Separated', 'With', 'Comma', 'Keys']
                            }
                        ]
                    }
                }
            ]
        };

        // Check if module template already exists
        const [checkModuleRows] = await connection.query(
            'SELECT id FROM module_templates WHERE name = ?',
            ['Research Configuration']
        ) as any[];

        let moduleId: string;

        if (checkModuleRows.length > 0) {
            console.log('⚠️  Module template "Research Configuration" already exists. Updating...');
            moduleId = checkModuleRows[0].id;
            await connection.query(
                'UPDATE module_templates SET structure = ?, description = ?, updated_at = NOW() WHERE name = ?',
                [
                    JSON.stringify(moduleStructure),
                    'Research settings and recruitment configuration',
                    'Research Configuration'
                ]
            );
        } else {
            console.log('✨ Creating module template "Research Configuration"...');
            moduleId = randomUUID();
            await connection.query(
                `INSERT INTO module_templates (id, name, description, structure, is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, true, NOW(), NOW())`,
                [
                    moduleId,
                    'Research Configuration',
                    'Research settings and recruitment configuration',
                    JSON.stringify(moduleStructure)
                ]
            );
        }

        console.log(`✓ Module template created/updated: ${moduleId}`);

        // 2. Create Stage Template for Research Configuration
        const [checkStageRows] = await connection.query(
            'SELECT id FROM stage_templates WHERE name = ?',
            ['Research Configuration']
        ) as any[];

        let stageId: string;

        if (checkStageRows.length > 0) {
            console.log('⚠️  Stage template "Research Configuration" already exists. Updating...');
            stageId = checkStageRows[0].id;
            await connection.query(
                'UPDATE stage_templates SET description = ?, type = ?, updated_at = NOW() WHERE name = ?',
                [
                    'Research settings and recruitment configuration',
                    'single_module',
                    'Research Configuration'
                ]
            );

            // Clear existing module associations
            await connection.query(
                'DELETE FROM stage_templates_module_templates WHERE stage_template_id = ?',
                [stageId]
            );
        } else {
            console.log('✨ Creating stage template "Research Configuration"...');
            stageId = randomUUID();
            await connection.query(
                `INSERT INTO stage_templates (id, name, description, type, is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, true, NOW(), NOW())`,
                [
                    stageId,
                    'Research Configuration',
                    'Research settings and recruitment configuration',
                    'single_module'
                ]
            );
        }

        console.log(`✓ Stage template created/updated: ${stageId}`);

        // 3. Associate module with stage
        await connection.query(
            `INSERT INTO stage_templates_module_templates (id, stage_template_id, module_template_id, display_order)
             VALUES (UUID(), ?, ?, 0)
             ON DUPLICATE KEY UPDATE id=id`,
            [stageId, moduleId]
        );

        console.log('✓ Module associated with stage template');

        await connection.commit();
        console.log('✅ Research Configuration module and stage created successfully!');
    } catch (err) {
        await connection.rollback();
        console.error('❌ Error creating Research Configuration:', err);
        throw err;
    } finally {
        connection.release();
        await pool.end();
    }
}

seedResearchConfigurationModule();
