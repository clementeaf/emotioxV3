interface EyeTrackingStepProps {
    gazePosition: [number, number];
    onFinish: () => void;
    hasFace: boolean;
    featuresReady: boolean;
}

/**
 * Full-screen gaze overlay with green indicator (research lab); camera visible underneath.
 */
export function EyeTrackingStep({ gazePosition, onFinish, hasFace, featuresReady }: EyeTrackingStepProps) {
    const [gx, gy] = gazePosition;

    return (
        <div className="pointer-events-none fixed inset-0 z-[10050] flex flex-col items-center justify-end bg-transparent pb-16 select-none">
            <p className="mb-2 text-sm text-white drop-shadow">Estimated gaze (green dot)</p>
            <p className="mb-4 max-w-md px-4 text-center text-xs text-white/80 drop-shadow">
                Face: {hasFace ? 'detected' : 'none'} · Features: {featuresReady ? 'ok' : 'weak'}
            </p>

            <button
                type="button"
                onClick={onFinish}
                className="pointer-events-auto rounded-lg bg-white px-6 py-2.5 font-medium text-gray-900 transition hover:bg-gray-100"
            >
                Finish
            </button>

            <div
                className="pointer-events-none fixed rounded-full"
                style={{
                    width: 20,
                    height: 20,
                    backgroundColor: 'rgba(74, 222, 128, 0.6)',
                    border: '2px solid rgba(74, 222, 128, 0.9)',
                    left: gx - 10,
                    top: gy - 10,
                    zIndex: 10051,
                    transition: 'left 0.05s linear, top 0.05s linear',
                }}
            />
        </div>
    );
}
