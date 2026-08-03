import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        include: ['src/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reportOnFailure: true,
            reporter: ['text', 'json-summary'],
            include: ['src/**/*.ts'],
            exclude: ['src/**/__tests__/**', 'src/**/*.d.ts'],
            thresholds: {
                '**/analytics/eye-tracking.analytics.ts': { lines: 60, functions: 60 },
                '**/analytics/eye-tracking-v2.analytics.ts': { lines: 80, functions: 80 },
                '**/tracking/tracking-emotion.analytics.ts': { lines: 80, functions: 80 },
                '**/tracking/tracking-gaze-logic.ts': { lines: 90, functions: 90 },
                '**/tracking/tracking-gaze.analytics.ts': { lines: 80, functions: 80 },
                '**/tracking/tracking-report.service.ts': { lines: 70, functions: 70 },
            },
        },
    },
});
