import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

/**
 * Consulta y muestra los datos de la base de datos local
 */
async function checkDatabase(): Promise<void> {
    try {
        console.log('🔍 Revisando base de datos local...\n');

        // 1. Verificar conexión
        const connectionTest = await pool.query('SELECT NOW() as current_time, current_database() as database');
        console.log('✓ Conexión exitosa');
        console.log(`  Base de datos: ${connectionTest.rows[0].database}`);
        console.log(`  Hora actual: ${connectionTest.rows[0].current_time}\n`);

        // 2. Researches
        console.log('📊 RESEARCHES:');
        const researches = await pool.query(`
            SELECT 
                r.id,
                r.name,
                r.description,
                r.status,
                r.research_type_id,
                r.research_technique_id,
                rt.name as research_type_name,
                rtech.name as research_technique_name,
                r.created_at
            FROM researches r
            LEFT JOIN research_types rt ON r.research_type_id = rt.id
            LEFT JOIN research_techniques rtech ON r.research_technique_id = rtech.id
            WHERE r.deleted_at IS NULL
            ORDER BY r.created_at DESC
            LIMIT 10
        `);
        console.log(`  Total: ${researches.rows.length}`);
        researches.rows.forEach((r, idx) => {
            console.log(`  ${idx + 1}. ${r.name}`);
            console.log(`     ID: ${r.id}`);
            console.log(`     Status: ${r.status}`);
            console.log(`     Type: ${r.research_type_name || 'N/A'}`);
            console.log(`     Technique: ${r.research_technique_name || 'N/A'}`);
            console.log(`     Created: ${r.created_at}`);
            console.log('');
        });

        // 3. Stages para cada research
        if (researches.rows.length > 0) {
            console.log('📋 STAGES:');
            for (const research of researches.rows) {
                const stages = await pool.query(`
                    SELECT 
                        s.id,
                        s.name,
                        s.description,
                        s.order_index,
                        COUNT(m.id) as module_count
                    FROM stages s
                    LEFT JOIN modules m ON s.id = m.stage_id
                    WHERE s.research_id = $1
                    GROUP BY s.id
                    ORDER BY s.order_index
                `, [research.id]);
                
                if (stages.rows.length > 0) {
                    console.log(`  Research: ${research.name}`);
                    stages.rows.forEach((stage) => {
                        console.log(`    - ${stage.name} (order: ${stage.order_index}, modules: ${stage.module_count})`);
                    });
                    console.log('');
                }
            }
        }

        // 4. Modules por research
        if (researches.rows.length > 0) {
            console.log('🧩 MODULES:');
            for (const research of researches.rows) {
                const modules = await pool.query(`
                    SELECT 
                        m.id,
                        m.name,
                        m.description,
                        m.order_index,
                        m.stage_id,
                        s.name as stage_name,
                        s.order_index as stage_order,
                        COUNT(q.id) as question_count
                    FROM modules m
                    LEFT JOIN stages s ON m.stage_id = s.id
                    LEFT JOIN questions q ON m.id = q.module_id
                    WHERE m.research_id = $1
                    GROUP BY m.id, m.name, m.description, m.order_index, m.stage_id, s.name, s.order_index
                    ORDER BY s.order_index, m.order_index
                `, [research.id]);
                
                if (modules.rows.length > 0) {
                    console.log(`  Research: ${research.name}`);
                    modules.rows.forEach((module) => {
                        console.log(`    - ${module.name}`);
                        console.log(`      Stage: ${module.stage_name || 'No stage'}`);
                        console.log(`      Order: ${module.order_index}, Questions: ${module.question_count}`);
                    });
                    console.log('');
                }
            }
        }

        // 5. Research Types
        console.log('🔬 RESEARCH TYPES:');
        const researchTypes = await pool.query(`
            SELECT id, name, description, is_active, created_at
            FROM research_types
            ORDER BY name
        `);
        console.log(`  Total: ${researchTypes.rows.length}`);
        researchTypes.rows.forEach((rt) => {
            console.log(`  - ${rt.name} (${rt.is_active ? 'active' : 'inactive'})`);
        });
        console.log('');

        // 6. Research Techniques
        console.log('⚙️ RESEARCH TECHNIQUES:');
        const techniques = await pool.query(`
            SELECT id, name, description, is_active, created_at
            FROM research_techniques
            ORDER BY name
        `);
        console.log(`  Total: ${techniques.rows.length}`);
        techniques.rows.forEach((tech) => {
            console.log(`  - ${tech.name} (${tech.is_active ? 'active' : 'inactive'})`);
        });
        console.log('');

        // 7. Module Templates
        console.log('📦 MODULE TEMPLATES:');
        const templates = await pool.query(`
            SELECT id, name, description, is_active, created_at
            FROM module_templates
            ORDER BY name
        `);
        console.log(`  Total: ${templates.rows.length}`);
        templates.rows.forEach((tpl) => {
            console.log(`  - ${tpl.name} (${tpl.is_active ? 'active' : 'inactive'})`);
        });
        console.log('');

        // 8. Stage Templates
        const stageTemplatesCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'stage_templates'
            )
        `);
        
        if (stageTemplatesCheck.rows[0].exists) {
            console.log('📚 STAGE TEMPLATES:');
            const stageTemplates = await pool.query(`
                SELECT id, name, description, is_active, created_at
                FROM stage_templates
                ORDER BY name
            `);
            console.log(`  Total: ${stageTemplates.rows.length}`);
            stageTemplates.rows.forEach((st) => {
                console.log(`  - ${st.name} (${st.is_active ? 'active' : 'inactive'})`);
            });
            console.log('');
        }

        // 9. Resumen de tablas
        console.log('📊 RESUMEN DE TABLAS:');
        const tables = [
            'users', 'researches', 'research_types', 'research_techniques',
            'stages', 'modules', 'questions', 'module_templates', 
            'stage_templates', 'responses', 'media'
        ];
        
        for (const table of tables) {
            const exists = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                )
            `, [table]);
            
            if (exists.rows[0].exists) {
                const count = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`  ${table}: ${count.rows[0].count} registros`);
            } else {
                console.log(`  ${table}: tabla no existe`);
            }
        }

    } catch (error) {
        console.error('❌ Error al consultar la base de datos:', error);
    } finally {
        await pool.end();
    }
}

void checkDatabase();

