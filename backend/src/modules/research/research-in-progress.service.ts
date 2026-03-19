import pool from '../../config/database';
import { buildOwnershipClause } from './research.service';

interface ProgressComponentConfig {
    hidden?: boolean;
    config?: {
        hidden?: boolean;
    };
}

interface ProgressModuleConfig {
    structure?: {
        components?: ProgressComponentConfig[];
    };
    components?: ProgressComponentConfig[];
    hidden?: boolean;
}

interface ProgressModuleRow {
    id: string;
    name: string;
    config: unknown;
}

/**
 * Counts visible modules (not sub-components) that participants are expected to answer.
 * Excludes Research Configuration, Welcome Screen, Thank You Screen, and hidden modules.
 * Progress = modules answered / total visible modules.
 */
const countVisibleModulesForProgress = (modules: ProgressModuleRow[]): number => {
    const EXCLUDED_NAMES = ['research configuration', 'welcome screen', 'thank you screen'];
    let count = 0;

    for (const mod of modules) {
        if (EXCLUDED_NAMES.includes(mod.name.toLowerCase())) continue;

        let parsedConfig: ProgressModuleConfig | null = null;
        try {
            if (typeof mod.config === 'string') {
                parsedConfig = JSON.parse(mod.config) as ProgressModuleConfig;
            } else if (mod.config && typeof mod.config === 'object') {
                parsedConfig = mod.config as ProgressModuleConfig;
            }
        } catch {
            parsedConfig = null;
        }

        if (parsedConfig?.hidden === true) continue;

        count++;
    }

    return count;
};

/**
 * Gets the total number of visible modules for progress calculation.
 * @param researchId - Research ID
 * @returns Number of visible modules participants should answer
 */
const getTotalVisibleModulesForProgress = async (researchId: string): Promise<number> => {
    const modulesQuery = `
        SELECT id, name, config
        FROM modules
        WHERE research_id = ?
        ORDER BY order_index
    `;
    const modulesResult = await pool.query(modulesQuery, [researchId]);
    return countVisibleModulesForProgress(modulesResult.rows as ProgressModuleRow[]);
};

/**
 * Obtiene las métricas generales de una investigación
 * @param researchId - ID de la investigación
 * @param userId - ID del usuario (para verificar permisos)
 * @returns Métricas de la investigación
 */
export const getOverviewMetrics = async (researchId: string, userId: string, role?: string) => {
    const ownership = buildOwnershipClause(userId, role);
    // Verificar que el research existe y pertenece al usuario (admin bypasses)
    const researchCheck = await pool.query(
        `SELECT id, status FROM researches WHERE id = ? AND ${ownership.clause} AND deleted_at IS NULL`,
        [researchId, ...ownership.params]
    );

    if (researchCheck.rows.length === 0) {
        throw new Error('Research not found');
    }

    return getOverviewMetricsInternal(researchId);
};

export const getOverviewMetricsInternal = async (researchId: string) => {
    // Verifying research existence
    const researchCheck = await pool.query(
        'SELECT id, status FROM researches WHERE id = ? AND deleted_at IS NULL',
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
            WHERE research_id = ?
        ),
        participants_with_responses AS (
            SELECT DISTINCT participant_id
            FROM responses
            WHERE research_id = ?
            GROUP BY participant_id
            HAVING COUNT(*) > 0
        )
        SELECT 
            (SELECT COUNT(*) FROM participant_stats) as total_participants,
            (SELECT COUNT(*) FROM participants_with_responses) as participants_with_responses
    `;
    const participantsResult = await pool.query(participantsQuery, [researchId, researchId]);
    const totalParticipants = parseInt(participantsResult.rows[0]?.total_participants || '0', 10);
    const participantsWithResponses = parseInt(participantsResult.rows[0]?.participants_with_responses || '0', 10);

    // Contar total de componentes visibles desde config de módulos
    const totalComponents = await getTotalVisibleModulesForProgress(researchId);

    // Calcular tasa de completitud real: participantes que respondieron todos los módulos
    const completedQuery = `
        SELECT COUNT(*) as completed
        FROM (
            SELECT participant_id, COUNT(DISTINCT module_id) as answered
            FROM responses
            WHERE research_id = ?
            GROUP BY participant_id
            HAVING COUNT(DISTINCT module_id) >= ?
        ) completed_participants
    `;
    const completedResult = await pool.query(completedQuery, [researchId, totalComponents]);
    const completedParticipants = parseInt(completedResult.rows[0]?.completed || '0', 10);

    const completionRate = totalParticipants > 0
        ? Math.round((completedParticipants / totalParticipants) * 100)
        : 0;

    // Calcular tiempo promedio
    const timeQuery = `
        WITH participant_durations AS (
            SELECT 
                TIMESTAMPDIFF(SECOND, MIN(created_at), MAX(created_at)) as duration_seconds
            FROM responses
            WHERE research_id = ?
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
        'SELECT id FROM researches WHERE id = ? AND deleted_at IS NULL',
        [researchId]
    );

    if (researchCheck.rows.length === 0) {
        throw new Error('Research not found');
    }

    // 1. Contar total de componentes visibles esperados desde la config de módulos
    const totalComponents = await getTotalVisibleModulesForProgress(researchId);

    // 2. Obtener módulos respondidos por participante
    const participantsQuery = `
        SELECT
            r.participant_id as id,
            COALESCE(CAST(r.participant_id AS CHAR), 'Unknown') as name,
            COALESCE(CAST(r.participant_id AS CHAR), 'unknown@example.com') as email,
            COUNT(DISTINCT r.module_id) as answered_modules,
            MIN(r.created_at) as first_response,
            MAX(r.created_at) as last_response
        FROM responses r
        WHERE r.research_id = ?
        GROUP BY r.participant_id
        ORDER BY MAX(r.created_at) IS NULL, MAX(r.created_at) DESC
    `;
    const result = await pool.query(participantsQuery, [researchId]);

    const participants = result.rows.map(row => {
        const answered = parseInt(row.answered_modules || '0', 10);
        const progress = totalComponents > 0
            ? Math.min(100, Math.round((answered / totalComponents) * 100))
            : 0;
        const status = progress >= 100 ? 'Completado' : (progress > 0 ? 'En proceso' : 'Por iniciar');
        const durationSeconds = row.first_response && row.last_response
            ? Math.floor((new Date(row.last_response).getTime() - new Date(row.first_response).getTime()) / 1000)
            : 0;
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = Math.floor(durationSeconds % 60);
        const duration = minutes > 0 ? `${minutes} min ${seconds} seg` : `${seconds} seg`;
        const lastActivity = row.last_response
            ? formatLastActivity(row.last_response)
            : 'Nunca';
        return {
            id: row.id,
            name: row.name,
            email: row.email,
            status,
            progress,
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
export const getParticipantsWithStatus = async (researchId: string, userId: string, role?: string) => {
    const ownership = buildOwnershipClause(userId, role);
    const researchCheck = await pool.query(
        `SELECT id FROM researches WHERE id = ? AND ${ownership.clause} AND deleted_at IS NULL`,
        [researchId, ...ownership.params]
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
export const getParticipantDetails = async (researchId: string, participantId: string, userId: string, role?: string) => {
    const ownership = buildOwnershipClause(userId, role);
    const researchCheck = await pool.query(
        `SELECT id FROM researches WHERE id = ? AND ${ownership.clause} AND deleted_at IS NULL`,
        [researchId, ...ownership.params]
    );

    if (researchCheck.rows.length === 0) {
        throw new Error('Research not found');
    }

    // Contar total de componentes visibles desde config de módulos
    const totalComponents = await getTotalVisibleModulesForProgress(researchId);

    // Obtener estadísticas del participante usando module_id
    const participantQuery = `
        SELECT
            participant_id as id,
            COALESCE(CAST(participant_id AS CHAR), 'Unknown') as name,
            COALESCE(CAST(participant_id AS CHAR), 'unknown@example.com') as email,
            COUNT(DISTINCT module_id) as answered_modules,
            MIN(created_at) as first_response,
            MAX(created_at) as last_response
        FROM responses
        WHERE research_id = ? AND participant_id = ?
        GROUP BY participant_id
    `;

    const result = await pool.query(participantQuery, [researchId, participantId]);

    if (result.rows.length === 0) {
        throw new Error('Participant not found');
    }

    const row = result.rows[0];
    const answered = parseInt(row.answered_modules || '0', 10);
    const progress = totalComponents > 0
        ? Math.min(100, Math.round((answered / totalComponents) * 100))
        : 0;
    const status = progress >= 100 ? 'Completado' : (progress > 0 ? 'En proceso' : 'Por iniciar');

    const durationMs = row.first_response && row.last_response
        ? new Date(row.last_response).getTime() - new Date(row.first_response).getTime()
        : 0;
    const durationSeconds = Math.floor(durationMs / 1000);
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
        WHERE r.research_id = ? AND r.participant_id = ?
        ORDER BY r.created_at ASC
    `;

    const responsesResult = await pool.query(responsesQuery, [researchId, participantId]);

    return {
        id: row.id,
        name: row.name,
        email: row.email,
        status,
        progress,
        duration,
        lastActivity: row.last_response ? formatLastActivity(row.last_response) : 'Nunca',
        startTime: row.first_response,
        endTime: row.last_response,
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
export const deleteParticipant = async (researchId: string, participantId: string, userId: string, role?: string) => {
    const client = await pool.connect();
    const ownership = buildOwnershipClause(userId, role);

    try {
        await client.query('BEGIN');

        // Verificar que el research existe y pertenece al usuario (admin bypasses)
        const researchCheck = await client.query(
            `SELECT id FROM researches WHERE id = ? AND ${ownership.clause} AND deleted_at IS NULL`,
            [researchId, ...ownership.params]
        );

        if (researchCheck.rows.length === 0) {
            throw new Error('Research not found');
        }

        // Verificar que el participante tiene respuestas
        const participantCheck = await client.query(
            'SELECT COUNT(*) as count FROM responses WHERE research_id = ? AND participant_id = ?',
            [researchId, participantId]
        );

        if (parseInt(participantCheck.rows[0]?.count || '0', 10) === 0) {
            throw new Error('Participant not found');
        }

        // Eliminar todas las respuestas del participante
        await client.query(
            'DELETE FROM responses WHERE research_id = ? AND participant_id = ?',
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
        WHERE research_id = ?
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
