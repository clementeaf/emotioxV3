import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useBlazeGaze } from '../hooks/useBlazeGaze';

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

// --- Calibration targets (9 points — fast) ---
const CALIBRATION_TARGETS: [number, number][] = [
    [10, 10], [50, 10], [90, 10],
    [10, 50], [50, 50], [90, 50],
    [10, 90], [50, 90], [90, 90],
];

// --- Stimulus config ---
const STIMULUS_DURATION_MS = 10_000;
const STIMULUS_URL = 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&h=800&fit=crop';

// --- 3x3 AOI grid ---
const AOI_GRID = [
    { id: 'tl', label: 'Top Left',      col: 0, row: 0 },
    { id: 'tc', label: 'Top Center',    col: 1, row: 0 },
    { id: 'tr', label: 'Top Right',     col: 2, row: 0 },
    { id: 'ml', label: 'Middle Left',   col: 0, row: 1 },
    { id: 'mc', label: 'Center',        col: 1, row: 1 },
    { id: 'mr', label: 'Middle Right',  col: 2, row: 1 },
    { id: 'bl', label: 'Bottom Left',   col: 0, row: 2 },
    { id: 'bc', label: 'Bottom Center', col: 1, row: 2 },
    { id: 'br', label: 'Bottom Right',  col: 2, row: 2 },
];

/** Map a screen point to a 3x3 grid cell id */
function pointToZone(x: number, y: number, w: number, h: number): string | null {
    const col = Math.floor((x / w) * 3);
    const row = Math.floor((y / h) * 3);
    if (col < 0 || col > 2 || row < 0 || row > 2) return null;
    return AOI_GRID.find(z => z.col === col && z.row === row)?.id ?? null;
}

/** Heatmap color from 0-1 intensity */
function heatColor(intensity: number): string {
    if (intensity < 0.25) return 'rgba(59, 130, 246, 0.15)';   // blue — low
    if (intensity < 0.50) return 'rgba(34, 197, 94, 0.30)';    // green
    if (intensity < 0.75) return 'rgba(250, 204, 21, 0.45)';   // yellow
    return 'rgba(239, 68, 68, 0.60)';                           // red — high
}

export function EyeTrackingHybridPage() {
    const deviceType = useMemo(() => getDeviceType(), []);
    const isDesktop = deviceType === 'desktop';

    const [phase, setPhase] = useState<Phase>('intro');
    const [calIndex, setCalIndex] = useState(0);
    const [countdown, setCountdown] = useState(STIMULUS_DURATION_MS / 1000);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Data collection
    const gazePoints = useRef<GazePoint[]>([]);
    const touchPoints = useRef<TouchPoint[]>([]);

    // Desktop: BlazeGaze
    const blaze = useBlazeGaze(videoRef);

    // Heatmap state (populated by finishStimulus)
    type ZoneHeat = Record<string, number>;
    const [heatmap, setHeatmap] = useState<ZoneHeat | null>(null);

    // --- Camera ---
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            });
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

    // --- Gaze collection during stimulus (desktop, silent — no dot) ---
    useEffect(() => {
        if (phase !== 'stimulus' || !isDesktop) return;
        const interval = setInterval(() => {
            if (blaze.gazePos && blaze.gazeState === 'open') {
                gazePoints.current.push({ x: blaze.gazePos.x, y: blaze.gazePos.y, t: Date.now() });
            }
        }, 50);
        return () => clearInterval(interval);
    }, [phase, isDesktop, blaze.gazePos, blaze.gazeState]);

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
        if (isDesktop) { blaze.stop(); stopCamera(); }

        const zoneCounts: ZoneHeat = {};
        AOI_GRID.forEach(z => { zoneCounts[z.id] = 0; });
        const w = window.innerWidth;
        const h = window.innerHeight;

        if (isDesktop) {
            gazePoints.current.forEach(pt => {
                const zoneId = pointToZone(pt.x, pt.y, w, h);
                if (zoneId) zoneCounts[zoneId]++;
            });
        } else {
            touchPoints.current.forEach(pt => {
                const zoneId = pointToZone(pt.x, pt.y, w, h);
                if (zoneId) zoneCounts[zoneId]++;
            });
        }

        setHeatmap(zoneCounts);
        setPhase('results');
    }, [isDesktop, blaze, stopCamera]);

    // --- Countdown ---
    useEffect(() => {
        if (phase !== 'stimulus') return;
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    finishStimulus();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [phase, finishStimulus]);

    // --- Handlers ---
    const handleStart = useCallback(() => {
        gazePoints.current = [];
        touchPoints.current = [];
        setPhase('instruction');
    }, []);

    const handleInstructionNext = useCallback(async () => {
        if (isDesktop) {
            await startCamera();
            setCalIndex(0);
            setPhase('calibrating');
        } else {
            setCountdown(STIMULUS_DURATION_MS / 1000);
            setPhase('stimulus');
        }
    }, [isDesktop, startCamera]);

    const handleCalibrationClick = useCallback((e: React.MouseEvent) => {
        const normX = (e.clientX / window.innerWidth) - 0.5;
        const normY = (e.clientY / window.innerHeight) - 0.5;
        blaze.calibrate(normX, normY);

        const next = calIndex + 1;
        if (next >= CALIBRATION_TARGETS.length) {
            blaze.start();
            setCountdown(STIMULUS_DURATION_MS / 1000);
            setPhase('stimulus');
        } else {
            setCalIndex(next);
        }
    }, [calIndex, blaze]);

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

    const calTarget = CALIBRATION_TARGETS[calIndex];

    return (
        <div className="min-h-screen bg-gray-50">
            {isDesktop && <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />}

            {/* === INTRO === */}
            {phase === 'intro' && (
                <div className="flex min-h-screen items-center justify-center px-4">
                    <div className="max-w-md text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Eye Tracking Test</h1>
                        <div className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 bg-blue-100 text-blue-700">
                            {deviceType === 'desktop' ? 'Desktop — Webcam gaze tracking' :
                             deviceType === 'tablet' ? 'Tablet — Tap tracking' :
                             'Mobile — Tap tracking'}
                        </div>
                        <p className="text-gray-600 text-sm mb-6">
                            {isDesktop
                                ? 'We will calibrate your webcam, give you an instruction, then show an image for 10 seconds while we track where you look.'
                                : 'We will give you an instruction, then show an image for 10 seconds. Tap on the areas that catch your attention.'}
                        </p>
                        {isDesktop && !blaze.isLoaded && (
                            <p className="text-amber-600 text-xs mb-4">Loading gaze model...</p>
                        )}
                        <button
                            onClick={handleStart}
                            disabled={isDesktop && !blaze.isLoaded}
                            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            {isDesktop && !blaze.isLoaded ? 'Loading...' : 'Start'}
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
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Instruction</h2>
                            <p className="text-gray-700 text-base leading-relaxed">
                                You will see an image of a business meeting. <strong>Look at the people in the image and try to identify who is leading the conversation.</strong>
                            </p>
                        </div>
                        <p className="text-gray-500 text-sm">
                            {isDesktop
                                ? 'First we need to calibrate your camera. Then the image will appear for 10 seconds.'
                                : 'The image will appear for 10 seconds. Tap on the areas that draw your attention.'}
                        </p>
                        <button
                            onClick={handleInstructionNext}
                            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                        >
                            {isDesktop ? 'Calibrate' : 'Show image'}
                        </button>
                    </div>
                </div>
            )}

            {/* === CALIBRATION (desktop only) === */}
            {phase === 'calibrating' && calTarget && (
                <div className="fixed inset-0 z-50 bg-neutral-950">
                    <button
                        type="button"
                        className="fixed inset-0 cursor-crosshair bg-transparent"
                        onClick={handleCalibrationClick}
                    />
                    <div className="pointer-events-none absolute left-1/2 top-12 z-10 -translate-x-1/2 text-center">
                        <p className="text-base font-medium text-white">Look at the green dot, then click on it</p>
                        <p className="mt-1 text-sm text-white/80">Point {calIndex + 1} of {CALIBRATION_TARGETS.length}</p>
                    </div>
                    <div
                        className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${calTarget[0]}%`, top: `${calTarget[1]}%` }}
                    >
                        <div className="h-5 w-5 rounded-full shadow-lg bg-green-400 shadow-green-400/50" />
                    </div>
                    <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 w-48 -translate-x-1/2">
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(calIndex / CALIBRATION_TARGETS.length) * 100}%` }} />
                        </div>
                    </div>
                </div>
            )}

            {/* === STIMULUS (no gaze dot — silent tracking) === */}
            {phase === 'stimulus' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950">
                    <div className="absolute top-4 right-4 z-10 rounded-full bg-white/10 px-4 py-1.5 text-sm font-mono text-white">
                        {countdown}s
                    </div>
                    <img
                        src={STIMULUS_URL}
                        alt="Stimulus"
                        className="max-w-[95vw] max-h-[95vh] object-contain"
                        crossOrigin="anonymous"
                    />
                </div>
            )}

            {/* === RESULTS — Heatmap overlay === */}
            {phase === 'results' && normalizedHeat && (
                <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 gap-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">Attention Heatmap</h2>
                        <p className="text-sm text-gray-500">
                            {isDesktop
                                ? `${totalSamples} gaze samples collected at 20 Hz`
                                : `${totalSamples} touch points recorded`}
                        </p>
                    </div>

                    {/* Image with heatmap overlay */}
                    <div className="relative inline-block rounded-lg overflow-hidden shadow-xl">
                        <img
                            src={STIMULUS_URL}
                            alt="Stimulus"
                            className="max-w-[90vw] max-h-[65vh] object-contain"
                            crossOrigin="anonymous"
                        />
                        {/* 3x3 heatmap grid overlay */}
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                            {AOI_GRID.map(zone => {
                                const intensity = normalizedHeat[zone.id] || 0;
                                const pct = heatmap ? Math.round((heatmap[zone.id] / Math.max(totalSamples, 1)) * 100) : 0;
                                return (
                                    <div
                                        key={zone.id}
                                        className="relative border border-white/10 flex items-center justify-center transition-colors"
                                        style={{ backgroundColor: heatColor(intensity) }}
                                    >
                                        {pct > 0 && (
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
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(59,130,246,0.3)' }} /> Low</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(34,197,94,0.5)' }} /> Medium</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(250,204,21,0.6)' }} /> High</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.7)' }} /> Peak</span>
                    </div>

                    {/* Zone breakdown table */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 w-full max-w-lg">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Zone breakdown</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {AOI_GRID.map(zone => {
                                const count = heatmap?.[zone.id] || 0;
                                const pct = totalSamples > 0 ? Math.round((count / totalSamples) * 100) : 0;
                                const intensity = normalizedHeat[zone.id] || 0;
                                return (
                                    <div key={zone.id} className="rounded p-2 text-center" style={{ backgroundColor: heatColor(intensity) }}>
                                        <p className="text-xs font-medium text-gray-800">{zone.label}</p>
                                        <p className="text-lg font-bold text-gray-900">{pct}%</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                    >
                        Run again
                    </button>
                </div>
            )}
        </div>
    );
}
