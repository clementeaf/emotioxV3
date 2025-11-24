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
                mt.id,
                mt.name,
                mt.description,
                mt.is_active,
                mt.created_at,
                mt.updated_at,
                jsonb_array_length(COALESCE(mt.structure->'components', '[]'::jsonb)) as components_count,
                st.name as stage_template_name,
                stmt.display_order
             FROM module_templates mt
             LEFT JOIN stage_templates_module_templates stmt ON mt.id = stmt.module_template_id
             LEFT JOIN stage_templates st ON stmt.stage_template_id = st.id
             WHERE mt.is_active = true
             ORDER BY mt.name`
        );

        console.log('📋 Module Templates Activos:\n');
        console.log('Total:', result.rows.length, 'módulos\n');

        // Agrupar por stage template
        const grouped: Record<string, any[]> = {};
        const ungrouped: any[] = [];

        result.rows.forEach(row => {
            if (row.stage_template_name) {
                if (!grouped[row.stage_template_name]) {
                    grouped[row.stage_template_name] = [];
                }
                grouped[row.stage_template_name].push(row);
            } else {
                ungrouped.push(row);
            }
        });

        // Mostrar módulos agrupados por stage
        Object.keys(grouped).sort().forEach(stageName => {
            console.log(`📁 ${stageName}:`);
            grouped[stageName].forEach(module => {
                console.log(`  ✓ ${module.name}`);
                console.log(`    - ID: ${module.id}`);
                console.log(`    - Descripción: ${module.description || 'Sin descripción'}`);
                console.log(`    - Componentes: ${module.components_count || 0}`);
                console.log(`    - Orden: ${module.display_order || 0}`);
                console.log('');
            });
        });

        // Mostrar módulos sin stage
        if (ungrouped.length > 0) {
            console.log('📦 Sin Stage Template:');
            ungrouped.forEach(module => {
                console.log(`  ✓ ${module.name}`);
                console.log(`    - ID: ${module.id}`);
                console.log(`    - Descripción: ${module.description || 'Sin descripción'}`);
                console.log(`    - Componentes: ${module.components_count || 0}`);
                console.log('');
            });
        }

        // Mostrar estructura de algunos módulos de ejemplo
        console.log('\n🔍 Estructura de Componentes (ejemplos):\n');
        
        const examples = ['Welcome Screen', 'Thank You Screen', 'Voice of Costumer (VOC)', 'Customer Satisfaction Score (CSAT)'];
        for (const exampleName of examples) {
            const example = result.rows.find(r => r.name === exampleName);
            if (example) {
                const structureRes = await client.query(
                    'SELECT structure FROM module_templates WHERE id = $1',
                    [example.id]
                );
                const structure = structureRes.rows[0]?.structure;
                if (structure && typeof structure === 'object' && 'components' in structure) {
                    console.log(`${exampleName}:`);
                    (structure.components as any[]).forEach((comp: any, idx: number) => {
                        console.log(`  ${idx + 1}. ${comp.label} (${comp.type})`);
                        if (comp.placeholder?.enabled) {
                            console.log(`     Placeholder: "${comp.placeholder.text}"`);
                        }
                    });
                    console.log('');
                }
            }
        }

    } finally {
        client.release();
        await pool.end();
    }
})();

