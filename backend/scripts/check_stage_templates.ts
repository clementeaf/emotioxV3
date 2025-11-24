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

(async () => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT 
                st.id,
                st.name,
                st.description,
                st.stage_type,
                st.is_active,
                st.created_at,
                st.updated_at,
                COUNT(DISTINCT stmt.module_template_id) as modules_count
             FROM stage_templates st
             LEFT JOIN stage_templates_module_templates stmt ON st.id = stmt.stage_template_id
             WHERE st.is_active = true
             GROUP BY st.id
             ORDER BY st.name`
        );

        console.log('📋 Stage Templates Registrados:\n');
        console.log('Total:', result.rows.length, 'stages\n');

        result.rows.forEach((stage, index) => {
            console.log(`${index + 1}. ${stage.name}`);
            console.log(`   - ID: ${stage.id}`);
            console.log(`   - Tipo: ${stage.stage_type || 'module_collection'}`);
            console.log(`   - Descripción: ${stage.description || 'Sin descripción'}`);
            console.log(`   - Módulos asociados: ${stage.modules_count || 0}`);
            console.log(`   - Creado: ${new Date(stage.created_at).toLocaleDateString()}`);
            console.log('');
        });

        // Mostrar módulos por stage
        console.log('\n📦 Módulos por Stage:\n');
        
        for (const stage of result.rows) {
            const modulesRes = await client.query(
                `SELECT 
                    mt.name,
                    mt.description,
                    stmt.display_order
                 FROM stage_templates_module_templates stmt
                 JOIN module_templates mt ON stmt.module_template_id = mt.id
                 WHERE stmt.stage_template_id = $1 AND mt.is_active = true
                 ORDER BY stmt.display_order`,
                [stage.id]
            );

            if (modulesRes.rows.length > 0) {
                console.log(`📁 ${stage.name} (${stage.stage_type}):`);
                modulesRes.rows.forEach((module, idx) => {
                    console.log(`   ${idx + 1}. ${module.name} (orden: ${module.display_order})`);
                });
                console.log('');
            } else {
                console.log(`📁 ${stage.name} (${stage.stage_type}): Sin módulos asociados\n`);
            }
        }

    } finally {
        client.release();
        await pool.end();
    }
})();

