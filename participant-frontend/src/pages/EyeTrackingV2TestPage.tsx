/**
 * Eye Tracking V2 Test Page — Zone-based (no pointers)
 *
 * 3x3 grid stimulus: gray cells + red center.
 * Calibration captures raw gaze centroid per zone.
 * Tracking: raw gaze → nearest centroid (Voronoi) → zone ID → emitter.
 * Output is zones only — no coordinate dots, no pointer.
 *
 * URL: /test/eye-tracking-v2
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlazeGaze } from '../hooks/useBlazeGaze';
import { ZoneRegistry } from '../lib/eyeTracking/zoneRegistry';
import { ZoneEventEmitter, type ZoneEvent } from '../lib/eyeTracking/zoneEventEmitter';
import { getCurrentDeviceProfile } from '../lib/eyeTracking/deviceProfile';
import {
  computeZoneMetrics,
  generateBackwardZoneMass,
  type ZoneMetrics,
} from '../lib/eyeTracking/v2ResponseBuilder';
import {
  buildDwellBars,
  buildAttentionSummary,
  explorationOrder,
  formatDwellTime,
  formatPercent,
} from '../utils/eyeTrackingV2';

// ---------------------------------------------------------------------------
// Binary classifier — left/right of fixed center X
// ---------------------------------------------------------------------------

/**
 * One binary decision: left or right of centerX.
 * 324px of X range from webcam → reliable horizontal discrimination.
 * No adaptive center — fixed from calibration to avoid drift-chase.
 */
function classifyHalf(
  gazeX: number,
  centerX: number,
  rangeX: number,
): { zoneId: string; confidence: number } {
  const isRight = gazeX > centerX;
  const zoneId = isRight ? 'right' : 'left';
  const dx = Math.abs(gazeX - centerX) / Math.max(rangeX / 2, 1);
  const confidence = Math.min(1, Math.max(0.1, dx));
  return { zoneId, confidence };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GAZE_POLL_MS = 50;
const CALIB_SAMPLES_PER_POINT = 16;
const CALIB_SAMPLE_INTERVAL_MS = 50;

/** 2-point calibration: center of each half (%). */
const CALIBRATION_POINTS: { pctX: number; pctY: number; zoneId: string }[] = [
  { pctX: 25, pctY: 50, zoneId: 'left' },
  { pctX: 75, pctY: 50, zoneId: 'right' },
];

const ZONE_LABELS: Record<string, string> = {
  left: 'IZQ',
  right: 'DER',
};

const ZONE_COLORS: Record<string, string> = {
  left: '#D1D5DB',
  right: '#DC2626',
};

type Phase = 'loading' | 'calibrating' | 'tracking' | 'complete';

// ---------------------------------------------------------------------------
// Stimulus — 2 halves: gray left, red right
// ---------------------------------------------------------------------------

function StimulusGrid({ highlightZone, fixationActive }: {
  highlightZone: string | null;
  fixationActive: boolean;
}) {
  const zoneIds = ['left', 'right'];
  return (
    <div className="flex w-full h-full">
      {zoneIds.map((id) => {
        const isActive = id === highlightZone;
        const isFixated = isActive && fixationActive;
        return (
          <div
            key={id}
            className="flex items-center justify-center relative"
            style={{
              width: '50%',
              height: '100%',
              backgroundColor: ZONE_COLORS[id],
            }}
          >
            <span className="text-6xl font-bold select-none" style={{
              color: id === 'right' ? '#FECACA' : '#9CA3AF',
            }}>
              {ZONE_LABELS[id]}
            </span>
            {isActive && (
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-100"
                style={{
                  backgroundColor: isFixated ? 'rgba(245, 158, 11, 0.35)' : 'rgba(59, 130, 246, 0.25)',
                  border: isFixated ? '3px solid #F59E0B' : '3px solid #3B82F6',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EyeTrackingV2TestPage() {
  const profile = useMemo(() => getCurrentDeviceProfile(), []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stimulusRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>('loading');
  const [cameraReady, setCameraReady] = useState(() => !profile.hasGazeTracking);
  const [currentZone, setCurrentZone] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [fixationActive, setFixationActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [events, setEvents] = useState<ZoneEvent[]>([]);
  const [eventCount, setEventCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [calibPointIndex, setCalibPointIndex] = useState(0);
  const [calibCount, setCalibCount] = useState(0);
  const [calibCapturing, setCalibCapturing] = useState(false);
  // Diagnostic state — shows raw CNN output to identify what's failing
  const [diag, setDiag] = useState({
    normX: 0, normY: 0,       // raw CNN normPog
    rawScrX: 0, rawScrY: 0,   // screen coords before filter
    filtX: 0, filtY: 0,       // after One-Euro
    normMinX: Infinity, normMaxX: -Infinity,
    normMinY: Infinity, normMaxY: -Infinity,
  });

  const eventsRef = useRef<ZoneEvent[]>([]);
  const emitterRef = useRef<ZoneEventEmitter | null>(null);
  const registryRef = useRef<ZoneRegistry | null>(null);
  const gazeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const calibSamplesRef = useRef<{ x: number; y: number }[]>([]);
  /** Fixed center X from calibration. No adaptive drift. */
  const centerXRef = useRef(0);
  const rangeXRef = useRef(1);
  const zoneCentersRef = useRef<Record<string, { x: number; y: number }>>({});

  const blaze = useBlazeGaze(videoRef, { oneEuroMinCutoff: 0.8, oneEuroBeta: 0.005 });
  const modelReady = blaze.isLoaded;

  // -- Camera --
  useEffect(() => {
    if (!profile.hasGazeTracking) return;
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
        if (!cancelled) setCameraReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Camera access denied');
      }
    }
    initCamera();
    return () => { cancelled = true; };
  }, [profile.hasGazeTracking]);

  // -- Emitter --
  useEffect(() => {
    const emitter = new ZoneEventEmitter({
      uncertaintyRadius: 100,
      switchThresholdMs: 200,
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

  // -- Loading -> calibrating --
  const canStart = profile.hasGazeTracking ? (cameraReady && modelReady) : cameraReady;

  useEffect(() => {
    if (!canStart || phase !== 'loading') return;
    if (profile.hasGazeTracking) blaze.start();
    const rafId = requestAnimationFrame(() => {
      setPhase(profile.hasGazeTracking ? 'calibrating' : 'tracking');
    });
    return () => cancelAnimationFrame(rafId);
  }, [canStart, phase, profile.hasGazeTracking, blaze]);

  // -- Calibration: capture raw gaze centroid per zone --
  const handleCalibrationClick = useCallback(() => {
    if (calibCapturing) return;
    setCalibCapturing(true);

    const rawRef = blaze.rawScreenRef;
    const pointSamples: { x: number; y: number }[] = [];
    let count = 0;

    const captureInterval = setInterval(() => {
      const gaze = rawRef.current;
      if (gaze) pointSamples.push({ x: gaze.x, y: gaze.y });
      count++;

      if (count >= CALIB_SAMPLES_PER_POINT) {
        clearInterval(captureInterval);

        if (pointSamples.length > 0) {
          const avgX = pointSamples.reduce((s, p) => s + p.x, 0) / pointSamples.length;
          const avgY = pointSamples.reduce((s, p) => s + p.y, 0) / pointSamples.length;
          calibSamplesRef.current.push({ x: avgX, y: avgY });
        }

        setCalibCapturing(false);

        const nextIndex = calibPointIndex + 1;
        if (nextIndex < CALIBRATION_POINTS.length) {
          setCalibPointIndex(nextIndex);
        } else {
          // 2 points: left (index 0) and right (index 1)
          const all = calibSamplesRef.current;
          centerXRef.current = (all[0].x + all[1].x) / 2;
          rangeXRef.current = Math.max(1, Math.abs(all[1].x - all[0].x));
          setCalibCount(all.length);
          startTracking();
        }
      }
    }, CALIB_SAMPLE_INTERVAL_MS);
  }, [calibPointIndex, calibCapturing, blaze]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Start tracking --
  const startTracking = useCallback(() => {
    const stimulus = stimulusRef.current;
    const emitter = emitterRef.current;
    if (!stimulus || !emitter) return;

    const rect = stimulus.getBoundingClientRect();
    const registry = new ZoneRegistry();
    // Register as 'left' and 'right' instead of r0c0/r0c1
    const halfW = rect.width / 2;
    registry.register('left', 'Izquierda', { x: rect.x, y: rect.y, width: halfW, height: rect.height });
    registry.register('right', 'Derecha', { x: rect.x + halfW, y: rect.y, width: halfW, height: rect.height });
    registryRef.current = registry;

    const centers: Record<string, { x: number; y: number }> = {
      left: { x: rect.x + halfW / 2, y: rect.y + rect.height / 2 },
      right: { x: rect.x + halfW + halfW / 2, y: rect.y + rect.height / 2 },
    };
    zoneCentersRef.current = centers;

    const rawRef = blaze.rawScreenRef;
    const cx = centerXRef.current;
    const rx = rangeXRef.current;
    const startTime = Date.now();

    gazeIntervalRef.current = setInterval(() => {
      const registeredZones = registry.getZones();
      const elapsedMs = Date.now() - startTime;

      if (profile.hasGazeTracking && rawRef.current) {
        const raw = rawRef.current;

        // ponytail: one binary decision — left or right of calibration center
        const match = classifyHalf(raw.x, cx, rx);
        const zoneCenter = centers[match.zoneId];
        if (zoneCenter) {
          emitter.feed(zoneCenter.x, zoneCenter.y, elapsedMs, registeredZones);
        }

        // Diagnostic
        if (elapsedMs % 200 < GAZE_POLL_MS) {
          const np = blaze.normPogRef.current;
          setDiag(prev => ({
            normX: np?.x ?? 0,
            normY: np?.y ?? 0,
            rawScrX: raw.x,
            rawScrY: raw.y,
            filtX: cx,
            filtY: 0,
            normMinX: Math.min(prev.normMinX, np?.x ?? 0),
            normMaxX: Math.max(prev.normMaxX, np?.x ?? 0),
            normMinY: Math.min(prev.normMinY, np?.y ?? 0),
            normMaxY: Math.max(prev.normMaxY, np?.y ?? 0),
          }));
        }
      }
    }, GAZE_POLL_MS);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    setPhase('tracking');
  }, [profile, blaze]);

  // -- Complete --
  const completeSession = useCallback(() => {
    if (gazeIntervalRef.current) clearInterval(gazeIntervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    blaze.stop();
    setEvents([...eventsRef.current]);
    setPhase('complete');
  }, [blaze]);

  // -- Mobile tap --
  const handleStimulusClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (phase === 'calibrating') {
      handleCalibrationClick();
      return;
    }
    const emitter = emitterRef.current;
    const registry = registryRef.current;
    if (phase === 'tracking' && emitter && registry) {
      emitter.feed(e.clientX, e.clientY, Date.now(), registry.getZones());
    }
  }, [phase, handleCalibrationClick]);

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
    return computeZoneMetrics(events, ['left', 'right']);
  }, [events]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isCalibrating = phase === 'calibrating';
  const isTracking = phase === 'tracking';
  const cp = CALIBRATION_POINTS[calibPointIndex];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <video
        ref={videoRef}
        className={`fixed z-50 bottom-4 right-4 rounded-lg object-cover bg-black border-2 border-white shadow-lg ${
          isCalibrating || isTracking ? 'w-32 h-24 opacity-60' : 'hidden'
        }`}
        autoPlay muted playsInline
      />

      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Eye Tracking V2 — Zone Test</h1>
          <p className="text-xs text-slate-400">
            izq/der · {profile.deviceType}
            {calibCount > 0 && ` · ${calibCount}pt cal`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isTracking && (
            <span className="text-sm font-mono text-slate-600">
              {currentZone ? `Zona ${ZONE_LABELS[currentZone]}` : '\u2014'}
              {' '}
              <span className="text-slate-400">{Math.round(confidence * 100)}%</span>
            </span>
          )}
          {isTracking && <span className="text-sm font-mono text-blue-600">{elapsed}s</span>}
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            isTracking ? 'bg-green-100 text-green-700'
              : isCalibrating ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-500'
          }`}>{phase}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent" />
            <p className="text-sm text-slate-500">
              {!cameraReady ? 'Iniciando camara...' : 'Cargando modelo...'}
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        {(isCalibrating || isTracking) && (
          <div className="relative">
            <div
              ref={stimulusRef}
              className={`rounded-lg shadow-lg overflow-hidden ${isCalibrating ? 'opacity-70' : ''}`}
              style={{ width: '600px', height: '600px', maxWidth: '90vw', maxHeight: '70vh' }}
              onClick={handleStimulusClick}
            >
              <StimulusGrid
                highlightZone={isTracking ? currentZone : null}
                fixationActive={fixationActive}
              />
            </div>

            {isCalibrating && (
              <>
                <div
                  className={`absolute w-7 h-7 rounded-full border-3 border-white shadow-lg cursor-crosshair z-10 ${
                    calibCapturing ? 'bg-amber-400 scale-125' : 'bg-green-400 animate-pulse'
                  } transition-all`}
                  style={{
                    left: `${cp.pctX}%`,
                    top: `${cp.pctY}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={(e) => { e.stopPropagation(); handleCalibrationClick(); }}
                />
                <div className="absolute bottom-2 left-0 right-0 text-center z-10">
                  <span className="bg-black/70 text-white text-xs px-3 py-1 rounded">
                    {calibCapturing
                      ? 'Capturando... sigue mirando el punto'
                      : `Mira el punto y haz clic (${calibPointIndex + 1}/${CALIBRATION_POINTS.length})`}
                  </span>
                </div>
              </>
            )}

            {/* Diagnostic panel — shows raw CNN values to identify the failure point */}
            {isTracking && (
              <div className="mt-2 bg-slate-800 text-[10px] font-mono text-slate-300 rounded-lg p-2 w-full">
                <div className="flex gap-4 flex-wrap">
                  <span>normPog: <strong className="text-amber-300">{diag.normX.toFixed(4)}, {diag.normY.toFixed(4)}</strong></span>
                  <span>rawScr: <strong className="text-green-300">{Math.round(diag.rawScrX)}, {Math.round(diag.rawScrY)}</strong></span>
                  <span>centerX: <strong className="text-blue-300">{Math.round(diag.filtX)}</strong></span>
                </div>
                <div className="flex gap-4 flex-wrap mt-1">
                  <span>normX range: <strong className="text-amber-300">{diag.normMinX.toFixed(4)} .. {diag.normMaxX.toFixed(4)}</strong> <span className="text-slate-500">({(diag.normMaxX - diag.normMinX).toFixed(4)} span)</span></span>
                  <span>normY range: <strong className="text-amber-300">{diag.normMinY.toFixed(4)} .. {diag.normMaxY.toFixed(4)}</strong> <span className="text-slate-500">({(diag.normMaxY - diag.normMinY).toFixed(4)} span)</span></span>
                </div>
                {calibSamplesRef.current.length > 0 && (
                  <div className="mt-1 border-t border-slate-700 pt-1">
                    <span className="text-slate-500">centerX: <strong className="text-white">{Math.round(centerXRef.current)}</strong> rangeX: <strong className="text-white">{Math.round(rangeXRef.current)}</strong></span>
                    <div className="flex gap-2 flex-wrap mt-0.5">
                      {calibSamplesRef.current.map((c, i) => (
                        <span key={i} className="text-slate-400">
                          {ZONE_LABELS[CALIBRATION_POINTS[i]?.zoneId ?? '']}:<strong className="text-white">{Math.round(c.x)},{Math.round(c.y)}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isTracking && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white px-3 py-2 flex items-center gap-4 text-xs rounded-b-lg">
                <span>Zona: <strong className="text-blue-300">{currentZone ? `${ZONE_LABELS[currentZone]} (${currentZone})` : '\u2014'}</strong></span>
                <span>Conf: <strong>{Math.round(confidence * 100)}%</strong></span>
                <span>Fix: <strong className={fixationActive ? 'text-amber-300' : ''}>{fixationActive ? 'SI' : '\u2014'}</strong></span>
                <span>Ev: <strong>{eventCount}</strong></span>
                <button onClick={completeSession} className="ml-auto px-3 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors">
                  Terminar
                </button>
              </div>
            )}
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
              calibSamplesRef.current = [];
              centerXRef.current = 0;
              rangeXRef.current = 1;
              zoneCentersRef.current = {};
              setEvents([]);
              setEventCount(0);
              setCurrentZone(null);
              setConfidence(0);
              setFixationActive(false);
              setElapsed(0);
              setCalibPointIndex(0);
              setCalibCount(0);
              setPhase('loading');
              setCameraReady(!profile.hasGazeTracking);
              setTimeout(() => { setCameraReady(true); }, 500);
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

function CompletePanel({ events, metrics, profile, onRestart }: {
  events: ZoneEvent[]; metrics: Record<string, ZoneMetrics>;
  profile: ReturnType<typeof getCurrentDeviceProfile>; onRestart: () => void;
}) {
  const zoneIds = Object.keys(metrics);
  const zoneDefs = zoneIds.map((id) => ({ id, label: ZONE_LABELS[id] ?? id, rect: { x: 0, y: 0, width: 100, height: 100 } }));
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
            <span className="w-16 text-xs text-slate-600 font-mono">
              {ZONE_LABELS[bar.zoneId] ?? bar.zoneId} <span className="text-slate-400">({bar.zoneId})</span>
            </span>
            <div className="flex-1 h-4 bg-slate-100 rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${(bar.dwellMs / maxDwell) * 100}%`,
                  backgroundColor: bar.zoneId === 'r1c1' ? '#DC2626' : '#3B82F6',
                }}
              />
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
                  <span className="font-semibold text-blue-600">{i + 1}.</span> {ZONE_LABELS[entry.zoneId] ?? entry.label}
                </span>
                {i < order.length - 1 && <span className="text-slate-300">{'\u2192'}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg p-3 shadow-sm">
        <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">Mapa de atencion</h3>
        <div className="flex" style={{ aspectRatio: '2' }}>
          {['left','right'].map((id) => {
            const mass = zoneMass[id] ?? 0;
            const intensity = Math.min(1, mass * 3);
            const isRed = id === 'right';
            return (
              <div
                key={id}
                className="flex items-center justify-center text-sm font-mono"
                style={{
                  width: '50%',
                  height: '100%',
                  backgroundColor: isRed
                    ? `rgba(220, 38, 38, ${0.1 + intensity * 0.7})`
                    : `rgba(59, 130, 246, ${0.05 + intensity * 0.6})`,
                  color: intensity > 0.4 ? 'white' : '#64748b',
                }}
              >
                <span className="font-bold mr-1">{ZONE_LABELS[id]}</span>
                {Math.round(mass * 100)}%
              </div>
            );
          })}
        </div>
      </div>

      <details className="bg-white rounded-lg p-3 shadow-sm">
        <summary className="text-xs font-medium text-slate-500 uppercase cursor-pointer">Event log ({events.length})</summary>
        <div className="mt-2 max-h-48 overflow-y-auto">
          <table className="w-full text-[10px] font-mono">
            <thead><tr className="text-slate-400"><th className="text-left py-0.5">Tipo</th><th className="text-left">Zona</th><th className="text-right">t</th><th className="text-right">dur</th><th className="text-right">conf</th></tr></thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="text-slate-600 border-t border-slate-50">
                  <td className="py-0.5">{e.type.replace('zone_', '').replace('fixation_', 'fix_')}</td>
                  <td>{e.zoneId ? `${ZONE_LABELS[e.zoneId] ?? ''} ${e.zoneId}` : '\u2014'}</td>
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
    <div className={`flex flex-col items-center px-2.5 py-1 rounded-lg ${accent ? 'bg-blue-50 border border-blue-200' : 'bg-white shadow-sm'}`}>
      <span className="text-[9px] text-slate-400 uppercase">{label}</span>
      <span className={`text-sm font-semibold ${accent ? 'text-blue-700' : 'text-slate-700'}`}>{value}</span>
    </div>
  );
}
