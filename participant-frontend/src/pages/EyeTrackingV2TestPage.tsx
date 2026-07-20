/**
 * Eye Tracking Test Page — Full Pipeline (V2 zones + V3 probabilistic heatmap)
 *
 * Uses the REAL production pipeline:
 *   MediaPipe FaceLandmarker + Ridge regression → 13-point dwell calibration →
 *   IDW correction → V2 ZoneClassifier/Hysteresis/Emitter → V3 ProbabilisticHeatmap
 *
 * URL: /test/eye-tracking-v2
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMediaPipeGaze } from '../hooks/useMediaPipeGaze';
import { useBlazeGaze } from '../hooks/useBlazeGaze';
import { ZoneRegistry, generateGrid } from '../lib/eyeTracking/zoneRegistry';
import { ZoneEventEmitter, type ZoneEvent } from '../lib/eyeTracking/zoneEventEmitter';
import { getCurrentDeviceProfile } from '../lib/eyeTracking/deviceProfile';
import {
  HYBRID_IMAGE_CALIBRATION_POINTS,
  HYBRID_CALIBRATION_FIELD_STRENGTH,
  HYBRID_AOI_GRID,
  hybridApplyCalibrationField,
  hybridCalibrationRmsePx,
  hybridImagePercentToBlazeNorm,
} from '../lib/eyeTracking';
import type { HybridCalibrationResidual } from '../lib/eyeTracking';
import {
  computeZoneMetrics,
  generateBackwardZoneMass,
  type ZoneMetrics,
} from '../lib/eyeTracking/v2ResponseBuilder';
import { GAZE_ENGINE, V3_HEATMAP_ENABLED } from '../components/renderers/eye-tracking/types';

// V3
import { fitFromHybridResiduals, computeFrameUncertainty } from '../lib/eyeTracking/attention/uncertaintyEstimator';
import type { CalibrationEllipse } from '../lib/eyeTracking/attention/types';
import { ProbabilisticHeatmap } from '../lib/eyeTracking/attention/probabilisticHeatmap';
import { computeSessionConfidence, computeSpatialCoverage } from '../lib/eyeTracking/attention/sessionMetrics';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GAZE_POLL_MS = 50;
const VIEWING_DURATION_S = 10;
const GRID_ROWS = 3;
const GRID_COLS = 3;

/** Dwell detection — same params as production EyeTrackingRenderer */
const DWELL_THRESHOLD_MS = 1000;
const DWELL_PROXIMITY_PX = 280;
const DWELL_GRACE_MS = 300;
const CALIBRATE_CALLS_PER_POINT = 3;

const TEST_STIMULUS_URL = 'https://picsum.photos/800/600';

type Phase = 'loading' | 'calibrating' | 'viewing' | 'complete';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EyeTrackingV2TestPage() {
  const profile = useMemo(() => getCurrentDeviceProfile(), []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stimulusRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>('loading');
  const [stimulusLoaded, setStimulusLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calibration
  const [calibPointIndex, setCalibPointIndex] = useState(0);
  const [calibRmsePx, setCalibRmsePx] = useState<number | null>(null);
  const calibResidualsRef = useRef<HybridCalibrationResidual[]>([]);

  // Viewing
  const [currentZone, setCurrentZone] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [fixationActive, setFixationActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [events, setEvents] = useState<ZoneEvent[]>([]);
  const eventsRef = useRef<ZoneEvent[]>([]);
  const gazePointsRef = useRef<{ x: number; y: number; t: number }[]>([]);

  // V2 pipeline refs
  const emitterRef = useRef<ZoneEventEmitter | null>(null);
  const registryRef = useRef<ZoneRegistry | null>(null);
  const gazeLoopRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // V3 heatmap refs
  const v3HeatmapRef = useRef<ProbabilisticHeatmap | null>(null);
  const v3EllipsesRef = useRef<CalibrationEllipse[]>([]);
  const v3LastTimeRef = useRef(0);
  const v3LastGazeRef = useRef<{ x: number; y: number } | null>(null);
  const v3InitRectRef = useRef<{ width: number; height: number } | null>(null);

  // V3 debug
  const [v3Debug, setV3Debug] = useState<{
    mass: number; duration: number; sigma1: number; sigma2: number; coverage: number;
  } | null>(null);

  // Gaze diag
  const [diag, setDiag] = useState({
    rawX: 0, rawY: 0, corrX: 0, corrY: 0, gazeState: 'unknown',
  });

  // Dwell calibration refs
  const dwellStartRef = useRef<number | null>(null);
  const dwellSamplesRef = useRef<{ x: number; y: number }[]>([]);
  const dwellExitTimeRef = useRef<number | null>(null);
  const dwellRafRef = useRef(0);

  // --- Gaze engines (both always called — React rules) ---
  const useMP = GAZE_ENGINE === 'mediapipe';
  const blaze = useBlazeGaze(videoRef, { oneEuroMinCutoff: 0.8, oneEuroBeta: 0.005 });
  const mpGaze = useMediaPipeGaze(videoRef, { oneEuroMinCutoff: 1.2, oneEuroBeta: 0.05 });

  // Unified gaze ref — same shape as production EyeTrackingRenderer
  const gazePosRef = useRef<[number, number]>([0, 0]);

  const gaze = useMemo(() => useMP ? {
    isLoaded: mpGaze.isLoaded,
    gazeState: mpGaze.gazeState,
    start: mpGaze.start,
    stop: mpGaze.stop,
    calibrate: mpGaze.calibrate,
    trainRidge: mpGaze.trainRidge as () => Promise<void>,
    headPoseRef: mpGaze.headPoseRef,
    earRef: mpGaze.earRef,
    predictorRef: mpGaze.predictorRef,
  } : {
    isLoaded: blaze.isLoaded,
    gazeState: blaze.gazeState,
    start: blaze.start,
    stop: blaze.stop,
    calibrate: blaze.calibrate,
    trainRidge: undefined as (() => Promise<void>) | undefined,
    headPoseRef: { current: { pitch: 0, yaw: 0 } },
    earRef: { current: 0.28 },
    predictorRef: { current: null } as { current: { diagnostics?: { perPoint?: Array<{ targetX: number; targetY: number; residualX: number; residualY: number }> } } | null },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useMP, mpGaze.isLoaded, mpGaze.gazeState, blaze.isLoaded, blaze.gazeState]);

  // Sync gazePosRef from active engine (same pattern as production renderer)
  useEffect(() => {
    if (phase !== 'calibrating' && phase !== 'viewing') return;
    let raf = 0;
    const sync = () => {
      const pos = useMP ? mpGaze.gazePosRef.current : blaze.gazePosRef.current;
      if (pos) {
        gazePosRef.current = [pos.x, pos.y];
      }
      raf = requestAnimationFrame(sync);
    };
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [phase, useMP, mpGaze.gazePosRef, blaze.gazePosRef]);

  // -- Camera --
  useEffect(() => {
    if (!profile.hasGazeTracking) { setCameraReady(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if (!cancelled) setCameraReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Camera denied');
      }
    })();
    return () => { cancelled = true; };
  }, [profile.hasGazeTracking]);

  // -- Model ready → start engine + go to calibration --
  const modelReady = gaze.isLoaded;
  useEffect(() => {
    if (!cameraReady || !modelReady || !stimulusLoaded || phase !== 'loading') return;
    gaze.start();
    const raf = requestAnimationFrame(() => setPhase('calibrating'));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraReady, modelReady, stimulusLoaded, phase]);

  // -- Dwell-based calibration (same as production EyeTrackingRenderer) --
  useEffect(() => {
    if (phase !== 'calibrating') return;

    dwellStartRef.current = null;
    dwellSamplesRef.current = [];
    dwellExitTimeRef.current = null;

    const loop = () => {
      const stimEl = stimulusRef.current;
      if (!stimEl) { dwellRafRef.current = requestAnimationFrame(loop); return; }
      const rect = stimEl.getBoundingClientRect();
      if (rect.width <= 0) { dwellRafRef.current = requestAnimationFrame(loop); return; }

      const pts = HYBRID_IMAGE_CALIBRATION_POINTS;
      const idx = calibPointIndex;
      if (idx >= pts.length) return;

      const [ipx, ipy] = pts[idx];
      const dotX = rect.left + (ipx / 100) * rect.width;
      const dotY = rect.top + (ipy / 100) * rect.height;
      const [gx, gy] = gazePosRef.current;
      const dist = Math.sqrt((gx - dotX) ** 2 + (gy - dotY) ** 2);
      const now = performance.now();

      if (dist <= DWELL_PROXIMITY_PX && gaze.gazeState === 'open') {
        dwellExitTimeRef.current = null;

        if (dwellStartRef.current === null) {
          dwellStartRef.current = now;
          dwellSamplesRef.current = [];
        }
        dwellSamplesRef.current.push({ x: gx, y: gy });

        const elapsed = now - dwellStartRef.current;
        if (elapsed >= DWELL_THRESHOLD_MS) {
          // Dwell complete — calibrate this point
          const samples = dwellSamplesRef.current;
          let avgX = 0, avgY = 0;
          for (const s of samples) { avgX += s.x; avgY += s.y; }
          avgX /= samples.length;
          avgY /= samples.length;

          const targetX = dotX;
          const targetY = dotY;

          // IDW residual (same sign convention as production: target - gaze)
          calibResidualsRef.current.push({
            u: ipx / 100,
            v: ipy / 100,
            dx: targetX - avgX,
            dy: targetY - avgY,
          });

          // Feed calibration to gaze engine
          if (useMP) {
            gaze.calibrate(targetX, targetY);
          } else {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const [normX, normY] = hybridImagePercentToBlazeNorm(rect, ipx, ipy, vw, vh);
            for (let c = 0; c < CALIBRATE_CALLS_PER_POINT; c++) {
              gaze.calibrate(normX, normY);
            }
          }

          dwellStartRef.current = null;
          dwellSamplesRef.current = [];
          dwellExitTimeRef.current = null;

          if (idx + 1 >= pts.length) {
            // All points done — train + start viewing
            void finishCalibration();
            return;
          } else {
            setCalibPointIndex(idx + 1);
            return;
          }
        }
      } else {
        // Gaze outside proximity — grace period
        if (dwellStartRef.current !== null) {
          if (dwellExitTimeRef.current === null) {
            dwellExitTimeRef.current = now;
          } else if (now - dwellExitTimeRef.current > DWELL_GRACE_MS) {
            dwellStartRef.current = null;
            dwellSamplesRef.current = [];
            dwellExitTimeRef.current = null;
          }
        }
      }

      dwellRafRef.current = requestAnimationFrame(loop);
    };

    dwellRafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(dwellRafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, calibPointIndex, gaze.gazeState, useMP]);

  // -- Finish calibration: train Ridge, compute RMSE, fit V3 ellipses --
  const finishCalibration = useCallback(async () => {
    // Train Ridge regression
    if (gaze.trainRidge) {
      await gaze.trainRidge();
    }

    // Compute RMSE
    const rmse = hybridCalibrationRmsePx(calibResidualsRef.current);
    setCalibRmsePx(rmse);

    // Fit V3 uncertainty ellipses
    if (V3_HEATMAP_ENABLED && calibResidualsRef.current.length >= 3) {
      const predictor = gaze.predictorRef?.current;
      const loocvPoints = (predictor?.diagnostics as { perPoint?: Array<{ targetX: number; targetY: number; residualX: number; residualY: number; errorPx: number; cvErrorPx: number | null }> } | null)?.perPoint;
      if (loocvPoints && loocvPoints.length >= 3) {
        const { fitFromLoocvResiduals } = await import('../lib/eyeTracking/attention/uncertaintyEstimator');
        const stimRect = stimulusRef.current?.getBoundingClientRect();
        if (stimRect && stimRect.width > 0) {
          const loocvResiduals = loocvPoints.map(pp => ({
            u: stimRect.width > 0 ? (pp.targetX - stimRect.left) / stimRect.width : 0.5,
            v: stimRect.height > 0 ? (pp.targetY - stimRect.top) / stimRect.height : 0.5,
            dx: pp.residualX,
            dy: pp.residualY,
          }));
          v3EllipsesRef.current = fitFromLoocvResiduals(loocvResiduals, calibResidualsRef.current);
        }
      } else {
        v3EllipsesRef.current = fitFromHybridResiduals(calibResidualsRef.current);
      }
    }

    startViewing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gaze]);

  // -- Start viewing phase --
  const startViewing = useCallback(() => {
    const stimEl = stimulusRef.current;
    if (!stimEl) return;
    const rect = stimEl.getBoundingClientRect();

    // V2: zone registry + emitter
    const registry = new ZoneRegistry();
    const gridZones = generateGrid(GRID_ROWS, GRID_COLS, {
      x: rect.x, y: rect.y, width: rect.width, height: rect.height,
    });
    for (const z of gridZones) {
      registry.register(z.id, z.label, z.rect);
    }
    registryRef.current = registry;

    const emitter = new ZoneEventEmitter({
      uncertaintyRadius: profile.uncertaintyRadius,
      switchThresholdMs: profile.hysteresisMs,
      minFixationMs: 150,
    });
    const collect = (e: ZoneEvent) => {
      eventsRef.current = [...eventsRef.current, e];
    };
    emitter.on('zone_enter', collect);
    emitter.on('zone_leave', collect);
    emitter.on('fixation_start', collect);
    emitter.on('fixation_end', collect);
    emitter.on('zone_enter', (e) => { setCurrentZone(e.zoneId); setConfidence(e.confidence); });
    emitter.on('zone_leave', () => { setCurrentZone(null); setConfidence(0); setFixationActive(false); });
    emitter.on('fixation_start', () => setFixationActive(true));
    emitter.on('fixation_end', () => setFixationActive(false));
    emitterRef.current = emitter;

    // V3: probabilistic heatmap
    if (V3_HEATMAP_ENABLED) {
      v3HeatmapRef.current = new ProbabilisticHeatmap(rect.width, rect.height, 64);
      v3InitRectRef.current = { width: rect.width, height: rect.height };
      v3LastTimeRef.current = Date.now();
      v3LastGazeRef.current = null;
    }

    // Gaze collection loop (rAF — same as production)
    const startTime = Date.now();
    let lastCollect = 0;

    const loop = () => {
      const [rawX, rawY] = gazePosRef.current;
      const now = Date.now();
      const stimRect = stimulusRef.current?.getBoundingClientRect();

      if (stimRect && stimRect.width > 0 && gaze.gazeState === 'open' && now - lastCollect >= GAZE_POLL_MS) {
        // IDW correction (same as production)
        const corrected = hybridApplyCalibrationField(
          rawX, rawY, stimRect,
          calibResidualsRef.current,
          HYBRID_CALIBRATION_FIELD_STRENGTH,
        );

        gazePointsRef.current.push({ x: corrected.x, y: corrected.y, t: now });

        // V2: feed zones
        const zones = registry.getZones();
        if (zones.length > 0) {
          emitter.feed(corrected.x, corrected.y, now, zones);
        }

        // V3: probabilistic heatmap splat
        if (V3_HEATMAP_ENABLED && v3HeatmapRef.current && v3EllipsesRef.current.length > 0) {
          const dtS = (now - v3LastTimeRef.current) / 1000;
          v3LastTimeRef.current = now;

          const prev = v3LastGazeRef.current;
          const velocity = prev
            ? Math.sqrt((corrected.x - prev.x) ** 2 + (corrected.y - prev.y) ** 2)
            : 0;
          v3LastGazeRef.current = { x: corrected.x, y: corrected.y };

          const unc = computeFrameUncertainty({
            gazeX: corrected.x,
            gazeY: corrected.y,
            velocity,
            pitch: useMP ? gaze.headPoseRef.current.pitch : 0,
            yaw: useMP ? gaze.headPoseRef.current.yaw : 0,
            ear: useMP ? gaze.earRef.current : 0.28,
            rect: { left: stimRect.left, top: stimRect.top, width: stimRect.width, height: stimRect.height },
          }, v3EllipsesRef.current);

          const initRect = v3InitRectRef.current!;
          const relX = (corrected.x - stimRect.left) / stimRect.width;
          const relY = (corrected.y - stimRect.top) / stimRect.height;
          const stimX = relX * initRect.width;
          const stimY = relY * initRect.height;
          if (dtS > 0 && dtS < 1) {
            v3HeatmapRef.current.addSample(stimX, stimY, unc, dtS);
          }

          // Debug update ~4fps
          if (now % 250 < GAZE_POLL_MS) {
            const grid = v3HeatmapRef.current.getDensityGrid();
            const mass = grid.data.reduce((s: number, v: number) => s + v, 0);
            setV3Debug({
              mass,
              duration: v3HeatmapRef.current.totalDurationS,
              sigma1: unc.sigma1,
              sigma2: unc.sigma2,
              coverage: computeSpatialCoverage(grid),
            });
          }
        }

        // Diag update ~5fps
        if ((now - startTime) % 200 < GAZE_POLL_MS) {
          setDiag({
            rawX, rawY,
            corrX: corrected.x, corrY: corrected.y,
            gazeState: gaze.gazeState,
          });
        }

        lastCollect = now;
      }

      gazeLoopRef.current = requestAnimationFrame(loop);
    };
    gazeLoopRef.current = requestAnimationFrame(loop);

    // Countdown timer
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev + 1 >= VIEWING_DURATION_S) {
          completeSession();
          return VIEWING_DURATION_S;
        }
        return prev + 1;
      });
    }, 1000);

    setPhase('viewing');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, gaze, useMP]);

  // -- Complete --
  const completeSession = useCallback(() => {
    cancelAnimationFrame(gazeLoopRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    gaze.stop();
    setEvents([...eventsRef.current]);
    setPhase('complete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(gazeLoopRef.current);
      cancelAnimationFrame(dwellRafRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      registryRef.current?.destroy();
      emitterRef.current?.destroy();
    };
  }, []);

  // -- Metrics --
  const zoneIds = HYBRID_AOI_GRID.map(z => z.id);
  const metrics = useMemo(() => computeZoneMetrics(events, zoneIds), [events, zoneIds]);
  const zoneMass = useMemo(() => generateBackwardZoneMass(metrics), [metrics]);

  // V3 final metrics
  const v3Final = useMemo(() => {
    if (phase !== 'complete' || !v3HeatmapRef.current) return null;
    const hm = v3HeatmapRef.current;
    const grid = hm.getDensityGrid();
    const mass = grid.data.reduce((s: number, v: number) => s + v, 0);
    const conf = computeSessionConfidence(
      gazePointsRef.current.length > 0 ? 1.0 : 0,
      calibRmsePx,
      0,
      hm.totalDurationS,
    );
    conf.spatialCoverage = computeSpatialCoverage(grid);
    return { mass, duration: hm.totalDurationS, confidence: conf, grid };
  }, [phase, calibRmsePx]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const calibPoints = HYBRID_IMAGE_CALIBRATION_POINTS;
  const cp = calibPoints[calibPointIndex];
  // Dwell progress for visual feedback
  const [dwellProgress, setDwellProgress] = useState(0);
  useEffect(() => {
    if (phase !== 'calibrating') { setDwellProgress(0); return; }
    const interval = setInterval(() => {
      if (dwellStartRef.current !== null) {
        const pct = Math.min(1, (performance.now() - dwellStartRef.current) / DWELL_THRESHOLD_MS);
        setDwellProgress(pct);
      } else {
        setDwellProgress(0);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Webcam preview */}
      <video
        ref={videoRef}
        className={`fixed z-50 bottom-4 right-4 rounded-lg object-cover bg-black border-2 border-white shadow-lg ${
          phase === 'calibrating' || phase === 'viewing' ? 'w-32 h-24 opacity-60' : 'hidden'
        }`}
        autoPlay muted playsInline
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Eye Tracking — Full Pipeline Test</h1>
          <p className="text-xs text-slate-400">
            {GAZE_ENGINE} · {profile.deviceType} · V2 zones + V3 density
            {calibRmsePx !== null && ` · RMSE ${Math.round(calibRmsePx)}px`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {phase === 'calibrating' && (
            <span className="text-sm font-mono text-amber-600">
              {calibPointIndex + 1}/{calibPoints.length}
            </span>
          )}
          {phase === 'viewing' && currentZone && (
            <span className="text-sm font-mono text-slate-600">
              {currentZone} <span className="text-slate-400">{Math.round(confidence * 100)}%</span>
              {fixationActive && <span className="text-amber-500 ml-1">FIX</span>}
            </span>
          )}
          {phase === 'viewing' && (
            <span className="text-sm font-mono text-blue-600">{VIEWING_DURATION_S - elapsed}s</span>
          )}
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            phase === 'viewing' ? 'bg-green-100 text-green-700'
              : phase === 'calibrating' ? 'bg-amber-100 text-amber-700'
              : phase === 'complete' ? 'bg-blue-100 text-blue-700'
              : 'bg-slate-100 text-slate-500'
          }`}>{phase}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        {/* Loading */}
        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent" />
            <p className="text-sm text-slate-500">
              {!cameraReady ? 'Iniciando camara...' : !modelReady ? `Cargando ${GAZE_ENGINE}...` : 'Cargando stimulus...'}
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        {/* Stimulus (visible during loading/calibration/viewing) */}
        {(phase === 'loading' || phase === 'calibrating' || phase === 'viewing') && (
          <div className="relative">
            <div
              ref={stimulusRef}
              className={`rounded-lg shadow-lg overflow-hidden ${phase === 'calibrating' ? 'opacity-80' : ''}`}
              style={{ width: '800px', maxWidth: '90vw', maxHeight: '70vh' }}
            >
              <img
                src={TEST_STIMULUS_URL}
                alt="Test stimulus"
                className="w-full h-auto block"
                crossOrigin="anonymous"
                onLoad={() => setStimulusLoaded(true)}
              />

              {/* 3x3 grid overlay during viewing */}
              {phase === 'viewing' && (
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: GRID_ROWS }).map((_, row) => (
                    Array.from({ length: GRID_COLS }).map((_, col) => {
                      const zoneId = `r${row}c${col}`;
                      const isActive = zoneId === currentZone;
                      const isFixated = isActive && fixationActive;
                      return (
                        <div
                          key={zoneId}
                          className="absolute border border-white/30 flex items-center justify-center"
                          style={{
                            left: `${(col / GRID_COLS) * 100}%`,
                            top: `${(row / GRID_ROWS) * 100}%`,
                            width: `${100 / GRID_COLS}%`,
                            height: `${100 / GRID_ROWS}%`,
                            backgroundColor: isFixated
                              ? 'rgba(245, 158, 11, 0.3)'
                              : isActive
                                ? 'rgba(59, 130, 246, 0.2)'
                                : 'transparent',
                            transition: 'background-color 150ms',
                          }}
                        >
                          <span className="text-[10px] font-mono text-white/60 select-none">
                            {zoneId}
                          </span>
                        </div>
                      );
                    })
                  ))}
                </div>
              )}
            </div>

            {/* Calibration dot with dwell progress ring */}
            {phase === 'calibrating' && cp && (
              <>
                <div
                  className="absolute z-10 flex items-center justify-center"
                  style={{
                    left: `${cp[0]}%`,
                    top: `${cp[1]}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '36px',
                    height: '36px',
                  }}
                >
                  {/* Progress ring */}
                  <svg className="absolute" width="36" height="36" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15" fill="none" stroke="#22C55E" strokeWidth="3"
                      strokeDasharray={`${dwellProgress * 94.2} 94.2`}
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                      style={{ transition: 'stroke-dasharray 50ms linear' }}
                    />
                  </svg>
                  {/* Center dot */}
                  <div className={`w-4 h-4 rounded-full ${
                    dwellProgress > 0 ? 'bg-amber-400' : 'bg-green-400 animate-pulse'
                  } shadow-lg`} />
                </div>
                <div className="absolute bottom-2 left-0 right-0 text-center z-10">
                  <span className="bg-black/70 text-white text-xs px-3 py-1 rounded">
                    Mira el punto verde ({calibPointIndex + 1}/{calibPoints.length})
                    {dwellProgress > 0 && ` — ${Math.round(dwellProgress * 100)}%`}
                  </span>
                </div>
              </>
            )}

            {/* Viewing HUD */}
            {phase === 'viewing' && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white px-3 py-2 flex items-center gap-4 text-xs rounded-b-lg">
                <span>Zone: <strong className="text-blue-300">{currentZone ?? '\u2014'}</strong></span>
                <span>Conf: <strong>{Math.round(confidence * 100)}%</strong></span>
                <span>Fix: <strong className={fixationActive ? 'text-amber-300' : ''}>{fixationActive ? 'SI' : '\u2014'}</strong></span>
                <span>Pts: <strong>{gazePointsRef.current.length}</strong></span>
                <button onClick={completeSession} className="ml-auto px-3 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors">
                  Terminar
                </button>
              </div>
            )}

            {/* Diagnostics panel */}
            {phase === 'viewing' && (
              <div className="mt-2 bg-slate-800 text-[10px] font-mono text-slate-300 rounded-lg p-2 w-full">
                <div className="flex gap-4 flex-wrap">
                  <span>raw: <strong className="text-green-300">{Math.round(diag.rawX)},{Math.round(diag.rawY)}</strong></span>
                  <span>corr: <strong className="text-blue-300">{Math.round(diag.corrX)},{Math.round(diag.corrY)}</strong></span>
                  <span>state: <strong className="text-amber-300">{diag.gazeState}</strong></span>
                  <span>engine: <strong className="text-purple-300">{GAZE_ENGINE}</strong></span>
                  <span>residuals: <strong className="text-white">{calibResidualsRef.current.length}</strong></span>
                </div>
                {v3Debug && (
                  <div className="flex gap-4 flex-wrap mt-1 border-t border-slate-700 pt-1">
                    <span>V3 mass: <strong className="text-cyan-300">{v3Debug.mass.toFixed(2)}s</strong></span>
                    <span>dur: <strong className="text-cyan-300">{v3Debug.duration.toFixed(2)}s</strong></span>
                    <span>sigma: <strong className="text-cyan-300">{Math.round(v3Debug.sigma1)}x{Math.round(v3Debug.sigma2)}px</strong></span>
                    <span>coverage: <strong className="text-cyan-300">{(v3Debug.coverage * 100).toFixed(0)}%</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Complete panel */}
        {phase === 'complete' && (
          <CompletePanel
            events={events}
            metrics={metrics}
            zoneMass={zoneMass}
            calibRmsePx={calibRmsePx}
            gazePointCount={gazePointsRef.current.length}
            v3Final={v3Final}
            profile={profile}
            onRestart={() => {
              eventsRef.current = [];
              gazePointsRef.current = [];
              calibResidualsRef.current = [];
              v3EllipsesRef.current = [];
              v3HeatmapRef.current = null;
              v3LastGazeRef.current = null;
              setEvents([]);
              setCurrentZone(null);
              setConfidence(0);
              setFixationActive(false);
              setElapsed(0);
              setCalibPointIndex(0);
              setCalibRmsePx(null);
              setV3Debug(null);
              setDiag({ rawX: 0, rawY: 0, corrX: 0, corrY: 0, gazeState: 'unknown' });
              setPhase('loading');
              setCameraReady(false);
              setStimulusLoaded(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results panel
// ---------------------------------------------------------------------------

function CompletePanel({ events, metrics, zoneMass, calibRmsePx, gazePointCount, v3Final, profile, onRestart }: {
  events: ZoneEvent[];
  metrics: Record<string, ZoneMetrics>;
  zoneMass: Record<string, number>;
  calibRmsePx: number | null;
  gazePointCount: number;
  v3Final: { mass: number; duration: number; confidence: { score: number; spatialCoverage: number; calibrationQuality: number }; grid: { data: Float64Array; cols: number; rows: number } } | null;
  profile: ReturnType<typeof getCurrentDeviceProfile>;
  onRestart: () => void;
}) {
  const totalDwell = Object.values(metrics).reduce((s, m) => s + m.totalDwellTime, 0);
  const totalFixations = Object.values(metrics).reduce((s, m) => s + m.fixationCount, 0);
  const visitedZones = Object.values(metrics).filter(m => m.visitCount > 0).length;

  return (
    <div className="max-w-2xl w-full flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-slate-700 text-center">Resultados</h2>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Chip label="Engine" value={GAZE_ENGINE} />
        <Chip label="Device" value={profile.deviceType} />
        <Chip label="Calib RMSE" value={calibRmsePx !== null ? `${Math.round(calibRmsePx)}px` : 'N/A'} />
        <Chip label="Gaze points" value={String(gazePointCount)} />
        <Chip label="Events" value={String(events.length)} />
        <Chip label="Zones" value={`${visitedZones}/9`} />
        <Chip label="Fixations" value={String(totalFixations)} />
        <Chip label="Dwell" value={`${(totalDwell / 1000).toFixed(1)}s`} />
      </div>

      {/* V3 metrics */}
      {v3Final && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
          <h3 className="text-xs font-medium text-cyan-700 uppercase mb-2">V3 Probabilistic Heatmap</h3>
          <div className="flex flex-wrap gap-2">
            <Chip label="Mass" value={`${v3Final.mass.toFixed(2)}s`} accent />
            <Chip label="Duration" value={`${v3Final.duration.toFixed(2)}s`} accent />
            <Chip label="Confidence" value={`${(v3Final.confidence.score * 100).toFixed(0)}%`} accent />
            <Chip label="Coverage" value={`${(v3Final.confidence.spatialCoverage * 100).toFixed(0)}%`} accent />
            <Chip label="Calib quality" value={`${(v3Final.confidence.calibrationQuality * 100).toFixed(0)}%`} accent />
            <Chip label="Grid" value={`${v3Final.grid.cols}x${v3Final.grid.rows}`} accent />
          </div>
        </div>
      )}

      {/* 3x3 attention map */}
      <div className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">V2 Zone Attention (3x3)</h3>
        <div className="flex flex-col" style={{ aspectRatio: '4/3' }}>
          {[0, 1, 2].map(row => (
            <div key={row} className="flex flex-1">
              {[0, 1, 2].map(col => {
                const zoneId = `r${row}c${col}`;
                const mass = zoneMass[zoneId] ?? 0;
                const m = metrics[zoneId];
                const intensity = Math.min(1, mass * 4);
                return (
                  <div
                    key={zoneId}
                    className="flex-1 flex flex-col items-center justify-center text-xs font-mono border border-slate-100"
                    style={{
                      backgroundColor: `rgba(59, 130, 246, ${0.05 + intensity * 0.6})`,
                      color: intensity > 0.3 ? 'white' : '#64748b',
                    }}
                  >
                    <span className="font-bold">{Math.round(mass * 100)}%</span>
                    <span className="text-[9px] opacity-70">{m?.fixationCount ?? 0} fix</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Dwell time bars */}
      <div className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">Dwell por zona</h3>
        {Object.entries(metrics)
          .sort(([, a], [, b]) => b.totalDwellTime - a.totalDwellTime)
          .map(([id, m]) => {
            const maxDwell = Math.max(...Object.values(metrics).map(z => z.totalDwellTime), 1);
            return (
              <div key={id} className="flex items-center gap-2 mb-1">
                <span className="w-10 text-xs text-slate-600 font-mono">{id}</span>
                <div className="flex-1 h-4 bg-slate-100 rounded-sm overflow-hidden">
                  <div
                    className="h-full rounded-sm bg-blue-500"
                    style={{ width: `${(m.totalDwellTime / maxDwell) * 100}%` }}
                  />
                </div>
                <span className="w-14 text-xs text-slate-500 text-right">{(m.totalDwellTime / 1000).toFixed(1)}s</span>
              </div>
            );
          })}
      </div>

      {/* Event log */}
      <details className="bg-white rounded-lg p-3 shadow-sm">
        <summary className="text-xs font-medium text-slate-500 uppercase cursor-pointer">Event log ({events.length})</summary>
        <div className="mt-2 max-h-48 overflow-y-auto">
          <table className="w-full text-[10px] font-mono">
            <thead><tr className="text-slate-400"><th className="text-left py-0.5">Tipo</th><th className="text-left">Zona</th><th className="text-right">t(ms)</th><th className="text-right">dur</th><th className="text-right">conf</th></tr></thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="text-slate-600 border-t border-slate-50">
                  <td className="py-0.5">{e.type.replace('zone_', '').replace('fixation_', 'fix_')}</td>
                  <td>{e.zoneId ?? '\u2014'}</td>
                  <td className="text-right">{Math.round(e.timestamp)}</td>
                  <td className="text-right">{e.duration ? Math.round(e.duration) : '\u2014'}</td>
                  <td className="text-right">{Math.round(e.confidence * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <button onClick={onRestart} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors self-center">
        Repetir test
      </button>
    </div>
  );
}

function Chip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex flex-col items-center px-2.5 py-1 rounded-lg ${accent ? 'bg-cyan-50 border border-cyan-200' : 'bg-white shadow-sm'}`}>
      <span className="text-[9px] text-slate-400 uppercase">{label}</span>
      <span className={`text-sm font-semibold ${accent ? 'text-cyan-700' : 'text-slate-700'}`}>{value}</span>
    </div>
  );
}
