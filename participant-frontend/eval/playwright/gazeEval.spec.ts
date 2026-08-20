/**
 * Playwright E2E gaze evaluation spec.
 *
 * Supports single-engine mode via EVAL_ENGINE env var:
 *   EVAL_ENGINE=mediapipe  — only MediaPipe+Ridge
 *   EVAL_ENGINE=blazegaze  — only BlazeGaze
 *   (unset)                — both engines (default)
 *
 * Run:
 *   EVAL_ENGINE=mediapipe npx playwright test --config eval/playwright/playwright.eval.config.ts
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { GroundTruth, EvalMetrics, EvalRun } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REPETITIONS = Number(process.env.EVAL_REPETITIONS ?? '3');
const DATASET_DIR = process.env.EVAL_DATASET_DIR
  ?? path.resolve(__dirname, '../datasets/synthetic-default');
const RESULTS_DIR = path.resolve(__dirname, '../results');
const ENGINE = process.env.EVAL_ENGINE ?? ''; // 'mediapipe', 'blazegaze', or '' (both)

// ---------------------------------------------------------------------------
// Default ground truth
// ---------------------------------------------------------------------------

const DEFAULT_GROUND_TRUTH: GroundTruth = {
  calibration: [
    { startMs: 0, endMs: 800, x: 0.1, y: 0.1 },
    { startMs: 1000, endMs: 1800, x: 0.5, y: 0.1 },
    { startMs: 2000, endMs: 2800, x: 0.9, y: 0.1 },
    { startMs: 3000, endMs: 3800, x: 0.1, y: 0.5 },
    { startMs: 4000, endMs: 4800, x: 0.5, y: 0.5 },
    { startMs: 5000, endMs: 5800, x: 0.9, y: 0.5 },
    { startMs: 6000, endMs: 6800, x: 0.1, y: 0.9 },
    { startMs: 7000, endMs: 7800, x: 0.5, y: 0.9 },
    { startMs: 8000, endMs: 8800, x: 0.9, y: 0.9 },
  ],
  evaluation: [
    { startMs: 10000, endMs: 14000, x: 0.25, y: 0.5, zone: 'left' },
    { startMs: 15000, endMs: 19000, x: 0.75, y: 0.5, zone: 'right' },
    { startMs: 20000, endMs: 24000, x: 0.5, y: 0.5, zone: 'center' },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadGroundTruth(): GroundTruth {
  const gtPath = path.join(DATASET_DIR, 'ground-truth.json');
  if (fs.existsSync(gtPath)) {
    return JSON.parse(fs.readFileSync(gtPath, 'utf-8')) as GroundTruth;
  }
  return DEFAULT_GROUND_TRUTH;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

interface EvalResult {
  blazeMetrics: EvalMetrics | null;
  mpMetrics: EvalMetrics | null;
  blazeFps: number;
  mpFps: number;
  evalDurationMs: number;
  ridgeDiagnostics: unknown;
  ridgeCvRmse: number | null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const allRuns: EvalRun[] = [];

for (let rep = 0; rep < REPETITIONS; rep++) {
  test(`Gaze eval [${ENGINE || 'both'}] — rep ${rep + 1}/${REPETITIONS}`, async ({ page }, testInfo) => {
    const gt = loadGroundTruth();
    const viewport = testInfo.project.use.viewport ?? { width: 1280, height: 720 };
    const viewportLabel = `${viewport.width}x${viewport.height}`;

    // Inject ground truth
    await page.addInitScript((gtJson: string) => {
      (window as Record<string, unknown>).__gazeEvalGroundTruth = JSON.parse(gtJson);
    }, JSON.stringify(gt));

    // Navigate — with optional engine filter, RFF toggle, predictor toggle
    const engineParam = ENGINE ? `&engine=${ENGINE}` : '';
    const rffParam = process.env.EVAL_RFF === 'true' ? '&rff=true' : '';
    const predictorParam = process.env.EVAL_PREDICTOR ? `&predictor=${process.env.EVAL_PREDICTOR}` : '';
    const modelParam = process.env.EVAL_MODEL ? `&model=${process.env.EVAL_MODEL}` : '';
    await page.goto(`/test/gaze-compare?eval=true${engineParam}${rffParam}${predictorParam}${modelParam}`, { waitUntil: 'networkidle' });

    // Wait for tracking phase — take screenshot after 10s if still loading
    const trackingReady = page.waitForFunction(() => {
      const header = document.querySelector('header');
      return header?.textContent?.includes('tracking') || header?.textContent?.includes('complete');
    }, { timeout: 180_000 });

    // Capture console logs for debugging
    const consoleLogs: string[] = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => consoleLogs.push(`[ERROR] ${err.message}`));

    // Debug: screenshot if stuck
    const debugTimer = setTimeout(async () => {
      try {
        ensureDir(RESULTS_DIR);
        await page.screenshot({ path: path.join(RESULTS_DIR, `debug-stuck-${Date.now()}.png`) });
        const consoleLog = await page.evaluate(() => (window as Record<string, unknown>).__evalDebugLog ?? 'none');
        fs.writeFileSync(path.join(RESULTS_DIR, 'debug-console.txt'),
          String(consoleLog) + '\n\n--- Browser Console ---\n' + consoleLogs.join('\n'));
      } catch { /* noop */ }
    }, 30_000);

    await trackingReady;
    clearTimeout(debugTimer);

    // Wait for eval completion
    const maxWaitMs = gt.evaluation.length > 0
      ? Math.max(...gt.evaluation.map(p => p.endMs)) + 15_000
      : 60_000;

    await page.waitForFunction(
      () => {
        const r = (window as Record<string, unknown>).__gazeEvalResults;
        return r && (r as { done: boolean }).done === true;
      },
      { timeout: maxWaitMs },
    );

    // Extract
    const results = await page.evaluate(() => {
      return (window as Record<string, unknown>).__gazeEvalResults as EvalResult;
    });

    expect(results).toBeDefined();

    // Save per-run result
    ensureDir(RESULTS_DIR);
    const engineLabel = ENGINE || 'both';
    const runFile = path.join(
      RESULTS_DIR,
      `run-${engineLabel}-${viewportLabel}-rep${rep + 1}-${Date.now()}.json`,
    );

    const runData = {
      engine: engineLabel,
      blaze: results.blazeMetrics,
      mp: results.mpMetrics,
      blazeFps: results.blazeFps,
      mpFps: results.mpFps,
      evalDurationMs: results.evalDurationMs,
      ridgeDiagnostics: results.ridgeDiagnostics,
      ridgeCvRmse: results.ridgeCvRmse,
      viewport: viewportLabel,
      repetition: rep + 1,
    };
    fs.writeFileSync(runFile, JSON.stringify(runData, null, 2));

    // Store for aggregate
    if (results.blazeMetrics) {
      allRuns.push({
        config: { dataset: path.basename(DATASET_DIR), viewport: { ...viewport, label: viewportLabel }, repetition: rep + 1 },
        metrics: results.blazeMetrics,
        timestamp: new Date().toISOString(),
      });
    }
    if (results.mpMetrics) {
      allRuns.push({
        config: { dataset: path.basename(DATASET_DIR), viewport: { ...viewport, label: viewportLabel }, repetition: rep + 1 },
        metrics: results.mpMetrics,
        timestamp: new Date().toISOString(),
      });
    }

    // Assertions
    if (results.blazeMetrics) {
      expect(Number.isFinite(results.blazeMetrics.rmsePx)).toBe(true);
      expect(results.blazeMetrics.totalFrames).toBeGreaterThan(0);
    }
    if (results.mpMetrics) {
      expect(Number.isFinite(results.mpMetrics.rmsePx)).toBe(true);
      expect(results.mpMetrics.totalFrames).toBeGreaterThan(0);
    }
    expect(results.evalDurationMs).toBeGreaterThan(0);
  });
}
