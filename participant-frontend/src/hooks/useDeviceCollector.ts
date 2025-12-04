import { useEffect } from 'react';
import { useSessionStore } from '../stores/useSessionStore';
import type { DeviceInfo } from '../types/research-config';

export const useDeviceCollector = () => {
    const { config, setDeviceInfo } = useSessionStore();

    useEffect(() => {
        if (!config?.settings.enableDeviceCapture) return;

        const userAgent = navigator.userAgent;
        const platform = navigator.platform;
        const language = navigator.language;
        const screenResolution = `${window.screen.width}x${window.screen.height}`;

        // Simple device type detection
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const deviceType: DeviceInfo['deviceType'] = isMobile ? 'mobile' : 'desktop';

        setDeviceInfo({
            userAgent,
            platform,
            language,
            screenResolution,
            deviceType,
        });
    }, [config, setDeviceInfo]);
};
