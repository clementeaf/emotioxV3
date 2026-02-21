import { useState, useRef, useMemo, useCallback } from 'react';
import { useWebcam } from '../hooks/useWebcam';
import { useEyeTracking } from '../hooks/useEyeTracking';
import { EyeTrackingCalibrationStep } from '../components/steps/EyeTrackingCalibrationStep';
import { EyeTrackingStep } from '../components/steps/EyeTrackingStep';

type Phase = 'permission' | 'calibrating' | 'tracking' | 'done';

export function EyeTrackingTestPage() {
  const [phase, setPhase] = useState<Phase>('permission');
  const [startTime] = useState(() => Date.now());
  const [endTime, setEndTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const webcam = useWebcam(videoRef);
  const eyeTracking = useEyeTracking(videoRef);

  const duration = useMemo(
    () => (endTime > 0 ? Math.round((endTime - startTime) / 1000) : 0),
    [endTime, startTime],
  );

  const handleStart = useCallback(async () => {
    await webcam.start();
    eyeTracking.startCalibration();
    setPhase('calibrating');
  }, [webcam, eyeTracking]);

  const handleCalibrationDotClick = useCallback(() => {
    eyeTracking.recordCalibrationPoint(() => {
      // Called when all calibration points are done
      eyeTracking.startTracking();
      setPhase('tracking');
    });
  }, [eyeTracking]);

  const handleFinish = useCallback(() => {
    eyeTracking.stopTracking();
    webcam.stop();
    setEndTime(Date.now());
    setPhase('done');
  }, [eyeTracking, webcam]);

  return (
    <>
      <div
        className={phase === 'tracking' ? '' : 'sr-only overflow-hidden'}
        style={phase === 'tracking' ? {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, calc(-50% - 40px))',
          maxWidth: 640,
          maxHeight: 480,
          borderRadius: 12,
          overflow: 'hidden',
          border: '2px solid rgb(55, 65, 81)',
          zIndex: 10000,
        } : undefined}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
      </div>

      {phase === 'permission' && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Eye Tracking Test
            </h1>
            <p className="text-gray-600 mb-2">
              Esta prueba usa tu cámara para estimar hacia dónde estás mirando en la pantalla.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Primero calibraremos con 9 puntos, luego verás el rastreo en tiempo real.
            </p>

            {!eyeTracking.isModelLoaded && (
              <p className="text-amber-600 text-sm mb-4">
                Cargando modelo de detección facial...
              </p>
            )}

            {webcam.error && (
              <p className="text-red-600 text-sm mb-4">
                Error: {webcam.error}
              </p>
            )}

            <button
              onClick={handleStart}
              disabled={!eyeTracking.isModelLoaded}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {eyeTracking.isModelLoaded ? 'Iniciar' : 'Cargando...'}
            </button>
          </div>
        </div>
      )}

      {phase === 'calibrating' && eyeTracking.currentDotPosition && (
        <EyeTrackingCalibrationStep
          dotPosition={eyeTracking.currentDotPosition}
          progress={eyeTracking.calibrationProgress}
          total={eyeTracking.totalCalibrationPoints}
          isCollecting={eyeTracking.state === 'collecting'}
          collectProgress={eyeTracking.collectProgress}
          framesPerPoint={eyeTracking.framesPerPoint}
          onDotClick={handleCalibrationDotClick}
        />
      )}

      {phase === 'tracking' && (
        <EyeTrackingStep
          gazePosition={eyeTracking.gazePosition}
          onFinish={handleFinish}
        />
      )}

      {phase === 'done' && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Prueba completada
            </h1>
            <div className="bg-white rounded-lg p-6 shadow-sm space-y-3">
              <p className="text-gray-600">
                Puntos calibrados: <span className="font-semibold">{eyeTracking.totalCalibrationPoints}</span>
              </p>
              <p className="text-gray-600">
                Duración: <span className="font-semibold">{duration}s</span>
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Repetir prueba
            </button>
          </div>
        </div>
      )}
    </>
  );
}
