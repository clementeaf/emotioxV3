import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModuleConfig } from '../../types/module';
import { useParticipantStore } from '../../stores/useParticipantStore';
import { getComponentText } from '../../utils/moduleComponent';
import { mediaService } from '../../services/media.service';
import { useBlazeGaze } from '../../hooks/useBlazeGaze';
import { useFaceLandmarks } from '../../hooks/useFaceLandmarks';
import { usePreviewMode } from '../../hooks/usePreviewMode';
import {
    BLAZE_GAZE_MEDIA_STREAM_CONSTRAINTS,
    HYBRID_CALIBRATION_FIELD_STRENGTH,
    HYBRID_IMAGE_CALIBRATION_POINTS,
    HYBRID_VALIDATION_POINT,
    HYBRID_RECALIBRATION_RMSE_THRESHOLD_PX,
    HYBRID_AOI_GRID,
    hybridApplyCalibrationField,
    hybridCalibrationRmsePx,
    hybridImagePercentToBlazeNorm,
    hybridPointToSoftZoneWeights,
    hybridCalibrationConfidenceWeightUv,
    expandGazeWithMinimumJerkGapFill,
    HYBRID_GAP_FILL_SYNTHETIC_WEIGHT,
    detectFixationsIDT,
    mapFixationsToImageCoords,
    extractEmotionFromFrame,
} from '../../lib/eyeTracking';
import type { HybridCalibrationResidual, EmotionSample } from '../../lib/eyeTracking';

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

/**
 * Phases:
 * intro → setup → preparing → calibration → validating → viewing → complete
 * If validation fails, loops back to calibration (re-calibrate).
 */
type ETPhase = 'intro' | 'setup' | 'preparing' | 'calibration' | 'validating' | 'viewing' | 'complete';

const TOTAL_STEPS = 3;

/** One-Euro params aligned with `/eye-tracking-hybrid` lab (calmer than BlazeGaze defaults). */
const EYE_TRACKING_ONE_EURO_MIN_CUTOFF = 0.8;
const EYE_TRACKING_ONE_EURO_BETA = 0.005;

const HYBRID_CALIB_POINT_COUNT = HYBRID_IMAGE_CALIBRATION_POINTS.length;

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

    // Detect video stimulus
    const isVideo = /\.(mp4|webm|ogg)$/i.test(stimulusUrl) || stimulusUrl.includes('video/');

    return { stimulusUrl, taskDescription, viewingDuration, displayMode, hasEmotionRecognition, hasAttentionMeasurement, isVideo };
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
    const { isPreviewMode } = usePreviewMode();

    const deviceType = useMemo(() => getDeviceType(), []);
    const isDesktop = deviceType === 'desktop';

    const { stimulusUrl, taskDescription, viewingDuration, hasEmotionRecognition, isVideo } = useMemo(() => extractConfig(module), [module]);

    const [phase, setPhase] = useState<ETPhase>('intro');
    const [resolvedUrl, setResolvedUrl] = useState<string>('');
    const [fixations, setFixations] = useState<Fixation[]>([]);
    const [timeLeft, setTimeLeft] = useState(Math.ceil(viewingDuration / 1000));
    const imgRef = useRef<HTMLImageElement>(null);
    const stimulusVideoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastClickRef = useRef<{ time: number } | null>(null);
    const savedRef = useRef(false);
    const fixationsRef = useRef<Fixation[]>([]);
    const naturalSizeRef = useRef<{ w: number; h: number } | null>(null);
    const completeTimerRef = useRef<number | null>(null);
    /** Snapshot of image bounding rect captured during viewing phase (before complete hides the image). */
    const viewingRectRef = useRef<DOMRect | null>(null);
    /** Timestamp when viewing phase started (for emotion sample elapsed time). */
    const viewingStartTimeRef = useRef<number>(0);
    const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
    const [finalPointCount, setFinalPointCount] = useState(0);

    // Setup checkboxes
    const [checks, setChecks] = useState([false, false, false, false]);
    const allChecked = checks.every(Boolean);

    /** 9-point calibration on stimulus image (3×3 grid) + IDW field. */
    const [calibrationIndex, setCalibrationIndex] = useState(0);
    const calibrationResidualsRef = useRef<HybridCalibrationResidual[]>([]);
    const calibrationRmsePxRef = useRef<number | null>(null);
    const gazePosRef = useRef<[number, number]>([0, 0]);
    /** Tracks how many times the participant has re-calibrated (validation failed). */
    const recalibrationCountRef = useRef(0);
    /** Validation RMSE at the off-grid point (null until validation completes). */
    const [validationRmse, setValidationRmse] = useState<number | null>(null);

    // --- BlazeGaze (desktop only) ---
    const videoRef = useRef<HTMLVideoElement>(null);
    const blaze = useBlazeGaze(videoRef, {
        oneEuroMinCutoff: EYE_TRACKING_ONE_EURO_MIN_CUTOFF,
        oneEuroBeta: EYE_TRACKING_ONE_EURO_BETA,
    });
    const gazePointsRef = useRef<{ x: number; y: number; t: number; videoTime?: number }[]>([]);

    // --- Face landmarks for FACS emotion recognition (desktop, parallel to BlazeGaze) ---
    const faceLandmarks = useFaceLandmarks({
        videoRef,
        enabled: isDesktop && hasEmotionRecognition,
        sampleIntervalMs: GAZE_POLL_MS,
    });
    /** Collected emotion samples during viewing phase. */
    const emotionSamplesRef = useRef<EmotionSample[]>([]);

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

    /** Keep latest smoothed gaze for hybrid calibration samples (desktop). */
    useEffect(() => {
        if (!blaze.gazePos) return;
        gazePosRef.current = [blaze.gazePos.x, blaze.gazePos.y];
    }, [blaze.gazePos]);

    // Gaze collection during viewing phase (desktop): RAF loop with 50ms throttle, IDW-corrected.
    // Also samples facial landmarks for FACS emotion recognition when enabled.
    // Matches hybrid page pattern: reads from gazePosRef (cached), uses Date.now() timestamps.
    useEffect(() => {
        if (phase !== 'viewing' || !isDesktop) return;

        // Start face landmark sampling alongside gaze
        if (hasEmotionRecognition) {
            emotionSamplesRef.current = [];
            viewingStartTimeRef.current = performance.now();
            faceLandmarks.start();
        }

        // Start video playback if video stimulus
        if (isVideo && stimulusVideoRef.current) {
            stimulusVideoRef.current.currentTime = 0;
            void stimulusVideoRef.current.play();
        }

        let raf = 0;
        let lastCollect = 0;
        const loop = () => {
            const [gx, gy] = gazePosRef.current;
            const now = Date.now();
            // Use stimulus element (video or image) for bounding rect
            const stimEl = isVideo ? stimulusVideoRef.current : imgRef.current;
            const rect = stimEl?.getBoundingClientRect();
            if (rect && rect.width > 0 && rect.height > 0 && blaze.gazeState === 'open' && now - lastCollect >= GAZE_POLL_MS) {
                const corrected = hybridApplyCalibrationField(
                    gx, gy, rect,
                    calibrationResidualsRef.current,
                    HYBRID_CALIBRATION_FIELD_STRENGTH,
                );
                const videoTime = isVideo && stimulusVideoRef.current ? stimulusVideoRef.current.currentTime : undefined;
                gazePointsRef.current.push({ x: corrected.x, y: corrected.y, t: now, videoTime });
                lastCollect = now;

                // Sample emotion from latest face landmarks (same frame cadence as gaze)
                if (hasEmotionRecognition) {
                    const frames = faceLandmarks.getFrames();
                    const latest = frames[frames.length - 1];
                    if (latest?.landmarks) {
                        const elapsed = performance.now() - viewingStartTimeRef.current;
                        const sample = extractEmotionFromFrame(latest.landmarks, Math.round(elapsed));
                        if (sample) emotionSamplesRef.current.push(sample);
                    }
                }
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(raf);
            if (hasEmotionRecognition) faceLandmarks.stop();
            if (isVideo && stimulusVideoRef.current) stimulusVideoRef.current.pause();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable RAF loop; live blaze.* reads via ref
    }, [phase, isDesktop, hasEmotionRecognition, isVideo]);

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
            // Snapshot stimulus rect before transitioning to complete (which hides the stimulus)
            const stimEl = isVideo ? stimulusVideoRef.current : imgRef.current;
            if (stimEl) {
                viewingRectRef.current = stimEl.getBoundingClientRect();
            }
            setFinalPointCount(isDesktop ? gazePointsRef.current.length : fixationsRef.current.length);
            setPhase('complete');
        }, viewingDuration);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [phase, viewingDuration, isDesktop]);

    // "Preparing" phase: start camera on desktop, reset hybrid calibration, auto-advance
    useEffect(() => {
        if (phase !== 'preparing') return;

        if (isDesktop) {
            void startCamera();
        }

        const timer = setTimeout(() => {
            setCalibrationIndex(0);
            calibrationResidualsRef.current = [];
            calibrationRmsePxRef.current = null;
            setPhase('calibration');
        }, 2000);
        return () => clearTimeout(timer);
    }, [phase, isDesktop, startCamera]);

    // Desktop: run BlazeGaze during calibration (gaze samples for IDW residuals) and through viewing
    useEffect(() => {
        if (phase !== 'calibration' || !isDesktop) return;
        blaze.start();
    }, [phase, isDesktop, blaze]);

    // Save results when complete
    useEffect(() => {
        if (phase === 'complete' && !savedRef.current) {
            savedRef.current = true;

            // Stop gaze tracking, face landmarks, and camera on desktop
            if (isDesktop) {
                blaze.stop();
                faceLandmarks.stop();
                stopCamera();
            }

            let calibrationQuality: string;

            // Compute zone-based heatmap (same approach as /eye-tracking-hybrid)
            const zoneMass: Record<string, number> = {};
            HYBRID_AOI_GRID.forEach(z => { zoneMass[z.id] = 0; });

            const stimEl = isVideo ? stimulusVideoRef.current : imgRef.current;
            const liveRect = stimEl?.getBoundingClientRect();
            const rect = (liveRect && liveRect.width > 0) ? liveRect : viewingRectRef.current;
            const natW = isVideo
                ? (stimulusVideoRef.current?.videoWidth || 1)
                : (naturalSizeRef.current?.w || imgRef.current?.naturalWidth || 1);
            const natH = isVideo
                ? (stimulusVideoRef.current?.videoHeight || 1)
                : (naturalSizeRef.current?.h || imgRef.current?.naturalHeight || 1);

            // Also compute fixations for backward compatibility
            let finalFixations: Fixation[];

            if (isDesktop && gazePointsRef.current.length > 0) {
                const residuals = calibrationResidualsRef.current;
                const effectiveRect = rect ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);

                // Gap fill: interpolate missing gaze during blinks/drops (same as hybrid page)
                const expanded = expandGazeWithMinimumJerkGapFill(gazePointsRef.current);

                // Zone mass from expanded gaze points with calibration confidence
                for (const pt of expanded) {
                    const u = effectiveRect.width > 0 ? (pt.x - effectiveRect.left) / effectiveRect.width : 0;
                    const v = effectiveRect.height > 0 ? (pt.y - effectiveRect.top) / effectiveRect.height : 0;
                    const baseConf = hybridCalibrationConfidenceWeightUv(u, v, residuals);
                    const conf = pt.interpolated ? baseConf * HYBRID_GAP_FILL_SYNTHETIC_WEIGHT : baseConf;
                    const soft = hybridPointToSoftZoneWeights(pt.x, pt.y, effectiveRect);
                    for (const z of HYBRID_AOI_GRID) {
                        zoneMass[z.id] += soft[z.id] * conf;
                    }
                }

                // I-DT fixations for backward compatibility
                const viewportFixations = detectFixationsIDT(gazePointsRef.current);
                if (effectiveRect.width > 0 && effectiveRect.height > 0) {
                    finalFixations = mapFixationsToImageCoords(viewportFixations, effectiveRect, natW, natH);
                } else {
                    finalFixations = viewportFixations;
                }
                calibrationQuality = `blazegaze-${blaze.calibrationCount}pt`;
            } else {
                // Click-proxy: compute zones from tap fixations
                const effectiveRect = rect ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
                for (const f of fixationsRef.current) {
                    // Convert image coords back to viewport for zone computation
                    const vpX = effectiveRect.left + (f.x / natW) * effectiveRect.width;
                    const vpY = effectiveRect.top + (f.y / natH) * effectiveRect.height;
                    const soft = hybridPointToSoftZoneWeights(vpX, vpY, effectiveRect);
                    for (const z of HYBRID_AOI_GRID) {
                        zoneMass[z.id] += soft[z.id];
                    }
                }
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
                zoneMass,
                calibrationQuality,
                integrityScore: isDesktop ? Math.min(gazePointsRef.current.length / 100, 1.0) : 1.0,
                trackingMethod: isDesktop ? 'blazegaze' : 'click-proxy',
                deviceType,
                gazePointCount: isDesktop ? gazePointsRef.current.length : undefined,
                fixationCount: isDesktop ? finalFixations.length : undefined,
                fixationMethod: isDesktop ? 'idt' : 'click-proxy',
                gazePipeline: isDesktop ? 'hybrid-zone-idt' : 'click-proxy',
                calibrationRmsePx: isDesktop ? calibrationRmsePxRef.current : undefined,
                emotions: hasEmotionRecognition ? emotionSamplesRef.current : undefined,
                stimulusType: isVideo ? 'video' : 'image',
                gazeTimeline: isVideo && isDesktop ? gazePointsRef.current.map(p => ({
                    x: p.x, y: p.y, t: p.t, videoTime: p.videoTime,
                })) : undefined,
            });
            saveResponse(module.id, 'eye-tracking-data', responseValue);

            completeTimerRef.current = window.setTimeout(() => {
                onComplete?.();
            }, 1200);
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

    /**
     * One click per dot: user LOOKS at the green dot and clicks anywhere.
     * BlazeGaze captures where the eyes are looking, not where the click lands.
     * Same approach as /eye-tracking-hybrid.
     */
    const handleCalibrationClick = useCallback(() => {
        if (phase !== 'calibration') return;
        const img = imgRef.current;
        if (!img) return;
        const pts = HYBRID_IMAGE_CALIBRATION_POINTS;
        const idx = calibrationIndex;
        if (idx >= pts.length) return;

        const rect = img.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const [ipx, ipy] = pts[idx];
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const targetX = rect.left + (ipx / 100) * rect.width;
        const targetY = rect.top + (ipy / 100) * rect.height;

        if (isDesktop) {
            const [gx, gy] = gazePosRef.current;
            calibrationResidualsRef.current.push({
                u: ipx / 100,
                v: ipy / 100,
                dx: targetX - gx,
                dy: targetY - gy,
            });
            const [normX, normY] = hybridImagePercentToBlazeNorm(rect, ipx, ipy, vw, vh);
            blaze.calibrate(normX, normY);
        }

        if (idx + 1 >= pts.length) {
            calibrationRmsePxRef.current = isDesktop
                ? hybridCalibrationRmsePx(calibrationResidualsRef.current)
                : null;
            if (isDesktop && !isPreviewMode) {
                setTimeout(() => setPhase('validating'), 400);
            } else {
                gazePointsRef.current = [];
                setTimeLeft(Math.ceil(viewingDuration / 1000));
                setTimeout(() => setPhase('viewing'), 600);
            }
        } else {
            setCalibrationIndex(idx + 1);
        }
    }, [phase, calibrationIndex, isDesktop, blaze, viewingDuration, isPreviewMode]);

    // Toggle a setup checkbox
    const toggleCheck = useCallback((index: number) => {
        setChecks(prev => {
            const next = [...prev];
            next[index] = !next[index];
            return next;
        });
    }, []);

    /**
     * Validation phase (desktop): show off-grid dot, user clicks while we measure
     * gaze error. If RMSE > threshold and max 2 retries not reached, offer re-calibration.
     */
    const handleValidationClick = useCallback(() => {
        if (phase !== 'validating') return;
        const img = imgRef.current;
        if (!img) return;
        const rect = img.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const [vpx, vpy] = HYBRID_VALIDATION_POINT;
        const targetX = rect.left + (vpx / 100) * rect.width;
        const targetY = rect.top + (vpy / 100) * rect.height;
        const [gx, gy] = gazePosRef.current;

        const errorPx = Math.sqrt((targetX - gx) ** 2 + (targetY - gy) ** 2);
        setValidationRmse(Math.round(errorPx));

        if (errorPx > HYBRID_RECALIBRATION_RMSE_THRESHOLD_PX && recalibrationCountRef.current < 2) {
            // Validation failed — will show re-calibrate option in UI
            return;
        }

        // Passed — proceed to viewing
        if (blaze) blaze.resetFrameStats();
        gazePointsRef.current = [];
        setTimeLeft(Math.ceil(viewingDuration / 1000));
        setValidationRmse(null);
        setTimeout(() => setPhase('viewing'), 400);
    }, [phase, blaze, viewingDuration]);

    /** Re-calibrate: reset residuals and go back to calibration phase. */
    const handleRecalibrate = useCallback(() => {
        recalibrationCountRef.current += 1;
        calibrationResidualsRef.current = [];
        calibrationRmsePxRef.current = null;
        setCalibrationIndex(0);
        setValidationRmse(null);
        setPhase('calibration');
    }, []);

    /** Skip validation and proceed to viewing (user chose to continue despite poor accuracy). */
    const handleSkipValidation = useCallback(() => {
        if (blaze) blaze.resetFrameStats();
        gazePointsRef.current = [];
        setTimeLeft(Math.ceil(viewingDuration / 1000));
        setValidationRmse(null);
        setTimeout(() => setPhase('viewing'), 400);
    }, [blaze, viewingDuration]);

    // -----------------------------------------------------------------------
    // Render helpers (phase content)
    // -----------------------------------------------------------------------

    const checkLabelsDesktop = [
        t('eyeTracking.check1', 'I am seated and will not move.'),
        t('eyeTracking.check2', 'My device is stable and at face level.'),
        t('eyeTracking.check3', 'My face is well lit, no backlight.'),
        t('eyeTracking.check4', 'No light-reflecting glasses on.'),
    ];
    const checkLabelsMobile = [
        t('eyeTracking.checkMobile1', 'I am holding my device comfortably and it is stable.'),
        t('eyeTracking.checkMobile2', 'I will tap where my attention goes on the image.'),
        t('eyeTracking.checkMobile3', 'I am in a quiet environment without distractions.'),
        t('eyeTracking.checkMobile4', 'I understand my taps will be recorded.'),
    ];
    const checkLabels = isDesktop ? checkLabelsDesktop : checkLabelsMobile;

    const calibrationPercent = Math.round(30 + (calibrationIndex / HYBRID_CALIB_POINT_COUNT) * 35);
    const calDotImagePct = phase === 'calibration'
        ? HYBRID_IMAGE_CALIBRATION_POINTS[calibrationIndex]
        : undefined;
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
                            <label key={idx} className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={checks[idx]}
                                    onChange={() => toggleCheck(idx)}
                                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
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
            <div
                className="fixed inset-0 z-50 flex items-center justify-center cursor-crosshair bg-black"
                onClick={handleCalibrationClick}
            >
                <div className="pointer-events-none absolute top-4 left-1/2 z-[70] -translate-x-1/2">
                    <StepProgressPill step={1} total={TOTAL_STEPS} percent={calibrationPercent} />
                </div>

                <div className="pointer-events-none absolute left-1/2 top-20 z-[70] max-w-lg -translate-x-1/2 px-4 text-center">
                    <p className="text-sm text-white/80">
                        {t(
                            'eyeTracking.calibrationHint4Point',
                            'Look at the green dot, then click anywhere.',
                        )}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                        {t('eyeTracking.pointOf', 'Point {{current}} of {{total}}', {
                            current: calibrationIndex + 1,
                            total: HYBRID_CALIB_POINT_COUNT,
                        })}
                    </p>
                </div>

                {resolvedUrl && (
                    <div className="relative">
                        <img
                            ref={imgRef}
                            src={resolvedUrl}
                            alt="Calibration"
                            className="max-w-[95vw] max-h-[95vh] object-contain"
                            style={{ filter: 'blur(12px)', opacity: 0.6 }}
                            draggable={false}
                            onLoad={handleImageLoad}
                        />
                        {calDotImagePct && (
                            <div
                                className="pointer-events-none absolute z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"
                                style={{ left: `${calDotImagePct[0]}%`, top: `${calDotImagePct[1]}%` }}
                            />
                        )}
                    </div>
                )}
            </div>
        );
    } else if (phase === 'validating') {
        const showRecalibrateOption = validationRmse !== null && validationRmse > HYBRID_RECALIBRATION_RMSE_THRESHOLD_PX;
        phaseContent = (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black"
                onClick={!showRecalibrateOption ? handleValidationClick : undefined}
                style={{ cursor: !showRecalibrateOption ? 'crosshair' : 'default' }}
            >
                <div className="pointer-events-none absolute top-4 left-1/2 z-[70] -translate-x-1/2">
                    <StepProgressPill step={1} total={TOTAL_STEPS} percent={68} />
                </div>

                <div className="pointer-events-none absolute left-1/2 top-20 z-[70] max-w-lg -translate-x-1/2 px-4 text-center">
                    {!showRecalibrateOption ? (
                        <p className="text-sm text-white/80">
                            {t('eyeTracking.validationHint', 'Look at the yellow dot and click anywhere to verify accuracy.')}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-amber-400 font-medium">
                                {t('eyeTracking.validationFailed', 'Calibration accuracy is low. Would you like to re-calibrate?')}
                            </p>
                            <div className="pointer-events-auto flex gap-3 justify-center">
                                <button
                                    onClick={handleRecalibrate}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                >
                                    {t('eyeTracking.recalibrate', 'Re-calibrate')}
                                </button>
                                <button
                                    onClick={handleSkipValidation}
                                    className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
                                >
                                    {t('eyeTracking.continueAnyway', 'Continue anyway')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {resolvedUrl && (
                    <div className="relative">
                        <img
                            ref={imgRef}
                            src={resolvedUrl}
                            alt="Validation"
                            className="max-w-[95vw] max-h-[95vh] object-contain"
                            style={{ filter: 'blur(12px)', opacity: 0.6 }}
                            draggable={false}
                            onLoad={handleImageLoad}
                        />
                        {!showRecalibrateOption && (
                            <div
                                className="pointer-events-none absolute z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse"
                                style={{ left: `${HYBRID_VALIDATION_POINT[0]}%`, top: `${HYBRID_VALIDATION_POINT[1]}%` }}
                            />
                        )}
                    </div>
                )}
            </div>
        );
    } else if (phase === 'viewing') {
        phaseContent = (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center select-none"
                style={{ backgroundImage: 'linear-gradient(rgb(235, 239, 251) 0%, rgb(245, 247, 253) 50%, rgb(255, 255, 255) 100%)' }}
            >
                <div className="pointer-events-none absolute top-4 left-1/2 z-[70] -translate-x-1/2">
                    <StepProgressPill step={2} total={TOTAL_STEPS} percent={viewingPercent} />
                </div>

                {/* Timer */}
                <div className="pointer-events-none absolute top-16 left-1/2 z-[70] -translate-x-1/2">
                    <span className={`text-lg font-mono font-bold ${
                        timeLeft <= 3 ? 'text-red-500' : 'text-gray-400'
                    }`}>
                        {timeLeft}s
                    </span>
                </div>

                {/* Stimulus container (image or video) */}
                <div
                    ref={containerRef}
                    className={`relative ${isDesktop ? '' : 'cursor-crosshair'}`}
                    onClick={handleImageInteraction}
                    onTouchStart={handleImageInteraction}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ touchAction: 'none' }}
                >
                    {isVideo ? (
                        <video
                            ref={stimulusVideoRef}
                            src={resolvedUrl}
                            className="max-w-[95vw] max-h-[95vh] object-contain"
                            muted
                            playsInline
                            preload="auto"
                            onLoadedMetadata={() => {
                                if (stimulusVideoRef.current) {
                                    const v = stimulusVideoRef.current;
                                    naturalSizeRef.current = { w: v.videoWidth, h: v.videoHeight };
                                    setNaturalSize({ w: v.videoWidth, h: v.videoHeight });
                                }
                            }}
                        />
                    ) : (
                        <img
                            ref={imgRef}
                            src={resolvedUrl}
                            alt="Stimulus"
                            className="max-w-[95vw] max-h-[95vh] object-contain"
                            draggable={false}
                            onLoad={handleImageLoad}
                        />
                    )}
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
                    <p className="pointer-events-none absolute bottom-6 left-1/2 z-[70] -translate-x-1/2 text-xs text-gray-400">
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
