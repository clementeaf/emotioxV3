import pool from '../../config/database';

export interface StageTemplateData {
    name: string;
    description?: string;
    created_by?: string | null;
}

export interface StageTemplateWithModules {
    id: string;
    name: string;
    description: string | null;
    created_by: string | null;
    is_active: boolean;
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
    const query = `
        SELECT 
            st.id,
            st.name,
            st.description,
            st.created_by,
            st.is_active,
            st.created_at,
            st.updated_at,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', mt.id,
                        'name', mt.name,
                        'description', mt.description,
                        'display_order', stmt.display_order
                    ) ORDER BY stmt.display_order
                ) FILTER (WHERE mt.id IS NOT NULL),
                '[]'
            ) as modules
        FROM stage_templates st
        LEFT JOIN stage_templates_module_templates stmt ON st.id = stmt.stage_template_id
        LEFT JOIN module_templates mt ON stmt.module_template_id = mt.id AND mt.is_active = true
        WHERE st.is_active = true
        GROUP BY st.id
        ORDER BY st.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
};

export const create = async (data: StageTemplateData) => {
    const { name, description, created_by } = data;

    const query = `
        INSERT INTO stage_templates (name, description, created_by)
        VALUES ($1, $2, $3)
        RETURNING id, name, description, created_by, is_active, created_at
    `;

    const result = await pool.query(query, [name, description, created_by || null]);
    return result.rows[0];
};

export const getById = async (id: string): Promise<StageTemplateWithModules> => {
    const query = `
        SELECT 
            st.id,
            st.name,
            st.description,
            st.created_by,
            st.is_active,
            st.created_at,
            st.updated_at,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', mt.id,
                        'name', mt.name,
                        'description', mt.description,
                        'display_order', stmt.display_order
                    ) ORDER BY stmt.display_order
                ) FILTER (WHERE mt.id IS NOT NULL),
                '[]'
            ) as modules
        FROM stage_templates st
        LEFT JOIN stage_templates_module_templates stmt ON st.id = stmt.stage_template_id
        LEFT JOIN module_templates mt ON stmt.module_template_id = mt.id AND mt.is_active = true
        WHERE st.id = $1 AND st.is_active = true
        GROUP BY st.id
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        throw new Error('Stage template not found');
    }

    return result.rows[0];
};

export const update = async (id: string, data: Partial<StageTemplateData>) => {
    const { name, description } = data;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
    }
    if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
    }

    if (updates.length === 0) {
        throw new Error('No fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
        UPDATE stage_templates
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND is_active = true
        RETURNING id, name, description, is_active, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        throw new Error('Stage template not found');
    }

    return result.rows[0];
};

export const deleteTemplate = async (id: string) => {
    const query = `
        UPDATE stage_templates
        SET is_active = false
        WHERE id = $1
        RETURNING id
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        throw new Error('Stage template not found');
    }

    return { message: 'Stage template deleted successfully' };
};

export const addModule = async (stageId: string, moduleId: string, displayOrder?: number) => {
    const order = displayOrder ?? 0;

    const query = `
        INSERT INTO stage_templates_module_templates 
        (stage_template_id, module_template_id, display_order)
        VALUES ($1, $2, $3)
        ON CONFLICT (stage_template_id, module_template_id) 
        DO UPDATE SET display_order = $3
        RETURNING *
    `;

    const result = await pool.query(query, [stageId, moduleId, order]);
    return result.rows[0];
};

export const removeModule = async (stageId: string, moduleId: string) => {
    const query = `
        DELETE FROM stage_templates_module_templates
        WHERE stage_template_id = $1 AND module_template_id = $2
        RETURNING *
    `;

    const result = await pool.query(query, [stageId, moduleId]);

    if (result.rows.length === 0) {
        throw new Error('Module not found in this stage');
    }

    return { message: 'Module removed from stage successfully' };
};
