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
        },
    },
});
