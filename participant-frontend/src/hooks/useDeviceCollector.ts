import { useEffect } from 'react';
import { useSessionStore } from '../stores/useSessionStore';
import type { DeviceInfo } from '../types/research-config';

/**
 * Detecta el nombre del navegador a partir del user agent
 */
const detectBrowser = (userAgent: string): string => {
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
    return 'Unknown';
};

/**
 * Detecta el sistema operativo
 */
const detectOS = (userAgent: string): string => {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    return 'Unknown';
};

/**
 * Detecta el tipo de dispositivo de manera más precisa
 */
const detectDeviceType = (userAgent: string): DeviceInfo['deviceType'] => {
    const ua = userAgent.toLowerCase();
    
    // Tablets
    if (ua.includes('ipad') || (ua.includes('tablet') && !ua.includes('mobile'))) {
        return 'tablet';
    }
    
    // Mobile
    if (/android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
        return 'mobile';
    }
    
    // Desktop (por defecto)
    return 'desktop';
};

/**
 * Hook para recolectar información del dispositivo del usuario
 */
export const useDeviceCollector = () => {
    const { config, setDeviceInfo } = useSessionStore();

    useEffect(() => {
        if (!config?.settings.enableDeviceCapture) return;

        const userAgent = navigator.userAgent;
        const platform = navigator.platform;
        const language = navigator.language;
        const screenResolution = `${window.screen.width}x${window.screen.height}`;
        const viewportSize = `${window.innerWidth}x${window.innerHeight}`;
        const deviceType = detectDeviceType(userAgent);
        const browserName = detectBrowser(userAgent);
        const osName = detectOS(userAgent);

        setDeviceInfo({
            userAgent,
            platform,
            language,
            screenResolution,
            viewportSize,
            deviceType,
            browserName,
            osName,
        });
    }, [config, setDeviceInfo]);
};
