import { CALIBRATION_VIEWPORT_TOP_INSET_PX } from '../../lib/eyeTracking';

interface EyeTrackingCalibrationStepProps {
    dotPosition: [number, number];
    progress: number;
    total: number;
    isCollecting: boolean;
    collectProgress: number;
    framesPerPoint: number;
    onViewportClick: (event: React.MouseEvent<HTMLElement>) => void;
    hasFace: boolean;
    featuresReady: boolean;
}

/**
 * Nine-point calibration: green guide only; ridge targets use the exact click (clientX/clientY).
 */
export function EyeTrackingCalibrationStep({
    dotPosition,
    progress,
    total,
    isCollecting,
    collectProgress,
    framesPerPoint,
    onViewportClick,
    hasFace,
    featuresReady,
}: EyeTrackingCalibrationStepProps) {
    const [pctX, pctY] = dotPosition;
    const collectPct = (collectProgress / framesPerPoint) * 100;

    return (
        <div className="pointer-events-none fixed inset-0 z-[10050] select-none">
            {!isCollecting && (
                <button
                    type="button"
                    className="pointer-events-auto fixed inset-0 z-0 cursor-crosshair bg-transparent"
                    aria-label={`Calibration point ${progress + 1} of ${total}: click where you are looking`}
                    onClick={e => onViewportClick(e)}
                />
            )}
            {isCollecting && <div className="pointer-events-auto fixed inset-0 z-0" aria-hidden />}

            <div className="pointer-events-none absolute left-1/2 top-20 z-10 max-w-lg -translate-x-1/2 px-4 text-center">
                <p className="text-lg font-medium text-white drop-shadow-md">
                    {isCollecting
                        ? 'Hold your gaze on that spot while we sample…'
                        : 'Look where you are looking, then click that exact spot. The green dot is only a guide.'}
                </p>
                <p className="mt-1 text-sm text-white/90 drop-shadow">
                    Point {progress + 1} of {total}
                </p>
                <p className="mt-2 text-xs text-white/80 drop-shadow">
                    Face: {hasFace ? 'detected' : 'none'} · Gaze features:{' '}
                    {featuresReady ? 'ready' : 'need full face + iris visible'}
                </p>
                {isCollecting && !featuresReady && collectProgress === 0 && (
                    <p className="mt-2 text-xs font-medium text-amber-200 drop-shadow">
                        Waiting for stable features — check lighting and face the camera.
                    </p>
                )}
            </div>

            <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{
                    left: `${pctX}%`,
                    top: `calc(${CALIBRATION_VIEWPORT_TOP_INSET_PX}px + (100dvh - ${CALIBRATION_VIEWPORT_TOP_INSET_PX}px) * ${pctY} / 100)`,
                }}
                aria-hidden
            >
                <svg width="40" height="40" viewBox="0 0 40 40" className="absolute -left-3 -top-3">
                    <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(74,222,128,0.55)" strokeWidth="3" />
                    {isCollecting && (
                        <circle
                            cx="20"
                            cy="20"
                            r="17"
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="3"
                            strokeDasharray={`${(collectPct / 100) * 106.8} 106.8`}
                            strokeLinecap="round"
                            transform="rotate(-90 20 20)"
                            className="transition-all duration-75"
                        />
                    )}
                </svg>
                <div
                    className={`h-4 w-4 rounded-full ${isCollecting ? 'bg-green-500' : 'bg-green-400/95'}`}
                />
            </div>

            <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 w-48 -translate-x-1/2">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/30">
                    <div
                        className="h-full rounded-full bg-green-500/90 transition-all duration-300"
                        style={{ width: `${(progress / total) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
