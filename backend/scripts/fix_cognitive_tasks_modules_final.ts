/**
 * Script final para asociar los módulos de Cognitive Tasks al stage template
 * Busca módulos por nombre exacto o con variaciones y elimina asociaciones previas
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
        console.log('🔧 Fixing Cognitive Tasks modules associations...\n');
        await client.query('BEGIN');

        // 1. Listar todos los módulos para verificar nombres
        console.log('📋 Listing all module templates...\n');
        const allModulesQuery = await client.query(
            'SELECT id, name, is_active FROM module_templates ORDER BY name'
        );
        
        console.log(`Found ${allModulesQuery.rows.length} total modules:\n`);
        allModulesQuery.rows.forEach((module, index) => {
            const status = module.is_active ? '✅' : '❌';
            console.log(`${index + 1}. [${status}] ${module.name} (${module.id})`);
        });

        // 2. Obtener o crear el stage template "Cognitive Tasks"
        let stageId: string;
        const stageQuery = await client.query(
            'SELECT id FROM stage_templates WHERE name = $1',
            ['Cognitive Tasks']
        );

        if (stageQuery.rows.length === 0) {
            console.log('\n💡 Creating "Cognitive Tasks" stage template...');
            const createStageQuery = await client.query(
                `INSERT INTO stage_templates (name, description, stage_type, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, NOW(), NOW())
                 RETURNING id`,
                ['Cognitive Tasks', 'Cognitive assessment and task-based research modules.', 'module_collection', true]
            );
            stageId = createStageQuery.rows[0].id;
            console.log(`✅ Created "Cognitive Tasks" stage template with ID: ${stageId}\n`);
        } else {
            stageId = stageQuery.rows[0].id;
            console.log(`\n✅ Found "Cognitive Tasks" stage template with ID: ${stageId}\n`);
        }

        // 3. Buscar y asociar módulos
        console.log('🔍 Searching for Cognitive Tasks modules...\n');
        const foundModules: Array<{ id: string; name: string }> = [];

        for (const moduleName of COGNITIVE_TASKS_MODULES) {
            // Buscar coincidencia exacta (activo o inactivo)
            const exactMatch = allModulesQuery.rows.find(
                (m: { name: string }) => m.name === moduleName
            );

            if (exactMatch) {
                foundModules.push({ id: exactMatch.id, name: exactMatch.name });
                console.log(`✓ Found: "${exactMatch.name}" (${exactMatch.id})`);
            } else {
                // Buscar coincidencia parcial (case insensitive)
                const partialMatch = allModulesQuery.rows.find(
                    (m: { name: string }) => {
                        const mName = m.name.toLowerCase().trim();
                        const searchName = moduleName.toLowerCase().trim();
                        return mName === searchName || 
                               mName.includes(searchName) || 
                               searchName.includes(mName);
                    }
                );

                if (partialMatch) {
                    foundModules.push({ id: partialMatch.id, name: partialMatch.name });
                    console.log(`✓ Found (partial): "${partialMatch.name}" (${partialMatch.id}) - looking for "${moduleName}"`);
                } else {
                    console.log(`✗ Not found: "${moduleName}"`);
                }
            }
        }

        console.log(`\n📊 Summary: Found ${foundModules.length} out of ${COGNITIVE_TASKS_MODULES.length} Cognitive Tasks modules\n`);

        if (foundModules.length === 0) {
            console.log('⚠️  No Cognitive Tasks modules found. Cannot proceed with association.');
            await client.query('ROLLBACK');
            return;
        }

        // 4. Eliminar asociaciones existentes de estos módulos con otros stages
        console.log('🗑️  Removing existing associations with other stages...\n');
        const moduleIds = foundModules.map(m => m.id);
        
        const deleteResult = await client.query(
            `DELETE FROM stage_templates_module_templates 
             WHERE module_template_id = ANY($1::uuid[])
             AND stage_template_id != $2`,
            [moduleIds, stageId]
        );
        
        if (deleteResult.rowCount && deleteResult.rowCount > 0) {
            console.log(`  ✓ Removed ${deleteResult.rowCount} existing association(s)\n`);
        } else {
            console.log(`  ℹ️  No existing associations to remove\n`);
        }

        // 5. Asociar módulos al stage "Cognitive Tasks"
        console.log('🔗 Associating modules to "Cognitive Tasks"...\n');
        for (let i = 0; i < foundModules.length; i++) {
            const module = foundModules[i];

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

        // 6. Verificar las asociaciones
        console.log('\n📋 Verifying associations...\n');
        const verifyQuery = await client.query(`
            SELECT 
                st.name as stage_name,
                mt.name as module_name,
                stmt.display_order
            FROM stage_templates_module_templates stmt
            JOIN stage_templates st ON stmt.stage_template_id = st.id
            JOIN module_templates mt ON stmt.module_template_id = mt.id
            WHERE st.name = 'Cognitive Tasks'
            ORDER BY stmt.display_order
        `);

        console.log(`Found ${verifyQuery.rows.length} associations:\n`);
        verifyQuery.rows.forEach((assoc) => {
            console.log(`  ${assoc.display_order}. ${assoc.module_name}`);
        });

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
fixCognitiveTasksModules()
    .then(() => {
        console.log('\n🎉 Script completed successfully!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n💥 Script failed:', err);
        process.exit(1);
    });

