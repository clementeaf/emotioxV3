/**
 * Script para verificar y activar un research si es necesario
 */
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';
import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface DbConfig {
    DB_HOST: string;
    DB_PORT: number;
    DB_NAME: string;
    DB_USER: string;
    DB_PASSWORD: string;
    DB_SSL: boolean;
}

async function getDbConfigFromSsm(): Promise<DbConfig | null> {
    const stage = process.env.API_STAGE || 'production';
    const ssmPrefix = `/emotioxv3/${stage}`;
    console.log(`📡 Attempting to get credentials from SSM Parameter Store (${stage})...`);

    try {
        const command = new GetParametersCommand({
            Names: [
                `${ssmPrefix}/DB_HOST`,
                `${ssmPrefix}/DB_PORT`,
                `${ssmPrefix}/DB_NAME`,
                `${ssmPrefix}/DB_USER`,
                `${ssmPrefix}/DB_PASSWORD`,
                `${ssmPrefix}/DB_SSL`,
            ],
            WithDecryption: true,
        });

        const response = await ssmClient.send(command);
        const params = response.Parameters || [];

        const config: Partial<DbConfig> = {};
        params.forEach(param => {
            if (param.Name && param.Value) {
                const key = param.Name.split('/').pop();
                if (key) {
                    if (key === 'DB_PORT') {
                        config[key as keyof DbConfig] = parseInt(param.Value, 10) as any;
                    } else if (key === 'DB_SSL') {
                        config[key as keyof DbConfig] = (param.Value.toLowerCase() === 'true') as any;
                    } else {
                        config[key as keyof DbConfig] = param.Value as any;
                    }
                }
            }
        });

        if (config.DB_HOST && config.DB_PORT && config.DB_NAME && config.DB_USER && config.DB_PASSWORD !== undefined && config.DB_SSL !== undefined) {
            return config as DbConfig;
        }
        console.warn('⚠️  Missing one or more DB parameters in SSM. Falling back to .env.');
        return null;
    } catch (error) {
        console.error('❌ Error fetching DB config from SSM:', error);
        console.warn('⚠️  Falling back to .env for DB credentials.');
        return null;
    }
}

async function getDbConfig(): Promise<DbConfig> {
    // Try production first if API_STAGE is set
    if (process.env.API_STAGE === 'production' || process.env.CHECK_PRODUCTION === 'true') {
        const ssmConfig = await getDbConfigFromSsm();
        if (ssmConfig) {
            console.log('✅ Using DB credentials from SSM Parameter Store (production).');
            return ssmConfig;
        }
    }

    // Fallback to .env
    const config = {
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
        DB_NAME: process.env.DB_NAME || 'emotioxv3',
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
        DB_SSL: (process.env.DB_SSL?.toLowerCase() === 'true') || false,
    };
    console.log('Using DB credentials from .env file (local/dev).');
    return config;
}

let pool: Pool | null = null;

async function checkAndActivateResearch(researchId: string): Promise<void> {
    if (!pool) {
        const dbConfig = await getDbConfig();
        pool = new Pool({
            host: dbConfig.DB_HOST,
            port: dbConfig.DB_PORT,
            database: dbConfig.DB_NAME,
            user: dbConfig.DB_USER,
            password: dbConfig.DB_PASSWORD,
            ssl: dbConfig.DB_SSL ? { rejectUnauthorized: false } : false
        });
    }
    
    const client = await pool.connect();
    try {
        console.log(`🔍 Checking research: ${researchId}\n`);
        
        // Check research status
        const checkQuery = `
            SELECT id, name, status, deleted_at, created_at, updated_at
            FROM researches
            WHERE id = $1
        `;
        const result = await client.query(checkQuery, [researchId]);
        
        if (result.rows.length === 0) {
            console.log(`❌ Research not found: ${researchId}`);
            return;
        }
        
        const research = result.rows[0];
        console.log(`📋 Research found:`);
        console.log(`   ID: ${research.id}`);
        console.log(`   Name: ${research.name}`);
        console.log(`   Status: ${research.status}`);
        console.log(`   Deleted: ${research.deleted_at ? 'Yes' : 'No'}`);
        console.log(`   Created: ${research.created_at}`);
        console.log(`   Updated: ${research.updated_at}\n`);
        
        // Check stages
        const stagesQuery = `
            SELECT COUNT(*) as count
            FROM stages
            WHERE research_id = $1
        `;
        const stagesResult = await client.query(stagesQuery, [researchId]);
        const stageCount = parseInt(stagesResult.rows[0].count);
        console.log(`📊 Stages: ${stageCount}`);
        
        // Check modules
        const modulesQuery = `
            SELECT COUNT(*) as count
            FROM modules m
            JOIN stages s ON m.stage_id = s.id
            WHERE s.research_id = $1
        `;
        const modulesResult = await client.query(modulesQuery, [researchId]);
        const moduleCount = parseInt(modulesResult.rows[0].count);
        console.log(`📦 Modules: ${moduleCount}\n`);
        
        // Activate if not active
        if (research.status !== 'active') {
            console.log(`⚠️  Research is not active (status: ${research.status})`);
            console.log(`🔄 Activating research...\n`);
            
            await client.query('BEGIN');
            const updateQuery = `
                UPDATE researches
                SET status = 'active', updated_at = NOW()
                WHERE id = $1
                RETURNING id, name, status
            `;
            const updateResult = await client.query(updateQuery, [researchId]);
            await client.query('COMMIT');
            
            console.log(`✅ Research activated successfully!`);
            console.log(`   New status: ${updateResult.rows[0].status}\n`);
        } else {
            console.log(`✅ Research is already active\n`);
        }
        
        // Check if deleted
        if (research.deleted_at) {
            console.log(`⚠️  Research is marked as deleted`);
            console.log(`🔄 Restoring research...\n`);
            
            await client.query('BEGIN');
            const restoreQuery = `
                UPDATE researches
                SET deleted_at = NULL, updated_at = NOW()
                WHERE id = $1
                RETURNING id, name, deleted_at
            `;
            const restoreResult = await client.query(restoreQuery, [researchId]);
            await client.query('COMMIT');
            
            console.log(`✅ Research restored successfully!`);
            console.log(`   Deleted at: ${restoreResult.rows[0].deleted_at}\n`);
        }
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', err);
        throw err;
    } finally {
        client.release();
        if (pool) {
            await pool.end();
        }
    }
}

// Get research ID from command line argument
const researchId = process.argv[2];

if (!researchId) {
    console.error('❌ Please provide a research ID as argument');
    console.log('Usage: npx ts-node scripts/check_and_activate_research.ts <research-id>');
    process.exit(1);
}

checkAndActivateResearch(researchId)
    .then(() => {
        console.log('🎉 Script completed successfully!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('💥 Script failed:', err);
        process.exit(1);
    });

