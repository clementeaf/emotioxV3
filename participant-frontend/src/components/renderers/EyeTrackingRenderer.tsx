import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParticipantStore } from '../../stores/useParticipantStore';
import { mediaService } from '../../services/media.service';
import { useBlazeGaze } from '../../hooks/useBlazeGaze';
import { useFaceApiEmotions } from '../../hooks/useFaceApiEmotions';
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
    MICRO_RECALIB_INTERVAL_MS,
    MICRO_RECALIB_SAMPLE_DURATION_MS,
    MICRO_RECALIB_SAMPLE_COUNT,
    MICRO_RECALIB_POSITIONS,
    computeMicroRecalibResidual,
} from '../../lib/eyeTracking';
import type { HybridCalibrationResidual } from '../../lib/eyeTracking';

import type { EyeTrackingRendererProps, ETPhase, Fixation } from './eye-tracking/types';
import {
    EYE_TRACKING_ONE_EURO_MIN_CUTOFF,
    EYE_TRACKING_ONE_EURO_BETA,
    GAZE_POLL_MS,
    getDeviceType,
    extractConfig,
} from './eye-tracking/types';

import { IntroPhase } from './eye-tracking/IntroPhase';
import { SetupPhase } from './eye-tracking/SetupPhase';
import { PreparingPhase } from './eye-tracking/PreparingPhase';
import { CalibrationPhase } from './eye-tracking/CalibrationPhase';
import { ValidationPhase } from './eye-tracking/ValidationPhase';
import { ViewingPhase } from './eye-tracking/ViewingPhase';
import { CompletePhase } from './eye-tracking/CompletePhase';

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
    const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
    const [finalPointCount, setFinalPointCount] = useState(0);

    // Setup checkboxes
    const [checks, setChecks] = useState([false, false, false, false]);
    const allChecked = checks.every(Boolean);

    /** 9-point calibration on stimulus image (3x3 grid) + IDW field. */
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

    // --- face-api.js emotion recognition (desktop, parallel to BlazeGaze) ---
    const faceEmotions = useFaceApiEmotions({
        videoRef,
        enabled: isDesktop && hasEmotionRecognition,
        sampleIntervalMs: GAZE_POLL_MS,
    });

    // --- Micro-recalibration (drift correction during viewing) ---
    const [microDot, setMicroDot] = useState<{ u: number; v: number } | null>(null);
    const microProbeIndexRef = useRef(0);
    const microGazeSamplesRef = useRef<{ x: number; y: number }[]>([]);

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

    /** Keep latest smoothed gaze for hybrid calibration samples (desktop).
     *  Reads from blaze.gazePosRef (updated every frame, no re-render). */
    useEffect(() => {
        if (!isDesktop) return;
        let raf = 0;
        const sync = () => {
            const pos = blaze.gazePosRef.current;
            if (pos) gazePosRef.current = [pos.x, pos.y];
            raf = requestAnimationFrame(sync);
        };
        raf = requestAnimationFrame(sync);
        return () => cancelAnimationFrame(raf);
    }, [isDesktop, blaze.gazePosRef]);

    // Gaze collection during viewing phase (desktop): RAF loop with 50ms throttle, IDW-corrected.
    // Gaze collection + face-api.js emotion recognition during viewing (desktop).
    // Matches hybrid page pattern: reads from gazePosRef (cached), uses Date.now() timestamps.
    useEffect(() => {
        if (phase !== 'viewing' || !isDesktop) return;

        // Start face-api.js emotion sampling alongside gaze
        if (hasEmotionRecognition) {
            faceEmotions.start();
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
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(raf);
            if (hasEmotionRecognition) faceEmotions.stop();
            if (isVideo && stimulusVideoRef.current) stimulusVideoRef.current.pause();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable RAF loop; live blaze.* reads via ref
    }, [phase, isDesktop, hasEmotionRecognition, isVideo]);

    // Micro-recalibration: periodic drift correction during viewing (desktop only)
    useEffect(() => {
        if (phase !== 'viewing' || !isDesktop) return;

        const probeTimer = setInterval(() => {
            // Pick next position from the pool (round-robin)
            const idx = microProbeIndexRef.current % MICRO_RECALIB_POSITIONS.length;
            microProbeIndexRef.current += 1;
            const [pctX, pctY] = MICRO_RECALIB_POSITIONS[idx];
            const u = pctX / 100;
            const v = pctY / 100;

            // Show micro-dot and start collecting gaze samples
            microGazeSamplesRef.current = [];
            setMicroDot({ u, v });

            // Collect gaze samples during the probe window
            let sampleRaf = 0;
            let samplesCollected = 0;
            const collectLoop = () => {
                if (samplesCollected >= MICRO_RECALIB_SAMPLE_COUNT) return;
                const [gx, gy] = gazePosRef.current;
                if (blaze.gazeState === 'open') {
                    microGazeSamplesRef.current.push({ x: gx, y: gy });
                    samplesCollected++;
                }
                sampleRaf = requestAnimationFrame(collectLoop);
            };
            sampleRaf = requestAnimationFrame(collectLoop);

            // After sample duration, compute drift and update correction field
            setTimeout(() => {
                cancelAnimationFrame(sampleRaf);
                setMicroDot(null);

                const samples = microGazeSamplesRef.current;
                if (samples.length < 3) return; // not enough data

                // Average gaze position during probe
                let sumX = 0, sumY = 0;
                for (const s of samples) { sumX += s.x; sumY += s.y; }
                const avgX = sumX / samples.length;
                const avgY = sumY / samples.length;

                // Get stimulus rect
                const stimEl = isVideo ? stimulusVideoRef.current : imgRef.current;
                const rect = stimEl?.getBoundingClientRect();
                if (!rect || rect.width <= 0) return;

                const residual = computeMicroRecalibResidual(u, v, avgX, avgY, rect);
                if (residual) {
                    calibrationResidualsRef.current = [
                        ...calibrationResidualsRef.current,
                        residual,
                    ];
                }
            }, MICRO_RECALIB_SAMPLE_DURATION_MS);
        }, MICRO_RECALIB_INTERVAL_MS);

        return () => clearInterval(probeTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable timer; reads refs
    }, [phase, isDesktop, isVideo]);

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

            // Stop gaze tracking, face-api emotions, and camera on desktop
            if (isDesktop) {
                blaze.stop();
                faceEmotions.stop();
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
                emotions: hasEmotionRecognition ? faceEmotions.getSamples() : undefined,
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

    const handleVideoLoadedMetadata = useCallback(() => {
        if (stimulusVideoRef.current) {
            const v = stimulusVideoRef.current;
            naturalSizeRef.current = { w: v.videoWidth, h: v.videoHeight };
            setNaturalSize({ w: v.videoWidth, h: v.videoHeight });
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

    /** Re-calibrate: reset residuals and go back to calibration phase.
     *  Does NOT increment recalibrationCount — manual recalib is unlimited. */
    const handleRecalibrate = useCallback(() => {
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
            <IntroPhase
                taskDescription={taskDescription}
                isDesktop={isDesktop}
                isBlazeLoaded={blaze.isLoaded}
                onNext={() => setPhase('setup')}
            />
        );
    } else if (phase === 'setup') {
        phaseContent = (
            <SetupPhase
                isDesktop={isDesktop}
                checks={checks}
                allChecked={allChecked}
                onToggleCheck={toggleCheck}
                onReady={() => setPhase('preparing')}
            />
        );
    } else if (phase === 'preparing') {
        phaseContent = (
            <PreparingPhase isDesktop={isDesktop} />
        );
    } else if (phase === 'calibration') {
        phaseContent = (
            <CalibrationPhase
                calibrationIndex={calibrationIndex}
                resolvedUrl={resolvedUrl}
                imgRef={imgRef}
                onCalibrationClick={handleCalibrationClick}
                onImageLoad={handleImageLoad}
            />
        );
    } else if (phase === 'validating') {
        phaseContent = (
            <ValidationPhase
                validationRmse={validationRmse}
                resolvedUrl={resolvedUrl}
                imgRef={imgRef}
                onValidationClick={handleValidationClick}
                onRecalibrate={handleRecalibrate}
                onSkipValidation={handleSkipValidation}
                onImageLoad={handleImageLoad}
            />
        );
    } else if (phase === 'viewing') {
        phaseContent = (
            <ViewingPhase
                isDesktop={isDesktop}
                isVideo={isVideo}
                resolvedUrl={resolvedUrl}
                viewingDuration={viewingDuration}
                timeLeft={timeLeft}
                fixations={fixations}
                naturalSize={naturalSize}
                microDot={microDot}
                imgRef={imgRef}
                stimulusVideoRef={stimulusVideoRef}
                containerRef={containerRef}
                onImageInteraction={handleImageInteraction}
                onImageLoad={handleImageLoad}
                onVideoLoadedMetadata={handleVideoLoadedMetadata}
            />
        );
    } else if (phase === 'complete') {
        phaseContent = (
            <CompletePhase
                isDesktop={isDesktop}
                finalPointCount={finalPointCount}
            />
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
