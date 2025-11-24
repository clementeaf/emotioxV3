import pool from '../../config/database';

export interface ResearchData {
    name: string;
    description?: string;
    research_type_id?: string;
    research_technique_id?: string;
    enterprise_id?: string;
    settings?: Record<string, unknown>;
    use_default_modules?: string[]; // Module names to clone from template
}

export const list = async (userId: string) => {
    const query = `
    SELECT r.id, r.name, r.description, r.status, r.research_type_id, r.settings, r.created_at, r.updated_at,
           rt.name as research_type_name
    FROM researches r
    LEFT JOIN research_types rt ON r.research_type_id = rt.id
    WHERE r.user_id = $1 AND r.deleted_at IS NULL
    ORDER BY r.created_at DESC
  `;
    const result = await pool.query(query, [userId]);
    return result.rows;
};

export const create = async (userId: string, data: ResearchData) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let { description } = data;
        const { name, research_type_id, research_technique_id, enterprise_id, settings = {}, use_default_modules = [] } = data;

        // If description is not provided and we have a technique, try to get it from the technique
        if (!description && research_technique_id) {
            const techniqueQuery = 'SELECT description FROM research_techniques WHERE id = $1';
            const techniqueResult = await client.query(techniqueQuery, [research_technique_id]);
            if (techniqueResult.rows.length > 0) {
                description = techniqueResult.rows[0].description;
            }
        }

        // Create research
        const researchQuery = `
      INSERT INTO researches (user_id, name, description, research_type_id, research_technique_id, enterprise_id, settings, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
      RETURNING id, name, description, status, research_type_id, research_technique_id, enterprise_id, settings, created_at
    `;
        const researchResult = await client.query(researchQuery, [
            userId,
            name,
            description,
            research_type_id || null,
            research_technique_id || null,
            enterprise_id || null,
            JSON.stringify(settings),
        ]);

        const research = researchResult.rows[0];

        // Clone modules from template if requested
        if (research_type_id && use_default_modules.length > 0) {
            await cloneTemplateModulesInternal(client, research.id, research_type_id, use_default_modules);
        }

        await client.query('COMMIT');
        return research;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const cloneTemplateModulesInternal = async (client: any, researchId: string, researchTypeId: string, moduleNames: string[]) => {
    // Get research type with default_modules
    const typeQuery = 'SELECT default_modules FROM research_types WHERE id = $1';
    const typeResult = await client.query(typeQuery, [researchTypeId]);

    if (typeResult.rows.length === 0) {
        throw new Error('Research type not found');
    }

    const defaultModules = typeResult.rows[0].default_modules || [];

    // Filter modules by names
    const modulesToClone = defaultModules.filter((m: any) => moduleNames.includes(m.name));

    // Create modules and questions
    for (const templateModule of modulesToClone) {
        const moduleQuery = `
      INSERT INTO modules (research_id, name, description, order_index, is_from_template, config)
      VALUES ($1, $2, $3, $4, true, $5)
      RETURNING id
    `;
        const moduleResult = await client.query(moduleQuery, [
            researchId,
            templateModule.name,
            templateModule.description,
            templateModule.order,
            JSON.stringify(templateModule.config || {}),
        ]);

        const moduleId = moduleResult.rows[0].id;

        // Create questions for this module
        if (templateModule.questions && Array.isArray(templateModule.questions)) {
            for (let i = 0; i < templateModule.questions.length; i++) {
                const q = templateModule.questions[i];
                const questionQuery = `
          INSERT INTO questions (module_id, question_type, question_text, order_index, config, validation, required)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
                await client.query(questionQuery, [
                    moduleId,
                    q.type,
                    q.text,
                    i + 1,
                    JSON.stringify(q.config || {}),
                    JSON.stringify(q.validation || {}),
                    q.required || false,
                ]);
            }
        }
    }
};

export const getById = async (researchId: string, userId: string) => {
    const query = `
    SELECT r.id, r.name, r.description, r.status, r.research_type_id, r.research_technique_id, r.settings, r.created_at, r.updated_at,
           rt.name as research_type_name,
           rtech.name as research_technique_name
    FROM researches r
    LEFT JOIN research_types rt ON r.research_type_id = rt.id
    LEFT JOIN research_techniques rtech ON r.research_technique_id = rtech.id
    WHERE r.id = $1 AND r.user_id = $2 AND r.deleted_at IS NULL
  `;
    const result = await pool.query(query, [researchId, userId]);

    if (result.rows.length === 0) {
        throw new Error('Research not found');
    }

    const research = result.rows[0];

    // Get modules with questions
    const modulesQuery = `
    SELECT m.id, m.name, m.description, m.order_index, m.is_from_template, m.config,
           json_agg(
             json_build_object(
               'id', q.id,
               'type', q.question_type,
               'text', q.question_text,
               'order', q.order_index,
               'config', q.config,
               'validation', q.validation,
               'required', q.required
             ) ORDER BY q.order_index
           ) FILTER (WHERE q.id IS NOT NULL) as questions
    FROM modules m
    LEFT JOIN questions q ON m.id = q.module_id
    WHERE m.research_id = $1
    GROUP BY m.id
    ORDER BY m.order_index
  `;
    const modulesResult = await pool.query(modulesQuery, [researchId]);

    research.modules = modulesResult.rows;

    return research;
};

export const update = async (researchId: string, userId: string, data: Partial<ResearchData>) => {
    const { name, description, settings } = data;

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
    if (settings !== undefined) {
        updates.push(`settings = $${paramIndex++}`);
        values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
        throw new Error('No fields to update');
    }

    values.push(researchId, userId);

    const query = `
    UPDATE researches
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} AND deleted_at IS NULL
    RETURNING id, name, description, status, settings, updated_at
  `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        throw new Error('Research not found');
    }

    return result.rows[0];
};

export const updateStatus = async (researchId: string, userId: string, status: string) => {
    const query = `
    UPDATE researches
    SET status = $1
    WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL
    RETURNING id, name, status, updated_at
  `;
    const result = await pool.query(query, [status, researchId, userId]);

    if (result.rows.length === 0) {
        throw new Error('Research not found');
    }

    return result.rows[0];
};

export const deleteResearch = async (researchId: string, userId: string) => {
    const query = `
    UPDATE researches
    SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted'
    WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
    RETURNING id
  `;
    const result = await pool.query(query, [researchId, userId]);

    if (result.rows.length === 0) {
        throw new Error('Research not found');
    }

    return { message: 'Research deleted successfully' };
};
