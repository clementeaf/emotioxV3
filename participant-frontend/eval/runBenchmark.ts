#!/usr/bin/env npx tsx
/**
 * Gaze Benchmark Orchestrator — zero manual steps after capture.
 *
 * Takes a WebM video (+ optional ground-truth.json) and:
 * 1. Converts WebM → Y4M via ffmpeg
 * 2. Creates eval/datasets/session-auto/
 * 3. Generates ground truth from capture sequence if not provided
 * 4. Ensures Vite dev server is running
 * 5. Runs Playwright with fake camera → both engines compared
 * 6. Generates JSON + HTML report
 * 7. Opens report in browser
 *
 * Usage:
 *   npx tsx eval/runBenchmark.ts <video.webm> [ground-truth.json]
 *   npx tsx eval/runBenchmark.ts docs/gaze-capture.webm
 *
 * Dependencies: ffmpeg, npx playwright (auto-installs browsers)
 *
 * macOS: brew install ffmpeg
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn, type ChildProcess } from 'child_process';
import type { GroundTruth } from './types';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(__dirname, '..');
const EVAL_DIR = __dirname;
const DATASET_DIR = path.join(EVAL_DIR, 'datasets', 'session-auto');
const RESULTS_DIR = path.join(EVAL_DIR, 'results');
const PW_CONFIG = path.join(EVAL_DIR, 'playwright', 'playwright.eval.config.ts');
const REPORT_SCRIPT = path.join(EVAL_DIR, 'report', 'generateReport.ts');

// ---------------------------------------------------------------------------
// GazeCapturePage dot sequence — must match GazeCapturePage.tsx constants
// ---------------------------------------------------------------------------

const COUNTDOWN_S = 3;
const PAUSE_MS = 800;

const CALIBRATION_DOTS = [
  { pctX: 10, pctY: 10, durationMs: 1200 },
  { pctX: 50, pctY: 10, durationMs: 1200 },
  { pctX: 90, pctY: 10, durationMs: 1200 },
  { pctX: 10, pctY: 50, durationMs: 1200 },
  { pctX: 50, pctY: 50, durationMs: 1200 },
  { pctX: 90, pctY: 50, durationMs: 1200 },
  { pctX: 10, pctY: 90, durationMs: 1200 },
  { pctX: 50, pctY: 90, durationMs: 1200 },
  { pctX: 90, pctY: 90, durationMs: 1200 },
];

const EVALUATION_DOTS = [
  { pctX: 20, pctY: 50, durationMs: 2000, zone: 'left' },
  { pctX: 80, pctY: 50, durationMs: 2000, zone: 'right' },
  { pctX: 20, pctY: 50, durationMs: 2000, zone: 'left' },
  { pctX: 80, pctY: 50, durationMs: 2000, zone: 'right' },
  { pctX: 20, pctY: 20, durationMs: 1500 },
  { pctX: 80, pctY: 80, durationMs: 1500 },
  { pctX: 80, pctY: 20, durationMs: 1500 },
  { pctX: 20, pctY: 80, durationMs: 1500 },
  { pctX: 50, pctY: 50, durationMs: 3000 },
  { pctX: 15, pctY: 50, durationMs: 1000, zone: 'left' },
  { pctX: 85, pctY: 50, durationMs: 1000, zone: 'right' },
  { pctX: 50, pctY: 50, durationMs: 1500 },
];

function generateDefaultGroundTruth(): GroundTruth {
  let t = COUNTDOWN_S * 1000; // skip countdown

  const calibration = CALIBRATION_DOTS.map(dot => {
    const start = t;
    t += dot.durationMs;
    const end = t;
    t += PAUSE_MS;
    return { startMs: start, endMs: end, x: dot.pctX / 100, y: dot.pctY / 100 };
  });

  const evaluation = EVALUATION_DOTS.map(dot => {
    const start = t;
    t += dot.durationMs;
    const end = t;
    t += PAUSE_MS;
    return {
      startMs: start,
      endMs: end,
      x: dot.pctX / 100,
      y: dot.pctY / 100,
      ...(dot.zone ? { zone: dot.zone } : {}),
    };
  });

  return { calibration, evaluation };
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

function step(msg: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${msg}`);
  console.log('─'.repeat(60));
}

function checkDependencies() {
  step('1/7 Checking dependencies');

  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    console.log('  ✓ ffmpeg found');
  } catch {
    console.error('  ✗ ffmpeg not found. Install: brew install ffmpeg');
    process.exit(1);
  }

  try {
    execSync('npx playwright --version', { stdio: 'pipe' });
    console.log('  ✓ playwright found');
  } catch {
    console.log('  ⟳ Installing playwright...');
    execSync('npx playwright install chromium', { stdio: 'inherit' });
  }
}

function convertVideo(webmPath: string): string {
  step('2/7 Converting WebM → Y4M');

  const y4mPath = path.join(DATASET_DIR, 'video.y4m');
  fs.mkdirSync(DATASET_DIR, { recursive: true });

  if (fs.existsSync(y4mPath)) {
    console.log(`  Using existing ${y4mPath}`);
    return y4mPath;
  }

  console.log(`  Input:  ${webmPath}`);
  console.log(`  Output: ${y4mPath}`);

  execSync(
    `ffmpeg -y -i "${webmPath}" -pix_fmt yuv420p "${y4mPath}"`,
    { stdio: 'pipe' },
  );

  const sizeMB = (fs.statSync(y4mPath).size / (1024 * 1024)).toFixed(1);
  console.log(`  ✓ ${sizeMB} MB`);
  return y4mPath;
}

function setupGroundTruth(gtPath?: string) {
  step('3/7 Setting up ground truth');

  const destPath = path.join(DATASET_DIR, 'ground-truth.json');

  if (gtPath && fs.existsSync(gtPath)) {
    fs.copyFileSync(gtPath, destPath);
    console.log(`  ✓ Copied from ${gtPath}`);
  } else {
    const gt = generateDefaultGroundTruth();
    fs.writeFileSync(destPath, JSON.stringify(gt, null, 2));
    console.log(`  ✓ Generated from GazeCapturePage dot sequence`);
    console.log(`    Calibration: ${gt.calibration.length} points`);
    console.log(`    Evaluation:  ${gt.evaluation.length} points`);
    console.log(`    Total duration: ${Math.round(Math.max(...gt.evaluation.map(p => p.endMs)) / 1000)}s`);
  }

  // Write metadata
  const metaPath = path.join(DATASET_DIR, 'metadata.json');
  fs.writeFileSync(metaPath, JSON.stringify({
    name: 'session-auto',
    generatedBy: 'runBenchmark.ts',
    timestamp: new Date().toISOString(),
  }, null, 2));
}

function ensureDevServer(): ChildProcess | null {
  step('4/7 Checking dev server');

  try {
    execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:12600', { stdio: 'pipe' });
    console.log('  ✓ Dev server already running at :5174');
    return null;
  } catch {
    console.log('  ⟳ Starting Vite dev server...');
    const child = spawn('npx', ['vite', '--port', '12600'], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      detached: true,
    });

    // Wait for server to be ready
    for (let i = 0; i < 30; i++) {
      try {
        execSync('curl -s -o /dev/null http://localhost:12600', { stdio: 'pipe', timeout: 2000 });
        console.log('  ✓ Dev server started');
        return child;
      } catch {
        execSync('sleep 1', { stdio: 'pipe' });
      }
    }
    console.error('  ✗ Dev server failed to start');
    child.kill();
    process.exit(1);
  }
}

function runPlaywright(y4mPath: string) {
  step('5/7 Running Playwright evaluation');

  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  // Clean old results
  const oldFiles = fs.readdirSync(RESULTS_DIR).filter(f => f.startsWith('run-'));
  for (const f of oldFiles) fs.unlinkSync(path.join(RESULTS_DIR, f));

  console.log(`  Video: ${y4mPath}`);
  console.log(`  Dataset: ${DATASET_DIR}`);
  console.log(`  Config: ${PW_CONFIG}`);
  console.log('  Running 3 repetitions × 2 viewports...\n');

  try {
    execSync(
      [
        `EVAL_VIDEO_PATH="${y4mPath}"`,
        `EVAL_DATASET_DIR="${DATASET_DIR}"`,
        `EVAL_REPETITIONS=3`,
        `npx playwright test --config "${PW_CONFIG}"`,
      ].join(' '),
      { cwd: PROJECT_ROOT, stdio: 'inherit', timeout: 300_000 },
    );
    console.log('\n  ✓ Playwright complete');
  } catch {
    console.warn('\n  ⚠ Playwright exited with errors (partial results may be available)');
  }
}

function generateReport() {
  step('6/7 Generating report');

  try {
    execSync(`npx tsx "${REPORT_SCRIPT}" "${RESULTS_DIR}"`, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
  } catch {
    console.warn('  ⚠ Report generation failed — check results dir');
  }
}

function openReport() {
  step('7/7 Opening report');

  const htmlPath = path.join(RESULTS_DIR, 'eval-report.html');
  const jsonPath = path.join(RESULTS_DIR, 'eval-report.json');

  if (fs.existsSync(htmlPath)) {
    console.log(`  HTML: ${htmlPath}`);
    try {
      execSync(`open "${htmlPath}"`, { stdio: 'pipe' }); // macOS
    } catch {
      console.log('  (open manually in browser)');
    }
  }

  if (fs.existsSync(jsonPath)) {
    console.log(`  JSON: ${jsonPath}`);

    // Print summary
    try {
      const report = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const summary = report.summary?.byEngine;
      if (summary) {
        console.log('\n  ┌─────────────────────────────────────────────┐');
        console.log('  │           BENCHMARK RESULTS                  │');
        console.log('  ├─────────────────────────────────────────────┤');

        const engines = Object.keys(summary);
        for (const eng of engines) {
          const s = summary[eng];
          console.log(`  │ ${eng.padEnd(20)} RMSE: ${s.avgRmsePx.toFixed(0).padStart(4)}px  Jitter: ${s.avgJitterPx.toFixed(0).padStart(3)}px │`);
        }

        // Winner
        if (engines.length === 2) {
          const [a, b] = engines;
          const rmseA = summary[a].avgRmsePx;
          const rmseB = summary[b].avgRmsePx;
          const winner = rmseA < rmseB ? a : b;
          const diff = Math.abs(rmseA - rmseB);
          console.log('  ├─────────────────────────────────────────────┤');
          console.log(`  │ Winner: ${winner.padEnd(20)} (${diff.toFixed(0)}px better)  │`);
        }
        console.log('  └─────────────────────────────────────────────┘');
      }
    } catch { /* noop */ }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const webmPath = process.argv[2];
  const gtPath = process.argv[3];

  if (!webmPath) {
    console.log('Gaze Benchmark Orchestrator');
    console.log('');
    console.log('Usage: npx tsx eval/runBenchmark.ts <video.webm> [ground-truth.json]');
    console.log('');
    console.log('Example:');
    console.log('  npx tsx eval/runBenchmark.ts docs/gaze-capture.webm');
    console.log('');
    console.log('Dependencies: ffmpeg (brew install ffmpeg)');
    process.exit(0);
  }

  const absWebmPath = path.resolve(PROJECT_ROOT, webmPath);
  if (!fs.existsSync(absWebmPath)) {
    console.error(`Video not found: ${absWebmPath}`);
    process.exit(1);
  }

  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║       GAZE BENCHMARK — AUTOMATED             ║');
  console.log('╚═══════════════════════════════════════════════╝');

  let devServer: ChildProcess | null = null;

  try {
    checkDependencies();
    const y4mPath = convertVideo(absWebmPath);
    setupGroundTruth(gtPath ? path.resolve(PROJECT_ROOT, gtPath) : undefined);
    devServer = ensureDevServer();
    runPlaywright(y4mPath);
    generateReport();
    openReport();
  } finally {
    if (devServer) {
      console.log('\n  Stopping dev server...');
      devServer.kill();
    }
  }

  console.log('\nDone.\n');
}

main();
