import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useBlazeGaze } from '../hooks/useBlazeGaze';

// --- Device detection (inline, no store dependency) ---
function getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('ipad') || (ua.includes('tablet') && !ua.includes('mobile'))) return 'tablet';
    if (/android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return 'mobile';
    return 'desktop';
}

// --- Types ---
interface GazePoint { x: number; y: number; t: number }
interface TouchPoint { x: number; y: number; t: number }
interface ViewportEvent { elementId: string; visibleMs: number; scrollY: number; t: number }

type Phase = 'intro' | 'calibrating' | 'stimulus' | 'results';

// --- Calibration targets (17 points, good upper coverage) ---
const CALIBRATION_TARGETS: [number, number][] = [
    [5, 8], [25, 8], [50, 8], [75, 8], [95, 8],
    [15, 25], [50, 25], [85, 25],
    [10, 50], [50, 50], [90, 50],
    [15, 75], [50, 75], [85, 75],
    [5, 92], [50, 92], [95, 92],
];

// --- Test stimulus: a sample image with labeled zones ---
const STIMULUS_DURATION_MS = 10_000;
const STIMULUS_URL = 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=900&h=600&fit=crop';
const AOI_ZONES = [
    { id: 'top-left', label: 'Top Left', x: 0, y: 0, w: 50, h: 50 },
    { id: 'top-right', label: 'Top Right', x: 50, y: 0, w: 50, h: 50 },
    { id: 'bottom-left', label: 'Bottom Left', x: 0, y: 50, w: 50, h: 50 },
    { id: 'bottom-right', label: 'Bottom Right', x: 50, y: 50, w: 50, h: 50 },
];

export function EyeTrackingHybridPage() {
    const deviceType = useMemo(() => getDeviceType(), []);
    const isDesktop = deviceType === 'desktop';

    const [phase, setPhase] = useState<Phase>('intro');
    const [calIndex, setCalIndex] = useState(0);
    const [countdown, setCountdown] = useState(STIMULUS_DURATION_MS / 1000);
    const videoRef = useRef<HTMLVideoElement>(null);
    const stimulusRef = useRef<HTMLDivElement>(null);

    // Data collection
    const gazePoints = useRef<GazePoint[]>([]);
    const touchPoints = useRef<TouchPoint[]>([]);
    const viewportEvents = useRef<ViewportEvent[]>([]);
    const scrollSamples = useRef<{ scrollY: number; t: number }[]>([]);

    // Desktop: BlazeGaze
    const blaze = useBlazeGaze(videoRef);

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

    // --- Gaze collection during stimulus (desktop) ---
    useEffect(() => {
        if (phase !== 'stimulus' || !isDesktop) return;
        const interval = setInterval(() => {
            if (blaze.gazePos && blaze.gazeState === 'open') {
                gazePoints.current.push({ x: blaze.gazePos.x, y: blaze.gazePos.y, t: Date.now() });
            }
        }, 50); // 20Hz sampling
        return () => clearInterval(interval);
    }, [phase, isDesktop, blaze.gazePos, blaze.gazeState]);

    // --- Touch/tap collection (tablet/mobile) ---
    useEffect(() => {
        if (phase !== 'stimulus' || isDesktop) return;
        const handleTouch = (e: TouchEvent) => {
            for (let i = 0; i < e.touches.length; i++) {
                touchPoints.current.push({
                    x: e.touches[i].clientX,
                    y: e.touches[i].clientY,
                    t: Date.now(),
                });
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

    // --- Scroll tracking (tablet/mobile) ---
    useEffect(() => {
        if (phase !== 'stimulus' || isDesktop) return;
        const handleScroll = () => {
            scrollSamples.current.push({ scrollY: window.scrollY, t: Date.now() });
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        // Sample viewport visibility every 200ms
        const interval = setInterval(() => {
            if (!stimulusRef.current) return;
            const rect = stimulusRef.current.getBoundingClientRect();
            const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
            const visiblePct = rect.height > 0 ? (visibleHeight / rect.height) * 100 : 0;
            viewportEvents.current.push({
                elementId: 'stimulus',
                visibleMs: 200,
                scrollY: window.scrollY,
                t: Date.now(),
            });
            // Track which AOI zones are visible
            if (visiblePct > 20) {
                AOI_ZONES.forEach(zone => {
                    viewportEvents.current.push({
                        elementId: zone.id,
                        visibleMs: 200,
                        scrollY: window.scrollY,
                        t: Date.now(),
                    });
                });
            }
        }, 200);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearInterval(interval);
        };
    }, [phase, isDesktop]);

    // --- Countdown timer during stimulus ---
    useEffect(() => {
        if (phase !== 'stimulus') return;
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    if (isDesktop) { blaze.stop(); stopCamera(); }
                    setPhase('results');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [phase, isDesktop, blaze, stopCamera]);

    // --- Handlers ---
    const handleStart = useCallback(async () => {
        gazePoints.current = [];
        touchPoints.current = [];
        viewportEvents.current = [];
        scrollSamples.current = [];

        if (isDesktop) {
            await startCamera();
            blaze.start();
            setCalIndex(0);
            setPhase('calibrating');
        } else {
            // Mobile/tablet: skip calibration, go straight to stimulus
            setCountdown(STIMULUS_DURATION_MS / 1000);
            setPhase('stimulus');
        }
    }, [isDesktop, startCamera, blaze]);

    const [calBusy, setCalBusy] = useState(false);

    const handleCalibrationClick = useCallback(async (e: React.MouseEvent) => {
        if (calBusy) return; // prevent double-clicks during multi-frame sampling
        setCalBusy(true);

        const normX = (e.clientX / window.innerWidth) - 0.5;
        const normY = (e.clientY / window.innerHeight) - 0.5;
        await blaze.calibrate(normX, normY);

        setCalBusy(false);
        const next = calIndex + 1;
        if (next >= CALIBRATION_TARGETS.length) {
            setCountdown(STIMULUS_DURATION_MS / 1000);
            setPhase('stimulus');
        } else {
            setCalIndex(next);
        }
    }, [calIndex, blaze, calBusy]);

    // --- Results computation (runs once when phase transitions to 'results') ---
    type GazeResults = { mode: 'gaze'; totalPoints: number; aoiDwell: Record<string, number> };
    type ProxyResults = { mode: 'attention-proxy'; totalTouches: number; totalViewportMs: number; totalScrollSamples: number; aoiTouches: Record<string, number> };
    const [results, setResults] = useState<GazeResults | ProxyResults | null>(null);

    useEffect(() => {
        if (phase !== 'results') return;

        if (isDesktop) {
            const aoiDwell: Record<string, number> = {};
            AOI_ZONES.forEach(z => { aoiDwell[z.id] = 0; });

            // Use stimulus image natural dimensions as reference (viewport-independent)
            const totalGaze = gazePoints.current.length;
            gazePoints.current.forEach(pt => {
                // Map gaze screen coords to 0-100% relative to viewport center
                const relX = (pt.x / window.innerWidth) * 100;
                const relY = (pt.y / window.innerHeight) * 100;
                AOI_ZONES.forEach(zone => {
                    if (relX >= zone.x && relX < zone.x + zone.w && relY >= zone.y && relY < zone.y + zone.h) {
                        aoiDwell[zone.id] = (aoiDwell[zone.id] || 0) + 50;
                    }
                });
            });

            setResults({ mode: 'gaze', totalPoints: totalGaze, aoiDwell });
        } else {
            const aoiTouches: Record<string, number> = {};
            AOI_ZONES.forEach(z => { aoiTouches[z.id] = 0; });

            touchPoints.current.forEach(pt => {
                const relX = (pt.x / window.innerWidth) * 100;
                const relY = (pt.y / window.innerHeight) * 100;
                AOI_ZONES.forEach(zone => {
                    if (relX >= zone.x && relX < zone.x + zone.w && relY >= zone.y && relY < zone.y + zone.h) {
                        aoiTouches[zone.id]++;
                    }
                });
            });

            const totalViewportMs = viewportEvents.current
                .filter(e => e.elementId === 'stimulus')
                .reduce((sum, e) => sum + e.visibleMs, 0);

            setResults({
                mode: 'attention-proxy',
                totalTouches: touchPoints.current.length,
                totalViewportMs,
                totalScrollSamples: scrollSamples.current.length,
                aoiTouches,
            });
        }
    }, [phase, isDesktop]);

    const calTarget = CALIBRATION_TARGETS[calIndex];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hidden video for BlazeGaze */}
            {isDesktop && <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />}

            {/* === INTRO === */}
            {phase === 'intro' && (
                <div className="flex min-h-screen items-center justify-center px-4">
                    <div className="max-w-md text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Eye Tracking Hybrid Test</h1>
                        <div className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 bg-blue-100 text-blue-700">
                            {deviceType === 'desktop' ? 'Desktop — Webcam gaze tracking' :
                             deviceType === 'tablet' ? 'Tablet — Touch + viewport tracking' :
                             'Mobile — Touch + viewport tracking'}
                        </div>
                        <p className="text-gray-600 mb-2 text-sm">
                            {isDesktop
                                ? 'We will calibrate your webcam with 17 points, then show a stimulus image for 10 seconds while tracking your gaze.'
                                : 'We will show a stimulus image for 10 seconds. Tap on the areas that catch your attention. We also track viewport visibility and scroll behavior.'}
                        </p>
                        {isDesktop && !blaze.isLoaded && (
                            <p className="text-amber-600 text-xs mb-4">Loading BlazeGaze model...</p>
                        )}
                        <button
                            onClick={handleStart}
                            disabled={isDesktop && !blaze.isLoaded}
                            className="mt-4 px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            {isDesktop && !blaze.isLoaded ? 'Loading...' : 'Start'}
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
                    {/* Instructions */}
                    <div className="pointer-events-none absolute left-1/2 top-12 z-10 -translate-x-1/2 text-center">
                        <p className="text-base font-medium text-white">
                            {calBusy ? 'Sampling... hold still' : 'Look at the green dot, then click on it'}
                        </p>
                        <p className="mt-1 text-sm text-white/80">Point {calIndex + 1} of {CALIBRATION_TARGETS.length}</p>
                        <p className="mt-1 text-xs text-white/60">
                            {blaze.calibrationCount} calibration samples collected (4 frames each)
                        </p>
                    </div>
                    {/* Green dot */}
                    <div
                        className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${calTarget[0]}%`, top: `${calTarget[1]}%` }}
                    >
                        <div className={`h-5 w-5 rounded-full shadow-lg ${calBusy ? 'bg-amber-400 shadow-amber-400/50 animate-pulse' : 'bg-green-400 shadow-green-400/50'}`} />
                    </div>
                    {/* Progress bar */}
                    <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 w-48 -translate-x-1/2">
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(calIndex / CALIBRATION_TARGETS.length) * 100}%` }} />
                        </div>
                    </div>
                    {/* Telemetry */}
                    <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-lg border border-neutral-700/60 bg-black/70 px-3 py-2 font-mono text-[10px] text-neutral-400">
                        BlazeGaze: {blaze.isLoaded ? 'ready' : 'loading'} · Eyes: {blaze.gazeState}
                    </div>
                </div>
            )}

            {/* === STIMULUS === */}
            {phase === 'stimulus' && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950">
                    {/* Countdown */}
                    <div className="absolute top-4 right-4 z-10 rounded-full bg-white/10 px-4 py-1.5 text-sm font-mono text-white">
                        {countdown}s
                    </div>
                    {/* Mode badge */}
                    <div className="absolute top-4 left-4 z-10 rounded-full bg-blue-600/80 px-3 py-1 text-xs text-white">
                        {isDesktop ? 'Gaze tracking' : 'Tap where you look'}
                    </div>
                    {/* Stimulus image */}
                    <div ref={stimulusRef} className="relative max-w-[90vw] max-h-[80vh]">
                        <img
                            src={STIMULUS_URL}
                            alt="Test stimulus"
                            className="max-w-full max-h-[80vh] object-contain rounded-lg"
                            crossOrigin="anonymous"
                        />
                        {/* AOI overlay grid (subtle) */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" />
                        </div>
                    </div>
                    {/* Desktop: gaze dot */}
                    {isDesktop && blaze.gazePos && (
                        <div
                            className="pointer-events-none fixed z-[60] rounded-full"
                            style={{
                                width: 16, height: 16,
                                backgroundColor: 'rgba(239, 68, 68, 0.5)',
                                border: '2px solid rgba(239, 68, 68, 0.8)',
                                left: blaze.gazePos.x - 8,
                                top: blaze.gazePos.y - 8,
                                transition: 'left 0.05s linear, top 0.05s linear',
                            }}
                        />
                    )}
                </div>
            )}

            {/* === RESULTS === */}
            {phase === 'results' && results && (
                <div className="flex min-h-screen items-center justify-center px-4 py-8">
                    <div className="max-w-lg w-full space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">Results</h2>
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                Mode: {results.mode === 'gaze' ? 'Webcam Gaze (Desktop)' : 'Attention Proxy (Touch + Viewport)'}
                            </span>
                        </div>

                        {/* Stats */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-gray-900">Data collected</h3>
                            {results.mode === 'gaze' ? (
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-gray-50 rounded p-3">
                                        <p className="text-gray-500 text-xs">Gaze samples</p>
                                        <p className="text-lg font-bold text-gray-900">{results.totalPoints}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded p-3">
                                        <p className="text-gray-500 text-xs">Sample rate</p>
                                        <p className="text-lg font-bold text-gray-900">20 Hz</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3 text-sm">
                                    <div className="bg-gray-50 rounded p-3">
                                        <p className="text-gray-500 text-xs">Touches</p>
                                        <p className="text-lg font-bold text-gray-900">{results.totalTouches}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded p-3">
                                        <p className="text-gray-500 text-xs">Viewport time</p>
                                        <p className="text-lg font-bold text-gray-900">{((results.totalViewportMs || 0) / 1000).toFixed(1)}s</p>
                                    </div>
                                    <div className="bg-gray-50 rounded p-3">
                                        <p className="text-gray-500 text-xs">Scroll events</p>
                                        <p className="text-lg font-bold text-gray-900">{results.totalScrollSamples}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* AOI breakdown */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-gray-900">AOI breakdown</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {AOI_ZONES.map(zone => {
                                    const value = results.mode === 'gaze'
                                        ? `${((results.aoiDwell?.[zone.id] || 0) / 1000).toFixed(1)}s`
                                        : `${(results as { aoiTouches: Record<string, number> }).aoiTouches?.[zone.id] || 0} taps`;
                                    const total = results.mode === 'gaze'
                                        ? Object.values(results.aoiDwell || {}).reduce((a, b) => a + b, 0)
                                        : Object.values((results as { aoiTouches: Record<string, number> }).aoiTouches || {}).reduce((a, b) => a + b, 0);
                                    const raw = results.mode === 'gaze'
                                        ? (results.aoiDwell?.[zone.id] || 0)
                                        : ((results as { aoiTouches: Record<string, number> }).aoiTouches?.[zone.id] || 0);
                                    const pct = total > 0 ? (raw / total) * 100 : 0;

                                    return (
                                        <div key={zone.id} className="bg-gray-50 rounded p-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-medium text-gray-700">{zone.label}</span>
                                                <span className="text-xs text-gray-500">{value}</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-gray-200">
                                                <div
                                                    className="h-full rounded-full bg-blue-500 transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="text-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                            >
                                Run again
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
