import pool from '../../config/database';
import { ParticipationMode } from './public.types';
import { getResearchConfiguration } from './public.research';

/**
 * Resolves global participant cap from Research Configuration module.
 * Matches research-frontend: legacy `participantLimit` as a number means enabled with that value;
 * object form uses `enabled` + `value`.
 * @param researchConfig - Parsed module config from getResearchConfiguration
 * @returns Positive cap when the limit applies, or null when disabled / unset
 */
export function getEffectiveParticipantLimitCap(researchConfig: Record<string, unknown>): number | null {
  const raw = researchConfig?.participantLimit;
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  if (typeof raw === 'object' && raw !== null) {
    const o = raw as Record<string, unknown>;
    if (o.enabled !== true) {
      return null;
    }
    const v = typeof o.value === 'number' ? o.value : Number(o.value);
    if (Number.isFinite(v) && v > 0) {
      return Math.floor(v);
    }
  }
  return null;
}

/**
 * Gets the participation mode for a research from its Research Configuration module.
 * @returns 'kiosk' or 'panel' (defaults to 'panel' for retrocompatibility)
 */
export const getParticipationMode = async (researchId: string): Promise<ParticipationMode> => {
  const config = await getResearchConfiguration(researchId);
  const mode = config.participationMode as string | undefined;
  return mode === 'kiosk' ? 'kiosk' : 'panel';
};

/**
 * Generates an incremental kiosk session ID for a research.
 * Uses a transaction to avoid race conditions between simultaneous tablets.
 * @returns { participantId: 'kiosk-N' }
 */
export const generateKioskSession = async (researchId: string): Promise<{ participantId: string }> => {
  // Validate research exists and is active
  const researchQuery = `
    SELECT id FROM researches
    WHERE id = ? AND status = 'active' AND deleted_at IS NULL
  `;
  const researchResult = await pool.query(researchQuery, [researchId]);
  if (researchResult.rows.length === 0) {
    throw new Error('Research not found or not active');
  }

  // Validate research is in kiosk mode
  const mode = await getParticipationMode(researchId);
  if (mode !== 'kiosk') {
    throw new Error('Research is not configured in kiosk mode');
  }

  // Generate incremental ID with transaction to prevent race conditions
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Count existing kiosk participants (FOR UPDATE locks the rows to prevent concurrent reads)
    const countQuery = `
      SELECT COUNT(DISTINCT participant_id) as kiosk_count
      FROM responses
      WHERE research_id = ? AND participant_id LIKE 'kiosk-%'
      FOR UPDATE
    `;
    const countResult = await client.query(countQuery, [researchId]);
    const currentCount = Number.parseInt(countResult.rows[0].kiosk_count, 10) || 0;
    const participantId = `kiosk-${currentCount + 1}`;

    await client.query('COMMIT');
    return { participantId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
