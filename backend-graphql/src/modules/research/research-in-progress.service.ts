import pool from '../../config/database';

/**
 * Obtiene las métricas generales de una investigación
 * @param researchId - ID de la investigación
 * @param userId - ID del usuario (para verificar permisos)
 * @returns Métricas de la investigación
 */
export const getOverviewMetrics = async (researchId: string, userId: string) => {
    // Verificar que el research existe y pertenece al usuario
    const researchCheck = await pool.query(
        'SELECT id, status FROM researches WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [researchId, userId]
    );

    if (researchCheck.rows.length === 0) {
        throw new Error('Research not found');
    }

    return getOverviewMetricsInternal(researchId);
};

export const getOverviewMetricsInternal = async (researchId: string) => {
    // Verifying research existence
    const researchCheck = await pool.query(
        'SELECT id, status FROM researches WHERE id = $1 AND deleted_at IS NULL',
        [researchId]
    );

    if (researchCheck.rows.length === 0) {
        throw new Error('Research not found');
    }

    const research = researchCheck.rows[0];
    const researchStatus = research.status;

    // Obtener estadísticas de participantes
    const participantsQuery = `
        WITH participant_stats AS (
            SELECT DISTINCT participant_id
            FROM responses
            WHERE research_id = $1
        ),
        participants_with_responses AS (
            SELECT DISTINCT participant_id
            FROM responses
            WHERE research_id = $1
            GROUP BY participant_id
            HAVING COUNT(*) > 0
        )
        SELECT 
            (SELECT COUNT(*) FROM participant_stats) as total_participants,
            (SELECT COUNT(*) FROM participants_with_responses) as participants_with_responses
    `;
    const participantsResult = await pool.query(participantsQuery, [researchId]);
    const totalParticipants = parseInt(participantsResult.rows[0]?.total_participants || '0', 10);
    const participantsWithResponses = parseInt(participantsResult.rows[0]?.participants_with_responses || '0', 10);

    // Calcular progreso promedio de participantes
    const progressQuery = `
        WITH participant_progress AS (
            SELECT 
                participant_id,
                COUNT(DISTINCT module_id) as completed_modules,
                (SELECT COUNT(DISTINCT id) FROM modules WHERE research_id = $1) as total_modules
            FROM responses
            WHERE research_id = $1
            GROUP BY participant_id
        )
        SELECT 
            AVG(CASE 
                WHEN total_modules > 0 
                THEN (completed_modules::float / total_modules::float) * 100 
                ELSE 0 
            END) as avg_progress
        FROM participant_progress
    `;
    const progressResult = await pool.query(progressQuery, [researchId]);
    const avgProgress = parseFloat(progressResult.rows[0]?.avg_progress || '0');

    // Calcular tasa de completitud
    const totalModulesQuery = `
        SELECT COUNT(DISTINCT id) as total_modules
        FROM modules
        WHERE research_id = $1
    `;
    const totalModulesResult = await pool.query(totalModulesQuery, [researchId]);
    const totalModules = parseInt(totalModulesResult.rows[0]?.total_modules || '0', 10);

    const completionRate = totalParticipants > 0 && totalModules > 0
        ? Math.round((participantsWithResponses / totalParticipants) * 100)
        : 0;

    // Calcular tiempo promedio
    const timeQuery = `
        WITH participant_durations AS (
            SELECT 
                EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as duration_seconds
            FROM responses
            WHERE research_id = $1
            GROUP BY participant_id
        )
        SELECT AVG(duration_seconds) as avg_duration_seconds
        FROM participant_durations
    `;
    const timeResult = await pool.query(timeQuery, [researchId]);
    const avgDurationSeconds = parseFloat(timeResult.rows[0]?.avg_duration_seconds || '0');

    const minutes = Math.floor(avgDurationSeconds / 60);
    const seconds = Math.floor(avgDurationSeconds % 60);
    const averageTime = `${minutes} min ${seconds} seg`;

    let statusValue = 'Inactiva';
    let statusDescription = 'Los participantes no pueden acceder';

    if (researchStatus === 'active') {
        statusValue = 'Activa';
        statusDescription = 'Los participantes pueden acceder';
    } else if (researchStatus === 'draft') {
        statusValue = 'Borrador';
        statusDescription = 'En configuración';
    }

    return {
        status: {
            value: statusValue,
            description: statusDescription,
            icon: 'chart-line'
        },
        participants: {
            value: totalParticipants.toString(),
            description: `${participantsWithResponses} respuestas completadas`,
            icon: 'users'
        },
        completionRate: {
            value: `${completionRate}%`,
            description: `${totalParticipants - participantsWithResponses} pendientes`,
            icon: 'check-circle'
        },
        averageTime: {
            value: averageTime,
            description: `Última actividad: ${await getLastActivityText(researchId)}`,
            icon: 'clock'
        }
    };
};

/**
 * Obtiene la lista de participantes con su estado (Internal version)
 */
export const getParticipantsWithStatusInternal = async (researchId: string) => {
    // Verificar que el research existe
    const researchCheck = await pool.query(
        'SELECT id FROM researches WHERE id = $1 AND deleted_at IS NULL',
        [researchId]
    );

    if (researchCheck.rows.length === 0) {
        throw new Error('Research not found');
    }

    // Obtener todos los participantes únicos con sus estadísticas
    const participantsQuery = `
        WITH participant_stats AS (
            SELECT 
                participant_id,
                COUNT(DISTINCT module_id) as completed_modules,
                MIN(created_at) as first_response,
                MAX(created_at) as last_response,
                COUNT(*) as total_responses
            FROM responses
            WHERE research_id = $1
            GROUP BY participant_id
        ),
        total_modules AS (
            SELECT COUNT(DISTINCT id) as total
            FROM modules
            WHERE research_id = $1
        )
        SELECT 
            ps.participant_id as id,
            COALESCE(ps.participant_id::text, 'Unknown') as name,
            COALESCE(ps.participant_id::text, 'unknown@example.com') as email,
            CASE 
                WHEN ps.completed_modules >= tm.total THEN 'Completado'
                WHEN ps.completed_modules > 0 THEN 'En proceso'
                ELSE 'Por iniciar'
            END as status,
            CASE 
                WHEN tm.total > 0 
                THEN ROUND((ps.completed_modules::float / tm.total::float) * 100)
                ELSE 0 
            END as progress,
            CASE 
                WHEN ps.last_response IS NOT NULL AND ps.first_response IS NOT NULL
                THEN EXTRACT(EPOCH FROM (ps.last_response - ps.first_response))
                ELSE 0
            END as duration_seconds,
            ps.last_response as last_activity
        FROM participant_stats ps
        CROSS JOIN total_modules tm
        ORDER BY ps.last_response DESC NULLS LAST
    `;

    const result = await pool.query(participantsQuery, [researchId]);

    const participants = result.rows.map(row => {
        const durationSeconds = parseFloat(row.duration_seconds || '0');
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = Math.floor(durationSeconds % 60);
        const duration = minutes > 0 ? `${minutes} min ${seconds} seg` : `${seconds} seg`;

        const lastActivity = row.last_activity
            ? formatLastActivity(row.last_activity)
            : 'Nunca';

        return {
            id: row.id,
            name: row.name,
            email: row.email,
            status: row.status,
            progress: parseInt(row.progress || '0', 10),
            duration,
            lastActivity
        };
    });

    return participants;
};

/**
 * Obtiene la lista de participantes con su estado
 * @param researchId - ID de la investigación
 * @param userId - ID del usuario (para verificar permisos)
 * @returns Lista de participantes con estado
 */
export const getParticipantsWithStatus = async (researchId: string, userId: string) => {
    // Verificar que el research existe y pertenece al usuario
    const researchCheck = await pool.query(
        'SELECT id FROM researches WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [researchId, userId]
    );

    if (researchCheck.rows.length === 0) {
        throw new Error('Research not found');
    }

    // Return internal implementation result
    return getParticipantsWithStatusInternal(researchId);
};

/**
 * Obtiene los detalles de un participante específico
 * @param researchId - ID de la investigación
 * @param participantId - ID del participante
 * @param userId - ID del usuario (para verificar permisos)
 * @returns Detalles del participante
 */
export const getParticipantDetails = async (researchId: string, participantId: string, userId: string) => {
    // Verificar que el research existe y pertenece al usuario
    const researchCheck = await pool.query(
        'SELECT id FROM researches WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [researchId, userId]
    );

    if (researchCheck.rows.length === 0) {
        throw new Error('Research not found');
    }

    // Obtener estadísticas del participante
    const participantQuery = `
        WITH participant_stats AS (
            SELECT 
                participant_id,
                COUNT(DISTINCT module_id) as completed_modules,
                MIN(created_at) as first_response,
                MAX(created_at) as last_response,
                COUNT(*) as total_responses
            FROM responses
            WHERE research_id = $1 AND participant_id = $2
            GROUP BY participant_id
        ),
        total_modules AS (
            SELECT COUNT(DISTINCT id) as total
            FROM modules
            WHERE research_id = $1
        )
        SELECT 
            ps.participant_id as id,
            COALESCE(ps.participant_id::text, 'Unknown') as name,
            COALESCE(ps.participant_id::text, 'unknown@example.com') as email,
            CASE 
                WHEN ps.completed_modules >= tm.total THEN 'Completado'
                WHEN ps.completed_modules > 0 THEN 'En proceso'
                ELSE 'Por iniciar'
            END as status,
            CASE 
                WHEN tm.total > 0 
                THEN ROUND((ps.completed_modules::float / tm.total::float) * 100)
                ELSE 0 
            END as progress,
            CASE 
                WHEN ps.last_response IS NOT NULL AND ps.first_response IS NOT NULL
                THEN EXTRACT(EPOCH FROM (ps.last_response - ps.first_response))
                ELSE 0
            END as duration_seconds,
            ps.last_response as last_activity,
            ps.first_response as start_time,
            ps.last_response as end_time
        FROM participant_stats ps
        CROSS JOIN total_modules tm
    `;

    const result = await pool.query(participantQuery, [researchId, participantId]);

    if (result.rows.length === 0) {
        throw new Error('Participant not found');
    }

    const row = result.rows[0];
    const durationSeconds = parseFloat(row.duration_seconds || '0');
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.floor(durationSeconds % 60);
    const duration = minutes > 0 ? `${minutes} min ${seconds} seg` : `${seconds} seg`;

    // Obtener respuestas del participante
    const responsesQuery = `
        SELECT 
            r.id,
            r.module_id,
            r.question_id,
            r.component_id,
            r.value,
            r.metadata,
            r.created_at,
            m.name as module_name,
            q.question_text
        FROM responses r
        LEFT JOIN modules m ON r.module_id = m.id
        LEFT JOIN questions q ON r.question_id = q.id
        WHERE r.research_id = $1 AND r.participant_id = $2
        ORDER BY r.created_at ASC
    `;

    const responsesResult = await pool.query(responsesQuery, [researchId, participantId]);

    return {
        id: row.id,
        name: row.name,
        email: row.email,
        status: row.status,
        progress: parseInt(row.progress || '0', 10),
        duration,
        lastActivity: row.last_activity ? formatLastActivity(row.last_activity) : 'Nunca',
        startTime: row.start_time,
        endTime: row.end_time,
        responses: responsesResult.rows.map(r => ({
            id: r.id,
            moduleId: r.module_id,
            moduleName: r.module_name,
            questionId: r.question_id,
            questionText: r.question_text,
            componentId: r.component_id,
            value: r.value,
            metadata: r.metadata,
            createdAt: r.created_at
        }))
    };
};

/**
 * Elimina un participante y todas sus respuestas
 * @param researchId - ID de la investigación
 * @param participantId - ID del participante
 * @param userId - ID del usuario (para verificar permisos)
 * @returns Mensaje de confirmación
 */
export const deleteParticipant = async (researchId: string, participantId: string, userId: string) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Verificar que el research existe y pertenece al usuario
        const researchCheck = await client.query(
            'SELECT id FROM researches WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
            [researchId, userId]
        );

        if (researchCheck.rows.length === 0) {
            throw new Error('Research not found');
        }

        // Verificar que el participante tiene respuestas
        const participantCheck = await client.query(
            'SELECT COUNT(*) as count FROM responses WHERE research_id = $1 AND participant_id = $2',
            [researchId, participantId]
        );

        if (parseInt(participantCheck.rows[0]?.count || '0', 10) === 0) {
            throw new Error('Participant not found');
        }

        // Eliminar todas las respuestas del participante
        await client.query(
            'DELETE FROM responses WHERE research_id = $1 AND participant_id = $2',
            [researchId, participantId]
        );

        await client.query('COMMIT');
        return { message: 'Participant deleted successfully' };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Helper: Obtiene el texto de última actividad
 */
const getLastActivityText = async (researchId: string): Promise<string> => {
    const query = `
        SELECT MAX(created_at) as last_activity
        FROM responses
        WHERE research_id = $1
    `;
    const result = await pool.query(query, [researchId]);

    if (result.rows.length === 0 || !result.rows[0].last_activity) {
        return 'Nunca';
    }

    return formatLastActivity(result.rows[0].last_activity);
};

/**
 * Helper: Formatea la última actividad
 */
const formatLastActivity = (date: Date | string): string => {
    const now = new Date();
    const activityDate = typeof date === 'string' ? new Date(date) : date;
    const diffMs = now.getTime() - activityDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return diffMinutes <= 1 ? 'Hace un momento' : `Hace ${diffMinutes} minutos`;
        }
        return diffHours === 1 ? 'Hace 1 hora' : `Hace ${diffHours} horas`;
    }

    if (diffDays === 1) {
        return 'Hace 1 día';
    }

    if (diffDays < 7) {
        return `Hace ${diffDays} días`;
    }

    if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return weeks === 1 ? 'Hace 1 semana' : `Hace ${weeks} semanas`;
    }

    if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`;
    }

    const years = Math.floor(diffDays / 365);
    return years === 1 ? 'Hace 1 año' : `Hace ${years} años`;
};
