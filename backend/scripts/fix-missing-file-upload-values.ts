/**
 * Script para reconstruir los valores de componentes file-upload
 * que tienen imágenes en la tabla media pero no tienen value en el componente
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import pool from '../src/config/database';
import { getMediaUrl } from '../src/config/local-storage';

// Cargar variables de entorno
const envPaths = [
    path.join(__dirname, '../.env'),
    path.join(process.cwd(), '.env'),
    '.env',
];
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        break;
    }
}

interface MediaRecord {
    id: string;
    research_id: string;
    s3_key: string;
    file_name: string;
    file_type: string;
}

interface ModuleComponent {
    id: string;
    type: string;
    value?: string | null;
}

/**
 * Reconstruye el valor de un componente file-upload desde la tabla media
 */
async function rebuildFileUploadValue(
    researchId: string,
    moduleId: string,
    componentId: string
): Promise<void> {
    try {
        // 1. Obtener todas las imágenes de este research
        const mediaQuery = `
            SELECT id, s3_key, file_name, file_type
            FROM media
            WHERE research_id = ?
            ORDER BY created_at DESC
        `;
        const mediaResult = await pool.query(mediaQuery, [researchId]);
        const mediaRecords = mediaResult.rows as MediaRecord[];

        if (mediaRecords.length === 0) {
            console.log(`No media found for research ${researchId}`);
            return;
        }

        // 2. Obtener el módulo actual
        const moduleQuery = `SELECT config FROM modules WHERE id = ?`;
        const moduleResult = await pool.query(moduleQuery, [moduleId]);
        
        if (moduleResult.rows.length === 0) {
            console.log(`Module ${moduleId} not found`);
            return;
        }

        const moduleConfig = moduleResult.rows[0].config as {
            structure?: { components?: ModuleComponent[] };
        };

        if (!moduleConfig.structure?.components) {
            console.log(`Module ${moduleId} has no components`);
            return;
        }

        // 3. Encontrar el componente file-upload
        const component = moduleConfig.structure.components.find(
            (c) => c.id === componentId && c.type === 'file-upload'
        );

        if (!component) {
            console.log(`Component ${componentId} not found or not a file-upload`);
            return;
        }

        // 4. Reconstruir el array de archivos desde media
        const files = mediaRecords.map((media) => {
            const url = getMediaUrl(media.s3_key);
            return {
                id: media.id,
                name: media.file_name,
                s3Key: media.s3_key,
                url: url,
                status: 'uploaded' as const,
                hitZones: [] as Array<unknown>,
            };
        });

        // 5. Actualizar el componente con el valor reconstruido
        component.value = JSON.stringify(files);

        // 6. Guardar el módulo actualizado
        const updateQuery = `UPDATE modules SET config = ? WHERE id = ?`;
        await pool.query(updateQuery, [JSON.stringify(moduleConfig), moduleId]);

        console.log(`✓ Updated module ${moduleId}, component ${componentId} with ${files.length} file(s)`);
    } catch (error) {
        console.error(`Error rebuilding file-upload value:`, error);
        throw error;
    }
}

/**
 * Función principal
 */
async function main(): Promise<void> {
    const researchId = process.argv[2];
    const moduleId = process.argv[3];
    const componentId = process.argv[4] || 'image-upload';

    if (!researchId || !moduleId) {
        console.error('Usage: ts-node fix-missing-file-upload-values.ts <research_id> <module_id> [component_id]');
        console.error('Example: ts-node fix-missing-file-upload-values.ts 92c67aaa-fa3f-4634-89b4-32beb0937907 fe40de6f-1f7d-4cd8-aee1-1e8e1f055afb image-upload');
        process.exit(1);
    }

    try {
        await rebuildFileUploadValue(researchId, moduleId, componentId);
        console.log('✓ Done');
        process.exit(0);
    } catch (error) {
        console.error('✗ Failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    void main();
}
