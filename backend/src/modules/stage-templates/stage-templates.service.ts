import pool from '../../config/database';

export type StageType = 'single_module' | 'module_collection';

export interface StageTemplateData {
    name: string;
    description?: string;
    created_by?: string | null;
    stage_type?: StageType;
}

export interface StageTemplateWithModules {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    stage_type: StageType;
    created_at: Date;
    updated_at: Date;
    modules: Array<{
        id: string;
        name: string;
        description: string | null;
        display_order: number;
    }>;
}

export const list = async (): Promise<StageTemplateWithModules[]> => {
    // MySQL compatible: use subquery for JSON aggregation instead of FILTER
    const query = `
        SELECT 
            st.id,
            st.name,
            st.description,
            st.is_active,
            st.stage_type,
            st.created_at,
            st.updated_at,
            COALESCE(
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', mt.id,
                            'name', mt.name,
                            'description', mt.description,
                            'display_order', stmt.display_order
                        )
                        ORDER BY stmt.display_order
                    )
                    FROM stage_templates_module_templates stmt
                    INNER JOIN module_templates mt ON stmt.module_template_id = mt.id
                    WHERE stmt.stage_template_id = st.id AND mt.is_active = true
                ),
                JSON_ARRAY()
            ) as modules
        FROM stage_templates st
        WHERE st.is_active = true
        ORDER BY st.created_at DESC
    `;
    const result = await pool.query(query);
    
    // Parse modules JSON if it's a string (MySQL may return JSON as string)
    return result.rows.map((row: Record<string, unknown>) => {
        let modules = row.modules;
        if (typeof modules === 'string') {
            try {
                modules = JSON.parse(modules);
            } catch (e) {
                console.error('Error parsing modules JSON:', e);
                modules = [];
            }
        }
        return {
            ...row,
            modules: Array.isArray(modules) ? modules : []
        };
    }) as StageTemplateWithModules[];
};

export const create = async (data: StageTemplateData) => {
    const { name, description, created_by, stage_type = 'module_collection' } = data;

    // MySQL compatible: pre-generate UUID and no RETURNING
    const stageTemplateId = crypto.randomUUID();
    const query = `
        INSERT INTO stage_templates (id, name, description, stage_type)
        VALUES (?, ?, ?, ?)
    `;

    await pool.query(query, [stageTemplateId, name, description, stage_type]);
    
    // Fetch created record
    const selectResult = await pool.query(
        'SELECT id, name, description, is_active, stage_type, created_at FROM stage_templates WHERE id = ?',
        [stageTemplateId]
    );
    return selectResult.rows[0];
};

export const getById = async (id: string): Promise<StageTemplateWithModules> => {
    // MySQL compatible: use subquery for JSON aggregation instead of FILTER
    const query = `
        SELECT 
            st.id,
            st.name,
            st.description,
            st.is_active,
            st.stage_type,
            st.created_at,
            st.updated_at,
            COALESCE(
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', mt.id,
                            'name', mt.name,
                            'description', mt.description,
                            'display_order', stmt.display_order
                        )
                        ORDER BY stmt.display_order
                    )
                    FROM stage_templates_module_templates stmt
                    INNER JOIN module_templates mt ON stmt.module_template_id = mt.id
                    WHERE stmt.stage_template_id = st.id AND mt.is_active = true
                ),
                JSON_ARRAY()
            ) as modules
        FROM stage_templates st
        WHERE st.id = ? AND st.is_active = true
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        throw new Error('Stage template not found');
    }

    const row = result.rows[0] as Record<string, unknown>;
    
    // Parse modules JSON if it's a string (MySQL may return JSON as string)
    let modules = row.modules;
    if (typeof modules === 'string') {
        try {
            modules = JSON.parse(modules);
        } catch (e) {
            console.error('Error parsing modules JSON:', e);
            modules = [];
        }
    }

    return {
        ...row,
        modules: Array.isArray(modules) ? modules : []
    } as StageTemplateWithModules;
};

export const update = async (id: string, data: Partial<StageTemplateData>) => {
    const { name, description } = data;

    // MySQL compatible: use ? placeholders
    const updates: string[] = [];
    const values: Array<string | null | undefined> = [];

    if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
    }
    if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
    }

    if (updates.length === 0) {
        throw new Error('No fields to update');
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const query = `
        UPDATE stage_templates
        SET ${updates.join(', ')}
        WHERE id = ? AND is_active = true
    `;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
        throw new Error('Stage template not found');
    }

    // Fetch updated record (MySQL doesn't support RETURNING)
    const selectResult = await pool.query(
        'SELECT id, name, description, is_active, updated_at FROM stage_templates WHERE id = ?',
        [id]
    );
    return selectResult.rows[0];
};

export const deleteTemplate = async (id: string) => {
    // MySQL compatible: no RETURNING clause
    const query = `
        UPDATE stage_templates
        SET is_active = false
        WHERE id = ?
    `;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
        throw new Error('Stage template not found');
    }

    return { message: 'Stage template deleted successfully' };
};

export const addModule = async (stageId: string, moduleId: string, displayOrder?: number) => {
    const order = displayOrder ?? 0;

    // MySQL compatible: use ON DUPLICATE KEY UPDATE instead of ON CONFLICT
    const query = `
        INSERT INTO stage_templates_module_templates 
        (stage_template_id, module_template_id, display_order)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE display_order = ?
    `;

    await pool.query(query, [stageId, moduleId, order, order]);
    
    // Fetch inserted/updated record (MySQL doesn't support RETURNING)
    const selectResult = await pool.query(
        'SELECT * FROM stage_templates_module_templates WHERE stage_template_id = ? AND module_template_id = ?',
        [stageId, moduleId]
    );
    return selectResult.rows[0];
};

export const removeModule = async (stageId: string, moduleId: string) => {
    // MySQL compatible: no RETURNING clause
    const query = `
        DELETE FROM stage_templates_module_templates
        WHERE stage_template_id = ? AND module_template_id = ?
    `;

    const result = await pool.query(query, [stageId, moduleId]);

    if (result.rowCount === 0) {
        throw new Error('Module not found in this stage');
    }

    return { message: 'Module removed from stage successfully' };
};
