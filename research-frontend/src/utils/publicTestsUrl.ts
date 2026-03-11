/**
 * Genera la URL pública para acceder a los tests de un participante
 * @param researchId - ID de la investigación
 * @param participantId - ID del participante
 * @returns URL completa para acceder a los tests
 */
export function getPublicTestsUrl(researchId: string, participantId: string): string {
    // Siempre usar participantBaseUrl de runtime-config.json si está definido
    let baseUrl = '';
    const runtimeConfig = (window as { runtimeConfig?: { participantBaseUrl?: string } }).runtimeConfig;
    if (runtimeConfig?.participantBaseUrl) {
        baseUrl = runtimeConfig.participantBaseUrl;
    } else {
        // Fallback solo si no existe participantBaseUrl
        const envUrl = import.meta.env.VITE_PARTICIPANT_FRONTEND_URL;
        if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
            baseUrl = envUrl;
        } else {
            // Último recurso: hostname actual
            const protocol = window.location.protocol;
            const hostname = window.location.hostname;
            baseUrl = `${protocol}//${hostname}`;
        }
    }
    return `${baseUrl}/research/${researchId}?participantId=${participantId}`;
}

