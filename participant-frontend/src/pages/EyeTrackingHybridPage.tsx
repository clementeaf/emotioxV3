import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useBlazeGaze, type BlazeGazeFrameStats } from '../hooks/useBlazeGaze';
import {
    BLAZE_GAZE_MEDIA_STREAM_CONSTRAINTS,
    isBlazeGazeCaptureResolutionLow,
    HYBRID_AOI_GRID,
    HYBRID_CALIBRATION_FIELD_STRENGTH,
    HYBRID_FIXATION_DWELL_MS,
    HYBRID_IMAGE_CALIBRATION_POINTS,
    HYBRID_NOISE_THRESHOLD_PCT,
    HYBRID_ZONE_SAMPLE_MS,
    HYBRID_ZONE_VOTE_HISTORY,
    hybridApplyCalibrationField,
    hybridCalibrationConfidenceWeightUv,
    HYBRID_GAP_FILL_MAX_MS,
    HYBRID_GAP_FILL_SYNTHETIC_WEIGHT,
    hybridCalibrationRmsePx,
    expandGazeWithMinimumJerkGapFill,
    hybridHeatColor,
    hybridImagePercentToBlazeNorm,
    hybridModeZoneFromHistory,
    hybridPointToSoftZoneWeights,
    hybridPointToZone,
    type HybridCalibrationResidual,
} from '../lib/eyeTracking';

/** One-Euro params — adaptive layer on top of Kalman. */
const HYBRID_ONE_EURO_MIN_CUTOFF = 0.8;
const HYBRID_ONE_EURO_BETA = 0.005;

// --- Device detection ---
function getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('ipad') || (ua.includes('tablet') && !ua.includes('mobile'))) return 'tablet';
    if (/android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return 'mobile';
    return 'desktop';
}

// --- Types ---
interface GazePoint { x: number; y: number; t: number }
interface TouchPoint { x: number; y: number; t: number }

type Phase = 'intro' | 'instruction' | 'calibrating' | 'stimulus' | 'results';

// --- Stimulus config (lab demo) ---
const STIMULUS_URL = 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&h=800&fit=crop';

export function EyeTrackingHybridPage() {
    const deviceType = useMemo(() => getDeviceType(), []);
    const isDesktop = deviceType === 'desktop';

    const [phase, setPhase] = useState<Phase>('intro');
    const [calibrationIndex, setCalibrationIndex] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const stimulusImgRef = useRef<HTMLImageElement>(null);
    const blazeRef = useRef<ReturnType<typeof useBlazeGaze> | null>(null);

    // Data collection
    const gazePoints = useRef<GazePoint[]>([]);
    const touchPoints = useRef<TouchPoint[]>([]);
    /** Residuos (objetivo − mirada) por punto de calibración; interp. IDW en estímulo. */
    const calibrationResidualsRef = useRef<HybridCalibrationResidual[]>([]);

    // Desktop: BlazeGaze (same stack as EyeTrackingRenderer — CNN on eye crops, not iris landmarks alone)
    const blaze = useBlazeGaze(videoRef, {
        oneEuroMinCutoff: HYBRID_ONE_EURO_MIN_CUTOFF,
        oneEuroBeta: HYBRID_ONE_EURO_BETA,
    });
    // blaze returns both state (isLoaded, gazeState) and refs (gazePosRef).
    // Lint react-hooks/refs flags the whole object as ref access in render.
    // isLoaded is useState, safe to read in render.
    const blazeIsLoaded = blaze.isLoaded;

    useEffect(() => {
        blazeRef.current = blaze;
    }, [blaze]);

    // Heatmap state (soft mass per zone, sum ≈ weighted sample count)
    type ZoneHeat = Record<string, number>;
    const [heatmap, setHeatmap] = useState<ZoneHeat | null>(null);
    const [calibrationRmsePx, setCalibrationRmsePx] = useState<number | null>(null);
    const [sessionFrameStats, setSessionFrameStats] = useState<BlazeGazeFrameStats | null>(null);
    const [gapFillSummary, setGapFillSummary] = useState<{ measured: number; synthetic: number } | null>(null);
    const [activeZone, setActiveZone] = useState<string | null>(null);
    /** Same cell held ~HYBRID_FIXATION_DWELL_MS — gold ring (independent of vote smoothing). */
    const [fixatedZone, setFixatedZone] = useState<string | null>(null);
    /** Live gaze dot — DOM ref for direct manipulation (no React re-render). */
    const gazeDotRef = useRef<HTMLDivElement>(null);
    const zoneVoteHistoryRef = useRef<(string | null)[]>([]);
    const lastStableZoneRef = useRef<string | null>(null);
    const dwellInstantRef = useRef<string | null>(null);
    const dwellSinceRef = useRef<number>(0);
    const fixatedReportedRef = useRef<string | null>(null);

    // --- Camera ---
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(BLAZE_GAZE_MEDIA_STREAM_CONSTRAINTS);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
        } catch (err) {
            console.error('Camera error:', err);
        }
    }, []);

    const stopCamera = useCallback(() => {
        const video = videoRef.current;
        if (video?.srcObject) {
            (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            video.srcObject = null;
        }
    }, []);

    /** Read gaze directly from blaze ref (updated every frame, no React render delay). */
    const gazePosRef = blaze.gazePosRef;

    // --- Gaze collection during stimulus + real-time zone highlight (majority vote reduces flicker) ---
    useEffect(() => {
        if (phase !== 'stimulus' || !isDesktop) return;
        zoneVoteHistoryRef.current = [];
        lastStableZoneRef.current = null;
        dwellInstantRef.current = null;
        dwellSinceRef.current = 0;
        fixatedReportedRef.current = null;
        let raf = 0;
        let lastCollect = 0;
        let lastVoteAt = 0;
        const voteMs = HYBRID_ZONE_SAMPLE_MS;
        const fieldStrength = HYBRID_CALIBRATION_FIELD_STRENGTH;
        const loop = () => {
            const b = blazeRef.current;
            const gp = gazePosRef.current ?? { x: 0, y: 0 };
            const gx = gp.x;
            const gy = gp.y;
            const now = Date.now();
            const img = stimulusImgRef.current;
            const rect = img?.getBoundingClientRect();
            const corrected = rect
                ? hybridApplyCalibrationField(gx, gy, rect, calibrationResidualsRef.current, fieldStrength)
                : { x: gx, y: gy };
            const cx = corrected.x;
            const cy = corrected.y;
            if (b?.gazeState === 'open' && now - lastCollect >= 50) {
                gazePoints.current.push({ x: cx, y: cy, t: now });
                lastCollect = now;
            }
            if (img && rect) {
                // Live gaze dot — direct DOM positioning (calibration-corrected)
                if (gazeDotRef.current) {
                    gazeDotRef.current.style.left = `${((cx - rect.left) / rect.width) * 100}%`;
                    gazeDotRef.current.style.top = `${((cy - rect.top) / rect.height) * 100}%`;
                    gazeDotRef.current.style.display = 'block';
                }
                const instant = hybridPointToZone(cx, cy, rect);
                const hist = zoneVoteHistoryRef.current;
                if (now - lastVoteAt >= voteMs) {
                    lastVoteAt = now;
                    hist.push(instant);
                    if (hist.length > HYBRID_ZONE_VOTE_HISTORY) hist.shift();
                }
                const stable = hybridModeZoneFromHistory(hist, lastStableZoneRef.current);
                if (stable !== lastStableZoneRef.current) {
                    lastStableZoneRef.current = stable;
                    setActiveZone(stable);
                }

                const dwellKey = stable ?? instant;
                if (dwellKey !== dwellInstantRef.current) {
                    dwellInstantRef.current = dwellKey;
                    dwellSinceRef.current = now;
                    if (fixatedReportedRef.current !== null) {
                        fixatedReportedRef.current = null;
                        setFixatedZone(null);
                    }
                } else if (dwellKey !== null && now - dwellSinceRef.current >= HYBRID_FIXATION_DWELL_MS) {
                    if (fixatedReportedRef.current !== dwellKey) {
                        fixatedReportedRef.current = dwellKey;
                        setFixatedZone(dwellKey);
                    }
                }
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(raf);
            zoneVoteHistoryRef.current = [];
            lastStableZoneRef.current = null;
            dwellInstantRef.current = null;
            fixatedReportedRef.current = null;
            setActiveZone(null);
            setFixatedZone(null);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gazePosRef is a stable ref, read inside RAF loop
    }, [phase, isDesktop]);

    // --- Touch/tap collection (tablet/mobile) ---
    useEffect(() => {
        if (phase !== 'stimulus' || isDesktop) return;
        const handleTouch = (e: TouchEvent) => {
            for (let i = 0; i < e.touches.length; i++) {
                touchPoints.current.push({ x: e.touches[i].clientX, y: e.touches[i].clientY, t: Date.now() });
            }
        };
        const handleClick = (e: MouseEvent) => {
            touchPoints.current.push({ x: e.clientX, y: e.clientY, t: Date.now() });
        };
        window.addEventListener('touchstart', handleTouch, { passive: true });
        window.addEventListener('click', handleClick);
        return () => {
            window.removeEventListener('touchstart', handleTouch);
            window.removeEventListener('click', handleClick);
        };
    }, [phase, isDesktop]);

    // --- Compute heatmap and transition to results ---
    const finishStimulus = useCallback(() => {
        if (isDesktop) {
            const blaze = blazeRef.current;
            if (blaze) {
                setSessionFrameStats(blaze.getFrameStats());
            }
            blaze?.stop();
            stopCamera();
        } else {
            setSessionFrameStats(null);
            setGapFillSummary(null);
        }

        const zoneMass: ZoneHeat = {};
        HYBRID_AOI_GRID.forEach(z => { zoneMass[z.id] = 0; });

        const rect = stimulusImgRef.current?.getBoundingClientRect()
            ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);

        if (isDesktop) {
            const residuals = calibrationResidualsRef.current;
            const expanded = expandGazeWithMinimumJerkGapFill(gazePoints.current);
            setGapFillSummary({
                measured: gazePoints.current.length,
                synthetic: expanded.filter(p => p.interpolated).length,
            });
            for (const pt of expanded) {
                const u = rect.width > 0 ? (pt.x - rect.left) / rect.width : 0;
                const v = rect.height > 0 ? (pt.y - rect.top) / rect.height : 0;
                const baseConf = hybridCalibrationConfidenceWeightUv(u, v, residuals);
                const conf = pt.interpolated ? baseConf * HYBRID_GAP_FILL_SYNTHETIC_WEIGHT : baseConf;
                const soft = hybridPointToSoftZoneWeights(pt.x, pt.y, rect);
                for (const z of HYBRID_AOI_GRID) {
                    zoneMass[z.id] += soft[z.id] * conf;
                }
            }
        } else {
            for (const pt of touchPoints.current) {
                const soft = hybridPointToSoftZoneWeights(pt.x, pt.y, rect);
                for (const z of HYBRID_AOI_GRID) {
                    zoneMass[z.id] += soft[z.id];
                }
            }
        }

        setHeatmap(zoneMass);
        setPhase('results');
    }, [isDesktop, stopCamera]);

    const finishStimulusRef = useRef(finishStimulus);
    useEffect(() => { finishStimulusRef.current = finishStimulus; }, [finishStimulus]);

    // --- Handlers ---
    const handleStart = useCallback(() => {
        gazePoints.current = [];
        touchPoints.current = [];
        calibrationResidualsRef.current = [];
        setCalibrationIndex(0);
        setCalibrationRmsePx(null);
        setSessionFrameStats(null);
        setGapFillSummary(null);
        setPhase('instruction');
    }, []);

    const handleInstructionNext = useCallback(async () => {
        if (isDesktop) {
            calibrationResidualsRef.current = [];
            setCalibrationIndex(0);
            await startCamera();
            blaze.start();
            setPhase('calibrating');
        } else {
            setPhase('stimulus');
        }
    }, [isDesktop, startCamera, blaze]);

    /**
     * One click per dot: calibrate using the dot center in viewport space (aligned with the stimulus image).
     */
    const handleCalibrationClick = useCallback(() => {
        if (phase !== 'calibrating') return;
        const img = stimulusImgRef.current;
        if (!img) return;
        const pts = HYBRID_IMAGE_CALIBRATION_POINTS;
        const rect = img.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const [ipx, ipy] = pts[calibrationIndex];
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const targetX = rect.left + (ipx / 100) * rect.width;
        const targetY = rect.top + (ipy / 100) * rect.height;
        const gp = gazePosRef.current ?? { x: 0, y: 0 };
        calibrationResidualsRef.current.push({
            u: ipx / 100,
            v: ipy / 100,
            dx: targetX - gp.x,
            dy: targetY - gp.y,
        });
        const [normX, normY] = hybridImagePercentToBlazeNorm(rect, ipx, ipy, vw, vh);
        blaze.calibrate(normX, normY);
        if (calibrationIndex + 1 >= pts.length) {
            setCalibrationRmsePx(hybridCalibrationRmsePx(calibrationResidualsRef.current));
            blaze.resetFrameStats();
            setPhase('stimulus');
        } else {
            setCalibrationIndex(calibrationIndex + 1);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gazePosRef is a stable ref
    }, [phase, calibrationIndex, blaze]);

    // Normalize heatmap to 0-1
    const normalizedHeat = useMemo(() => {
        if (!heatmap) return null;
        const max = Math.max(...Object.values(heatmap), 1);
        const norm: ZoneHeat = {};
        Object.entries(heatmap).forEach(([k, v]) => { norm[k] = v / max; });
        return norm;
    }, [heatmap]);

    const totalSamples = useMemo(() => {
        if (!heatmap) return 0;
        return Object.values(heatmap).reduce((a, b) => a + b, 0);
    }, [heatmap]);

    const calDotImagePct = phase === 'calibrating' ? HYBRID_IMAGE_CALIBRATION_POINTS[calibrationIndex] : undefined;

    return (
        <div className="min-h-screen bg-gray-50">
            {isDesktop && <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />}

            {/* === INTRO === */}
            {phase === 'intro' && (
                <div className="flex min-h-screen items-center justify-center px-4">
                    <div className="max-w-md text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Prueba de seguimiento ocular</h1>
                        <div className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 bg-blue-100 text-blue-700">
                            {deviceType === 'desktop' ? 'Escritorio — BlazeGaze (webcam)' :
                             deviceType === 'tablet' ? 'Tableta — registro por toques' :
                             'Móvil — registro por toques'}
                        </div>
                        <p className="text-gray-600 text-sm mb-6">
                            {isDesktop
                                ? 'Verás una instrucción, luego cuatro puntos de calibración (uno por cuadrante). El resultado es un mapa en 4 zonas con probabilidades aproximadas, no un punto exacto de mirada.'
                                : 'Verás una instrucción y después una imagen. Toca las zonas que te llamen la atención. Los resultados son aproximados por cuadrante.'}
                        </p>
                        {isDesktop && !blazeIsLoaded && (
                            <p className="text-amber-600 text-xs mb-4">Cargando modelo de mirada...</p>
                        )}
                        <button
                            onClick={handleStart}
                            disabled={isDesktop && !blazeIsLoaded}
                            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            {isDesktop && !blazeIsLoaded ? 'Cargando...' : 'Empezar'}
                        </button>
                    </div>
                </div>
            )}

            {/* === INSTRUCTION === */}
            {phase === 'instruction' && (
                <div className="flex min-h-screen items-center justify-center px-4">
                    <div className="max-w-lg text-center space-y-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Instrucción</h2>
                            <p className="text-gray-700 text-base leading-relaxed">
                                Verás una imagen de una reunión. <strong>Mira a las personas e intenta identificar quién lidera la conversación.</strong>
                            </p>
                        </div>
                        <p className="text-gray-500 text-sm">
                            {isDesktop
                                ? 'Calibrarás con cuatro puntos (centro de cada cuadrante): mira cada punto verde y haz clic. Luego el seguimiento usa la misma imagen dividida en 4 zonas.'
                                : 'Aparecerá la imagen. Toca las zonas que te resulten más relevantes.'}
                        </p>
                        <button
                            onClick={handleInstructionNext}
                            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                        >
                            {isDesktop ? 'Calibrar' : 'Ver imagen'}
                        </button>
                    </div>
                </div>
            )}

            {/* === CALIBRATION + STIMULUS: same image, grid, layout (desktop) === */}
            {(phase === 'calibrating' || phase === 'stimulus') && isDesktop && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950">
                    {phase === 'stimulus' && (
                        <button
                            type="button"
                            onClick={() => finishStimulusRef.current()}
                            className="absolute top-4 right-4 z-[60] rounded-full bg-white/10 hover:bg-white/20 px-5 py-2 text-sm font-medium text-white transition"
                        >
                            Detener
                        </button>
                    )}

                    {phase === 'calibrating' && (
                        <>
                            <div className="pointer-events-none absolute left-1/2 top-4 z-[70] max-w-lg -translate-x-1/2 px-4 text-center">
                                <p className="text-base font-medium text-white">
                                    Mira el punto verde en la imagen y luego haz clic en cualquier sitio
                                </p>
                                <p className="mt-1 text-sm text-white/80">
                                    Punto {calibrationIndex + 1} de {HYBRID_IMAGE_CALIBRATION_POINTS.length}
                                </p>
                            </div>
                            <div className="pointer-events-none absolute bottom-6 left-1/2 z-[70] w-48 -translate-x-1/2">
                                <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                                    <div
                                        className="h-full rounded-full bg-green-500 transition-all"
                                        style={{ width: `${(calibrationIndex / HYBRID_IMAGE_CALIBRATION_POINTS.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="relative">
                        <img
                            ref={stimulusImgRef}
                            src={STIMULUS_URL}
                            alt="Estímulo"
                            className="max-w-[95vw] max-h-[95vh] object-contain"
                            crossOrigin="anonymous"
                        />
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                            {HYBRID_AOI_GRID.map(zone => {
                                const isActive = phase === 'stimulus' && activeZone === zone.id;
                                const isFix = phase === 'stimulus' && fixatedZone === zone.id;
                                return (
                                    <div
                                        key={zone.id}
                                        className={`border border-white/10 transition-colors duration-300 ${
                                            isFix ? 'ring-2 ring-amber-300/90 ring-inset' : ''
                                        }`}
                                        style={{
                                            backgroundColor: isActive ? 'rgba(239, 68, 68, 0.38)' : 'transparent',
                                        }}
                                    />
                                );
                            })}
                        </div>
                        {phase === 'calibrating' && calDotImagePct && (
                            <div
                                className="pointer-events-none absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-400 shadow-lg shadow-green-400/50"
                                style={{ left: `${calDotImagePct[0]}%`, top: `${calDotImagePct[1]}%` }}
                            />
                        )}
                        {phase === 'stimulus' && (
                            <div
                                ref={gazeDotRef}
                                className="pointer-events-none absolute z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow-lg shadow-red-500/60"
                                style={{ display: 'none', opacity: 0.9 }}
                            />
                        )}
                    </div>

                    {phase === 'calibrating' && (
                        <button
                            type="button"
                            className="fixed inset-0 z-[60] cursor-crosshair bg-transparent"
                            aria-label="Registrar punto de calibración"
                            onClick={handleCalibrationClick}
                        />
                    )}
                </div>
            )}

            {/* === RESULTS — Heatmap overlay === */}
            {phase === 'results' && normalizedHeat && (
                <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 gap-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">Mapa de atención</h2>
                        <p className="text-sm text-gray-500">
                            {isDesktop
                                ? `${totalSamples.toFixed(1)} unidades de masa acumulada (mirada corregida, reparto suave entre celdas vecinas)`
                                : `${totalSamples.toFixed(1)} unidades de masa acumulada (toques, reparto suave entre celdas)`}
                        </p>
                        {isDesktop && calibrationRmsePx !== null && (
                            <p className="text-xs text-gray-500 mt-1">
                                Error medio tras calibración (RMSE): {calibrationRmsePx.toFixed(0)} px en pantalla — valores más bajos suelen indicar mejor alineación.
                            </p>
                        )}
                        {isDesktop && sessionFrameStats !== null && (
                            <p className="text-xs text-gray-500 mt-1">
                                Frames en el estímulo: {sessionFrameStats.validGazeFrames} con mirada válida;{' '}
                                {sessionFrameStats.noValidGazeFrames} sin mirada (ojos cerrados o sin señal);{' '}
                                {sessionFrameStats.invalidFrames} fallidos (cámara o modelo).
                                {sessionFrameStats.captureWidthPx !== null &&
                                    sessionFrameStats.captureHeightPx !== null && (
                                    <>
                                        {' '}
                                        Resolución de captura (vídeo → modelo):{' '}
                                        {sessionFrameStats.captureWidthPx}×{sessionFrameStats.captureHeightPx} px.
                                    </>
                                )}
                            </p>
                        )}
                        {isDesktop &&
                            sessionFrameStats !== null &&
                            sessionFrameStats.captureWidthPx !== null &&
                            sessionFrameStats.captureHeightPx !== null &&
                            isBlazeGazeCaptureResolutionLow(
                                sessionFrameStats.captureWidthPx,
                                sessionFrameStats.captureHeightPx,
                            ) && (
                                <p className="text-xs text-amber-800/90 mt-1 max-w-lg mx-auto">
                                    La resolución de la cámara es baja; el seguimiento puede ser menos estable. Si puedes,
                                    acércate un poco a la pantalla o revisa la cámara o el permiso de resolución en el
                                    navegador.
                                </p>
                            )}
                        {isDesktop && gapFillSummary !== null && (
                            <p className="text-xs text-gray-500 mt-1">
                                Serie para el mapa: {gapFillSummary.measured} muestras medidas
                                {gapFillSummary.synthetic > 0
                                    ? ` + ${gapFillSummary.synthetic} intermedias (mínimo jerk entre puntos válidos, huecos ≤ ${HYBRID_GAP_FILL_MAX_MS} ms; peso ${Math.round(HYBRID_GAP_FILL_SYNTHETIC_WEIGHT * 100)} % vs medidas)`
                                    : ' (sin huecos rellenados)'}.
                            </p>
                        )}
                        <p className="text-xs text-amber-800/90 mt-2 max-w-lg mx-auto">
                            Interpreta los porcentajes como distribución aproximada de atención por región, no como precisión de laboratorio.
                        </p>
                    </div>

                    {/* Image with heatmap overlay */}
                    <div className="relative inline-block rounded-lg overflow-hidden shadow-xl">
                        <img
                            src={STIMULUS_URL}
                            alt="Estímulo"
                            className="max-w-[90vw] max-h-[65vh] object-contain"
                            crossOrigin="anonymous"
                        />
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                            {HYBRID_AOI_GRID.map(zone => {
                                const pct = heatmap ? Math.round((heatmap[zone.id] / Math.max(totalSamples, 1e-9)) * 100) : 0;
                                const aboveThreshold = pct >= HYBRID_NOISE_THRESHOLD_PCT;
                                const intensity = aboveThreshold ? (normalizedHeat[zone.id] || 0) : 0;
                                return (
                                    <div
                                        key={zone.id}
                                        className="relative border border-white/10 flex items-center justify-center transition-colors"
                                        style={{ backgroundColor: hybridHeatColor(intensity) }}
                                    >
                                        {aboveThreshold && (
                                            <span className="text-white font-bold text-lg drop-shadow-md">
                                                {pct}%
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(59,130,246,0.3)' }} /> Baja</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(34,197,94,0.5)' }} /> Media</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(250,204,21,0.6)' }} /> Alta</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.7)' }} /> Máxima</span>
                    </div>

                    {/* Zone breakdown table */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 w-full max-w-2xl">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Desglose por zona</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {HYBRID_AOI_GRID.map(zone => {
                                const count = heatmap?.[zone.id] || 0;
                                const pct = totalSamples > 0 ? Math.round((count / totalSamples) * 100) : 0;
                                const aboveThreshold = pct >= HYBRID_NOISE_THRESHOLD_PCT;
                                const intensity = aboveThreshold ? (normalizedHeat[zone.id] || 0) : 0;
                                return (
                                    <div key={zone.id} className="rounded p-2 text-center" style={{ backgroundColor: hybridHeatColor(intensity) }}>
                                        <p className="text-xs font-medium text-gray-800">{zone.label}</p>
                                        <p className="text-lg font-bold text-gray-900">{aboveThreshold ? `${pct}%` : '—'}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                    >
                        Repetir
                    </button>
                </div>
            )}
        </div>
    );
}
