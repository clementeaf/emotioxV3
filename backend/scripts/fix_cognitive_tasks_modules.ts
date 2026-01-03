/**
 * Script para asociar los módulos de Cognitive Tasks al stage template correspondiente
 * Mueve los módulos que están actualmente en "Other Modules" a "Cognitive Tasks"
 */
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

/**
 * Nombres exactos de los 8 módulos de Cognitive Tasks
 */
const COGNITIVE_TASKS_MODULES = [
    'Short Text',
    'Long Text',
    'Single Choice',
    'Multiple Choice',
    'Linear Scale',
    'Ranking',
    'Navigation Flow',
    'Preference Test'
];

async function fixCognitiveTasksModules(): Promise<void> {
    const client = await pool.connect();
    try {
        console.log('🔧 Fixing Cognitive Tasks modules associations...');
        await client.query('BEGIN');

        // 1. Obtener el ID del stage_template "Cognitive Tasks"
        const stageQuery = await client.query(
            'SELECT id FROM stage_templates WHERE name = $1 AND is_active = true',
            ['Cognitive Tasks']
        );

        if (stageQuery.rows.length === 0) {
            console.error('❌ Stage template "Cognitive Tasks" not found!');
            console.log('💡 Creating "Cognitive Tasks" stage template...');
            
            // Crear el stage template si no existe
            const createStageQuery = await client.query(
                `INSERT INTO stage_templates (name, description, stage_type, is_active)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                ['Cognitive Tasks', 'Cognitive assessment and task-based research modules.', 'module_collection', true]
            );
            
            const stageId = createStageQuery.rows[0].id;
            console.log(`✅ Created "Cognitive Tasks" stage template with ID: ${stageId}`);
            
            // Continuar con las asociaciones
            await associateModulesToStage(client, stageId);
        } else {
            const stageId = stageQuery.rows[0].id;
            console.log(`✅ Found "Cognitive Tasks" stage template with ID: ${stageId}`);
            
            // Continuar con las asociaciones
            await associateModulesToStage(client, stageId);
        }

        await client.query('COMMIT');
        console.log('✅ Cognitive Tasks modules fixed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error fixing Cognitive Tasks modules:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

/**
 * Asocia los módulos de Cognitive Tasks al stage template
 */
async function associateModulesToStage(client: any, stageId: string): Promise<void> {
    console.log('\n📋 Associating modules to "Cognitive Tasks"...');
    
    // Primero, eliminar asociaciones existentes de estos módulos con otros stages
    // (para evitar duplicados)
    const moduleIds: string[] = [];
    
    for (const moduleName of COGNITIVE_TASKS_MODULES) {
        const moduleQuery = await client.query(
            'SELECT id FROM module_templates WHERE name = $1 AND is_active = true',
            [moduleName]
        );

        if (moduleQuery.rows.length > 0) {
            const moduleId = moduleQuery.rows[0].id;
            moduleIds.push(moduleId);
            
            // Eliminar asociaciones existentes con otros stages
            const deleteQuery = await client.query(
                `DELETE FROM stage_templates_module_templates 
                 WHERE module_template_id = $1 
                 AND stage_template_id != $2`,
                [moduleId, stageId]
            );
            
            if (deleteQuery.rowCount && deleteQuery.rowCount > 0) {
                console.log(`  🗑️  Removed existing associations for "${moduleName}"`);
            }
        } else {
            console.log(`  ⚠️  Module "${moduleName}" not found, skipping...`);
        }
    }

    // Ahora asociar todos los módulos al stage "Cognitive Tasks"
    for (let i = 0; i < COGNITIVE_TASKS_MODULES.length; i++) {
        const moduleName = COGNITIVE_TASKS_MODULES[i];
        
        const moduleQuery = await client.query(
            'SELECT id FROM module_templates WHERE name = $1 AND is_active = true',
            [moduleName]
        );

        if (moduleQuery.rows.length > 0) {
            const moduleId = moduleQuery.rows[0].id;

            // Insertar o actualizar la asociación
            await client.query(
                `INSERT INTO stage_templates_module_templates 
                 (stage_template_id, module_template_id, display_order) 
                 VALUES ($1, $2, $3)
                 ON CONFLICT (stage_template_id, module_template_id) 
                 DO UPDATE SET display_order = $3`,
                [stageId, moduleId, i]
            );

            console.log(`  ✓ Associated "${moduleName}" with "Cognitive Tasks" (order: ${i})`);
        } else {
            console.log(`  ⚠️  Module "${moduleName}" not found, skipping...`);
        }
    }

    console.log(`\n✅ Associated ${moduleIds.length} modules to "Cognitive Tasks"`);
}

// Ejecutar el script
fixCognitiveTasksModules()
    .then(() => {
        console.log('\n🎉 Script completed successfully!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n💥 Script failed:', err);
        process.exit(1);
    });

