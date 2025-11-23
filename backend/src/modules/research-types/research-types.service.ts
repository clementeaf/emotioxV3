import pool from '../../config/database';

export interface ResearchTypeData {
    name: string;
    description?: string;
    research_technique_ids?: string[];
    default_modules?: Record<string, unknown>[];
    settings?: Record<string, unknown>;
}

export const list = async () => {
    // Return all research types
    const query = `
    SELECT 
        rt.id, 
        rt.name, 
        rt.description, 
        rt.default_modules, 
        rt.settings, 
        rt.is_active, 
        rt.created_at,
        rt.updated_at
    FROM research_types rt
    WHERE rt.is_active = true
    ORDER BY rt.name
  `;
    const result = await pool.query(query);
    return result.rows;
};

export const create = async (data: ResearchTypeData, createdBy: string | null) => {
    const { name, description, research_technique_ids = [], default_modules = [], settings = {} } = data;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Create research type
        const query = `
            INSERT INTO research_types (name, description, default_modules, settings, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, description, default_modules, settings, is_active, created_at
        `;
        const result = await client.query(query, [
            name,
            description,
            JSON.stringify(default_modules),
            JSON.stringify(settings),
            createdBy,
        ]);

        const researchType = result.rows[0];

        // Associate techniques in the junction table
        if (research_technique_ids && research_technique_ids.length > 0) {
            const junctionQuery = `
                INSERT INTO research_types_techniques (research_type_id, research_technique_id)
                VALUES ($1, $2)
                ON CONFLICT (research_type_id, research_technique_id) DO NOTHING
            `;

            for (const techId of research_technique_ids) {
                await client.query(junctionQuery, [researchType.id, techId]);
            }
        }

        await client.query('COMMIT');
        return researchType;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const getById = async (id: string) => {
    const query = `
    SELECT 
        rt.id, 
        rt.name, 
        rt.description, 
        rt.default_modules, 
        rt.settings, 
        rt.is_active, 
        rt.created_at, 
        rt.updated_at
    FROM research_types rt
    WHERE rt.id = $1
  `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        throw new Error('Research type not found');
    }

    const researchType = result.rows[0];

    // Get associated techniques
    const techniquesQuery = `
        SELECT rt.id, rt.name, rt.description
        FROM research_techniques rt
        INNER JOIN research_types_techniques rtt ON rt.id = rtt.research_technique_id
        WHERE rtt.research_type_id = $1 AND rt.is_active = true
    `;
    const techniquesResult = await pool.query(techniquesQuery, [id]);

    return {
        ...researchType,
        research_techniques: techniquesResult.rows
    };
};

export const update = async (id: string, data: Partial<ResearchTypeData>) => {
    const { name, description, research_technique_ids, default_modules, settings } = data;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(description);
        }
        if (default_modules !== undefined) {
            updates.push(`default_modules = $${paramIndex++}`);
            values.push(JSON.stringify(default_modules));
        }
        if (settings !== undefined) {
            updates.push(`settings = $${paramIndex++}`);
            values.push(JSON.stringify(settings));
        }

        if (updates.length > 0) {
            values.push(id);
            const query = `
                UPDATE research_types
                SET ${updates.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING id, name, description, default_modules, settings, is_active, updated_at
            `;
            const result = await client.query(query, values);

            if (result.rows.length === 0) {
                throw new Error('Research type not found');
            }
        }

        // Update techniques if provided
        if (research_technique_ids !== undefined) {
            // First delete existing associations
            await client.query('DELETE FROM research_types_techniques WHERE research_type_id = $1', [id]);

            // Then insert new ones
            if (research_technique_ids.length > 0) {
                const junctionQuery = `
                    INSERT INTO research_types_techniques (research_type_id, research_technique_id)
                    VALUES ($1, $2)
                    ON CONFLICT (research_type_id, research_technique_id) DO NOTHING
                `;

                for (const techId of research_technique_ids) {
                    await client.query(junctionQuery, [id, techId]);
                }
            }
        }

        await client.query('COMMIT');

        // Return updated object with techniques
        return await getById(id);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const deleteResearchType = async (id: string) => {
    const query = `
    UPDATE research_types
    SET is_active = false
    WHERE id = $1
    RETURNING id
  `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        throw new Error('Research type not found');
    }

    return { message: 'Research type deleted successfully' };
};

export const updateModules = async (id: string, modules: Record<string, unknown>[]) => {
    const query = `
    UPDATE research_types
    SET default_modules = $1
    WHERE id = $2
    RETURNING id, name, default_modules, updated_at
  `;
    const result = await pool.query(query, [JSON.stringify(modules), id]);

    if (result.rows.length === 0) {
        throw new Error('Research type not found');
    }

    return result.rows[0];
};

/**
 * Gets all research techniques associated with a research type
 * @param researchTypeId - ID of the research type
 * @returns Array of research techniques
 */
export const getTechniquesByType = async (researchTypeId: string) => {
    const query = `
    SELECT 
        rt.id,
        rt.name,
        rt.description,
        rt.created_by,
        rt.is_active,
        rt.created_at,
        rt.updated_at
    FROM research_techniques rt
    INNER JOIN research_types_techniques rtt ON rt.id = rtt.research_technique_id
    WHERE rtt.research_type_id = $1 AND rt.is_active = true
    ORDER BY rt.name
  `;
    const result = await pool.query(query, [researchTypeId]);
    return result.rows;
};

/**
 * Gets all module templates associated with a research type
 * @param researchTypeId - ID of the research type
 * @returns Array of module templates
 */
export const getModulesByType = async (researchTypeId: string) => {
    const query = `
    SELECT 
        mt.id,
        mt.name,
        mt.description,
        mt.structure,
        mt.created_by,
        mt.is_active,
        mt.created_at,
        mt.updated_at
    FROM module_templates mt
    INNER JOIN research_types_module_templates rtmt ON mt.id = rtmt.module_template_id
    WHERE rtmt.research_type_id = $1 AND mt.is_active = true
    ORDER BY mt.name
  `;
    const result = await pool.query(query, [researchTypeId]);
    return result.rows;
};

/**
 * Updates module template assignments for a research type
 * @param researchTypeId - ID of the research type
 * @param moduleTemplateIds - Array of module template IDs to assign
 */
export const updateModuleAssignments = async (researchTypeId: string, moduleTemplateIds: string[]) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // First delete existing associations
        await client.query('DELETE FROM research_types_module_templates WHERE research_type_id = $1', [
            researchTypeId,
        ]);

        // Then insert new associations
        if (moduleTemplateIds && moduleTemplateIds.length > 0) {
            const junctionQuery = `
                INSERT INTO research_types_module_templates (research_type_id, module_template_id)
                VALUES ($1, $2)
                ON CONFLICT (research_type_id, module_template_id) DO NOTHING
            `;

            for (const moduleId of moduleTemplateIds) {
                await client.query(junctionQuery, [researchTypeId, moduleId]);
            }
        }

        await client.query('COMMIT');
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
