import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { execSync } from 'child_process';

dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Script para revisar researches en AWS RDS (PostgreSQL)
 */
const checkAWSResearches = async () => {
    try {
        // Obtener credenciales usando AWS CLI
        console.log('🔑 Obteniendo credenciales de AWS SSM...\n');
        
        const dbHost = execSync('aws ssm get-parameter --name /emotioxv3/production/DB_HOST --with-decryption --query "Parameter.Value" --output text', { encoding: 'utf-8' }).trim();
        const dbName = execSync('aws ssm get-parameter --name /emotioxv3/production/DB_NAME --with-decryption --query "Parameter.Value" --output text', { encoding: 'utf-8' }).trim();
        const dbUser = execSync('aws ssm get-parameter --name /emotioxv3/production/DB_USER --with-decryption --query "Parameter.Value" --output text', { encoding: 'utf-8' }).trim();
        const dbPassword = execSync('aws ssm get-parameter --name /emotioxv3/production/DB_PASSWORD --with-decryption --query "Parameter.Value" --output text', { encoding: 'utf-8' }).trim();
        let dbPort = '5432';
        try {
            dbPort = execSync('aws ssm get-parameter --name /emotioxv3/production/DB_PORT --with-decryption --query "Parameter.Value" --output text', { encoding: 'utf-8' }).trim() || '5432';
        } catch {
            dbPort = '5432';
        }

        if (!dbHost || !dbName || !dbUser || !dbPassword) {
            console.error('❌ Faltan credenciales de base de datos en SSM');
            return;
        }

        console.log('🔍 Conectando a AWS RDS PostgreSQL...');
        console.log(`   Host: ${dbHost}`);
        console.log(`   Database: ${dbName}`);
        console.log(`   User: ${dbUser}\n`);

        const pool = new Pool({
            host: dbHost,
            port: parseInt(dbPort),
            database: dbName,
            user: dbUser,
            password: dbPassword,
            ssl: { rejectUnauthorized: false }
        });

        // 1. Verificar si hay researches
        console.log('📊 Revisando researches...\n');
        const researchesResult = await pool.query(`
            SELECT 
                id,
                name,
                status,
                created_at,
                deleted_at
            FROM researches
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT 10
        `);

        if (researchesResult.rows.length === 0) {
            console.log('⚠️  No se encontraron researches activas en AWS RDS\n');
            await pool.end();
            return;
        }

        console.log(`✅ Se encontraron ${researchesResult.rows.length} research(es) activa(s):\n`);

        // 2. Para cada research, verificar stages y modules
        for (const research of researchesResult.rows) {
            const researchId = research.id;
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`📋 Research: ${research.name} (ID: ${researchId})`);
            console.log(`   Status: ${research.status}`);
            console.log(`   Created: ${research.created_at}\n`);

            // Verificar stages
            const stagesResult = await pool.query(`
                SELECT 
                    id,
                    name,
                    description,
                    display_order,
                    stage_type,
                    created_at
                FROM stages
                WHERE research_id = $1
                ORDER BY display_order
            `, [researchId]);

            console.log(`   📦 Stages: ${stagesResult.rows.length}`);
            if (stagesResult.rows.length > 0) {
                stagesResult.rows.forEach((stage: Record<string, unknown>, idx: number) => {
                    console.log(`      ${idx + 1}. ${stage.name} (ID: ${stage.id})`);
                    console.log(`         Order: ${stage.display_order}, Type: ${stage.stage_type || 'N/A'}`);
                });
            } else {
                console.log(`      ⚠️  No hay stages para esta research`);
            }

            // Verificar modules
            const modulesResult = await pool.query(`
                SELECT 
                    m.id,
                    m.name,
                    m.description,
                    m.order_index,
                    m.stage_id,
                    s.name as stage_name
                FROM modules m
                LEFT JOIN stages s ON m.stage_id = s.id
                WHERE m.research_id = $1
                ORDER BY m.order_index
            `, [researchId]);

            console.log(`\n   📚 Modules: ${modulesResult.rows.length}`);
            if (modulesResult.rows.length > 0) {
                modulesResult.rows.forEach((module: Record<string, unknown>, idx: number) => {
                    const stageName = module.stage_name || 'Sin stage';
                    console.log(`      ${idx + 1}. ${module.name} (ID: ${module.id})`);
                    console.log(`         Order: ${module.order_index}, Stage: ${stageName}`);
                });
            } else {
                console.log(`      ⚠️  No hay modules para esta research`);
            }

            // Verificar si hay modules sin stage_id
            const orphanModulesResult = await pool.query(`
                SELECT COUNT(*) as count
                FROM modules
                WHERE research_id = $1 AND stage_id IS NULL
            `, [researchId]);

            if (orphanModulesResult.rows[0].count > 0) {
                console.log(`\n   ⚠️  Advertencia: ${orphanModulesResult.rows[0].count} module(s) sin stage_id asignado`);
            }

            console.log('');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('✅ Revisión completada');

        await pool.end();
    } catch (error) {
        console.error('❌ Error al revisar researches en AWS:', error);
        if (error instanceof Error) {
            console.error('   Mensaje:', error.message);
        }
    }
};

checkAWSResearches();
