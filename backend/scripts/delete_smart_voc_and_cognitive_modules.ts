/**
 * Script para eliminar módulos de Smart VOC y Cognitive Tasks de la base de datos
 * 
 * Elimina los siguientes módulos:
 * 
 * Smart VOC:
 * - Customer Satisfaction Score (CSAT)
 * - Customer Effort Score (CES)
 * - Cognitive Value (CV)
 * - Net Promoter Score (NPS)
 * - Net Emotional Value (NEV)
 * - Voice of Costumer (VOC)
 * 
 * Cognitive Tasks:
 * - Short Text
 * - Long Text
 * - Single Choice
 * - Multiple Choice
 * - Linear Scale
 * - Ranking
 * - Navigation Flow
 * - Preference Test
 * - 3.1 (si existe)
 * - 3.2 (si existe)
 * - 3.3 (si existe)
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

const MODULES_TO_DELETE = [
    // Smart VOC modules
    'Customer Satisfaction Score (CSAT)',
    'Customer Effort Score (CES)',
    'Cognitive Value (CV)',
    'Net Promoter Score (NPS)',
    'Net Emotional Value (NEV)',
    'Voice of Costumer (VOC)',
    // Cognitive Tasks modules
    'Short Text',
    'Long Text',
    'Single Choice',
    'Multiple Choice',
    'Linear Scale',
    'Ranking',
    'Navigation Flow',
    'Preference Test',
    // Old Cognitive Tasks modules (if they exist)
    '3.1',
    '3.2',
    '3.3'
];

const deleteModules = async () => {
    const client = await pool.connect();
    try {
        console.log('🗑️  Starting deletion of Smart VOC and Cognitive Tasks modules...\n');
        await client.query('BEGIN');

        let deletedCount = 0;
        let notFoundCount = 0;
        const deletedModules: string[] = [];
        const notFoundModules: string[] = [];

        for (const moduleName of MODULES_TO_DELETE) {
            // Check if module exists
            const checkRes = await client.query(
                'SELECT id FROM module_templates WHERE name = $1',
                [moduleName]
            );

            if (checkRes.rows.length === 0) {
                notFoundCount++;
                notFoundModules.push(moduleName);
                console.log(`⚠️  Not found: ${moduleName}`);
                continue;
            }

            const moduleId = checkRes.rows[0].id;

            // First, delete associations with stage templates
            await client.query(
                'DELETE FROM stage_templates_module_templates WHERE module_template_id = $1',
                [moduleId]
            );

            // Then delete the module template
            await client.query(
                'DELETE FROM module_templates WHERE id = $1',
                [moduleId]
            );

            deletedCount++;
            deletedModules.push(moduleName);
            console.log(`✓ Deleted: ${moduleName}`);
        }

        await client.query('COMMIT');
        
        console.log(`\n✅ Deletion completed!`);
        console.log(`   Deleted: ${deletedCount} modules`);
        console.log(`   Not found: ${notFoundCount} modules`);
        
        if (deletedModules.length > 0) {
            console.log(`\n📋 Deleted modules:`);
            deletedModules.forEach(name => console.log(`   - ${name}`));
        }
        
        if (notFoundModules.length > 0) {
            console.log(`\n⚠️  Modules not found (may have been already deleted):`);
            notFoundModules.forEach(name => console.log(`   - ${name}`));
        }

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Deletion failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
};

deleteModules();

