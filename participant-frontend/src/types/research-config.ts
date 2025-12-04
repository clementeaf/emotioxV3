export interface ResearchConfig {
    id: string;
    settings: {
        enableLocationCapture: boolean;
        enableDeviceCapture: boolean;
        enableSessionRecording: boolean;
    };
}

export interface DeviceInfo {
    userAgent: string;
    platform: string;
    language: string;
    screenResolution: string;
    deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
}

export interface LocationInfo {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
}
