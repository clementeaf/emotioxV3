import { useTranslation } from 'react-i18next';

interface EyeTrackingCalibrationStepProps {
  dotPosition: [number, number]; // [x%, y%]
  progress: number;
  total: number;
  isCollecting: boolean;
  collectProgress: number;
  framesPerPoint: number;
  onDotClick: () => void;
}

export function EyeTrackingCalibrationStep({
  dotPosition,
  progress,
  total,
  isCollecting,
  collectProgress,
  framesPerPoint,
  onDotClick,
}: EyeTrackingCalibrationStepProps) {
  const { t } = useTranslation();
  const [pctX, pctY] = dotPosition;
  const collectPct = (collectProgress / framesPerPoint) * 100;

  return (
    <div
      className="fixed inset-0 bg-white cursor-crosshair select-none"
      style={{ zIndex: 9999 }}
    >
      {/* Instruction */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center">
        <p className="text-gray-700 text-lg font-medium">
          {isCollecting
            ? t('eyeTracking.keepLooking')
            : t('eyeTracking.lookAndClick')}
        </p>
        <p className="text-gray-500 text-sm mt-1">
          {t('eyeTracking.pointOf', { current: progress + 1, total })}
        </p>
      </div>

      {/* Calibration dot with collection ring */}
      <button
        onClick={isCollecting ? undefined : onDotClick}
        disabled={isCollecting}
        className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
        style={{ left: `${pctX}%`, top: `${pctY}%` }}
        aria-label={t('eyeTracking.calibrationPoint', { number: progress + 1 })}
      >
        {/* Collection progress ring */}
        <svg width="40" height="40" viewBox="0 0 40 40" className="absolute -top-3 -left-3">
          <circle
            cx="20" cy="20" r="17"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="3"
          />
          {isCollecting && (
            <circle
              cx="20" cy="20" r="17"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeDasharray={`${(collectPct / 100) * 106.8} 106.8`}
              strokeLinecap="round"
              transform="rotate(-90 20 20)"
              className="transition-all duration-75"
            />
          )}
        </svg>
        {/* Inner dot */}
        <div
          className={`w-4 h-4 rounded-full ${isCollecting ? 'bg-blue-500' : 'bg-red-500 animate-pulse'}`}
        />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-300"
            style={{ width: `${(progress / total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
