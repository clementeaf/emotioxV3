import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParticipantStore } from '../../stores/useParticipantStore';
import { mediaService } from '../../services/media.service';
import { usePreviewMode } from '../../hooks/usePreviewMode';
import {
    connectHeartRateDevice, computeHRV, isWebBluetoothSupported,
    type HeartRateSample, type WearableDeviceInfo,
} from '../../lib/biometrics/heartRateDevice';

interface WearableRendererProps {
    module: {
        id: string;
        name: string;
        structure?: { components?: Array<{ id?: string; value?: unknown; placeholder?: { text?: string } }> };
    };
    onComplete?: () => void;
}

type Phase = 'intro' | 'pairing' | 'baseline' | 'viewing' | 'complete';

function extractConfig(module: WearableRendererProps['module']) {
    const comps = module.structure?.components ?? [];
    const get = (id: string) => comps.find(c => c.id === id);

    let stimulusUrls: string[] = [];
    const stimuliComp = get('stimuli');
    if (stimuliComp?.value) {
        try {
            const parsed = typeof stimuliComp.value === 'string' ? JSON.parse(stimuliComp.value) : stimuliComp.value;
            if (Array.isArray(parsed)) stimulusUrls = parsed.map((img: { s3Key?: string; url?: string }) => img.s3Key || img.url || '').filter(Boolean);
        } catch { /* */ }
    }

    return {
        stimulusUrls,
        recordingDuration: Number(get('recording-duration')?.value || '30') * 1000,
        baselineDuration: Number(get('baseline-duration')?.value || '30') * 1000,
        taskDescription: (get('task-instructions')?.value as string) || '',
    };
}

export const WearableRenderer: React.FC<WearableRendererProps> = ({ module, onComplete }) => {
    const { t } = useTranslation();
    const { saveResponse } = useParticipantStore();
    const { isPreviewMode } = usePreviewMode();

    const { stimulusUrls, recordingDuration, baselineDuration, taskDescription } = useMemo(() => extractConfig(module), [module]);

    const [phase, setPhase] = useState<Phase>('intro');
    const [device, setDevice] = useState<WearableDeviceInfo | null>(null);
    const [pairing, setPairing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const initialTime = phase === 'baseline' ? Math.ceil(baselineDuration / 1000) : phase === 'viewing' ? Math.ceil(recordingDuration / 1000) : 0;
    const [timeLeft, setTimeLeft] = useState(initialTime);
    const [latestBPM, setLatestBPM] = useState<number | null>(null);
    const [resolvedUrls, setResolvedUrls] = useState<string[]>([]);

    const savedRef = useRef(false);
    const deviceRef = useRef<{ start: (cb: (s: HeartRateSample) => void) => void; stop: () => void; disconnect: () => void } | null>(null);
    const baselineSamplesRef = useRef<HeartRateSample[]>([]);
    const stimuliSamplesRef = useRef<Array<{ stimulusIndex: number; samples: HeartRateSample[] }>>([]);
    const currentSamplesRef = useRef<HeartRateSample[]>([]);

    useEffect(() => {
        Promise.all(stimulusUrls.map(key => mediaService.getMediaUrl(key))).then(setResolvedUrls);
    }, [stimulusUrls]);

    const handlePair = useCallback(async () => {
        setPairing(true);
        const conn = await connectHeartRateDevice();
        setPairing(false);
        if (conn) {
            setDevice(conn.device);
            deviceRef.current = conn;
        }
    }, []);

    // Baseline
    useEffect(() => {
        if (phase !== 'baseline' || !deviceRef.current) return;
        baselineSamplesRef.current = [];

        deviceRef.current.start((sample) => {
            baselineSamplesRef.current.push(sample);
            setLatestBPM(sample.bpm);
        });

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(timer); deviceRef.current?.stop(); setTimeLeft(Math.ceil(recordingDuration / 1000)); setPhase('viewing'); return 0; }
                return prev - 1;
            });
        }, 1000);

        return () => { clearInterval(timer); deviceRef.current?.stop(); };
    }, [phase, baselineDuration]);

    // Viewing
    useEffect(() => {
        if (phase !== 'viewing' || !deviceRef.current) return;
        const dur = Math.ceil(recordingDuration / 1000);
        currentSamplesRef.current = [];

        deviceRef.current.start((sample) => {
            currentSamplesRef.current.push(sample);
            setLatestBPM(sample.bpm);
        });

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    deviceRef.current?.stop();
                    stimuliSamplesRef.current.push({ stimulusIndex: currentIndex, samples: [...currentSamplesRef.current] });

                    if (currentIndex < resolvedUrls.length - 1) {
                        setCurrentIndex(p => p + 1);
                        currentSamplesRef.current = [];
                        setTimeLeft(dur);
                        deviceRef.current?.start((s) => { currentSamplesRef.current.push(s); setLatestBPM(s.bpm); });
                    } else {
                        deviceRef.current?.disconnect();
                        setPhase('complete');
                    }
                    return dur;
                }
                return prev - 1;
            });
        }, 1000);

        return () => { clearInterval(timer); deviceRef.current?.stop(); };
    }, [phase, currentIndex, recordingDuration, resolvedUrls.length]);

    // Save
    useEffect(() => {
        if (phase !== 'complete' || savedRef.current) return;
        savedRef.current = true;
        if (isPreviewMode) { onComplete?.(); return; }

        const baselineRR = baselineSamplesRef.current.map(s => s.rrInterval).filter((rr): rr is number => rr !== null);
        const baselineHRV = computeHRV(baselineRR);

        const responseValue = JSON.stringify({
            device: device ? { name: device.name, batteryLevel: device.batteryLevel } : null,
            baseline: {
                samples: baselineSamplesRef.current,
                avgBPM: avg(baselineSamplesRef.current.map(s => s.bpm)),
                hrv: baselineHRV,
            },
            stimuli: stimuliSamplesRef.current.map(s => {
                const rrs = s.samples.map(x => x.rrInterval).filter((rr): rr is number => rr !== null);
                return {
                    stimulusIndex: s.stimulusIndex,
                    stimulusUrl: stimulusUrls[s.stimulusIndex],
                    samples: s.samples,
                    avgBPM: avg(s.samples.map(x => x.bpm)),
                    maxBPM: Math.max(...s.samples.map(x => x.bpm), 0),
                    minBPM: Math.min(...s.samples.map(x => x.bpm), 999),
                    hrv: computeHRV(rrs),
                };
            }),
        });

        saveResponse(module.id, 'wearable-biometric', responseValue);
        setTimeout(() => onComplete?.(), 1500);
    }, [phase, isPreviewMode, module.id, onComplete, saveResponse, device, stimulusUrls]);

    useEffect(() => { return () => deviceRef.current?.disconnect(); }, []);

    const supported = isWebBluetoothSupported();

    if (phase === 'intro') {
        return (
            <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
                <div className="max-w-md text-center space-y-6 px-6">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">{t('Biometric Recording')}</h2>
                    <p className="text-sm text-gray-600">{taskDescription || t('Your heart rate will be measured while you view stimuli. Please wear your heart rate sensor.')}</p>
                    {!supported && <p className="text-sm text-red-600">{t('Web Bluetooth is not supported in this browser.')}</p>}
                    <button onClick={() => setPhase('pairing')} disabled={!supported} className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">{t('Continue')}</button>
                </div>
            </div>
        );
    }

    if (phase === 'pairing') {
        return (
            <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
                <div className="max-w-md text-center space-y-6 px-6">
                    <h2 className="text-lg font-semibold text-gray-900">{t('Pair Heart Rate Monitor')}</h2>
                    {device ? (
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-green-800">{device.name}</p>
                                {device.batteryLevel !== undefined && <p className="text-xs text-green-600">Battery: {device.batteryLevel}%</p>}
                            </div>
                            <button onClick={() => { setTimeLeft(Math.ceil((baselineDuration > 0 ? baselineDuration : recordingDuration) / 1000)); setPhase(baselineDuration > 0 ? 'baseline' : 'viewing'); }} className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">{t('Start')}</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">{t('Turn on your heart rate monitor and click below.')}</p>
                            <button onClick={handlePair} disabled={pairing} className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">
                                {pairing ? t('Searching...') : t('Pair Device')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (phase === 'baseline') {
        return (
            <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
                <div className="text-center space-y-6">
                    <p className="text-white text-lg">{t('Sit quietly and breathe normally')}</p>
                    <p className="text-gray-400 text-sm">{t('Recording baseline...')} {timeLeft}s</p>
                    {latestBPM && <p className="text-red-400 text-4xl font-bold">{latestBPM} <span className="text-lg">BPM</span></p>}
                </div>
            </div>
        );
    }

    if (phase === 'viewing') {
        const currentUrl = resolvedUrls[currentIndex];
        return (
            <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
                <div className="flex-1 flex items-center justify-center p-4">
                    {currentUrl && <img src={currentUrl} alt="" className="max-w-[85vw] max-h-[75vh] object-contain" />}
                </div>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm flex items-center gap-3">
                    <span className="font-mono">{timeLeft}s</span>
                    <span className="text-white/60">{currentIndex + 1}/{resolvedUrls.length}</span>
                </div>
                {latestBPM && (
                    <div className="absolute bottom-4 right-4 bg-black/60 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2">
                        <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        <span className="text-xl font-bold">{latestBPM}</span>
                        <span className="text-xs text-white/60">BPM</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
            <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-lg font-medium text-gray-900">{t('Biometric recording complete')}</p>
            </div>
        </div>
    );
};

function avg(arr: number[]): number {
    return arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : 0;
}
