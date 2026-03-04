import { useTranslation } from 'react-i18next';

interface EyeTrackingStepProps {
  gazePosition: [number, number]; // [screenX, screenY]
  onFinish: () => void;
}

export function EyeTrackingStep({ gazePosition, onFinish }: EyeTrackingStepProps) {
  const { t } = useTranslation();
  const [gx, gy] = gazePosition;

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-end pb-16 select-none" style={{ zIndex: 9999 }}>
      <p className="text-gray-400 text-sm mb-4">
        {t('eyeTracking.gazeIndicator')}
      </p>

      <button
        onClick={onFinish}
        className="px-6 py-2.5 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
      >
        {t('eyeTracking.finish')}
      </button>

      {/* Gaze indicator */}
      <div
        className="fixed pointer-events-none rounded-full"
        style={{
          width: 20,
          height: 20,
          backgroundColor: 'rgba(74, 222, 128, 0.6)',
          border: '2px solid rgba(74, 222, 128, 0.9)',
          left: gx - 10,
          top: gy - 10,
          zIndex: 10001,
          transition: 'left 0.05s linear, top 0.05s linear',
        }}
      />
    </div>
  );
}
