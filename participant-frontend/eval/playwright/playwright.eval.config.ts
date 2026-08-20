/**
 * Playwright config for gaze evaluation.
 *
 * Uses Chromium with fake camera feed (--use-fake-device-for-media-stream).
 * When a Y4M video is present in the dataset, it's fed via --use-file-for-fake-video-capture.
 *
 * Run: npx playwright test --config eval/playwright/playwright.eval.config.ts
 */

import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.EVAL_BASE_URL ?? 'http://localhost:12600';

export default defineConfig({
  testDir: '.',
  testMatch: /gazeEval\.spec\.ts/,
  timeout: 120_000, // 2 min per test (calibration + tracking takes time)
  retries: 0,
  workers: 1, // sequential — camera can only be used by one browser at a time
  reporter: [
    ['list'],
    ['json', { outputFile: '../results/playwright-results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    headless: true,
    video: 'off',
    screenshot: 'off',
  },
  projects: [
    {
      name: 'desktop-1280x720',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            // Y4M file path injected per-test via EVAL_VIDEO_PATH env var
            ...(process.env.EVAL_VIDEO_PATH
              ? [`--use-file-for-fake-video-capture=${process.env.EVAL_VIDEO_PATH}`]
              : []),
          ],
        },
      },
    },
    {
      name: 'mobile-375x667',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            ...(process.env.EVAL_VIDEO_PATH
              ? [`--use-file-for-fake-video-capture=${process.env.EVAL_VIDEO_PATH}`]
              : []),
          ],
        },
      },
    },
  ],
});
