import { type ReactElement, useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBlazeGaze } from '../../hooks/useBlazeGaze';

type Phase = 'permission' | 'calibrating' | 'tracking' | 'done';

const CALIBRATION_TARGETS: [number, number][] = [
    // Row 1 — top (just below header, ~12% to clear 52px bar)
    [5, 12], [25, 12], [50, 12], [75, 12], [95, 12],
    // Row 2 — upper quarter
    [15, 25], [50, 25], [85, 25],
    // Row 3 — middle
    [10, 50], [50, 50], [90, 50],
    // Row 4 — lower quarter
    [15, 75], [50, 75], [85, 75],
    // Row 5 — bottom
    [5, 92], [50, 92], [95, 92],
];
const HEADER_HEIGHT = 52;

/**
 * Eye-tracking lab — WebEyeTrack BlazeGaze CNN only (single pipeline).
 * 9-point calibration → live gaze tracking. Clicks during tracking keep calibrating.
 */
export function EyeTrackingLabPage(): ReactElement {
    const [phase, setPhase] = useState<Phase>('permission');
    const videoRef = useRef<HTMLVideoElement>(null);
    const blaze = useBlazeGaze(videoRef);

    const [calIndex, setCalIndex] = useState(0);
    const [clickRipple, setClickRipple] = useState<{ x: number; y: number; id: number } | null>(null);
    const rippleTimer = useRef<ReturnType<typeof setTimeout>>(0 as unknown as ReturnType<typeof setTimeout>);

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

    // --- Handlers ---

    const handleStart = useCallback(async () => {
        await startCamera();
        blaze.start();
        setCalIndex(0);
        setPhase('calibrating');
    }, [startCamera, blaze]);

    const showRipple = useCallback((x: number, y: number) => {
        clearTimeout(rippleTimer.current);
        setClickRipple({ x, y, id: Date.now() });
        rippleTimer.current = setTimeout(() => setClickRipple(null), 500);
    }, []);

    const handleCalibrationClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
        showRipple(e.clientX, e.clientY);

        const normX = (e.clientX / window.innerWidth) - 0.5;
        const normY = (e.clientY / window.innerHeight) - 0.5;
        blaze.calibrate(normX, normY);

        const next = calIndex + 1;
        if (next >= CALIBRATION_TARGETS.length) {
            setPhase('tracking');
        } else {
            setCalIndex(next);
        }
    }, [calIndex, blaze, showRipple]);

    const handleFinish = useCallback(() => {
        blaze.stop();
        stopCamera();
        setPhase('done');
    }, [blaze, stopCamera]);

    const handleRecalibrate = useCallback(() => {
        setCalIndex(0);
        setPhase('calibrating');
    }, []);

    useEffect(() => {
        return () => {
            clearTimeout(rippleTimer.current);
            blaze.stop();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const calTarget = CALIBRATION_TARGETS[calIndex];

    return (
        <>
            {/* Hidden video for BlazeGaze */}
            <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />

            {/* Calibration / tracking background */}
            {(phase === 'calibrating' || phase === 'tracking') && (
                <div
                    className="fixed inset-x-0 bottom-0 top-[52px] z-[10030] bg-neutral-950"
                    style={{ cursor: phase === 'tracking' ? 'none' : 'crosshair' }}
                />
            )}

            {/* Header */}
            <div className="pointer-events-none fixed left-0 right-0 top-0 z-[10070] border-b border-neutral-800 bg-neutral-950 px-4 py-3 text-neutral-100">
                <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
                    <div className="pointer-events-auto">
                        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Lab</span>
                        <h1 className="text-base font-semibold text-white">Eye tracking</h1>
                    </div>
                    <div className="pointer-events-auto flex gap-2">
                        {phase === 'tracking' && (
                            <button type="button" onClick={handleRecalibrate}
                                className="rounded-md border border-amber-600 px-3 py-1.5 text-sm text-amber-400 transition hover:bg-amber-950">
                                Recalibrate
                            </button>
                        )}
                        {phase !== 'permission' && phase !== 'done' && (
                            <button type="button" onClick={handleFinish}
                                className="rounded-md border border-red-600 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-950">
                                Stop
                            </button>
                        )}
                        <Link to="/dashboard"
                            className="rounded-md border border-neutral-600 px-3 py-1.5 text-sm text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-900">
                            Back
                        </Link>
                    </div>
                </div>
            </div>

            {/* Permission screen */}
            {phase === 'permission' && (
                <div className="relative z-[10040] flex min-h-[calc(100dvh-52px)] items-center justify-center bg-gray-50">
                    <div className="mx-auto max-w-md p-8 text-center">
                        <h2 className="mb-4 text-2xl font-bold text-gray-900">Eye tracking lab</h2>
                        <p className="mb-2 text-gray-600">
                            BlazeGaze CNN — gaze prediction from eye image patches.
                        </p>
                        <p className="mb-6 text-sm text-gray-500">
                            9-point calibration → live gaze tracking. Clicks during tracking keep improving.
                        </p>
                        <button type="button" onClick={handleStart}
                            className="rounded-lg bg-blue-600 px-8 py-3 font-medium text-white transition hover:bg-blue-700">
                            Start
                        </button>
                        {!blaze.isLoaded && (
                            <p className="mt-3 text-xs text-gray-400">BlazeGaze model loading in background…</p>
                        )}
                    </div>
                </div>
            )}

            {/* Calibration overlay */}
            {phase === 'calibrating' && calTarget && (
                <div className="pointer-events-none fixed inset-0 z-[10050] select-none">
                    <button type="button"
                        className="pointer-events-auto fixed inset-0 z-0 cursor-crosshair bg-transparent"
                        onClick={handleCalibrationClick}
                    />

                    <div className="pointer-events-none absolute left-1/2 top-20 z-10 max-w-lg -translate-x-1/2 px-4 text-center">
                        <p className="text-lg font-medium text-white drop-shadow-md">
                            Look at the green dot, then click exactly on it.
                        </p>
                        <p className="mt-1 text-sm text-white/90 drop-shadow">
                            Point {calIndex + 1} of {CALIBRATION_TARGETS.length}
                        </p>
                    </div>

                    <DotTarget pctX={calTarget[0]} pctY={calTarget[1]} topInset={HEADER_HEIGHT} />

                    <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 w-48 -translate-x-1/2">
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/30">
                            <div className="h-full rounded-full bg-green-500/90 transition-all duration-300"
                                style={{ width: `${(calIndex / CALIBRATION_TARGETS.length) * 100}%` }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Telemetry */}
            {phase !== 'permission' && phase !== 'done' && (
                <div className="pointer-events-none fixed bottom-4 left-4 z-[10080] w-[200px] rounded-lg border border-neutral-700/60 bg-black/80 px-3 py-2.5 font-mono text-[11px] backdrop-blur-sm">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Telemetry</p>
                    <div className="space-y-1 text-neutral-300">
                        <div className="flex justify-between">
                            <span>BlazeGaze</span>
                            <span className={blaze.isLoaded ? 'text-green-400' : 'text-amber-400'}>
                                {blaze.isLoaded ? 'ready' : 'loading…'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Eyes</span>
                            <span className={blaze.gazeState === 'open' ? 'text-green-400' : 'text-red-400'}>
                                {blaze.gazeState}
                            </span>
                        </div>
                        {blaze.gazePos && (
                            <div className="flex justify-between">
                                <span>gaze</span>
                                <span className="text-red-400">
                                    {Math.round(blaze.gazePos.x)}, {Math.round(blaze.gazePos.y)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Gaze dot */}
            {phase === 'tracking' && blaze.gazePos && (
                <div className="pointer-events-none fixed z-[10051] rounded-full"
                    style={{
                        width: 20, height: 20,
                        backgroundColor: 'rgba(239, 68, 68, 0.6)',
                        border: '2px solid rgba(239, 68, 68, 0.9)',
                        left: blaze.gazePos.x - 10,
                        top: blaze.gazePos.y - 10,
                        transition: 'left 0.05s linear, top 0.05s linear',
                    }}
                />
            )}

            {/* Click ripple */}
            {clickRipple && (
                <div key={clickRipple.id}
                    className="pointer-events-none fixed z-[10060] animate-ping rounded-full border-2 border-white/80"
                    style={{ width: 28, height: 28, left: clickRipple.x - 14, top: clickRipple.y - 14 }}
                />
            )}

            {/* Done */}
            {phase === 'done' && (
                <div className="relative z-[10040] flex min-h-[calc(100dvh-52px)] items-center justify-center bg-gray-50">
                    <div className="mx-auto max-w-md p-8 text-center">
                        <h2 className="mb-4 text-2xl font-bold text-gray-900">Session ended</h2>
                        <button type="button" onClick={() => window.location.reload()}
                            className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition hover:bg-blue-700">
                            Run again
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

function DotTarget({ pctX, pctY, topInset }: { pctX: number; pctY: number; topInset: number }) {
    return (
        <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pctX}%`, top: `calc(${topInset}px + (100dvh - ${topInset}px) * ${pctY} / 100)` }}
            aria-hidden>
            <svg width="40" height="40" viewBox="0 0 40 40" className="absolute -left-3 -top-3">
                <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(74,222,128,0.55)" strokeWidth="3" />
            </svg>
            <div className="h-4 w-4 rounded-full bg-green-400/95" />
        </div>
    );
}
