/**
 * Script para verificar todos los módulos (activos e inactivos)
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

async function checkAllModules(): Promise<void> {
    const client = await pool.connect();
    try {
        console.log('📋 Checking database connection...\n');
        
        // Verificar conexión
        const testQuery = await client.query('SELECT NOW()');
        console.log('✅ Database connection successful\n');
        
        // Listar todos los módulos (activos e inactivos)
        console.log('📋 Listing ALL module templates (active and inactive)...\n');
        const allModulesQuery = await client.query(
            'SELECT id, name, description, is_active FROM module_templates ORDER BY name'
        );
        
        console.log(`Found ${allModulesQuery.rows.length} total modules:\n`);
        if (allModulesQuery.rows.length === 0) {
            console.log('⚠️  No modules found in the database!');
        } else {
            allModulesQuery.rows.forEach((module, index) => {
                const status = module.is_active ? '✅ ACTIVE' : '❌ INACTIVE';
                console.log(`${index + 1}. [${status}] ${module.name} (${module.id})`);
                if (module.description) {
                    console.log(`   Description: ${module.description}`);
                }
            });
        }
        
        // Verificar stage templates
        console.log('\n📋 Listing all stage templates...\n');
        const stagesQuery = await client.query(
            'SELECT id, name, description, stage_type, is_active FROM stage_templates ORDER BY name'
        );
        
        console.log(`Found ${stagesQuery.rows.length} stage templates:\n`);
        stagesQuery.rows.forEach((stage, index) => {
            const status = stage.is_active ? '✅ ACTIVE' : '❌ INACTIVE';
            console.log(`${index + 1}. [${status}] ${stage.name} (${stage.id})`);
            console.log(`   Type: ${stage.stage_type || 'N/A'}`);
            if (stage.description) {
                console.log(`   Description: ${stage.description}`);
            }
        });
        
        // Verificar asociaciones actuales
        console.log('\n📋 Current module-stage associations...\n');
        const associationsQuery = await client.query(`
            SELECT 
                st.name as stage_name,
                mt.name as module_name,
                stmt.display_order
            FROM stage_templates_module_templates stmt
            JOIN stage_templates st ON stmt.stage_template_id = st.id
            JOIN module_templates mt ON stmt.module_template_id = mt.id
            ORDER BY st.name, stmt.display_order
        `);
        
        console.log(`Found ${associationsQuery.rows.length} associations:\n`);
        if (associationsQuery.rows.length === 0) {
            console.log('⚠️  No module-stage associations found!');
        } else {
            let currentStage = '';
            associationsQuery.rows.forEach((assoc) => {
                if (assoc.stage_name !== currentStage) {
                    currentStage = assoc.stage_name;
                    console.log(`\n📁 ${currentStage}:`);
                }
                console.log(`   ${assoc.display_order}. ${assoc.module_name}`);
            });
        }
        
    } catch (err) {
        console.error('❌ Error:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

// Ejecutar el script
checkAllModules()
    .then(() => {
        console.log('\n🎉 Script completed successfully!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n💥 Script failed:', err);
        process.exit(1);
    });

