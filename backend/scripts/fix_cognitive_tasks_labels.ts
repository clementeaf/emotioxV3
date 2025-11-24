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

/**
 * Corrige los labels y placeholders de los módulos 3.1 y 3.2
 * Los campos de pregunta son para que el investigador escriba la pregunta, no para que los participantes respondan
 */
(async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Obtener módulos 3.1 y 3.2
        const modulesRes = await client.query(
            `SELECT id, name, structure FROM module_templates WHERE name IN ('3.1', '3.2')`
        );

        for (const module of modulesRes.rows) {
            let structure = module.structure;
            
            if (typeof structure === 'string') {
                structure = JSON.parse(structure);
            }

            if (structure && structure.components && Array.isArray(structure.components)) {
                // Buscar el componente de pregunta
                const questionComponent = structure.components.find((c: { id: string }) => c.id === 'question');
                
                if (questionComponent) {
                    // Actualizar label y placeholder
                    questionComponent.label = 'Question';
                    questionComponent.placeholder = {
                        enabled: true,
                        text: 'Escribe la pregunta aquí...'
                    };

                    // Actualizar en la base de datos
                    await client.query(
                        `UPDATE module_templates SET structure = $1 WHERE id = $2`,
                        [JSON.stringify(structure), module.id]
                    );

                    console.log(`✓ Updated module ${module.name}:`);
                    console.log(`  - Label: "Question"`);
                    console.log(`  - Placeholder: "Escribe la pregunta aquí..."`);
                }
            }
        }

        await client.query('COMMIT');
        console.log('\n✅ Cognitive Tasks modules labels updated successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
})();

