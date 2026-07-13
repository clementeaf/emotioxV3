#!/usr/bin/env npx tsx
/**
 * Generate HTML + JSON comparative report from eval results.
 *
 * Usage:
 *   npx tsx eval/report/generateReport.ts [results-dir]
 *
 * Reads all run-*.json files from results dir, aggregates, and produces:
 *   - eval-report.json  (machine-readable)
 *   - eval-report.html  (human-readable with comparison table)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { EvalMetrics, EvalReport, EvalRun, EvalRunConfig } from '../types';

const RESULTS_DIR = process.argv[2]
  ?? path.resolve(__dirname, '../results');

// ---------------------------------------------------------------------------
// Read runs
// ---------------------------------------------------------------------------

function readRuns(): EvalRun[] {
  if (!fs.existsSync(RESULTS_DIR)) {
    console.error(`Results directory not found: ${RESULTS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(RESULTS_DIR).filter(f => f.startsWith('run-') && f.endsWith('.json'));
  const runs: EvalRun[] = [];

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf-8'));
    // Extract viewport and rep from filename: run-1280x720-rep1-timestamp.json
    const match = file.match(/run-(\d+x\d+)-rep(\d+)-/);
    const viewportLabel = match?.[1] ?? 'unknown';
    const rep = Number(match?.[2] ?? 1);
    const [w, h] = viewportLabel.split('x').map(Number);

    const config: EvalRunConfig = {
      dataset: 'default',
      viewport: { width: w || 1280, height: h || 720, label: viewportLabel },
      repetition: rep,
    };

    if (data.blaze) {
      runs.push({ config, metrics: data.blaze as EvalMetrics, timestamp: new Date().toISOString() });
    }
    if (data.mp) {
      runs.push({ config, metrics: data.mp as EvalMetrics, timestamp: new Date().toISOString() });
    }
  }

  return runs;
}

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

function aggregate(runs: EvalRun[]): EvalReport {
  const byEngine: Record<string, EvalMetrics[]> = {};
  for (const run of runs) {
    const eng = run.metrics.engine;
    if (!byEngine[eng]) byEngine[eng] = [];
    byEngine[eng].push(run.metrics);
  }

  const summary: EvalReport['summary']['byEngine'] = {};
  for (const [eng, metrics] of Object.entries(byEngine)) {
    const n = metrics.length;
    summary[eng] = {
      avgRmsePx: metrics.reduce((s, m) => s + m.rmsePx, 0) / n,
      avgJitterPx: metrics.reduce((s, m) => s + m.jitterPx, 0) / n,
      avgDriftPxPerS: metrics.reduce((s, m) => s + m.driftPxPerS, 0) / n,
      avgValidFrameRatio: metrics.reduce((s, m) => s + m.validFrameRatio, 0) / n,
      avgFalseZoneChanges: metrics.reduce((s, m) => s + m.falseZoneChanges, 0) / n,
      avgLatencyMs: metrics.reduce((s, m) => s + m.avgLatencyMs, 0) / n,
    };
  }

  return { runs, summary: { byEngine: summary }, generatedAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

function generateHtml(report: EvalReport): string {
  const engines = Object.keys(report.summary.byEngine);

  const metricLabels: { key: keyof EvalReport['summary']['byEngine'][string]; label: string; unit: string; lower: boolean }[] = [
    { key: 'avgRmsePx', label: 'RMSE', unit: 'px', lower: true },
    { key: 'avgJitterPx', label: 'Jitter', unit: 'px', lower: true },
    { key: 'avgDriftPxPerS', label: 'Drift', unit: 'px/s', lower: true },
    { key: 'avgValidFrameRatio', label: 'Valid Frame Ratio', unit: '', lower: false },
    { key: 'avgFalseZoneChanges', label: 'False Zone Changes', unit: '', lower: true },
    { key: 'avgLatencyMs', label: 'Latency', unit: 'ms', lower: true },
  ];

  const headerCells = engines.map(e => `<th style="padding:8px 16px;background:#f1f5f9;font-weight:600">${e}</th>`).join('');

  const rows = metricLabels.map(m => {
    const values = engines.map(e => report.summary.byEngine[e]?.[m.key] ?? 0);
    const best = m.lower ? Math.min(...values) : Math.max(...values);

    const cells = values.map((v) => {
      const isBest = Math.abs(v - best) < 0.01;
      const color = isBest ? '#16a34a' : '#64748b';
      const weight = isBest ? 'bold' : 'normal';
      const display = m.key === 'avgValidFrameRatio' ? `${(v * 100).toFixed(1)}%` : `${v.toFixed(1)}${m.unit}`;
      return `<td style="padding:8px 16px;text-align:right;color:${color};font-weight:${weight}">${display}</td>`;
    }).join('');

    return `<tr><td style="padding:8px 16px;font-weight:500">${m.label}</td>${cells}</tr>`;
  }).join('\n');

  // Bar chart rows (simple CSS bars)
  const barRows = metricLabels.filter(m => m.key !== 'avgValidFrameRatio').map(m => {
    const values = engines.map(e => report.summary.byEngine[e]?.[m.key] ?? 0);
    const maxVal = Math.max(...values, 1);

    const bars = engines.map((e, i) => {
      const pct = (values[i] / maxVal) * 100;
      const color = i === 0 ? '#ef4444' : '#3b82f6';
      return `
        <div style="display:flex;align-items:center;gap:8px;margin:2px 0">
          <span style="width:120px;font-size:12px;color:#64748b">${e}</span>
          <div style="flex:1;background:#f1f5f9;border-radius:4px;height:20px;overflow:hidden">
            <div style="width:${pct}%;background:${color};height:100%;border-radius:4px;transition:width 0.3s"></div>
          </div>
          <span style="width:60px;text-align:right;font-size:12px;font-family:monospace">${values[i].toFixed(1)}</span>
        </div>`;
    }).join('');

    return `
      <div style="margin-bottom:16px">
        <h4 style="margin:0 0 4px;font-size:13px;color:#334155">${m.label} (${m.unit})</h4>
        ${bars}
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Gaze Eval Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
    h1 { font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    h2 { font-size: 18px; margin-top: 32px; color: #475569; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #e2e8f0; }
    .meta { font-size: 12px; color: #94a3b8; margin-top: 32px; }
  </style>
</head>
<body>
  <h1>Gaze Engine Evaluation Report</h1>
  <p style="color:#64748b">Generated: ${report.generatedAt}</p>
  <p style="color:#64748b">Runs: ${report.runs.length} | Engines: ${engines.join(', ')}</p>

  <h2>Summary</h2>
  <table>
    <thead><tr><th style="padding:8px 16px;background:#f1f5f9">Metric</th>${headerCells}</tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <h2>Visual Comparison</h2>
  ${barRows}

  <h2>Per-Run Details</h2>
  <details>
    <summary style="cursor:pointer;color:#3b82f6">Show ${report.runs.length} runs</summary>
    <pre style="font-size:11px;background:#f8fafc;padding:12px;border-radius:8px;overflow-x:auto;max-height:400px">${JSON.stringify(report.runs, null, 2)}</pre>
  </details>

  <div class="meta">
    <p>Green = best value for that metric. Lower is better for RMSE, Jitter, Drift, False Zone Changes, Latency. Higher is better for Valid Frame Ratio.</p>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const runs = readRuns();
  if (runs.length === 0) {
    console.log('No run files found. Run Playwright eval first.');
    console.log(`  npx playwright test --config eval/playwright/playwright.eval.config.ts`);
    process.exit(0);
  }

  const report = aggregate(runs);

  // Write JSON
  const jsonPath = path.join(RESULTS_DIR, 'eval-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`JSON report: ${jsonPath}`);

  // Write HTML
  const htmlPath = path.join(RESULTS_DIR, 'eval-report.html');
  fs.writeFileSync(htmlPath, generateHtml(report));
  console.log(`HTML report: ${htmlPath}`);

  // Print summary to console
  console.log('\n--- Summary ---');
  for (const [eng, stats] of Object.entries(report.summary.byEngine)) {
    console.log(`\n${eng}:`);
    console.log(`  RMSE:          ${stats.avgRmsePx.toFixed(1)}px`);
    console.log(`  Jitter:        ${stats.avgJitterPx.toFixed(1)}px`);
    console.log(`  Drift:         ${stats.avgDriftPxPerS.toFixed(1)}px/s`);
    console.log(`  Valid Frames:  ${(stats.avgValidFrameRatio * 100).toFixed(1)}%`);
    console.log(`  False Zones:   ${stats.avgFalseZoneChanges.toFixed(1)}`);
    console.log(`  Latency:       ${stats.avgLatencyMs.toFixed(1)}ms`);
  }
}

main();
