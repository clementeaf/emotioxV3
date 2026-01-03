/**
 * Script para listar módulos y asociar los de Cognitive Tasks
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
 * Nombres posibles de los módulos de Cognitive Tasks (con variaciones)
 */
const COGNITIVE_TASKS_MODULE_NAMES = [
    'Short Text',
    'Long Text',
    'Single Choice',
    'Multiple Choice',
    'Linear Scale',
    'Ranking',
    'Navigation Flow',
    'Preference Test'
];

async function listAndFixCognitiveTasks(): Promise<void> {
    const client = await pool.connect();
    try {
        console.log('📋 Listing all active module templates...\n');
        
        // Listar todos los módulos activos
        const allModulesQuery = await client.query(
            'SELECT id, name, description FROM module_templates WHERE is_active = true ORDER BY name'
        );
        
        console.log(`Found ${allModulesQuery.rows.length} active modules:\n`);
        allModulesQuery.rows.forEach((module, index) => {
            console.log(`${index + 1}. ${module.name} (${module.id})`);
            if (module.description) {
                console.log(`   Description: ${module.description}`);
            }
        });
        
        console.log('\n🔍 Searching for Cognitive Tasks modules...\n');
        
        // Buscar módulos que coincidan con los nombres de Cognitive Tasks
        const foundModules: Array<{ id: string; name: string }> = [];
        
        for (const moduleName of COGNITIVE_TASKS_MODULE_NAMES) {
            // Buscar coincidencia exacta
            const exactMatch = allModulesQuery.rows.find(
                (m: { name: string }) => m.name === moduleName
            );
            
            if (exactMatch) {
                foundModules.push({ id: exactMatch.id, name: exactMatch.name });
                console.log(`✓ Found: "${exactMatch.name}" (${exactMatch.id})`);
            } else {
                // Buscar coincidencia parcial (case insensitive)
                const partialMatch = allModulesQuery.rows.find(
                    (m: { name: string }) => 
                        m.name.toLowerCase().includes(moduleName.toLowerCase()) ||
                        moduleName.toLowerCase().includes(m.name.toLowerCase())
                );
                
                if (partialMatch) {
                    foundModules.push({ id: partialMatch.id, name: partialMatch.name });
                    console.log(`✓ Found (partial): "${partialMatch.name}" (${partialMatch.id}) - looking for "${moduleName}"`);
                } else {
                    console.log(`✗ Not found: "${moduleName}"`);
                }
            }
        }
        
        console.log(`\n📊 Summary: Found ${foundModules.length} out of ${COGNITIVE_TASKS_MODULE_NAMES.length} Cognitive Tasks modules\n`);
        
        if (foundModules.length === 0) {
            console.log('⚠️  No Cognitive Tasks modules found. Cannot proceed with association.');
            return;
        }
        
        // Obtener o crear el stage template "Cognitive Tasks"
        let stageId: string;
        const stageQuery = await client.query(
            'SELECT id FROM stage_templates WHERE name = $1 AND is_active = true',
            ['Cognitive Tasks']
        );
        
        if (stageQuery.rows.length === 0) {
            console.log('💡 Creating "Cognitive Tasks" stage template...');
            const createStageQuery = await client.query(
                `INSERT INTO stage_templates (name, description, stage_type, is_active)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                ['Cognitive Tasks', 'Cognitive assessment and task-based research modules.', 'module_collection', true]
            );
            stageId = createStageQuery.rows[0].id;
            console.log(`✅ Created "Cognitive Tasks" stage template with ID: ${stageId}\n`);
        } else {
            stageId = stageQuery.rows[0].id;
            console.log(`✅ Found "Cognitive Tasks" stage template with ID: ${stageId}\n`);
        }
        
        // Asociar módulos al stage template
        console.log('🔗 Associating modules to "Cognitive Tasks"...\n');
        await client.query('BEGIN');
        
        for (let i = 0; i < foundModules.length; i++) {
            const module = foundModules[i];
            
            // Eliminar asociaciones existentes con otros stages
            await client.query(
                `DELETE FROM stage_templates_module_templates 
                 WHERE module_template_id = $1 
                 AND stage_template_id != $2`,
                [module.id, stageId]
            );
            
            // Insertar o actualizar la asociación
            await client.query(
                `INSERT INTO stage_templates_module_templates 
                 (stage_template_id, module_template_id, display_order) 
                 VALUES ($1, $2, $3)
                 ON CONFLICT (stage_template_id, module_template_id) 
                 DO UPDATE SET display_order = $3`,
                [stageId, module.id, i]
            );
            
            console.log(`  ✓ Associated "${module.name}" with "Cognitive Tasks" (order: ${i})`);
        }
        
        await client.query('COMMIT');
        console.log(`\n✅ Successfully associated ${foundModules.length} modules to "Cognitive Tasks"!`);
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

// Ejecutar el script
listAndFixCognitiveTasks()
    .then(() => {
        console.log('\n🎉 Script completed successfully!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n💥 Script failed:', err);
        process.exit(1);
    });

