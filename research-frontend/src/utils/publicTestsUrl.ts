/**
 * Cached participant base URL resolved from runtime-config.json
 */
let cachedParticipantBaseUrl: string | null = null;

/**
 * Load participantBaseUrl from runtime-config.json (once)
 */
async function resolveParticipantBaseUrl(): Promise<string> {
    if (cachedParticipantBaseUrl) return cachedParticipantBaseUrl;

    try {
        const basePath = import.meta.env.BASE_URL || '/';
        const response = await fetch(`${basePath}runtime-config.json?t=${Date.now()}`, { cache: 'no-store' });
        if (response.ok) {
            const data = await response.json() as Record<string, unknown>;
            if (typeof data.participantBaseUrl === 'string' && data.participantBaseUrl.trim()) {
                cachedParticipantBaseUrl = data.participantBaseUrl.replace(/\/+$/, '');
                return cachedParticipantBaseUrl;
            }
        }
    } catch { /* fallback below */ }

    // Fallback: VITE env
    const envUrl = import.meta.env.VITE_PARTICIPANT_FRONTEND_URL;
    if (typeof envUrl === 'string' && envUrl.trim()) {
        cachedParticipantBaseUrl = envUrl.replace(/\/+$/, '');
        return cachedParticipantBaseUrl;
    }

    // Last resort: current origin + /participant
    cachedParticipantBaseUrl = `${window.location.protocol}//${window.location.hostname}/participant`;
    return cachedParticipantBaseUrl;
}

// Eagerly resolve on module load
void resolveParticipantBaseUrl();

/**
 * Genera la URL pública para acceder a los tests de un participante
 */
export function getPublicTestsUrl(researchId: string, participantId: string): string {
    const baseUrl = cachedParticipantBaseUrl || `${window.location.protocol}//${window.location.hostname}/participant`;
    return `${baseUrl}/research/${researchId}?participantId=${participantId}`;
}

/**
 * Genera la URL para revisar las respuestas de un participante (read-only)
 */
export function getReviewUrl(researchId: string, participantId: string): string {
    const baseUrl = cachedParticipantBaseUrl || `${window.location.protocol}//${window.location.hostname}/participant`;
    return `${baseUrl}/research/${researchId}?review=${encodeURIComponent(participantId)}`;
}
