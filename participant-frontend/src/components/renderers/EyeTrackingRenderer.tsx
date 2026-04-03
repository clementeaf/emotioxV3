import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModuleConfig } from '../../types/module';
import { useParticipantStore } from '../../stores/useParticipantStore';
import { getComponentText } from '../../utils/moduleComponent';
import { mediaService } from '../../services/media.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EyeTrackingRendererProps {
    module: ModuleConfig;
    onComplete?: () => void;
}

interface Fixation {
    x: number;
    y: number;
    duration: number;
    timestamp: number;
}

interface CalibrationPoint {
    id: number;
    x: number; // percentage
    y: number; // percentage
    completed: boolean;
}

/**
 * Phases:
 * intro → setup → preparing → calibration → viewing → complete
 */
type ETPhase = 'intro' | 'setup' | 'preparing' | 'calibration' | 'viewing' | 'complete';

const TOTAL_STEPS = 3;

// 9-point calibration grid (3x3) — positions as % of viewport
const CALIBRATION_POINTS: Omit<CalibrationPoint, 'completed'>[] = [
    { id: 0, x: 5, y: 8 },   { id: 1, x: 50, y: 8 },   { id: 2, x: 95, y: 8 },
    { id: 3, x: 5, y: 50 },  { id: 4, x: 50, y: 50 },  { id: 5, x: 95, y: 50 },
    { id: 6, x: 5, y: 92 },  { id: 7, x: 50, y: 92 },  { id: 8, x: 95, y: 92 },
];

// ---------------------------------------------------------------------------
// Config extraction (mirrors backend)
// ---------------------------------------------------------------------------

const extractConfig = (module: ModuleConfig) => {
    const components = module.structure?.components || [];

    let stimulusUrl = '';
    const fileUploadComp = components.find(c =>
        c.type === 'file-upload' || c.id === 'stimulus-image' || c.id === 'image' || c.id === 'stimulus'
    );
    if (fileUploadComp) {
        const raw = getComponentText(fileUploadComp);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const first = parsed[0] as { s3Key?: string; url?: string };
                    stimulusUrl = first.s3Key || first.url || '';
                } else if (typeof parsed === 'string') {
                    stimulusUrl = parsed;
                }
            } catch {
                stimulusUrl = raw;
            }
        }
    }

    let modality: 'stand_alone' | 'shelf' = 'stand_alone';
    const modalityComp = components.find(c =>
        c.id === 'modality' || c.id === 'test-mode' || c.id === 'display-mode'
    );
    if (modalityComp) {
        const val = getComponentText(modalityComp).toLowerCase();
        if (val.includes('shelf')) modality = 'shelf';
    }

    let taskDescription = '';
    const descComp = components.find(c =>
        c.id === 'task-description' || c.id === 'question-title' || c.id === 'description'
    );
    if (descComp) {
        taskDescription = getComponentText(descComp) || descComp.placeholder?.text || '';
    }

    let viewingDuration = 10000;
    const durationComp = components.find(c =>
        c.id === 'viewing-duration' || c.id === 'duration' || c.id === 'exposure-time'
    );
    if (durationComp) {
        const parsed = parseInt(getComponentText(durationComp), 10);
        if (!isNaN(parsed) && parsed > 0) viewingDuration = parsed;
    }

    return { stimulusUrl, modality, taskDescription, viewingDuration };
};

// ---------------------------------------------------------------------------
// Step progress pill (shared with IAT)
// ---------------------------------------------------------------------------

const StepProgressPill: React.FC<{ step: number; total: number; percent: number }> = ({ step, total, percent }) => (
    <div className="inline-flex items-center gap-3 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium">
        <span>Step {step} of {total}</span>
        <div className="w-24 h-1.5 bg-blue-400 rounded-full overflow-hidden">
            <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${Math.min(percent, 100)}%` }}
            />
        </div>
        <span>{Math.min(percent, 100)}%</span>
    </div>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const EyeTrackingRenderer: React.FC<EyeTrackingRendererProps> = ({ module, onComplete }) => {
    const { t } = useTranslation();
    const { saveResponse } = useParticipantStore();

    const { stimulusUrl, taskDescription, viewingDuration } = useMemo(
        () => extractConfig(module),
        [module]
    );

    const [phase, setPhase] = useState<ETPhase>('intro');
    const [resolvedUrl, setResolvedUrl] = useState<string>('');
    const [fixations, setFixations] = useState<Fixation[]>([]);
    const [timeLeft, setTimeLeft] = useState(Math.ceil(viewingDuration / 1000));
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastClickRef = useRef<{ time: number } | null>(null);
    const savedRef = useRef(false);
    const fixationsRef = useRef<Fixation[]>([]);
    const naturalSizeRef = useRef<{ w: number; h: number } | null>(null);
    const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

    // Setup checkboxes
    const [checks, setChecks] = useState([false, false, false, false]);
    const allChecked = checks.every(Boolean);

    // Calibration state
    const [calibrationPoints, setCalibrationPoints] = useState<CalibrationPoint[]>(
        CALIBRATION_POINTS.map(p => ({ ...p, completed: false }))
    );
    const [activeCalibrationPoint, setActiveCalibrationPoint] = useState<number | null>(null);
    const calibrationCompleted = calibrationPoints.every(p => p.completed);

    // Resolve stimulus URL
    useEffect(() => {
        if (!stimulusUrl) return;
        let cancelled = false;

        const resolve = async () => {
            try {
                if (stimulusUrl.startsWith('/') || (!stimulusUrl.startsWith('http') && !stimulusUrl.startsWith('blob'))) {
                    const url = await mediaService.getMediaUrl(stimulusUrl);
                    if (!cancelled) setResolvedUrl(url);
                } else {
                    if (!cancelled) setResolvedUrl(stimulusUrl);
                }
            } catch {
                if (!cancelled) setResolvedUrl(stimulusUrl);
            }
        };

        resolve();
        return () => { cancelled = true; };
    }, [stimulusUrl]);

    // Countdown timer during viewing phase
    useEffect(() => {
        if (phase !== 'viewing') return;

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        const timeout = setTimeout(() => {
            setPhase('complete');
        }, viewingDuration);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [phase, viewingDuration]);

    // "Preparing" phase auto-advance after 2s
    useEffect(() => {
        if (phase !== 'preparing') return;
        const timer = setTimeout(() => setPhase('calibration'), 2000);
        return () => clearTimeout(timer);
    }, [phase]);

    // Auto-advance from calibration to viewing when all points clicked
    useEffect(() => {
        if (phase === 'calibration' && calibrationCompleted) {
            const timer = setTimeout(() => setPhase('viewing'), 600);
            return () => clearTimeout(timer);
        }
    }, [phase, calibrationCompleted]);

    // Save results when complete
    useEffect(() => {
        if (phase === 'complete' && !savedRef.current) {
            savedRef.current = true;
            const finalFixations = fixationsRef.current;
            const responseValue = JSON.stringify({
                fixations: finalFixations.map(f => ({
                    x: f.x,
                    y: f.y,
                    duration: f.duration,
                    timestamp: f.timestamp,
                })),
                calibrationQuality: 'click-proxy',
                integrityScore: 1.0,
            });
            saveResponse(module.id, 'eye-tracking-data', responseValue);

            const timer = setTimeout(() => onComplete?.(), 1200);
            return () => clearTimeout(timer);
        }
    }, [phase, module.id, saveResponse, onComplete]);

    const handleImageLoad = useCallback(() => {
        if (imgRef.current) {
            const size = {
                w: imgRef.current.naturalWidth,
                h: imgRef.current.naturalHeight,
            };
            naturalSizeRef.current = size;
            setNaturalSize(size);
        }
    }, []);

    const handleImageInteraction = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (phase !== 'viewing' || !imgRef.current) return;

        const img = imgRef.current;
        const rect = img.getBoundingClientRect();
        const naturalW = naturalSizeRef.current?.w || img.naturalWidth || rect.width;
        const naturalH = naturalSizeRef.current?.h || img.naturalHeight || rect.height;

        let clientX: number;
        let clientY: number;

        if ('touches' in e) {
            const touch = e.touches[0] || (e as React.TouchEvent).changedTouches[0];
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const relX = (clientX - rect.left) / rect.width;
        const relY = (clientY - rect.top) / rect.height;
        const x = Math.round(relX * naturalW);
        const y = Math.round(relY * naturalH);

        const now = performance.now();
        const duration = lastClickRef.current
            ? Math.round(now - lastClickRef.current.time)
            : 200;

        lastClickRef.current = { time: now };

        const newFixation: Fixation = {
            x,
            y,
            duration: Math.min(duration, 5000),
            timestamp: Math.round(now),
        };

        setFixations(prev => {
            const next = [...prev, newFixation];
            fixationsRef.current = next;
            return next;
        });
    }, [phase]);

    // Handle calibration point click
    const handleCalibrationClick = useCallback((pointId: number) => {
        setActiveCalibrationPoint(pointId);
        // Brief feedback before marking as completed
        setTimeout(() => {
            setCalibrationPoints(prev =>
                prev.map(p => p.id === pointId ? { ...p, completed: true } : p)
            );
            setActiveCalibrationPoint(null);
        }, 300);
    }, []);

    // Toggle a setup checkbox
    const toggleCheck = useCallback((index: number) => {
        setChecks(prev => {
            const next = [...prev];
            next[index] = !next[index];
            return next;
        });
    }, []);

    // -----------------------------------------------------------------------
    // Unconfigured
    // -----------------------------------------------------------------------

    if (!stimulusUrl) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
                <p className="text-gray-400 text-center">
                    {t('eyeTracking.notConfigured', 'This eye tracking test has not been configured yet.')}
                </p>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Phase: intro — "In this section"
    // -----------------------------------------------------------------------

    if (phase === 'intro') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
                <div className="w-full max-w-lg space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">
                        {t('eyeTracking.introTitle', 'In this section')}
                    </h2>
                    {taskDescription && (
                        <p className="text-gray-600">{taskDescription}</p>
                    )}
                    <p className="text-gray-600">
                        {t('eyeTracking.introDescription', 'You will be presented with images. Your eye movements will be tracked to understand what catches your attention.')}
                    </p>
                    <p className="text-gray-600">
                        {t('eyeTracking.introSpeed', 'Try to look naturally at the content presented on screen.')}
                    </p>
                    <button
                        onClick={() => setPhase('setup')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        {t('eyeTracking.next', 'Next')}
                    </button>
                </div>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Phase: setup — camera preview placeholder + 4 checkboxes + "Ready"
    // -----------------------------------------------------------------------

    if (phase === 'setup') {
        const checkLabels = [
            t('eyeTracking.check1', 'I am sitting comfortably in front of my camera and will not lie down, stand, nor move out of position.'),
            t('eyeTracking.check2', 'My device is stable and on the same level as my face.'),
            t('eyeTracking.check3', 'My face is well lit with no bright light behind me or from my side.'),
            t('eyeTracking.check4', 'I will not wear glasses, unless they are required for vision. If they are required, they are not reflecting light and my eyes are clearly visible.'),
        ];

        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
                <StepProgressPill step={1} total={TOTAL_STEPS} percent={30} />

                <div className="w-full max-w-lg space-y-6 mt-8">
                    {/* Camera preview placeholder */}
                    <div className="w-40 h-32 bg-gray-800 rounded-lg mx-auto flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                    </div>

                    <h2 className="text-xl font-bold text-gray-900">
                        {t('eyeTracking.setupTitle', 'To continue')}
                    </h2>
                    <p className="text-gray-500 text-sm">
                        {t('eyeTracking.setupSubtitle', 'Please confirm that you meet all of the requirements mentioned below by ticking each of the checkboxes.')}
                    </p>

                    {/* 4 checkboxes */}
                    <div className="space-y-4">
                        {checkLabels.map((label, idx) => (
                            <label key={idx} className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={checks[idx]}
                                    onChange={() => toggleCheck(idx)}
                                    className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">{label}</span>
                            </label>
                        ))}
                    </div>

                    <button
                        onClick={() => setPhase('preparing')}
                        disabled={!allChecked}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {t('eyeTracking.ready', 'Ready')}
                    </button>
                </div>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Phase: preparing — brief loading screen
    // -----------------------------------------------------------------------

    if (phase === 'preparing') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
                <StepProgressPill step={1} total={TOTAL_STEPS} percent={30} />

                <div className="mt-12 text-center space-y-4">
                    <h2 className="text-xl font-bold text-gray-900">
                        {t('eyeTracking.preparing', 'Preparing eye tracking session...')}
                    </h2>
                    {/* Simple spinner */}
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Phase: calibration — 9 red points grid
    // -----------------------------------------------------------------------

    if (phase === 'calibration') {
        const completedCount = calibrationPoints.filter(p => p.completed).length;
        const calibrationPercent = Math.round(30 + (completedCount / calibrationPoints.length) * 35);

        return (
            <div className="relative w-full min-h-[400px]" style={{ height: '80vh' }}>
                {/* Progress pill */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                    <StepProgressPill step={1} total={TOTAL_STEPS} percent={calibrationPercent} />
                </div>

                {/* Instruction text */}
                {completedCount === 0 && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 text-center">
                        <p className="text-sm text-gray-500">
                            {t('eyeTracking.calibrationHint', 'Look at each red point and click on it')}
                        </p>
                    </div>
                )}

                {/* 9 calibration points */}
                {calibrationPoints.map(point => (
                    <button
                        key={point.id}
                        onClick={() => !point.completed && handleCalibrationClick(point.id)}
                        disabled={point.completed}
                        className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
                        style={{
                            left: `${point.x}%`,
                            top: `${point.y}%`,
                        }}
                    >
                        {point.completed ? (
                            // Green check circle
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        ) : activeCalibrationPoint === point.id ? (
                            // Active/pulsing state
                            <div className="w-8 h-8 rounded-full bg-red-400 animate-ping" />
                        ) : (
                            // Red dot
                            <div className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-400 transition-colors cursor-pointer shadow-md" />
                        )}
                    </button>
                ))}
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Phase: viewing — stimulus image with click tracking
    // -----------------------------------------------------------------------

    if (phase === 'viewing') {
        const viewingPercent = Math.round(65 + (1 - timeLeft / Math.ceil(viewingDuration / 1000)) * 35);

        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-2 py-4 select-none">
                <StepProgressPill step={2} total={TOTAL_STEPS} percent={viewingPercent} />

                {/* Timer */}
                <div className="mt-4 mb-3 text-center">
                    <span className={`text-lg font-mono font-bold ${
                        timeLeft <= 3 ? 'text-red-500' : 'text-gray-500'
                    }`}>
                        {timeLeft}s
                    </span>
                </div>

                {/* Stimulus image container */}
                <div
                    ref={containerRef}
                    className="relative cursor-crosshair max-w-full"
                    onClick={handleImageInteraction}
                    onTouchStart={handleImageInteraction}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ touchAction: 'none' }}
                >
                    <img
                        ref={imgRef}
                        src={resolvedUrl}
                        alt="Stimulus"
                        className="max-w-full max-h-[70vh] object-contain rounded-lg"
                        draggable={false}
                        onLoad={handleImageLoad}
                    />
                    {/* Click indicators */}
                    {fixations.map((fix, idx) => {
                        const natW = naturalSize?.w || 1;
                        const natH = naturalSize?.h || 1;
                        const left = (fix.x / natW) * 100;
                        const top = (fix.y / natH) * 100;
                        return (
                            <div
                                key={idx}
                                className="absolute w-4 h-4 rounded-full bg-blue-500 bg-opacity-40 border-2 border-blue-400 pointer-events-none"
                                style={{
                                    left: `${left}%`,
                                    top: `${top}%`,
                                    transform: 'translate(-50%, -50%)',
                                }}
                            />
                        );
                    })}
                </div>

                <p className="mt-3 text-xs text-gray-400">
                    {t('eyeTracking.clicks', '{{count}} points recorded', {
                        count: fixations.length,
                    })}
                </p>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Phase: complete
    // -----------------------------------------------------------------------

    if (phase === 'complete') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
                <StepProgressPill step={3} total={TOTAL_STEPS} percent={100} />

                <div className="mt-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-700">
                        {t('eyeTracking.complete', 'Test completed. Thank you!')}
                    </p>
                    <p className="text-sm text-gray-500">
                        {t('eyeTracking.pointsRecorded', '{{count}} attention points recorded.', {
                            count: fixations.length,
                        })}
                    </p>
                </div>
            </div>
        );
    }

    return null;
};
