import pool from '../../config/database';
import { getResearchConfiguration, getParticipantCount } from './public.research';
import { getEffectiveParticipantLimitCap } from './public.participation';

/**
 * Verifies Cloudflare Turnstile token
 * @param token - Turnstile token from frontend
 * @returns true if token is valid, false otherwise
 * @throws Error if secret key is required but not configured in production
 */
export const verifyTurnstileToken = async (token: string): Promise<boolean> => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, secret key is mandatory
  if (!secretKey) {
    if (isProduction) {
      console.error('[Turnstile] TURNSTILE_SECRET_KEY is required in production but not configured');
      throw new Error('Turnstile verification is not properly configured. Please contact support.');
    }
    // In development, allow skipping validation but log warning
    console.warn('[Turnstile] No secret key configured, skipping verification (development mode)');
    return true;
  }

  // Validate token format (basic check)
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    console.error('[Turnstile] Invalid token format');
    return false;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
      }),
    });

    if (!response.ok) {
      console.error('[Turnstile] Verification request failed with status:', response.status);
      return false;
    }

    const data = await response.json() as { success: boolean; 'error-codes'?: string[]; challenge_ts?: string };

    if (!data.success) {
      const errorCodes = data['error-codes'] || [];
      console.error('[Turnstile] Verification failed:', {
        errorCodes,
        challengeTimestamp: data.challenge_ts,
      });
      return false;
    }

    console.log('[Turnstile] Token verified successfully');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Turnstile] Verification error:', errorMessage);
    return false;
  }
};

/**
 * Validates participant demographics against disqualifications and quota availability.
 * Uses an atomic check-and-increment: if quotas pass, counters are already incremented on COMMIT.
 * Called before participant completes demographics step.
 */
export const validateDemographics = async (
  researchId: string,
  demographicAnswers: Record<string, string>,
  participantId?: string
): Promise<{ valid: boolean; reason?: 'DISQUALIFIED' | 'QUOTA_FULL' | 'RESEARCH_CLOSED'; details?: string }> => {
  const client = await pool.connect();
  try {
    // Verify research is still active before validating demographics
    const statusResult = await pool.query(
      'SELECT status FROM researches WHERE id = ? AND deleted_at IS NULL',
      [researchId]
    );
    if (statusResult.rows.length === 0 || statusResult.rows[0].status !== 'active') {
      return { valid: false, reason: 'RESEARCH_CLOSED', details: 'Research is no longer accepting responses' };
    }

    // Get research configuration to access demographic rules and participant limit
    const researchConfig = await getResearchConfiguration(researchId);
    const demographics = (researchConfig.demographics || {}) as Record<string, any>;

    // Resolve participant limit for percentage→absolute conversion (supports legacy number + { enabled, value })
    const resolvedParticipantLimit = getEffectiveParticipantLimitCap(researchConfig);

    const quotaService = await import('../quotas/quota.service');

    // If no participantId provided, fall back to non-atomic check (backwards compat)
    if (!participantId) {
      const validation = await quotaService.checkQuotaAvailability(
        researchId,
        demographicAnswers,
        demographics
      );
      return validation;
    }

    // Atomic: validate + increment quotas in a single transaction
    await client.query('BEGIN');

    const validation = await quotaService.tryIncrementQuota(
      client,
      researchId,
      participantId,
      demographicAnswers,
      demographics,
      resolvedParticipantLimit
    );

    if (validation.valid) {
      await client.query('COMMIT');
      console.log(`✓ Atomic quota increment committed for participant ${participantId}`);
    } else {
      await client.query('ROLLBACK');

      // Update participant status (panel mode tracking)
      try {
        const { updateStatus } = await import('../participants/participants.service');
        const status = validation.reason === 'QUOTA_FULL' ? 'overquota' : 'disqualified';
        await updateStatus(researchId, participantId, status);
        console.log(`✓ Participant ${participantId} marked as ${status}`);
      } catch (_statusErr) {
        // Non-critical: participant may not exist in participants table (kiosk mode)
      }
    }

    return validation;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error validating demographics:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Pre-check before showing the survey: research active + global participant limit only.
 * Demographic quotas are not pre-checked (options may exist outside configured quota rows;
 * enforcement remains in validateDemographics / tryIncrementQuota).
 */
export const checkQuotaPreAvailability = async (researchId: string): Promise<{ available: boolean; exhaustedType?: string }> => {
  // Also verify research is still active
  const statusResult = await pool.query(
    'SELECT status FROM researches WHERE id = ? AND deleted_at IS NULL',
    [researchId]
  );
  if (statusResult.rows.length === 0 || statusResult.rows[0].status !== 'active') {
    return { available: false, exhaustedType: 'research_closed' };
  }

  const researchConfig = await getResearchConfiguration(researchId);
  const participantCap = getEffectiveParticipantLimitCap(researchConfig);
  if (participantCap !== null) {
    const currentCount = await getParticipantCount(researchId);
    if (currentCount >= participantCap) {
      return { available: false, exhaustedType: 'participant_limit' };
    }
  }

  return { available: true };
};
