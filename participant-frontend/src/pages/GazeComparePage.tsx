/**
 * Gaze Compare — dual-engine test page.
 *
 * Runs BlazeGaze (WebEyeTrack) and MediaPipe (FaceLandmarker + Ridge) in
 * parallel on the same camera feed. Shows two colored dots, per-engine RMSE
 * after calibration, and live delta stats.
 *
 * URL: /test/gaze-compare
 * URL: /test/gaze-compare?eval=true  (eval mode — reads window.__gazeEvalGroundTruth)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBlazeGaze } from '../hooks/useBlazeGaze';
import { useMediaPipeGaze } from '../hooks/useMediaPipeGaze';
import {
  BLAZE_GAZE_MEDIA_STREAM_CONSTRAINTS,
  hybridImagePercentToBlazeNorm,
} from '../lib/eyeTracking';
import type { GroundTruth, EvalMetrics } from '../../eval/types';
import { computeAllMetrics, type PredictedSample } from '../../eval/computeMetrics';
import { OnnxGazePredictor } from '../lib/eyeTracking/onnxGazePredictor';
import { getAdapter, type ModelAdapterId } from '../lib/eyeTracking/modelAdapters';

// ---------------------------------------------------------------------------
// Eval mode globals — Playwright injects these before page load
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    __gazeEvalGroundTruth?: GroundTruth;
    __gazeEvalResults?: {
      blazeMetrics: EvalMetrics | null;
      mpMetrics: EvalMetrics | null;
      blazeFps: number;
      mpFps: number;
      evalDurationMs: number;
      ridgeDiagnostics: unknown;
      ridgeCvRmse: number | null;
      done: boolean;
    };
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CALIBRATION_POINTS: [number, number][] = [
  [10, 10], [50, 10], [90, 10],
  [10, 50], [50, 50], [90, 50],
  [10, 90], [50, 90], [90, 90],
];

const SAMPLES_PER_POINT = 20;
const SAMPLE_INTERVAL_MS = 40;

type Phase = 'loading' | 'calibrating' | 'tracking' | 'complete';

interface EngineStats {
  label: string;
  color: string;
  rmse: number | null;
  validFrames: number;
  noGazeFrames: number;
  /** Running average of distance from filtered pos to raw pos (jitter proxy). */
  avgJitter: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pctToScreen(pctX: number, pctY: number): [number, number] {
  return [(pctX / 100) * window.innerWidth, (pctY / 100) * window.innerHeight];
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GazeComparePage() {
  const [searchParams] = useSearchParams();
  const isEvalMode = searchParams.get('eval') === 'true';
  /** Single-engine eval: ?eval=true&engine=mediapipe or ?eval=true&engine=blazegaze */
  const evalEngineParam = searchParams.get('engine') as 'mediapipe' | 'blazegaze' | null;
  const runBlaze = !evalEngineParam || evalEngineParam === 'blazegaze';
  const runMp = !evalEngineParam || evalEngineParam === 'mediapipe';
  const evalGroundTruth = useRef<GroundTruth | null>(
    typeof window !== 'undefined' ? window.__gazeEvalGroundTruth ?? null : null,
  );

  // Eval sample collectors
  const blazePredictedRef = useRef<PredictedSample[]>([]);
  const mpPredictedRef = useRef<PredictedSample[]>([]);
  const evalStartTimeRef = useRef(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [cameraReady, setCameraReady] = useState(false);
  const [calibIdx, setCalibIdx] = useState(0);
  const [calibCapturing, setCalibCapturing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dotProgress, setDotProgress] = useState('');

  // Dots
  const [blazeDot, setBlazeDot] = useState<{ x: number; y: number } | null>(null);
  const [mpDot, setMpDot] = useState<{ x: number; y: number } | null>(null);

  // Stats
  const [blazeStats, setBlazeStats] = useState<EngineStats>({
    label: 'BlazeGaze', color: '#EF4444', rmse: null, validFrames: 0, noGazeFrames: 0, avgJitter: 0,
  });
  const [mpStats, setMpStats] = useState<EngineStats>({
    label: 'MediaPipe+Ridge', color: '#3B82F6', rmse: null, validFrames: 0, noGazeFrames: 0, avgJitter: 0,
  });

  // Validation errors per engine
  const blazeErrorsRef = useRef<number[]>([]);
  const mpErrorsRef = useRef<number[]>([]);

  // Jitter accumulators
  const blazeJitterRef = useRef({ sum: 0, count: 0 });
  const mpJitterRef = useRef({ sum: 0, count: 0 });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Engines ---
  // ?predictor=onnx&model=eth-xgaze (or eyetheia, mobilegaze, generic)
  const useRff = searchParams.get('rff') === 'true';
  const useOnnx = searchParams.get('predictor') === 'onnx';
  const modelId = (searchParams.get('model') ?? 'generic') as ModelAdapterId;
  const onnxPredictorRef = useRef(
    useOnnx ? new OnnxGazePredictor(getAdapter(modelId)) : null,
  );
  const blaze = useBlazeGaze(videoRef, { oneEuroMinCutoff: 0.6, oneEuroBeta: 0.007 });
  const mp = useMediaPipeGaze(videoRef, {
    oneEuroMinCutoff: 1.2,
    oneEuroBeta: 0.05,
    rff: useRff ? { D: 128, sigma: 'auto', seed: 42 } : false,
    predictor: onnxPredictorRef.current ?? undefined,
  });

  const enginesReady = (runBlaze ? blaze.isLoaded : true) && (runMp ? mp.isLoaded : true);

  // Debug logging for eval mode
  useEffect(() => {
    if (!isEvalMode) return;
    const log = `phase=${phase} runBlaze=${runBlaze} runMp=${runMp} blazeLoaded=${blaze.isLoaded} mpLoaded=${mp.isLoaded} enginesReady=${enginesReady} cameraReady=${cameraReady}`;
    (window as unknown as Record<string, unknown>).__evalDebugLog = log;
    console.log('[eval-debug]', log);
  }, [phase, blaze.isLoaded, mp.isLoaded, enginesReady, cameraReady, isEvalMode, runBlaze, runMp]);

  // --- Camera ---
  useEffect(() => {
    let cancelled = false;
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(BLAZE_GAZE_MEDIA_STREAM_CONSTRAINTS);
        if (cancelled) return;
        const video = videoRef.current;
        if (video) { video.srcObject = stream; await video.play(); }
        if (!cancelled) setCameraReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Camera denied');
      }
    }
    initCamera();
    return () => { cancelled = true; };
  }, []);

  // --- Auto-advance ---
  useEffect(() => {
    if (cameraReady && enginesReady && phase === 'loading') {
      if (runBlaze) blaze.start();
      if (runMp) mp.start();
      if (isEvalMode && evalGroundTruth.current) {
        // Skip interactive calibration — go straight to time-synced eval
        startTimeSyncedEval();
      } else {
        setPhase('calibrating');
      }
    }
  }, [cameraReady, enginesReady, phase, blaze, mp, isEvalMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Calibration click ---
  const handleCalibClick = useCallback(() => {
    if (calibCapturing || phase !== 'calibrating') return;
    setCalibCapturing(true);

    const [targetX, targetY] = pctToScreen(CALIBRATION_POINTS[calibIdx][0], CALIBRATION_POINTS[calibIdx][1]);
    const blazeSamples: { x: number; y: number }[] = [];
    const mpSamples: { x: number; y: number }[] = [];
    let count = 0;

    const iv = setInterval(() => {
      // Collect raw screen coords from both engines
      const bg = blaze.rawScreenRef?.current;
      const mg = mp.rawScreenRef?.current;
      if (bg) blazeSamples.push({ ...bg });
      if (mg) mpSamples.push({ ...mg });
      count++;

      if (count >= SAMPLES_PER_POINT) {
        clearInterval(iv);

        // BlazeGaze calibration: call internal calibrate with normalized coords
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const normCoords = hybridImagePercentToBlazeNorm(
          new DOMRect(0, 0, vw, vh),
          CALIBRATION_POINTS[calibIdx][0],
          CALIBRATION_POINTS[calibIdx][1],
          vw,
          vh,
        );
        for (let i = 0; i < 3; i++) blaze.calibrate(normCoords[0], normCoords[1]);

        // MediaPipe calibration: add ridge sample (features → screen target)
        mp.calibrate(targetX, targetY);

        // Store validation error (avg distance of raw samples to target)
        if (blazeSamples.length > 0) {
          const avgErr = blazeSamples.reduce((s, p) => s + dist(p, { x: targetX, y: targetY }), 0) / blazeSamples.length;
          blazeErrorsRef.current.push(avgErr);
        }
        if (mpSamples.length > 0) {
          const avgErr = mpSamples.reduce((s, p) => s + dist(p, { x: targetX, y: targetY }), 0) / mpSamples.length;
          mpErrorsRef.current.push(avgErr);
        }

        setCalibCapturing(false);
        const next = calibIdx + 1;
        if (next < CALIBRATION_POINTS.length) {
          setCalibIdx(next);
        } else {
          // Train MediaPipe ridge
          void mp.trainRidge();
          // Compute RMSE
          const blazeRmse = Math.sqrt(blazeErrorsRef.current.reduce((s, e) => s + e * e, 0) / blazeErrorsRef.current.length);
          const mpRmse = Math.sqrt(mpErrorsRef.current.reduce((s, e) => s + e * e, 0) / mpErrorsRef.current.length);
          setBlazeStats(prev => ({ ...prev, rmse: blazeRmse }));
          setMpStats(prev => ({ ...prev, rmse: mpRmse }));
          startTracking();
        }
      }
    }, SAMPLE_INTERVAL_MS);
  }, [calibIdx, calibCapturing, phase, blaze, mp]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Tracking ---
  const startTracking = useCallback(() => {
    setPhase('tracking');
    const startTime = Date.now();
    evalStartTimeRef.current = startTime;
    blazePredictedRef.current = [];
    mpPredictedRef.current = [];

    pollRef.current = setInterval(() => {
      const bg = blaze.gazePosRef.current;
      const br = blaze.rawScreenRef?.current;
      const mg = mp.gazePosRef.current;
      const mr = mp.rawScreenRef?.current;
      const t = Date.now() - startTime;

      if (bg) {
        setBlazeDot({ ...bg });
        if (br) {
          const j = dist(bg, br);
          blazeJitterRef.current.sum += j;
          blazeJitterRef.current.count += 1;
        }
        // Eval: collect predicted sample
        if (isEvalMode) {
          blazePredictedRef.current.push({ t, x: bg.x, y: bg.y });
        }
      }
      if (mg) {
        setMpDot({ ...mg });
        if (mr) {
          const j = dist(mg, mr);
          mpJitterRef.current.sum += j;
          mpJitterRef.current.count += 1;
        }
        if (isEvalMode) {
          mpPredictedRef.current.push({ t, x: mg.x, y: mg.y });
        }
      }

      // Update stats every ~500ms
      const el = Date.now() - startTime;
      if (el % 500 < 50) {
        const bfs = blaze.getFrameStats();
        const mfs = mp.getFrameStats();
        setBlazeStats(prev => ({
          ...prev,
          validFrames: bfs.validGazeFrames,
          noGazeFrames: bfs.noValidGazeFrames,
          avgJitter: blazeJitterRef.current.count > 0 ? blazeJitterRef.current.sum / blazeJitterRef.current.count : 0,
        }));
        setMpStats(prev => ({
          ...prev,
          validFrames: mfs.validGazeFrames,
          noGazeFrames: mfs.noValidGazeFrames,
          avgJitter: mpJitterRef.current.count > 0 ? mpJitterRef.current.sum / mpJitterRef.current.count : 0,
        }));
      }

      // Eval: auto-complete after last GT evaluation point ends
      if (isEvalMode && evalGroundTruth.current) {
        const gt = evalGroundTruth.current;
        const lastEvalEnd = gt.evaluation.length > 0
          ? Math.max(...gt.evaluation.map(p => p.endMs))
          : 10000;
        if (t >= lastEvalEnd + 500) {
          completeSession();
        }
      }
    }, 50);

    timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
  }, [blaze, mp, isEvalMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Complete ---
  const completeSession = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    blaze.stop();
    mp.stop();
    // Final stats snapshot
    const bfs = blaze.getFrameStats();
    const mfs = mp.getFrameStats();
    setBlazeStats(prev => ({
      ...prev,
      validFrames: bfs.validGazeFrames,
      noGazeFrames: bfs.noValidGazeFrames,
      avgJitter: blazeJitterRef.current.count > 0 ? blazeJitterRef.current.sum / blazeJitterRef.current.count : 0,
    }));
    setMpStats(prev => ({
      ...prev,
      validFrames: mfs.validGazeFrames,
      noGazeFrames: mfs.noValidGazeFrames,
      avgJitter: mpJitterRef.current.count > 0 ? mpJitterRef.current.sum / mpJitterRef.current.count : 0,
    }));
    // Eval: compute and expose metrics for Playwright
    if (isEvalMode && evalGroundTruth.current) {
      const gt = evalGroundTruth.current.evaluation;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const evalTicks = Math.max(1, evalTickCountRef.current);
      const evalDurationMs = evalPhaseStartRef.current > 0
        ? Date.now() - evalPhaseStartRef.current
        : 1;
      const evalDurationS = evalDurationMs / 1000;

      const blazeMetrics = runBlaze
        ? computeAllMetrics('BlazeGaze', blazePredictedRef.current, gt, evalTicks, vw, vh)
        : null;
      const mpMetrics = runMp
        ? computeAllMetrics('MediaPipe+Ridge', mpPredictedRef.current, gt, evalTicks, vw, vh)
        : null;

      window.__gazeEvalResults = {
        blazeMetrics,
        mpMetrics,
        blazeFps: evalDurationS > 0 ? blazePredictedRef.current.length / evalDurationS : 0,
        mpFps: evalDurationS > 0 ? mpPredictedRef.current.length / evalDurationS : 0,
        evalDurationMs,
        ridgeDiagnostics: runMp ? mp.predictorRef.current.diagnostics : null,
        ridgeCvRmse: runMp ? mp.predictorRef.current.cvRmsePx : null,
        done: true,
      };
    }

    setPhase('complete');
  }, [blaze, mp, isEvalMode, runBlaze, runMp]);

  // --- Eval: time-synced calibration + evaluation from GT ---
  // Track last seen features to avoid duplicate calibration samples (Bug #5)
  const lastCalibFeaturesIdRef = useRef(0);
  const evalTickCountRef = useRef(0);
  const evalPhaseStartRef = useRef(0); // for FPS calculation

  const startTimeSyncedEval = useCallback(() => {
    const gt = evalGroundTruth.current;
    if (!gt) return;

    setPhase('tracking');
    setDotProgress(`Eval: calibrating (${evalEngineParam ?? 'both engines'})`);

    const startTime = Date.now();
    evalStartTimeRef.current = startTime;
    blazePredictedRef.current = [];
    mpPredictedRef.current = [];
    evalTickCountRef.current = 0;
    evalPhaseStartRef.current = 0;
    lastCalibFeaturesIdRef.current = 0;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let ridgeTrained = !runMp; // skip ridge training if MP not running
    let blazeCalibDone = !runBlaze;
    let calibSamplesCollected = 0;
    let lastMpPos: { x: number; y: number } | null = null;
    let lastBlazePos: { x: number; y: number } | null = null;

    pollRef.current = setInterval(() => {
      const t = Date.now() - startTime;

      // --- Calibration phase ---
      if (!ridgeTrained || !blazeCalibDone) {
        const calPoint = gt.calibration.find(c => t >= c.startMs && t <= c.endMs);
        if (calPoint) {
          const targetX = calPoint.x * vw;
          const targetY = calPoint.y * vh;

          if (runBlaze) {
            const normX = calPoint.x - 0.5;
            const normY = calPoint.y - 0.5;
            blaze.calibrate(normX, normY);
          }

          if (runMp) {
            const currentFeatures = mp.lastFeaturesRef.current;
            const featuresId = currentFeatures ? currentFeatures[0] + currentFeatures[4] : 0;
            if (currentFeatures && Math.abs(featuresId - lastCalibFeaturesIdRef.current) > 1e-8) {
              mp.calibrate(targetX, targetY);
              lastCalibFeaturesIdRef.current = featuresId;
              calibSamplesCollected++;
            }
          }
        }

        const lastCalEnd = Math.max(...gt.calibration.map(c => c.endMs));
        if (t > lastCalEnd + 200) {
          if (runMp && calibSamplesCollected > 0) {
            void mp.trainRidge();
            ridgeTrained = true;
          }
          blazeCalibDone = true;
          evalPhaseStartRef.current = Date.now();
          setDotProgress(`Eval: collecting (${calibSamplesCollected} cal, engine=${evalEngineParam ?? 'both'})`);
        }
        return;
      }

      // --- Evaluation phase ---
      evalTickCountRef.current++;

      if (runBlaze) {
        const bg = blaze.gazePosRef.current;
        if (bg && bg !== lastBlazePos) {
          lastBlazePos = bg;
          blazePredictedRef.current.push({ t, x: bg.x, y: bg.y });
        }
      }

      if (runMp) {
        const mg = mp.gazePosRef.current;
        if (mg && mg !== lastMpPos) {
          lastMpPos = mg;
          mpPredictedRef.current.push({ t, x: mg.x, y: mg.y });
        }
      }

      if (t % 500 < 30) {
        setElapsed(Math.floor(t / 1000));
        // Live FPS
        const evalElapsed = (Date.now() - evalPhaseStartRef.current) / 1000;
        if (evalElapsed > 0.5) {
          const mpFps = mpPredictedRef.current.length / evalElapsed;
          const bgFps = blazePredictedRef.current.length / evalElapsed;
          setDotProgress(`Eval: MP ${mpFps.toFixed(1)}fps BG ${bgFps.toFixed(1)}fps (${Math.floor(t / 1000)}s)`);
        }
      }

      const lastEvalEnd = gt.evaluation.length > 0
        ? Math.max(...gt.evaluation.map(p => p.endMs))
        : 10000;
      if (t >= lastEvalEnd + 500) {
        completeSession();
      }
    }, 20); // 20ms poll — catch frames at up to 50fps
  }, [blaze, mp, completeSession]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Cleanup ---
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // --- Delta between engines ---
  const liveDelta = useMemo(() => {
    if (!blazeDot || !mpDot) return null;
    return Math.round(dist(blazeDot, mpDot));
  }, [blazeDot, mpDot]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isCalibrating = phase === 'calibrating';
  const isTracking = phase === 'tracking';
  const cp = CALIBRATION_POINTS[calibIdx];

  return (
    <div className="min-h-screen bg-slate-900 text-white relative overflow-hidden">
      {/* Camera preview */}
      <video
        ref={videoRef}
        className={`fixed z-50 bottom-4 right-4 rounded-lg object-cover bg-black border-2 border-white/30 shadow-lg ${
          isCalibrating || isTracking ? 'w-32 h-24 opacity-50' : 'hidden'
        }`}
        autoPlay muted playsInline
      />

      {/* Gaze dots — fullscreen overlay */}
      {isTracking && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          {blazeDot && (
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white"
              style={{
                left: blazeDot.x - 8, top: blazeDot.y - 8,
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
              }}
            />
          )}
          {mpDot && (
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white"
              style={{
                left: mpDot.x - 8, top: mpDot.y - 8,
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
              }}
            />
          )}
        </div>
      )}

      {/* Calibration dot */}
      {isCalibrating && cp && (
        <div
          className={`fixed z-50 w-8 h-8 rounded-full border-3 border-white shadow-lg cursor-crosshair ${
            calibCapturing ? 'bg-amber-400 scale-125' : 'bg-green-400 animate-pulse'
          } transition-all`}
          style={{
            left: `${cp[0]}%`, top: `${cp[1]}%`,
            transform: 'translate(-50%, -50%)',
          }}
          onClick={handleCalibClick}
        />
      )}

      {/* Header */}
      <header className="relative z-30 bg-slate-800/80 backdrop-blur border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Gaze Compare</h1>
          <p className="text-xs text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />BlazeGaze
            {' '}
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1 ml-2" />MediaPipe+Ridge
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isTracking && liveDelta !== null && (
            <span className="text-sm font-mono text-slate-300">
              Delta: <strong className="text-amber-300">{liveDelta}px</strong>
            </span>
          )}
          {isTracking && <span className="text-sm font-mono text-blue-400">{elapsed}s</span>}
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            isTracking ? 'bg-green-900 text-green-300'
              : isCalibrating ? 'bg-amber-900 text-amber-300'
              : 'bg-slate-700 text-slate-400'
          }`}>{phase}</span>
          {isTracking && (
            <button onClick={completeSession} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors">
              Terminar
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <div className="relative z-20 flex flex-col items-center justify-center min-h-[calc(100vh-56px)] p-4 gap-4">
        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-r-transparent" />
            <p className="text-sm text-slate-400">
              {!cameraReady ? 'Iniciando camara...' : 'Cargando modelos...'}
            </p>
            <p className="text-xs text-slate-500">
              BlazeGaze: {blaze.isLoaded ? 'OK' : '...'} | MediaPipe: {mp.isLoaded ? 'OK' : '...'}
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        )}

        {isCalibrating && !isEvalMode && (
          <div className="text-center">
            <p className="text-lg font-medium text-slate-300 mb-2">Calibracion</p>
            <p className="text-sm text-slate-400">
              {calibCapturing
                ? 'Capturando... sigue mirando el punto'
                : `Mira el punto verde y haz clic (${calibIdx + 1}/${CALIBRATION_POINTS.length})`}
            </p>
            <p className="text-xs text-slate-500 mt-1">Ambos motores calibran simultaneamente</p>
          </div>
        )}

        {/* Eval progress */}
        {isEvalMode && isTracking && dotProgress && (
          <div className="text-center mb-2">
            <p className="text-sm text-amber-300 font-mono">{dotProgress}</p>
            <p className="text-xs text-slate-500">{elapsed}s elapsed</p>
          </div>
        )}

        {/* Stats panel — shown during tracking and complete */}
        {(isTracking || phase === 'complete') && (
          <div className="w-full max-w-2xl flex flex-col gap-3">
            <div className="flex gap-3">
              <StatsCard stats={blazeStats} />
              <StatsCard stats={mpStats} />
            </div>

            {/* Live comparison */}
            {isTracking && liveDelta !== null && (
              <div className="bg-slate-800 rounded-lg p-3 text-center">
                <span className="text-xs text-slate-500 uppercase">Distancia entre motores</span>
                <p className={`text-3xl font-mono font-bold ${liveDelta < 80 ? 'text-green-400' : liveDelta < 150 ? 'text-amber-400' : 'text-red-400'}`}>
                  {liveDelta}px
                </p>
              </div>
            )}

            {phase === 'complete' && (
              <div className="flex flex-col items-center gap-3 mt-4">
                <div className="bg-slate-800 rounded-lg p-4 w-full">
                  <h3 className="text-xs font-medium text-slate-500 uppercase mb-3">Comparacion final</h3>
                  <ComparisonRow label="RMSE calibracion" blaze={blazeStats.rmse} mp={mpStats.rmse} unit="px" lower />
                  <ComparisonRow label="Jitter promedio" blaze={blazeStats.avgJitter} mp={mpStats.avgJitter} unit="px" lower />
                  <ComparisonRow label="Frames validos" blaze={blazeStats.validFrames} mp={mpStats.validFrames} unit="" />
                  <ComparisonRow label="Sin gaze" blaze={blazeStats.noGazeFrames} mp={mpStats.noGazeFrames} unit="" lower />
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Repetir test
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatsCard({ stats }: { stats: EngineStats }) {
  return (
    <div className="flex-1 bg-slate-800 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stats.color }} />
        <span className="text-sm font-semibold">{stats.label}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono">
        <span className="text-slate-400">RMSE: <strong className="text-white">{stats.rmse !== null ? `${Math.round(stats.rmse)}px` : '—'}</strong></span>
        <span className="text-slate-400">Jitter: <strong className="text-white">{Math.round(stats.avgJitter)}px</strong></span>
        <span className="text-slate-400">Valid: <strong className="text-green-300">{stats.validFrames}</strong></span>
        <span className="text-slate-400">NoGaze: <strong className="text-red-300">{stats.noGazeFrames}</strong></span>
      </div>
    </div>
  );
}

function ComparisonRow({ label, blaze, mp, unit, lower }: {
  label: string;
  blaze: number | null;
  mp: number | null;
  unit: string;
  lower?: boolean;
}) {
  const bVal = blaze ?? 0;
  const mVal = mp ?? 0;
  // lower=true means lower is better (RMSE, jitter), else higher is better (valid frames)
  const blazeWins = lower ? bVal < mVal : bVal > mVal;
  const mpWins = lower ? mVal < bVal : mVal > bVal;
  const tie = Math.abs(bVal - mVal) < 0.5;

  return (
    <div className="flex items-center gap-2 py-1 border-b border-slate-700 last:border-0">
      <span className="flex-1 text-xs text-slate-400">{label}</span>
      <span className={`w-24 text-right text-xs font-mono ${tie ? 'text-slate-300' : blazeWins ? 'text-green-400' : 'text-slate-500'}`}>
        {blaze !== null ? `${Math.round(bVal)}${unit}` : '—'}
      </span>
      <span className={`w-24 text-right text-xs font-mono ${tie ? 'text-slate-300' : mpWins ? 'text-green-400' : 'text-slate-500'}`}>
        {mp !== null ? `${Math.round(mVal)}${unit}` : '—'}
      </span>
    </div>
  );
}
