/**
 * Genera la URL pública para acceder a los tests de un participante
 * @param researchId - ID de la investigación
 * @param participantId - ID del participante
 * @returns URL completa para acceder a los tests
 */
export function getPublicTestsUrl(researchId: string, participantId: string): string {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    
    let baseUrl: string;
    
    if (isLocal) {
        baseUrl = 'http://localhost:12600';
    } else {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        baseUrl = `${protocol}//${hostname}`;
        
        const runtimeConfig = (window as { runtimeConfig?: { participantBaseUrl?: string } }).runtimeConfig;
        if (runtimeConfig?.participantBaseUrl) {
            baseUrl = runtimeConfig.participantBaseUrl;
        } else {
            const envUrl = import.meta.env.VITE_PARTICIPANT_FRONTEND_URL;
            if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
                baseUrl = envUrl;
            }
        }
    }
    
    return `${baseUrl}/research/${researchId}?participantId=${participantId}`;
}

