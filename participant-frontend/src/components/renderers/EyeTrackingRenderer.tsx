import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModuleConfig } from '../../types/module';
import { useParticipantStore } from '../../stores/useParticipantStore';
import { getComponentText } from '../../utils/moduleComponent';
import { mediaService } from '../../services/media.service';
import { useBlazeGaze } from '../../hooks/useBlazeGaze';
import { BLAZE_GAZE_MEDIA_STREAM_CONSTRAINTS } from '../../lib/eyeTracking';

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

// Gaze collection polling interval (ms)
const GAZE_POLL_MS = 50;

// ---------------------------------------------------------------------------
// Device detection
// ---------------------------------------------------------------------------

function getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('ipad') || (ua.includes('tablet') && !ua.includes('mobile'))) return 'tablet';
    if (/android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return 'mobile';
    return 'desktop';
}

// ---------------------------------------------------------------------------
// Config extraction (mirrors backend)
// ---------------------------------------------------------------------------

const extractConfig = (module: ModuleConfig) => {
    const components = module.structure?.components || [];

    // Stimulus URL — canonical ID: 'stimuli', fallback to any file-upload
    let stimulusUrl = '';
    const fileUploadComp = components.find(c =>
        c.id === 'stimuli' || c.type === 'file-upload' || c.id === 'stimulus-image' || c.id === 'image' || c.id === 'stimulus'
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

    // Task description — canonical ID: 'task-instructions'
    let taskDescription = '';
    const descComp = components.find(c =>
        c.id === 'task-instructions' || c.id === 'task-description' || c.id === 'question-title' || c.id === 'description'
    );
    if (descComp) {
        taskDescription = getComponentText(descComp) || descComp.placeholder?.text || '';
    }

    // Viewing duration — canonical ID: 'priming-time' (value in seconds, convert to ms)
    let viewingDuration = 10000;
    const durationComp = components.find(c =>
        c.id === 'priming-time' || c.id === 'viewing-duration' || c.id === 'duration' || c.id === 'exposure-time'
    );
    if (durationComp) {
        const raw = getComponentText(durationComp);
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed) && parsed > 0) {
            // priming-time stores seconds (5, 10, 15, 20, 30); legacy stores ms
            viewingDuration = parsed <= 60 ? parsed * 1000 : parsed;
        }
    }

    // Display mode — canonical ID: 'display-mode'
    let displayMode: 'stand_alone' | 'shelf' = 'stand_alone';
    const modeComp = components.find(c => c.id === 'display-mode');
    if (modeComp) {
        const val = getComponentText(modeComp).toLowerCase();
        if (val === 'shelf') displayMode = 'shelf';
    }

    // Feature toggles
    const emotionRecognition = components.find(c => c.id === 'emotion-recognition');
    const hasEmotionRecognition = emotionRecognition ? getComponentText(emotionRecognition) === 'true' : true;

    const attentionMeasurement = components.find(c => c.id === 'attention-measurement');
    const hasAttentionMeasurement = attentionMeasurement ? getComponentText(attentionMeasurement) === 'true' : true;

    return { stimulusUrl, taskDescription, viewingDuration, displayMode, hasEmotionRecognition, hasAttentionMeasurement };
};

// ---------------------------------------------------------------------------
// Step progress pill
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

    const deviceType = useMemo(() => getDeviceType(), []);
    const isDesktop = deviceType === 'desktop';

    const { stimulusUrl, taskDescription, viewingDuration } = useMemo(() => extractConfig(module), [module]);

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
    const [finalPointCount, setFinalPointCount] = useState(0);

    // Setup checkboxes
    const [checks, setChecks] = useState([false, false, false, false]);
    const allChecked = checks.every(Boolean);

    // Calibration state
    const [calibrationPoints, setCalibrationPoints] = useState<CalibrationPoint[]>(
        CALIBRATION_POINTS.map(p => ({ ...p, completed: false }))
    );
    const [activeCalibrationPoint, setActiveCalibrationPoint] = useState<number | null>(null);
    const calibrationCompleted = calibrationPoints.every(p => p.completed);

    // --- BlazeGaze (desktop only) ---
    const videoRef = useRef<HTMLVideoElement>(null);
    const blaze = useBlazeGaze(videoRef);
    const gazePointsRef = useRef<{ x: number; y: number; t: number }[]>([]);

    // Camera management
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(BLAZE_GAZE_MEDIA_STREAM_CONSTRAINTS);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
        } catch (err) {
            console.error('[EyeTrackingRenderer] Camera error:', err);
        }
    }, []);

    const stopCamera = useCallback(() => {
        const video = videoRef.current;
        if (video?.srcObject) {
            (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            video.srcObject = null;
        }
    }, []);

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

    // Gaze collection during viewing phase (desktop with BlazeGaze)
    useEffect(() => {
        if (phase !== 'viewing' || !isDesktop) return;
        const interval = setInterval(() => {
            if (blaze.gazePos && blaze.gazeState === 'open') {
                gazePointsRef.current.push({
                    x: blaze.gazePos.x,
                    y: blaze.gazePos.y,
                    t: performance.now(),
                });
            }
        }, GAZE_POLL_MS);
        return () => clearInterval(interval);
    }, [phase, isDesktop, blaze.gazePos, blaze.gazeState]);

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
            setFinalPointCount(isDesktop ? gazePointsRef.current.length : fixationsRef.current.length);
            setPhase('complete');
        }, viewingDuration);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [phase, viewingDuration]);

    // "Preparing" phase: start camera on desktop, auto-advance
    useEffect(() => {
        if (phase !== 'preparing') return;

        if (isDesktop) {
            void startCamera();
        }

        const timer = setTimeout(() => setPhase('calibration'), 2000);
        return () => clearTimeout(timer);
    }, [phase, isDesktop, startCamera]);

    // Auto-advance from calibration to viewing when all points clicked
    useEffect(() => {
        if (phase === 'calibration' && calibrationCompleted) {
            if (isDesktop) {
                // Start BlazeGaze tracking loop before viewing
                blaze.start();
            }
            const timer = setTimeout(() => setPhase('viewing'), 600);
            return () => clearTimeout(timer);
        }
    }, [phase, calibrationCompleted, isDesktop, blaze]);

    // Save results when complete
    useEffect(() => {
        if (phase === 'complete' && !savedRef.current) {
            savedRef.current = true;

            // Stop gaze tracking and camera on desktop
            if (isDesktop) {
                blaze.stop();
                stopCamera();
            }

            let finalFixations: Fixation[];
            let calibrationQuality: string;

            if (isDesktop && gazePointsRef.current.length > 0) {
                // Convert gaze screen points to image-relative fixations
                const img = imgRef.current;
                const rect = img?.getBoundingClientRect();
                const natW = naturalSizeRef.current?.w || img?.naturalWidth || 1;
                const natH = naturalSizeRef.current?.h || img?.naturalHeight || 1;

                finalFixations = gazePointsRef.current
                    .filter(pt => {
                        // Only include points that fall on the image
                        if (!rect) return false;
                        return pt.x >= rect.left && pt.x <= rect.right &&
                               pt.y >= rect.top && pt.y <= rect.bottom;
                    })
                    .map((pt, i, arr) => {
                        const relX = (pt.x - (rect?.left || 0)) / (rect?.width || 1);
                        const relY = (pt.y - (rect?.top || 0)) / (rect?.height || 1);
                        const duration = i < arr.length - 1
                            ? Math.round(arr[i + 1].t - pt.t)
                            : GAZE_POLL_MS;
                        return {
                            x: Math.round(relX * natW),
                            y: Math.round(relY * natH),
                            duration: Math.min(duration, 5000),
                            timestamp: Math.round(pt.t),
                        };
                    });
                calibrationQuality = `blazegaze-${blaze.calibrationCount}pt`;
            } else {
                // Fallback: click-proxy fixations
                finalFixations = fixationsRef.current;
                calibrationQuality = 'click-proxy';
            }

            const responseValue = JSON.stringify({
                fixations: finalFixations.map(f => ({
                    x: f.x,
                    y: f.y,
                    duration: f.duration,
                    timestamp: f.timestamp,
                })),
                calibrationQuality,
                integrityScore: isDesktop ? Math.min(gazePointsRef.current.length / 100, 1.0) : 1.0,
                trackingMethod: isDesktop ? 'blazegaze' : 'click-proxy',
                deviceType,
                gazePointCount: isDesktop ? gazePointsRef.current.length : undefined,
            });
            saveResponse(module.id, 'eye-tracking-data', responseValue);

            const timer = setTimeout(() => onComplete?.(), 1200);
            return () => clearTimeout(timer);
        }
    }, [phase, module.id, saveResponse, onComplete, isDesktop, blaze, stopCamera, deviceType]);

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

    // Click/tap proxy for mobile/tablet during viewing
    const handleImageInteraction = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (phase !== 'viewing' || !imgRef.current) return;
        // Desktop uses BlazeGaze — skip click capture
        if (isDesktop) return;

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
    }, [phase, isDesktop]);

    // Handle calibration point click — feeds BlazeGaze on desktop
    const handleCalibrationClick = useCallback((pointId: number) => {
        const point = CALIBRATION_POINTS.find(p => p.id === pointId);
        if (!point) return;

        if (isDesktop) {
            // Feed BlazeGaze normalized coords (0,0 = center, range -0.5 to 0.5)
            const normX = (point.x / 100) - 0.5;
            const normY = (point.y / 100) - 0.5;
            blaze.calibrate(normX, normY);
        }

        setActiveCalibrationPoint(pointId);
        setTimeout(() => {
            setCalibrationPoints(prev =>
                prev.map(p => p.id === pointId ? { ...p, completed: true } : p)
            );
            setActiveCalibrationPoint(null);
        }, 300);
    }, [isDesktop, blaze]);

    // Toggle a setup checkbox
    const toggleCheck = useCallback((index: number) => {
        setChecks(prev => {
            const next = [...prev];
            next[index] = !next[index];
            return next;
        });
    }, []);

    // -----------------------------------------------------------------------
    // Render helpers (phase content)
    // -----------------------------------------------------------------------

    const checkLabelsDesktop = [
        t('eyeTracking.check1', 'I am sitting comfortably in front of my camera and will not lie down, stand, nor move out of position.'),
        t('eyeTracking.check2', 'My device is stable and on the same level as my face.'),
        t('eyeTracking.check3', 'My face is well lit with no bright light behind me or from my side.'),
        t('eyeTracking.check4', 'I will not wear glasses, unless they are required for vision. If they are required, they are not reflecting light and my eyes are clearly visible.'),
    ];
    const checkLabelsMobile = [
        t('eyeTracking.checkMobile1', 'I am holding my device comfortably and it is stable.'),
        t('eyeTracking.checkMobile2', 'I will focus on the image and tap where my attention goes.'),
        t('eyeTracking.checkMobile3', 'I am in a quiet environment without distractions.'),
        t('eyeTracking.checkMobile4', 'I understand my taps will be recorded as attention points.'),
    ];
    const checkLabels = isDesktop ? checkLabelsDesktop : checkLabelsMobile;

    const completedCount = calibrationPoints.filter(p => p.completed).length;
    const calibrationPercent = Math.round(30 + (completedCount / calibrationPoints.length) * 35);
    const viewingPercent = Math.round(65 + (1 - timeLeft / Math.ceil(viewingDuration / 1000)) * 35);
    // pointCount: use state (set in save effect) to avoid reading ref during render

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
    // Main render — persistent <video> + phase content
    // -----------------------------------------------------------------------

    let phaseContent: React.ReactNode = null;

    if (phase === 'intro') {
        phaseContent = (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
                <div className="w-full max-w-lg space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">
                        {t('eyeTracking.introTitle', 'In this section')}
                    </h2>
                    {taskDescription && (
                        <p className="text-gray-600">{taskDescription}</p>
                    )}
                    <p className="text-gray-600">
                        {isDesktop
                            ? t('eyeTracking.introDescriptionDesktop', 'Your eye movements will be tracked using your webcam to understand what catches your attention.')
                            : t('eyeTracking.introDescription', 'You will be presented with images. Tap on the areas that catch your attention.')}
                    </p>
                    {isDesktop && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>{t('eyeTracking.webcamRequired', 'Webcam access will be required')}</span>
                        </div>
                    )}
                    {isDesktop && !blaze.isLoaded && (
                        <p className="text-amber-600 text-xs">{t('eyeTracking.loadingModel', 'Loading gaze model...')}</p>
                    )}
                    <button
                        onClick={() => setPhase('setup')}
                        disabled={isDesktop && !blaze.isLoaded}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isDesktop && !blaze.isLoaded
                            ? t('eyeTracking.loading', 'Loading...')
                            : t('eyeTracking.next', 'Next')}
                    </button>
                </div>
            </div>
        );
    } else if (phase === 'setup') {
        phaseContent = (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
                <StepProgressPill step={1} total={TOTAL_STEPS} percent={30} />

                <div className="w-full max-w-lg space-y-6 mt-8">
                    {/* Camera preview placeholder */}
                    <div className="w-40 h-32 bg-gray-800 rounded-lg mx-auto flex items-center justify-center overflow-hidden">
                        {isDesktop ? (
                            <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        ) : (
                            <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                            </svg>
                        )}
                    </div>

                    <h2 className="text-xl font-bold text-gray-900">
                        {t('eyeTracking.setupTitle', 'To continue')}
                    </h2>
                    <p className="text-gray-500 text-sm">
                        {t('eyeTracking.setupSubtitle', 'Please confirm that you meet all of the requirements mentioned below by ticking each of the checkboxes.')}
                    </p>

                    {/* Checkboxes */}
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
    } else if (phase === 'preparing') {
        phaseContent = (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
                <StepProgressPill step={1} total={TOTAL_STEPS} percent={30} />

                <div className="mt-12 text-center space-y-4">
                    <h2 className="text-xl font-bold text-gray-900">
                        {isDesktop
                            ? t('eyeTracking.preparingCamera', 'Starting camera...')
                            : t('eyeTracking.preparing', 'Preparing session...')}
                    </h2>
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
            </div>
        );
    } else if (phase === 'calibration') {
        phaseContent = (
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
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        ) : activeCalibrationPoint === point.id ? (
                            <div className="w-8 h-8 rounded-full bg-red-400 animate-ping" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-400 transition-colors cursor-pointer shadow-md" />
                        )}
                    </button>
                ))}
            </div>
        );
    } else if (phase === 'viewing') {
        phaseContent = (
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
                    className={`relative max-w-full ${isDesktop ? '' : 'cursor-crosshair'}`}
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
                    {/* Click indicators (mobile/tablet only — desktop is silent) */}
                    {!isDesktop && fixations.map((fix, idx) => {
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

                {!isDesktop && (
                    <p className="mt-3 text-xs text-gray-400">
                        {t('eyeTracking.clicks', '{{count}} points recorded', {
                            count: fixations.length,
                        })}
                    </p>
                )}
            </div>
        );
    } else if (phase === 'complete') {
        phaseContent = (
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
                        {isDesktop
                            ? t('eyeTracking.gazePointsRecorded', '{{count}} gaze samples recorded.', { count: finalPointCount })
                            : t('eyeTracking.pointsRecorded', '{{count}} attention points recorded.', { count: finalPointCount })}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Persistent hidden video — never unmounts across phases */}
            {isDesktop && <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />}
            {phaseContent}
        </>
    );
};
