import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['src/**/*.test.{ts,tsx}'],
        css: false,
        coverage: {
            provider: 'v8',
            reportOnFailure: true,
            reporter: ['text', 'json-summary'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/**/__tests__/**', 'src/**/*.d.ts'],
            thresholds: {
                '**/eyeTracking/ridgeRegression.ts': { lines: 80, functions: 80 },
                '**/eyeTracking/facsClassifier.ts': { lines: 80, functions: 80 },
                '**/eyeTracking/fixationDetector.ts': { lines: 80, functions: 80 },
                '**/eyeTracking/oneEuroFilter.ts': { lines: 90, functions: 90 },
                '**/eyeTracking/gazeGapFill.ts': { lines: 90, functions: 90 },
                '**/eyeTracking/calibrationStore.ts': { lines: 80, functions: 80 },
                '**/eyeTracking/hybridCalibrationField.ts': { lines: 80, functions: 80 },
                '**/eyeTracking/hybridZoneGrid.ts': { lines: 80, functions: 80 },
                '**/eyeTracking/attention/uncertaintyEstimator.ts': { lines: 80, functions: 80 },
                '**/eyeTracking/attention/probabilisticHeatmap.ts': { lines: 80, functions: 80 },
                '**/eyeTracking/zoneClassifier.ts': { lines: 80, functions: 80 },
                '**/eyeTracking/zoneRegistry.ts': { lines: 80, functions: 80 },
                '**/eyeTracking/zoneEventEmitter.ts': { lines: 80, functions: 80 },
                '**/eyeTracking/hysteresisEngine.ts': { lines: 80, functions: 80 },
                '**/eyeTracking/v2ResponseBuilder.ts': { lines: 80, functions: 80 },
                '**/eyeTracking/deviceProfile.ts': { lines: 80, functions: 80 },
                '**/eyeTracking/featureExtraction.ts': { lines: 80, functions: 80 },
                '**/eyeTracking/microExpressionDetector.ts': { lines: 80, functions: 80 },
            },
        },
    },
});
