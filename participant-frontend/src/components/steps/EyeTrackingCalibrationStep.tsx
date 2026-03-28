import { useTranslation } from 'react-i18next';

interface EyeTrackingCalibrationStepProps {
  dotPosition: [number, number]; // [x%, y%] guide only
  progress: number;
  total: number;
  isCollecting: boolean;
  collectProgress: number;
  framesPerPoint: number;
  onDotClick: (event: React.MouseEvent<HTMLElement>) => void;
}

/**
 * Nine-point calibration: ridge targets use the exact click position; the dot is a visual guide only.
 */
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
    <div className="pointer-events-none fixed inset-0 cursor-crosshair select-none" style={{ zIndex: 9999 }}>
      {!isCollecting && (
        <button
          type="button"
          className="pointer-events-auto fixed inset-0 z-0 cursor-crosshair bg-transparent"
          aria-label={t('eyeTracking.calibrationPoint', { number: progress + 1 })}
          onClick={e => onDotClick(e)}
        />
      )}
      {isCollecting && <div className="pointer-events-auto fixed inset-0 z-0" aria-hidden />}

      <div className="pointer-events-none absolute top-6 left-1/2 z-10 -translate-x-1/2 text-center">
        <p className="text-lg font-medium text-gray-700">
          {isCollecting ? t('eyeTracking.keepLooking') : t('eyeTracking.lookAndClick')}
        </p>
        <p className="mt-1 text-sm text-gray-500">{t('eyeTracking.pointOf', { current: progress + 1, total })}</p>
        <p className="mt-2 max-w-md text-xs text-gray-500">
          {t('eyeTracking.clickWhereYouLook')}
        </p>
      </div>

      <div
        className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${pctX}%`, top: `${pctY}%` }}
        aria-hidden
      >
        <svg width="40" height="40" viewBox="0 0 40 40" className="absolute -left-3 -top-3">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          {isCollecting && (
            <circle
              cx="20"
              cy="20"
              r="17"
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
        <div
          className={`h-4 w-4 rounded-full ${isCollecting ? 'bg-blue-500' : 'animate-pulse bg-red-500'}`}
        />
      </div>

      <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 w-48 -translate-x-1/2">
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-red-500 transition-all duration-300"
            style={{ width: `${(progress / total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
