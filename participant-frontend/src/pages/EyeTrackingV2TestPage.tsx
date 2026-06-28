/**
 * Eye Tracking V2 Test Page
 *
 * Flow: camera → calibration (5 points) → viewing with zone tracking.
 * Desktop: BlazeGaze CNN + IDW calibration correction.
 * Mobile: tap zones on image.
 *
 * URL: /test/eye-tracking-v2
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlazeGaze } from '../hooks/useBlazeGaze';
import { ZoneRegistry, generateGrid } from '../lib/eyeTracking/zoneRegistry';
import { ZoneEventEmitter, type ZoneEvent } from '../lib/eyeTracking/zoneEventEmitter';
import { getCurrentDeviceProfile } from '../lib/eyeTracking/deviceProfile';
import {
  hybridApplyCalibrationField,
  type HybridCalibrationResidual,
} from '../lib/eyeTracking/hybridCalibrationField';
import {
  buildDwellBars,
  buildAttentionSummary,
  explorationOrder,
  formatDwellTime,
  formatPercent,
} from '../utils/eyeTrackingV2';
import {
  computeZoneMetrics,
  generateBackwardZoneMass,
  type ZoneMetrics,
} from '../lib/eyeTracking/v2ResponseBuilder';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GAZE_POLL_MS = 50;
const GRID_ROWS = 3;
const GRID_COLS = 3;
const DEFAULT_STIMULUS = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=600&fit=crop';
const CALIB_FIELD_STRENGTH = 0.85;

const CALIBRATION_POINTS: [number, number][] = [
  [15, 15], [85, 15],
  [50, 50],
  [15, 85], [85, 85],
];

type Phase = 'loading' | 'calibrating' | 'viewing' | 'complete';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EyeTrackingV2TestPage() {
  const profile = useMemo(() => getCurrentDeviceProfile(), []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [phase, setPhase] = useState<Phase>('loading');
  const [cameraReady, setCameraReady] = useState(() => !profile.hasGazeTracking);
  const [currentZone, setCurrentZone] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [fixationActive, setFixationActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [events, setEvents] = useState<ZoneEvent[]>([]);
  const [eventCount, setEventCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [gazeDebug, setGazeDebug] = useState<{ x: number; y: number } | null>(null);
  const [calibPointIndex, setCalibPointIndex] = useState(0);
  const [calibCount, setCalibCount] = useState(0);

  const eventsRef = useRef<ZoneEvent[]>([]);
  const emitterRef = useRef<ZoneEventEmitter | null>(null);
  const registryRef = useRef<ZoneRegistry | null>(null);
  const gazeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackingStartedRef = useRef(false);
  const calibResidualsRef = useRef<HybridCalibrationResidual[]>([]);

  const blaze = useBlazeGaze(videoRef, { oneEuroMinCutoff: 0.8, oneEuroBeta: 0.005 });
  const modelReady = blaze.isLoaded;

  // -- Auto-start camera --
  useEffect(() => {
    if (!profile.hasGazeTracking) {
      return;
    }
    let cancelled = false;
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) return;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        if (!cancelled) { setCameraReady(true); }
      } catch (err) {
        if (!cancelled) { setError(err instanceof Error ? err.message : 'Camera access denied'); }
      }
    }
    initCamera();
    return () => { cancelled = true; };
  }, [profile.hasGazeTracking]);

  // -- Init emitter --
  useEffect(() => {
    const emitter = new ZoneEventEmitter({
      uncertaintyRadius: profile.uncertaintyRadius,
      switchThresholdMs: profile.hysteresisMs,
      minFixationMs: 150,
    });

    const collect = (event: ZoneEvent) => {
      eventsRef.current = [...eventsRef.current, event];
      setEventCount(eventsRef.current.length);
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
    return () => { emitter.destroy(); };
  }, [profile]);

  // -- Auto-transition: loading → calibrating or viewing --
  const canStart = profile.hasGazeTracking ? (cameraReady && modelReady) : cameraReady;
  const shouldTransition = canStart && phase === 'loading';

  useEffect(() => {
    if (!shouldTransition) return;
    if (profile.hasGazeTracking) {
      blaze.start();
    }
    const nextPhase = profile.hasGazeTracking ? 'calibrating' : 'viewing';
    const rafId = requestAnimationFrame(() => {
      setPhase(nextPhase);
    });
    return () => cancelAnimationFrame(rafId);
  }, [shouldTransition, profile.hasGazeTracking, blaze]);

  // -- Calibration click --
  const handleCalibrationClick = useCallback(() => {
    const gazePosRef = blaze.gazePosRef;
    const gaze = gazePosRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const [pctX, pctY] = CALIBRATION_POINTS[calibPointIndex];
    const targetX = (pctX / 100) * vw;
    const targetY = (pctY / 100) * vh;

    if (gaze) {
      calibResidualsRef.current.push({
        u: pctX / 100, v: pctY / 100,
        dx: targetX - gaze.x, dy: targetY - gaze.y,
      });
    }

    const nextIndex = calibPointIndex + 1;
    if (nextIndex < CALIBRATION_POINTS.length) {
      setCalibPointIndex(nextIndex);
    } else {
      setCalibCount(calibResidualsRef.current.length);
      setPhase('viewing');
    }
  }, [calibPointIndex, blaze]);

  // -- Complete session --
  const completeSession = useCallback(() => {
    if (gazeIntervalRef.current) clearInterval(gazeIntervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    blaze.stop();
    trackingStartedRef.current = false;
    setEvents([...eventsRef.current]);
    setPhase('complete');
  }, [blaze]);

  // -- Start tracking when image loads --
  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    const emitter = emitterRef.current;
    if (!img || !emitter || trackingStartedRef.current) return;
    trackingStartedRef.current = true;

    const rect = img.getBoundingClientRect();
    const imgRect = new DOMRect(rect.x, rect.y, rect.width, rect.height);
    const registry = new ZoneRegistry();
    generateGrid(GRID_ROWS, GRID_COLS, { x: rect.x, y: rect.y, width: rect.width, height: rect.height })
      .forEach((z) => registry.register(z.id, z.label, z.rect));
    registryRef.current = registry;

    const residuals = calibResidualsRef.current;
    const gazePosRef = blaze.gazePosRef;
    const startTime = Date.now();

    gazeIntervalRef.current = setInterval(() => {
      const zones = registry.getZones();
      const elapsedMs = Date.now() - startTime;

      if (profile.hasGazeTracking && gazePosRef.current) {
        const raw = gazePosRef.current;
        const corrected = residuals.length > 0
          ? hybridApplyCalibrationField(raw.x, raw.y, imgRect, residuals, CALIB_FIELD_STRENGTH)
          : raw;
        setGazeDebug({ x: Math.round(corrected.x), y: Math.round(corrected.y) });
        emitter.feed(corrected.x, corrected.y, elapsedMs, zones);
      }
    }, GAZE_POLL_MS);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, [profile, blaze]);

  // -- Mobile click --
  const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    const emitter = emitterRef.current;
    const registry = registryRef.current;
    if (phase === 'viewing' && emitter && registry) {
      emitter.feed(e.clientX, e.clientY, Date.now(), registry.getZones());
    }
  }, [phase]);

  // -- Cleanup --
  useEffect(() => {
    return () => {
      if (gazeIntervalRef.current) clearInterval(gazeIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      registryRef.current?.destroy();
    };
  }, []);

  // -- Metrics --
  const metrics = useMemo(() => {
    const zoneIds = Array.from({ length: GRID_ROWS * GRID_COLS }, (_, i) =>
      `r${Math.floor(i / GRID_COLS)}c${i % GRID_COLS}`
    );
    return computeZoneMetrics(events, zoneIds);
  }, [events]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const videoClass = phase === 'viewing'
    ? 'fixed z-50 bottom-4 right-4 w-32 h-24 rounded-lg object-cover bg-black border-2 border-white shadow-lg opacity-60'
    : phase === 'calibrating'
      ? 'fixed z-50 bottom-4 right-4 w-48 h-36 rounded-lg object-cover bg-black border-2 border-white shadow-lg'
      : 'hidden';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <video ref={videoRef} className={videoClass} autoPlay muted playsInline />

      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Eye Tracking V2 — Test</h1>
          <p className="text-xs text-slate-400">
            {profile.deviceType} · radius {profile.uncertaintyRadius}px · hysteresis {profile.hysteresisMs}ms
            {calibCount > 0 && ` · ${calibCount}pt calibration`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {phase === 'viewing' && <span className="text-sm font-mono text-blue-600">{elapsed}s</span>}
          {phase === 'viewing' && gazeDebug && (
            <span className="text-[10px] font-mono text-slate-400">gaze: {gazeDebug.x},{gazeDebug.y}</span>
          )}
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            phase === 'viewing' ? 'bg-green-100 text-green-700'
              : phase === 'calibrating' ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-500'
          }`}>{phase}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">

        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent" />
            <p className="text-sm text-slate-500">
              {!cameraReady ? 'Iniciando camara...' : 'Cargando modelo de gaze...'}
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        {phase === 'calibrating' && (
          <CalibrationOverlay
            pointIndex={calibPointIndex}
            totalPoints={CALIBRATION_POINTS.length}
            point={CALIBRATION_POINTS[calibPointIndex]}
            onClick={handleCalibrationClick}
          />
        )}

        {phase === 'viewing' && (
          <div className="relative">
            <img
              ref={imgRef}
              src={DEFAULT_STIMULUS}
              alt="Test stimulus"
              className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
              onClick={handleImageClick}
              onLoad={handleImageLoad}
              crossOrigin="anonymous"
            />
            <ZoneGridOverlay
              currentZone={currentZone}
              fixationActive={fixationActive}
              confidence={confidence}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white px-3 py-2 flex items-center gap-4 text-xs rounded-b-lg">
              <span>Zona: <strong className="text-blue-300">{currentZone ?? '\u2014'}</strong></span>
              <span>Confianza: <strong>{Math.round(confidence * 100)}%</strong></span>
              <span>Fijacion: <strong className={fixationActive ? 'text-amber-300' : ''}>{fixationActive ? 'SI' : '\u2014'}</strong></span>
              <span>Eventos: <strong>{eventCount}</strong></span>
              {!profile.hasGazeTracking && <span className="text-amber-300 animate-pulse">Toca la imagen</span>}
              <button onClick={completeSession} className="ml-auto px-3 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors">
                Terminar test
              </button>
            </div>
          </div>
        )}

        {phase === 'complete' && (
          <CompletePanel
            events={events}
            metrics={metrics}
            profile={profile}
            onRestart={() => {
              eventsRef.current = [];
              emitterRef.current?.reset();
              calibResidualsRef.current = [];
              setEvents([]);
              setEventCount(0);
              setCurrentZone(null);
              setConfidence(0);
              setFixationActive(false);
              setGazeDebug(null);
              setElapsed(0);
              setCalibPointIndex(0);
              setCalibCount(0);
              trackingStartedRef.current = false;
              setPhase('loading');
              setCameraReady(!profile.hasGazeTracking);
              setTimeout(() => {
                setCameraReady(true);
              }, 500);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CalibrationOverlay({ pointIndex, totalPoints, point, onClick }: {
  pointIndex: number; totalPoints: number; point: [number, number]; onClick: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 bg-slate-900 flex items-center justify-center"
      onClick={onClick}
      style={{ cursor: 'crosshair' }}
    >
      <div
        className="absolute w-6 h-6 rounded-full bg-green-400 border-2 border-white shadow-lg animate-pulse"
        style={{ left: `${point[0]}%`, top: `${point[1]}%`, transform: 'translate(-50%, -50%)' }}
      />
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-white text-sm">Mira el punto verde y haz clic ({pointIndex + 1}/{totalPoints})</p>
        <p className="text-slate-400 text-xs mt-1">Esto calibra el rastreo para tu posicion</p>
      </div>
    </div>
  );
}

function ZoneGridOverlay({ currentZone, fixationActive, confidence }: {
  currentZone: string | null; fixationActive: boolean; confidence: number;
}) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)` }}
    >
      {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, i) => {
        const zoneId = `r${Math.floor(i / GRID_COLS)}c${i % GRID_COLS}`;
        const isActive = zoneId === currentZone;
        const isFixated = isActive && fixationActive;
        return (
          <div
            key={zoneId}
            className={`border transition-all duration-150 flex items-start ${
              isFixated ? 'border-amber-400 bg-amber-400/25 border-2'
                : isActive ? 'border-blue-400 bg-blue-400/20 border-2'
                : 'border-white/30'
            }`}
          >
            <span className={`text-[10px] px-1 rounded m-0.5 ${
              isActive ? 'bg-blue-600 text-white font-bold' : 'bg-black/40 text-white/70'
            }`}>
              {zoneId}{isActive ? ` ${Math.round(confidence * 100)}%` : ''}{isFixated ? ' \u25CF' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CompletePanel({ events, metrics, profile, onRestart }: {
  events: ZoneEvent[]; metrics: Record<string, ZoneMetrics>;
  profile: ReturnType<typeof getCurrentDeviceProfile>; onRestart: () => void;
}) {
  const zoneIds = Object.keys(metrics);
  const zoneDefs = zoneIds.map((id) => ({ id, label: id, rect: { x: 0, y: 0, width: 100, height: 100 } }));
  const bars = buildDwellBars(metrics, zoneDefs);
  const summary = buildAttentionSummary(metrics, zoneDefs);
  const order = explorationOrder(metrics, zoneDefs);
  const zoneMass = generateBackwardZoneMass(metrics);
  const maxDwell = bars[0]?.dwellMs ?? 1;

  return (
    <div className="max-w-lg w-full flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-slate-700 text-center">Resultados</h2>
      <div className="flex flex-wrap gap-2 justify-center">
        <Chip label="Dispositivo" value={profile.deviceType} />
        <Chip label="Eventos" value={String(events.length)} />
        <Chip label="Zonas visitadas" value={`${summary.visitedZones}/${summary.totalZones}`} />
        <Chip label="Tiempo total" value={formatDwellTime(summary.totalDwellMs)} />
        <Chip label="Fijaciones" value={String(summary.totalFixations)} />
        <Chip label="Confianza" value={formatPercent(summary.avgConfidence * 100)} />
        {summary.firstZone && <Chip label="Primera zona" value={summary.firstZone.label} accent />}
      </div>
      <div className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">Tiempo por zona</h3>
        {bars.map((bar) => (
          <div key={bar.zoneId} className="flex items-center gap-2 mb-1">
            <span className="w-12 text-xs text-slate-600 font-mono">{bar.zoneId}</span>
            <div className="flex-1 h-4 bg-slate-100 rounded-sm overflow-hidden">
              <div className="h-full bg-blue-400 rounded-sm" style={{ width: `${(bar.dwellMs / maxDwell) * 100}%` }} />
            </div>
            <span className="w-14 text-xs text-slate-500 text-right">{formatDwellTime(bar.dwellMs)}</span>
            <span className="w-10 text-xs text-slate-400 text-right">{formatPercent(bar.dwellPercent)}</span>
          </div>
        ))}
      </div>
      {order.length > 1 && (
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">Orden de exploracion</h3>
          <div className="flex items-center gap-1 flex-wrap">
            {order.map((entry, i) => (
              <div key={entry.zoneId} className="flex items-center gap-1">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-xs text-slate-700">
                  <span className="font-semibold text-blue-600">{i + 1}.</span> {entry.label}
                </span>
                {i < order.length - 1 && <span className="text-slate-300">{'\u2192'}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">Mapa de atencion</h3>
        <div className="grid grid-cols-3 gap-0.5 aspect-[4/3]">
          {['r0c0','r0c1','r0c2','r1c0','r1c1','r1c2','r2c0','r2c1','r2c2'].map((id) => {
            const mass = zoneMass[id] ?? 0;
            const intensity = Math.min(1, mass * 3);
            return (
              <div key={id} className="flex items-center justify-center rounded-sm text-xs font-mono"
                style={{ backgroundColor: `rgba(59, 130, 246, ${0.05 + intensity * 0.6})`, color: intensity > 0.4 ? 'white' : '#64748b' }}>
                {Math.round(mass * 100)}%
              </div>
            );
          })}
        </div>
      </div>
      <details className="bg-white rounded-lg p-3 shadow-sm">
        <summary className="text-xs font-medium text-slate-500 uppercase cursor-pointer">Event log ({events.length} eventos)</summary>
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
      <button onClick={onRestart} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors self-center">Repetir test</button>
    </div>
  );
}

function Chip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex flex-col items-center px-2.5 py-1 rounded-lg ${accent ? 'bg-blue-50 border border-blue-200' : 'bg-white shadow-sm'}`}>
      <span className="text-[9px] text-slate-400 uppercase">{label}</span>
      <span className={`text-sm font-semibold ${accent ? 'text-blue-700' : 'text-slate-700'}`}>{value}</span>
    </div>
  );
}
