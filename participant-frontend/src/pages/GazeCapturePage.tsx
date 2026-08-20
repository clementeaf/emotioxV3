/**
 * Gaze Capture — self-recording dataset generator.
 *
 * Shows calibration + evaluation dots at known positions while recording
 * the webcam feed. Exports:
 *   - video as WebM (browser-native, convert to Y4M offline via ffmpeg)
 *   - ground-truth.json with calibration + evaluation points
 *   - metadata.json with viewport, duration, timestamps
 *
 * This creates perfectly aligned datasets on the user's actual hardware.
 * No public dataset can guarantee this alignment.
 *
 * URL: /test/gaze-capture
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GroundTruthPoint {
  startMs: number;
  endMs: number;
  x: number;
  y: number;
  zone?: string;
  label: string;
}

interface CapturePhase {
  type: 'calibration' | 'evaluation';
  points: { pctX: number; pctY: number; durationMs: number; label: string; zone?: string }[];
}

type Phase = 'idle' | 'countdown' | 'recording' | 'complete';

// ---------------------------------------------------------------------------
// Dot sequence — 9-point calibration + 12-point evaluation grid
// ---------------------------------------------------------------------------

const PAUSE_BETWEEN_DOTS_MS = 800;
const COUNTDOWN_S = 3;

const CALIBRATION_PHASE: CapturePhase = {
  type: 'calibration',
  points: [
    { pctX: 10, pctY: 10, durationMs: 1200, label: 'cal-1' },
    { pctX: 50, pctY: 10, durationMs: 1200, label: 'cal-2' },
    { pctX: 90, pctY: 10, durationMs: 1200, label: 'cal-3' },
    { pctX: 10, pctY: 50, durationMs: 1200, label: 'cal-4' },
    { pctX: 50, pctY: 50, durationMs: 1200, label: 'cal-5' },
    { pctX: 90, pctY: 50, durationMs: 1200, label: 'cal-6' },
    { pctX: 10, pctY: 90, durationMs: 1200, label: 'cal-7' },
    { pctX: 50, pctY: 90, durationMs: 1200, label: 'cal-8' },
    { pctX: 90, pctY: 90, durationMs: 1200, label: 'cal-9' },
  ],
};

const EVALUATION_PHASE: CapturePhase = {
  type: 'evaluation',
  points: [
    // Left/right saccades
    { pctX: 20, pctY: 50, durationMs: 2000, label: 'eval-left-1', zone: 'left' },
    { pctX: 80, pctY: 50, durationMs: 2000, label: 'eval-right-1', zone: 'right' },
    { pctX: 20, pctY: 50, durationMs: 2000, label: 'eval-left-2', zone: 'left' },
    { pctX: 80, pctY: 50, durationMs: 2000, label: 'eval-right-2', zone: 'right' },
    // Diagonal scan
    { pctX: 20, pctY: 20, durationMs: 1500, label: 'eval-tl' },
    { pctX: 80, pctY: 80, durationMs: 1500, label: 'eval-br' },
    { pctX: 80, pctY: 20, durationMs: 1500, label: 'eval-tr' },
    { pctX: 20, pctY: 80, durationMs: 1500, label: 'eval-bl' },
    // Center hold
    { pctX: 50, pctY: 50, durationMs: 3000, label: 'eval-center' },
    // Quick saccades
    { pctX: 15, pctY: 50, durationMs: 1000, label: 'eval-far-left', zone: 'left' },
    { pctX: 85, pctY: 50, durationMs: 1000, label: 'eval-far-right', zone: 'right' },
    { pctX: 50, pctY: 50, durationMs: 1500, label: 'eval-center-final' },
  ],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GazeCapturePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef(0);

  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(COUNTDOWN_S);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Current dot
  const [currentDot, setCurrentDot] = useState<{ pctX: number; pctY: number; label: string } | null>(null);
  const [dotProgress, setDotProgress] = useState('');

  // Results
  const [groundTruth, setGroundTruth] = useState<{ calibration: GroundTruthPoint[]; evaluation: GroundTruthPoint[] } | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  // Camera init
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) return;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setCameraReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Camera denied');
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  // Start recording
  const startCapture = useCallback(async () => {
    setPhase('countdown');
    setCountdown(COUNTDOWN_S);

    // Countdown
    for (let i = COUNTDOWN_S; i > 0; i--) {
      setCountdown(i);
      await sleep(1000);
    }

    // Start MediaRecorder
    const video = videoRef.current;
    if (!video?.srcObject) return;

    const stream = video.srcObject as MediaStream;
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm',
    });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.start(100); // 100ms chunks
    mediaRecorderRef.current = recorder;
    recordingStartRef.current = performance.now();

    setPhase('recording');

    // Run dot sequence
    const calibrationGT: GroundTruthPoint[] = [];
    const evaluationGT: GroundTruthPoint[] = [];

    for (const capturePhase of [CALIBRATION_PHASE, EVALUATION_PHASE]) {
      for (let i = 0; i < capturePhase.points.length; i++) {
        const pt = capturePhase.points[i];
        const label = `${capturePhase.type} ${i + 1}/${capturePhase.points.length}`;
        setDotProgress(label);
        setCurrentDot({ pctX: pt.pctX, pctY: pt.pctY, label: pt.label });

        const startMs = Math.round(performance.now() - recordingStartRef.current);
        await sleep(pt.durationMs);
        const endMs = Math.round(performance.now() - recordingStartRef.current);

        const gtPoint: GroundTruthPoint = {
          startMs,
          endMs,
          x: pt.pctX / 100,
          y: pt.pctY / 100,
          label: pt.label,
          ...(pt.zone ? { zone: pt.zone } : {}),
        };

        if (capturePhase.type === 'calibration') {
          calibrationGT.push(gtPoint);
        } else {
          evaluationGT.push(gtPoint);
        }

        // Pause between dots (blank screen)
        setCurrentDot(null);
        await sleep(PAUSE_BETWEEN_DOTS_MS);
      }
    }

    // Stop recording
    setCurrentDot(null);
    recorder.stop();
    await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    setVideoBlob(blob);
    setGroundTruth({ calibration: calibrationGT, evaluation: evaluationGT });
    setPhase('complete');
  }, []);

  // Downloads
  const downloadVideo = useCallback(() => {
    if (!videoBlob) return;
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gaze-capture.webm';
    a.click();
    URL.revokeObjectURL(url);
  }, [videoBlob]);

  const downloadGroundTruth = useCallback(() => {
    if (!groundTruth) return;
    const json = JSON.stringify(groundTruth, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ground-truth.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [groundTruth]);

  const downloadMetadata = useCallback(() => {
    const meta = {
      name: `capture-${new Date().toISOString().slice(0, 19)}`,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      videoWidth: videoRef.current?.videoWidth ?? 0,
      videoHeight: videoRef.current?.videoHeight ?? 0,
      durationMs: groundTruth
        ? Math.max(
            ...groundTruth.evaluation.map(p => p.endMs),
            ...groundTruth.calibration.map(p => p.endMs),
          )
        : 0,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      conversionNote: 'Convert WebM to Y4M: ffmpeg -i gaze-capture.webm -pix_fmt yuv420p video.y4m',
    };
    const blob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'metadata.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [groundTruth]);

  const downloadAll = useCallback(() => {
    downloadVideo();
    downloadGroundTruth();
    downloadMetadata();
  }, [downloadVideo, downloadGroundTruth, downloadMetadata]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-900 text-white relative overflow-hidden">
      {/* Camera preview */}
      <video
        ref={videoRef}
        className={`fixed z-50 bottom-4 right-4 rounded-lg object-cover bg-black border-2 border-white/30 shadow-lg ${
          phase === 'recording' ? 'w-24 h-18 opacity-40' : phase === 'idle' ? 'w-48 h-36' : 'hidden'
        }`}
        autoPlay muted playsInline
      />

      {/* Recording dot */}
      {currentDot && (
        <div
          className="fixed z-40 w-6 h-6 rounded-full bg-green-400 border-2 border-white shadow-lg animate-pulse"
          style={{
            left: `${currentDot.pctX}%`,
            top: `${currentDot.pctY}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}

      {/* Recording indicator */}
      {phase === 'recording' && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-xs font-medium">REC</span>
        </div>
      )}

      {/* Header */}
      <header className="relative z-30 bg-slate-800/80 backdrop-blur border-b border-slate-700 px-4 py-3">
        <h1 className="text-lg font-semibold">Gaze Capture — Dataset Generator</h1>
        <p className="text-xs text-slate-400">
          Graba tu webcam mirando puntos conocidos. Exporta video + ground-truth.json.
        </p>
      </header>

      <div className="relative z-20 flex flex-col items-center justify-center min-h-[calc(100vh-56px)] p-4 gap-4">
        {phase === 'idle' && (
          <div className="text-center max-w-md">
            <p className="text-slate-300 mb-4">
              Esta herramienta graba tu camara mientras sigues puntos verdes en la pantalla.
              El video + coordenadas se exportan como dataset para evaluacion automatizada.
            </p>
            <p className="text-sm text-slate-400 mb-6">
              Secuencia: 9 puntos de calibracion ({Math.round(9 * 1.2 + 9 * 0.8)}s) +
              12 puntos de evaluacion ({Math.round(EVALUATION_PHASE.points.reduce((s, p) => s + p.durationMs, 0) / 1000 + 12 * 0.8)}s)
            </p>
            {!cameraReady && !error && (
              <p className="text-amber-400 text-sm mb-4">Iniciando camara...</p>
            )}
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button
              onClick={startCapture}
              disabled={!cameraReady}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Iniciar captura
            </button>
          </div>
        )}

        {phase === 'countdown' && (
          <div className="text-center">
            <p className="text-6xl font-bold text-amber-400">{countdown}</p>
            <p className="text-slate-400 mt-2">Preparate para seguir los puntos verdes</p>
          </div>
        )}

        {phase === 'recording' && (
          <div className="text-center">
            <p className="text-sm text-slate-400">{dotProgress}</p>
            {!currentDot && <p className="text-xs text-slate-500 mt-2">Transicion...</p>}
          </div>
        )}

        {phase === 'complete' && groundTruth && (
          <div className="text-center max-w-lg">
            <p className="text-xl font-semibold text-green-400 mb-4">Captura completa</p>

            <div className="flex flex-wrap gap-2 justify-center mb-6">
              <Chip label="Calibracion" value={`${groundTruth.calibration.length} pts`} />
              <Chip label="Evaluacion" value={`${groundTruth.evaluation.length} pts`} />
              <Chip label="Duracion" value={`${Math.round(Math.max(...groundTruth.evaluation.map(p => p.endMs)) / 1000)}s`} />
              <Chip label="Viewport" value={`${window.innerWidth}×${window.innerHeight}`} />
            </div>

            {/* Benchmark button + results */}
            <BenchmarkRunner videoBlob={videoBlob} groundTruth={groundTruth} />

            <div className="flex flex-col gap-2 mb-6 mt-4">
              <button onClick={downloadAll} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors text-sm">
                Descargar archivos (3)
              </button>
            </div>

            <div className="bg-slate-800 rounded-lg p-4 text-left text-xs text-slate-400">
              <p className="font-medium text-slate-300 mb-2">CLI alternativo:</p>
              <pre className="bg-slate-900 rounded p-2 overflow-x-auto">{`npx tsx eval/runBenchmark.ts docs/gaze-capture.webm`}</pre>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
            >
              Nueva captura
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BenchmarkRunner — triggers full pipeline from button
// ---------------------------------------------------------------------------

interface BenchmarkResult {
  summary: {
    byEngine: Record<string, {
      avgRmsePx: number;
      avgJitterPx: number;
      avgDriftPxPerS: number;
      avgValidFrameRatio: number;
      avgFalseZoneChanges: number;
      avgLatencyMs: number;
    }>;
  };
}

type BenchmarkStatus = 'idle' | 'saving' | 'converting' | 'running' | 'done' | 'error';

function BenchmarkRunner({ videoBlob, groundTruth }: {
  videoBlob: Blob | null;
  groundTruth: { calibration: GroundTruthPoint[]; evaluation: GroundTruthPoint[] };
}) {
  const [status, setStatus] = useState<BenchmarkStatus>('idle');
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const runBenchmark = useCallback(async () => {
    if (!videoBlob) return;
    setStatus('saving');
    setErrorMsg('');

    try {
      // Step 1: Save video to docs/ via download (browser can't write to fs)
      // Instead, tell the backend middleware where the video already is
      // If user captured via this page, the video is in memory — save via API
      setStatus('converting');

      // Use the API endpoint to trigger the benchmark
      // The video at docs/gaze-capture.webm was already captured
      const resp = await fetch('/api/eval/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webmPath: 'docs/gaze-capture.webm',
          gtJson: groundTruth,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }));
        throw new Error(err.error ?? `HTTP ${resp.status}`);
      }

      setStatus('running');

      // Poll for results
      for (let i = 0; i < 120; i++) { // max 10 min
        await sleep(5000);
        try {
          const res = await fetch('/api/eval/results');
          if (res.ok) {
            const data = await res.json() as BenchmarkResult;
            if (data.summary?.byEngine && Object.keys(data.summary.byEngine).length > 0) {
              setResult(data);
              setStatus('done');
              return;
            }
          }
        } catch { /* keep polling */ }
      }

      setStatus('error');
      setErrorMsg('Timeout — benchmark did not complete in 10 minutes');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }, [videoBlob, groundTruth]);

  if (status === 'idle') {
    return (
      <div className="mb-4">
        <button
          onClick={runBenchmark}
          className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-lg transition-colors shadow-lg"
        >
          Ejecutar Benchmark
        </button>
        <p className="text-xs text-slate-500 mt-2">
          Convierte video, ejecuta ambos motores, genera reporte. Requiere ffmpeg.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="mb-4">
        <p className="text-red-400 text-sm mb-2">{errorMsg}</p>
        <p className="text-xs text-slate-500 mb-2">
          Alternativa CLI: <code className="bg-slate-800 px-1 rounded">npx tsx eval/runBenchmark.ts docs/gaze-capture.webm</code>
        </p>
        <button onClick={runBenchmark} className="px-4 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm">
          Reintentar
        </button>
      </div>
    );
  }

  if (status !== 'done' || !result) {
    const labels: Record<BenchmarkStatus, string> = {
      idle: '', saving: 'Guardando video...', converting: 'Convirtiendo WebM → Y4M...',
      running: 'Ejecutando benchmark (esto toma ~2-5 min)...', done: '', error: '',
    };
    return (
      <div className="mb-4 flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-amber-500 border-r-transparent" />
        <p className="text-sm text-amber-300">{labels[status]}</p>
      </div>
    );
  }

  // Results display
  const engines = Object.entries(result.summary.byEngine);
  const [engA, engB] = engines;

  const winner = engA && engB
    ? engA[1].avgRmsePx < engB[1].avgRmsePx ? engA[0] : engB[0]
    : engines[0]?.[0] ?? 'unknown';

  return (
    <div className="mb-4 w-full">
      {/* Winner banner */}
      <div className="bg-green-900/50 border border-green-700 rounded-lg p-3 mb-3">
        <p className="text-xs text-green-400 uppercase font-medium">Ganador por RMSE</p>
        <p className="text-2xl font-bold text-green-300">{winner}</p>
      </div>

      {/* Metrics table */}
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left p-2 text-slate-400 font-medium">Metrica</th>
              {engines.map(([name]) => (
                <th key={name} className="text-right p-2 text-slate-300 font-medium">{name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <MetricRow label="RMSE" engines={engines} pick={s => s.avgRmsePx} unit="px" lower />
            <MetricRow label="Jitter" engines={engines} pick={s => s.avgJitterPx} unit="px" lower />
            <MetricRow label="Drift" engines={engines} pick={s => s.avgDriftPxPerS} unit="px/s" lower />
            <MetricRow label="Frames validos" engines={engines} pick={s => s.avgValidFrameRatio * 100} unit="%" />
            <MetricRow label="Falsos zona" engines={engines} pick={s => s.avgFalseZoneChanges} unit="" lower />
            <MetricRow label="Latencia" engines={engines} pick={s => s.avgLatencyMs} unit="ms" lower />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricRow({ label, engines, pick, unit, lower }: {
  label: string;
  engines: [string, BenchmarkResult['summary']['byEngine'][string]][];
  pick: (s: BenchmarkResult['summary']['byEngine'][string]) => number;
  unit: string;
  lower?: boolean;
}) {
  const values = engines.map(([, s]) => pick(s));
  const best = lower ? Math.min(...values) : Math.max(...values);

  return (
    <tr className="border-b border-slate-700/50">
      <td className="p-2 text-slate-400">{label}</td>
      {values.map((v, i) => {
        const isBest = Math.abs(v - best) < 0.5;
        return (
          <td key={engines[i][0]} className={`p-2 text-right font-mono ${isBest ? 'text-green-400 font-bold' : 'text-slate-500'}`}>
            {v.toFixed(1)}{unit}
          </td>
        );
      })}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-1 rounded-lg bg-slate-800">
      <span className="text-[9px] text-slate-500 uppercase">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
