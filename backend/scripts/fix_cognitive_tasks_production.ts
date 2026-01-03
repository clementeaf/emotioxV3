/**
 * Script para asociar los módulos de Cognitive Tasks en PRODUCCIÓN
 * Usa las credenciales de producción desde SSM Parameter Store o variables de entorno
 */
import { Pool } from 'pg';
import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm';
import * as dotenv from 'dotenv';
import path from 'path';

// Cargar .env local si existe
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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

/**
 * Obtiene las credenciales de producción desde SSM Parameter Store
 */
async function getProductionCredentials(): Promise<{
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
} | null> {
    try {
        const stage = process.env.API_STAGE || 'production';
        const region = process.env.AWS_REGION || 'us-east-1';
        
        const ssmClient = new SSMClient({ region });
        const parameterNames = [
            `/emotioxv3/${stage}/DB_HOST`,
            `/emotioxv3/${stage}/DB_PORT`,
            `/emotioxv3/${stage}/DB_NAME`,
            `/emotioxv3/${stage}/DB_USER`,
            `/emotioxv3/${stage}/DB_PASSWORD`
        ];

        const command = new GetParametersCommand({
            Names: parameterNames,
            WithDecryption: true
        });

        const response = await ssmClient.send(command);
        
        if (!response.Parameters || response.Parameters.length < 5) {
            console.log('⚠️  No se pudieron obtener todas las credenciales desde SSM');
            return null;
        }

        const params: Record<string, string> = {};
        response.Parameters.forEach(param => {
            if (param.Name && param.Value) {
                params[param.Name] = param.Value;
            }
        });

        return {
            host: params[`/emotioxv3/${stage}/DB_HOST`],
            port: parseInt(params[`/emotioxv3/${stage}/DB_PORT`] || '5432'),
            database: params[`/emotioxv3/${stage}/DB_NAME`],
            user: params[`/emotioxv3/${stage}/DB_USER`],
            password: params[`/emotioxv3/${stage}/DB_PASSWORD`]
        };
    } catch (error) {
        console.log('⚠️  Error obteniendo credenciales desde SSM:', error);
        return null;
    }
}

/**
 * Obtiene las credenciales desde variables de entorno
 */
function getCredentialsFromEnv(): {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
} | null {
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT;
    const database = process.env.DB_NAME;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;

    if (!host || !database || !user || !password) {
        return null;
    }

    return {
        host,
        port: parseInt(port || '5432'),
        database,
        user,
        password
    };
}

async function fixCognitiveTasksModules(): Promise<void> {
    console.log('🔧 Fixing Cognitive Tasks modules associations in PRODUCTION...\n');

    // Intentar obtener credenciales
    let credentials = getCredentialsFromEnv();
    
    if (!credentials) {
        console.log('📡 Attempting to get credentials from SSM Parameter Store...\n');
        credentials = await getProductionCredentials();
    }

    if (!credentials) {
        console.error('❌ No se pudieron obtener las credenciales de la base de datos.');
        console.log('\n💡 Opciones:');
        console.log('   1. Configurar variables de entorno: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
        console.log('   2. Ejecutar el script SQL directamente: backend/scripts/fix_cognitive_tasks_associations.sql');
        console.log('   3. Asegurarse de tener AWS credentials configuradas para SSM');
        process.exit(1);
    }

    console.log(`✅ Conectando a: ${credentials.host}:${credentials.port}/${credentials.database}\n`);

    // La base de datos de producción requiere SSL
    const pool = new Pool({
        host: credentials.host,
        port: credentials.port,
        database: credentials.database,
        user: credentials.user,
        password: credentials.password,
        ssl: {
            rejectUnauthorized: false
        }
    });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Listar todos los módulos
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
            const exactMatch = allModulesQuery.rows.find(
                (m: { name: string }) => m.name === moduleName
            );

            if (exactMatch) {
                foundModules.push({ id: exactMatch.id, name: exactMatch.name });
                console.log(`✓ Found: "${exactMatch.name}" (${exactMatch.id})`);
            } else {
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

        // 4. Eliminar asociaciones existentes
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

        // 5. Asociar módulos
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

        // 6. Verificar
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

