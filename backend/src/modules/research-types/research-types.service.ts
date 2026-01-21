import pool from '../../config/database';
import cache, { CacheKeys, CacheTTL } from '../../config/cache';

export interface ResearchTypeData {
    name: string;
    description?: string;
    research_technique_ids?: string[];
    default_modules?: Record<string, unknown>[];
    settings?: Record<string, unknown>;
}

export const list = async () => {
    // TEMPORARY: Disable cache to ensure fresh data after cleanup
    // Always fetch from database to avoid stale cache issues
    // TODO: Re-enable cache after confirming it works correctly
    // return cache.getOrSet(
    //     CacheKeys.RESEARCH_TYPES_LIST,
    //     async () => {
            // Return all research types (MySQL compatible: use 1 instead of true for boolean)
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
                    WHERE rt.is_active = 1
                    ORDER BY rt.name
                  `;
                    const result = await pool.query(query);
                    console.log(`[Research Types Service] Fetched ${result.rows.length} active research types from database`);
                    
                    // Parse JSON fields (default_modules and settings) from MySQL JSON/string format
                    const parsedRows = result.rows.map((row: Record<string, unknown>) => {
                        const parsedRow = { ...row };
                        
                        // Parse default_modules if it exists
                        if (parsedRow.default_modules) {
                            if (typeof parsedRow.default_modules === 'string') {
                                try {
                                    parsedRow.default_modules = JSON.parse(parsedRow.default_modules);
                                } catch (e) {
                                    console.warn(`[Research Types Service] Failed to parse default_modules for ${parsedRow.id}:`, e);
                                    parsedRow.default_modules = null;
                                }
                            }
                        } else {
                            parsedRow.default_modules = null;
                        }
                        
                        // Parse settings if it exists
                        if (parsedRow.settings) {
                            if (typeof parsedRow.settings === 'string') {
                                try {
                                    parsedRow.settings = JSON.parse(parsedRow.settings);
                                } catch (e) {
                                    console.warn(`[Research Types Service] Failed to parse settings for ${parsedRow.id}:`, e);
                                    parsedRow.settings = {};
                                }
                            }
                        } else {
                            parsedRow.settings = {};
                        }
                        
                        return parsedRow;
                    });
                    
                    console.log(`[Research Types Service] Parsed ${parsedRows.length} research types with JSON fields`);
                    return parsedRows;
        // },
        // CacheTTL.LONG // Cache for 15 minutes
    // );
};

export const create = async (data: ResearchTypeData, createdBy: string | null) => {
    const { name, description, research_technique_ids = [], default_modules = [], settings = {} } = data;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Create research type (MySQL compatible: pre-generate UUID and no RETURNING)
        const researchTypeId = crypto.randomUUID();
        const query = `
            INSERT INTO research_types (id, name, description, default_modules, settings, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await client.query(query, [
            researchTypeId,
            name,
            description,
            JSON.stringify(default_modules),
            JSON.stringify(settings),
            createdBy,
        ]);

        // Fetch created record
        const selectResult = await client.query(
            'SELECT id, name, description, default_modules, settings, is_active, created_at FROM research_types WHERE id = ?',
            [researchTypeId]
        );
        const researchType = selectResult.rows[0];
        
        // Invalidate cache
        cache.delete(CacheKeys.RESEARCH_TYPES_LIST);

        // Associate techniques in the junction table
        if (research_technique_ids && research_technique_ids.length > 0) {
            // MySQL compatible: use ON DUPLICATE KEY UPDATE instead of ON CONFLICT
            const junctionQuery = `
                INSERT INTO research_types_techniques (research_type_id, research_technique_id)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE research_type_id = research_type_id
            `;

            for (const techId of research_technique_ids) {
                await client.query(junctionQuery, [researchType.id, techId]);
            }
        }

        await client.query('COMMIT');
        
        // Invalidate cache
        cache.delete(CacheKeys.RESEARCH_TYPES_LIST);
        
        return researchType;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const getById = async (id: string) => {
    const cacheKey = `${CacheKeys.RESEARCH_TYPE}:${id}`;
    
    return cache.getOrSet(
        cacheKey,
        async () => {
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
            WHERE rt.id = ?
          `;
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                throw new Error('Research type not found');
            }

            const researchType = result.rows[0];
            
            // Parse JSON fields (default_modules and settings) from MySQL JSON/string format
            if (researchType.default_modules && typeof researchType.default_modules === 'string') {
                try {
                    researchType.default_modules = JSON.parse(researchType.default_modules);
                } catch (e) {
                    console.warn(`[Research Types Service] Failed to parse default_modules for ${id}:`, e);
                    researchType.default_modules = null;
                }
            } else if (!researchType.default_modules) {
                researchType.default_modules = null;
            }
            
            if (researchType.settings && typeof researchType.settings === 'string') {
                try {
                    researchType.settings = JSON.parse(researchType.settings);
                } catch (e) {
                    console.warn(`[Research Types Service] Failed to parse settings for ${id}:`, e);
                    researchType.settings = {};
                }
            } else if (!researchType.settings) {
                researchType.settings = {};
            }

            // Get associated techniques
            const techniquesQuery = `
                SELECT rt.id, rt.name, rt.description
                FROM research_techniques rt
                INNER JOIN research_types_techniques rtt ON rt.id = rtt.research_technique_id
                WHERE rtt.research_type_id = ?
            `;
            const techniquesResult = await pool.query(techniquesQuery, [id]);

            return {
                ...researchType,
                research_techniques: techniquesResult.rows
            };
        },
        CacheTTL.LONG
    );
};

export const update = async (id: string, data: Partial<ResearchTypeData>) => {
    const { name, description, research_technique_ids, default_modules, settings } = data;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        // MySQL compatible: use ? placeholders
        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (default_modules !== undefined) {
            updates.push('default_modules = ?');
            values.push(JSON.stringify(default_modules));
        }
        if (settings !== undefined) {
            updates.push('settings = ?');
            values.push(JSON.stringify(settings));
        }

        if (updates.length > 0) {
            values.push(id);
            const query = `
                UPDATE research_types
                SET ${updates.join(', ')}
                WHERE id = ?
            `;
            const result = await client.query(query, values);

            if (result.rowCount === 0) {
                throw new Error('Research type not found');
            }
        }

        // Update techniques if provided
        if (research_technique_ids !== undefined) {
            // First delete existing associations
            await client.query('DELETE FROM research_types_techniques WHERE research_type_id = ?', [id]);

            // Then insert new ones
            if (research_technique_ids.length > 0) {
                // MySQL compatible: use ON DUPLICATE KEY UPDATE instead of ON CONFLICT
                const junctionQuery = `
                    INSERT INTO research_types_techniques (research_type_id, research_technique_id)
                    VALUES (?, ?)
                    ON DUPLICATE KEY UPDATE research_type_id = research_type_id
                `;

                for (const techId of research_technique_ids) {
                    await client.query(junctionQuery, [id, techId]);
                }
            }
        }

        await client.query('COMMIT');
        
        // Invalidate cache
        cache.delete(CacheKeys.RESEARCH_TYPES_LIST);
        cache.delete(`${CacheKeys.RESEARCH_TYPE}:${id}`);

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
    // MySQL compatible: no RETURNING clause
    const query = `
    UPDATE research_types
    SET is_active = false
    WHERE id = ?
  `;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
        throw new Error('Research type not found');
    }
    
    // Invalidate cache
    cache.delete(CacheKeys.RESEARCH_TYPES_LIST);
    cache.delete(`${CacheKeys.RESEARCH_TYPE}:${id}`);

    return { message: 'Research type deleted successfully' };
};

export const updateModules = async (id: string, modules: Record<string, unknown>[]) => {
    // MySQL compatible: no RETURNING clause
    const query = `
    UPDATE research_types
    SET default_modules = ?
    WHERE id = ?
  `;
    const result = await pool.query(query, [JSON.stringify(modules), id]);

    if (result.rowCount === 0) {
        throw new Error('Research type not found');
    }

    // Fetch updated record
    const selectResult = await pool.query(
        'SELECT id, name, default_modules, updated_at FROM research_types WHERE id = ?',
        [id]
    );
    return selectResult.rows[0];
};

/**
 * Gets all research techniques associated with a research type
 * @param researchTypeId - ID of the research type
 * @returns Array of research techniques
 */
export const getTechniquesByType = async (researchTypeId: string) => {
    // Check if is_active and created_by columns exist
    const columnsResult = await pool.query(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'research_techniques' 
         AND COLUMN_NAME IN ('is_active', 'created_by')`
    );
    
    const columns = columnsResult.rows as Array<{ COLUMN_NAME: string }>;
    const hasIsActive = columns.some((col: { COLUMN_NAME: string }) => col.COLUMN_NAME === 'is_active');
    const hasCreatedBy = columns.some((col: { COLUMN_NAME: string }) => col.COLUMN_NAME === 'created_by');
    
    // Build SELECT query based on available columns
    const selectFields = ['rt.id', 'rt.name', 'rt.description', 'rt.created_at', 'rt.updated_at'];
    if (hasIsActive) {
        selectFields.push('rt.is_active');
    }
    if (hasCreatedBy) {
        selectFields.push('rt.created_by');
    }
    
    const query = `
    SELECT 
        ${selectFields.join(', ')}
    FROM research_techniques rt
    INNER JOIN research_types_techniques rtt ON rt.id = rtt.research_technique_id
    WHERE rtt.research_type_id = ?
    ORDER BY rt.name
  `;
    const result = await pool.query(query, [researchTypeId]);
    
    // Ensure all expected fields are present with defaults if columns don't exist
    // Frontend expects: id, name, description, created_by, is_active, created_at, updated_at
    return result.rows.map((row: Record<string, unknown>) => {
        const technique: Record<string, unknown> = {
            id: String(row.id || ''),
            name: String(row.name || ''),
            description: String(row.description || ''),
            created_at: row.created_at ? new Date(row.created_at as string).toISOString() : new Date().toISOString(),
            updated_at: row.updated_at ? new Date(row.updated_at as string).toISOString() : new Date().toISOString(),
        };
        
        // Add optional fields if they exist in the database
        if (hasIsActive) {
            technique.is_active = Boolean(row.is_active ?? true);
        } else {
            technique.is_active = true;
        }
        
        if (hasCreatedBy) {
            technique.created_by = String(row.created_by || '');
        } else {
            technique.created_by = '';
        }
        
        return technique;
    });
};

/**
 * Gets all module templates associated with a research type
 * @param researchTypeId - ID of the research type
 * @returns Array of module templates
 */
export const getModulesByType = async (researchTypeId: string) => {
    // Check if the junction table exists
    const tableCheckQuery = `
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'research_types_module_templates'
    `;
    const tableCheckResult = await pool.query(tableCheckQuery);
    const tableExists = (tableCheckResult.rows[0] as { count: number }).count > 0;
    
    if (!tableExists) {
        // Table doesn't exist, return empty array
        console.warn(`[Research Types Service] Table research_types_module_templates does not exist, returning empty array`);
        return [];
    }
    
    const query = `
    SELECT 
        mt.id,
        mt.name,
        mt.description,
        mt.structure,
        mt.is_active,
        mt.created_at,
        mt.updated_at
    FROM module_templates mt
    INNER JOIN research_types_module_templates rtmt ON mt.id = rtmt.module_template_id
    WHERE rtmt.research_type_id = ? AND mt.is_active = true
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
    // Check if the junction table exists
    const tableCheckQuery = `
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'research_types_module_templates'
    `;
    const tableCheckResult = await pool.query(tableCheckQuery);
    const tableExists = (tableCheckResult.rows[0] as { count: number }).count > 0;
    
    if (!tableExists) {
        console.warn(`[Research Types Service] Table research_types_module_templates does not exist, cannot update assignments`);
        throw new Error('Module assignments feature not available: table research_types_module_templates does not exist');
    }
    
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // First delete existing associations
        await client.query('DELETE FROM research_types_module_templates WHERE research_type_id = ?', [
            researchTypeId,
        ]);

        // Then insert new associations
        if (moduleTemplateIds && moduleTemplateIds.length > 0) {
            // MySQL compatible: use ON DUPLICATE KEY UPDATE instead of ON CONFLICT
            const junctionQuery = `
                INSERT INTO research_types_module_templates (research_type_id, module_template_id)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE research_type_id = research_type_id
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
