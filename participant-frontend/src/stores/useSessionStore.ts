import { create } from 'zustand';
import type { ResearchConfig, DeviceInfo, LocationInfo } from '../types/research-config';

interface SessionState {
    config: ResearchConfig | null;
    startTime: number | null;
    endTime: number | null;
    deviceInfo: DeviceInfo | null;
    location: LocationInfo | null;

    setConfig: (config: ResearchConfig) => void;
    startSession: () => void;
    endSession: () => void;
    setDeviceInfo: (info: DeviceInfo) => void;
    setLocation: (location: LocationInfo) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
    config: null,
    startTime: null,
    endTime: null,
    deviceInfo: null,
    location: null,

    setConfig: (config) => set({ config }),
    startSession: () => set({ startTime: Date.now() }),
    endSession: () => set({ endTime: Date.now() }),
    setDeviceInfo: (deviceInfo) => set({ deviceInfo }),
    setLocation: (location) => set({ location }),
}));
