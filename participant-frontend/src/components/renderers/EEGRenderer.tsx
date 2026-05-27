import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParticipantStore } from '../../stores/useParticipantStore';
import { mediaService } from '../../services/media.service';
import { usePreviewMode } from '../../hooks/usePreviewMode';
import { connectEEGDevice, isWebBluetoothSupported, type EEGSample, type EEGDeviceInfo } from '../../lib/biometrics/eegDevice';

interface EEGRendererProps {
    module: {
        id: string;
        name: string;
        structure?: { components?: Array<{ id?: string; value?: unknown; placeholder?: { text?: string } }> };
    };
    onComplete?: () => void;
}

type Phase = 'intro' | 'pairing' | 'baseline' | 'viewing' | 'complete';

function extractConfig(module: EEGRendererProps['module']) {
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
        deviceType: (get('device-type')?.value || 'any') as string,
        taskDescription: (get('task-instructions')?.value as string) || '',
    };
}

const BAND_COLORS = { delta: '#6366f1', theta: '#8b5cf6', alpha: '#22c55e', beta: '#f59e0b', gamma: '#ef4444' };
const BAND_LABELS = { delta: 'Delta', theta: 'Theta', alpha: 'Alpha', beta: 'Beta', gamma: 'Gamma' };

export const EEGRenderer: React.FC<EEGRendererProps> = ({ module, onComplete }) => {
    const { t } = useTranslation();
    const { saveResponse } = useParticipantStore();
    const { isPreviewMode } = usePreviewMode();

    const { stimulusUrls, recordingDuration, baselineDuration, deviceType, taskDescription } = useMemo(() => extractConfig(module), [module]);

    const [phase, setPhase] = useState<Phase>('intro');
    const [device, setDevice] = useState<EEGDeviceInfo | null>(null);
    const [pairing, setPairing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const initialTime = phase === 'baseline' ? Math.ceil(baselineDuration / 1000) : phase === 'viewing' ? Math.ceil(recordingDuration / 1000) : 0;
    const [timeLeft, setTimeLeft] = useState(initialTime);
    const [latestSample, setLatestSample] = useState<EEGSample | null>(null);
    const [resolvedUrls, setResolvedUrls] = useState<string[]>([]);

    const savedRef = useRef(false);
    const deviceRef = useRef<{ start: (cb: (s: EEGSample) => void) => void; stop: () => void; disconnect: () => void } | null>(null);
    const baselineSamplesRef = useRef<EEGSample[]>([]);
    const stimuliSamplesRef = useRef<Array<{ stimulusIndex: number; samples: EEGSample[] }>>([]);
    const currentSamplesRef = useRef<EEGSample[]>([]);

    useEffect(() => {
        Promise.all(stimulusUrls.map(key => mediaService.getMediaUrl(key))).then(setResolvedUrls);
    }, [stimulusUrls]);

    const handlePair = useCallback(async () => {
        setPairing(true);
        const conn = await connectEEGDevice(deviceType);
        setPairing(false);
        if (conn) {
            setDevice(conn.device);
            deviceRef.current = conn;
        }
    }, [deviceType]);

    // Baseline recording
    useEffect(() => {
        if (phase !== 'baseline' || !deviceRef.current) return;
        baselineSamplesRef.current = [];

        deviceRef.current.start((sample) => {
            baselineSamplesRef.current.push(sample);
            setLatestSample(sample);
        });

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    deviceRef.current?.stop();
                    setTimeLeft(Math.ceil(recordingDuration / 1000));
                    setPhase('viewing');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => { clearInterval(timer); deviceRef.current?.stop(); };
    }, [phase, baselineDuration, recordingDuration]);

    // Viewing phase
    useEffect(() => {
        if (phase !== 'viewing' || !deviceRef.current) return;
        const dur = Math.ceil(recordingDuration / 1000);
        currentSamplesRef.current = [];

        deviceRef.current.start((sample) => {
            currentSamplesRef.current.push(sample);
            setLatestSample(sample);
        });

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    deviceRef.current?.stop();

                    stimuliSamplesRef.current.push({
                        stimulusIndex: currentIndex,
                        samples: [...currentSamplesRef.current],
                    });

                    if (currentIndex < resolvedUrls.length - 1) {
                        setCurrentIndex(p => p + 1);
                        currentSamplesRef.current = [];
                        setTimeLeft(dur);
                        deviceRef.current?.start((sample) => {
                            currentSamplesRef.current.push(sample);
                            setLatestSample(sample);
                        });
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

    // Save on complete
    useEffect(() => {
        if (phase !== 'complete' || savedRef.current) return;
        savedRef.current = true;

        if (isPreviewMode) { onComplete?.(); return; }

        const responseValue = JSON.stringify({
            device: device ? { name: device.name, type: device.type } : null,
            baseline: baselineSamplesRef.current,
            stimuli: stimuliSamplesRef.current.map(s => ({
                stimulusIndex: s.stimulusIndex,
                stimulusUrl: stimulusUrls[s.stimulusIndex],
                samples: s.samples,
                avgAttention: avg(s.samples.map(x => x.attentionIndex)),
                avgMeditation: avg(s.samples.map(x => x.meditationIndex)),
                avgAlpha: avg(s.samples.map(x => x.alpha)),
                avgBeta: avg(s.samples.map(x => x.beta)),
            })),
        });

        saveResponse(module.id, 'eeg-recording', responseValue);
        setTimeout(() => onComplete?.(), 1500);
    }, [phase, isPreviewMode, module.id, onComplete, saveResponse, device, stimulusUrls]);

    useEffect(() => { return () => deviceRef.current?.disconnect(); }, []);

    const supported = isWebBluetoothSupported();

    const bandBarsEl = latestSample ? (
        <div className="flex gap-1 items-end h-16">
            {(['delta', 'theta', 'alpha', 'beta', 'gamma'] as const).map(band => (
                <div key={band} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full rounded-t" style={{
                        height: `${Math.max(latestSample[band] * 100, 4)}%`,
                        backgroundColor: BAND_COLORS[band],
                        transition: 'height 0.1s',
                    }} />
                    <span className="text-[8px] text-gray-500">{BAND_LABELS[band]}</span>
                </div>
            ))}
        </div>
    ) : null;

    if (phase === 'intro') {
        return (
            <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
                <div className="max-w-md text-center space-y-6 px-6">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">{t('EEG Recording')}</h2>
                    <p className="text-sm text-gray-600">{taskDescription || t('Your brain activity will be recorded while you view stimuli. Please wear your EEG headband.')}</p>
                    {!supported && <p className="text-sm text-red-600">{t('Web Bluetooth is not supported in this browser. Please use Chrome or Edge.')}</p>}
                    <button onClick={() => setPhase('pairing')} disabled={!supported} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">{t('Continue')}</button>
                </div>
            </div>
        );
    }

    if (phase === 'pairing') {
        return (
            <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
                <div className="max-w-md text-center space-y-6 px-6">
                    <h2 className="text-lg font-semibold text-gray-900">{t('Pair EEG Device')}</h2>
                    {device ? (
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-green-800">{device.name}</p>
                                <p className="text-xs text-green-600">Connected ({device.type})</p>
                            </div>
                            <button onClick={() => { setTimeLeft(Math.ceil((baselineDuration > 0 ? baselineDuration : recordingDuration) / 1000)); setPhase(baselineDuration > 0 ? 'baseline' : 'viewing'); }} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">{t('Start Recording')}</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">{t('Turn on your EEG device and click the button below to pair.')}</p>
                            <button onClick={handlePair} disabled={pairing} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
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
                    <p className="text-white text-lg">{t('Close your eyes and relax')}</p>
                    <p className="text-gray-400 text-sm">{t('Recording baseline...')} {timeLeft}s</p>
                    <div className="w-64 mx-auto">{bandBarsEl}</div>
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
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 bg-black/40 rounded-lg p-2">
                    {bandBarsEl}
                    {latestSample && (
                        <div className="flex justify-between text-[10px] text-white/60 mt-1">
                            <span>Attention: {(latestSample.attentionIndex * 100).toFixed(0)}%</span>
                            <span>Meditation: {(latestSample.meditationIndex * 100).toFixed(0)}%</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
            <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-lg font-medium text-gray-900">{t('EEG recording complete')}</p>
            </div>
        </div>
    );
};

function avg(arr: number[]): number {
    return arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 1000) / 1000 : 0;
}
