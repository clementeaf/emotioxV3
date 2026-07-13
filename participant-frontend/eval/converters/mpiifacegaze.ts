#!/usr/bin/env npx tsx
/**
 * MPIIFaceGaze → eval dataset converter.
 *
 * Converts MPIIFaceGaze participant data to our video.y4m + ground-truth.json format.
 *
 * MPIIFaceGaze format (per participant):
 *   pXX/
 *     pXX.txt          — rows: "day/image.jpg  screenX  screenY"
 *     dayNN/*.jpg       — face images (background masked)
 *     Calibration/
 *       screenSize.mat  — screen dimensions
 *
 * License: CC BY-NC-SA 4.0 (non-commercial, share-alike)
 * Download: https://www.collaborative-ai.org/research/datasets/MPIIFaceGaze/
 *
 * Usage:
 *   npx tsx eval/converters/mpiifacegaze.ts <mpii-participant-dir> [output-dir] [options]
 *
 * Example:
 *   npx tsx eval/converters/mpiifacegaze.ts ~/datasets/MPIIFaceGaze/p00 eval/datasets/mpii-p00
 *
 * Options:
 *   --calibration-count=N   First N images used as calibration (default: 9)
 *   --max-eval=N            Max evaluation images (default: 200)
 *   --frame-duration=MS     Duration per frame in ground truth (default: 33, ~30fps)
 *   --viewport=WxH          Target viewport for coordinate mapping (default: 1280x720)
 *
 * Requirements:
 *   - ffmpeg in PATH (for Y4M assembly)
 *   - MPIIFaceGaze dataset downloaded and extracted
 *
 * Notes:
 *   - MPIIFaceGaze images have background masked (black). Models may behave
 *     differently than on live webcam. This is a known limitation.
 *   - Screen coordinates are scaled from original screen resolution to target viewport.
 *   - The script reads screenSize from Calibration/screenSize.mat if present,
 *     or falls back to a user-specified resolution.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { GroundTruth, GroundTruthPoint } from '../types';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const positional: string[] = [];
  const opts: Record<string, string> = {};

  for (const a of args) {
    if (a.startsWith('--')) {
      const [key, val] = a.slice(2).split('=');
      opts[key] = val ?? 'true';
    } else {
      positional.push(a);
    }
  }

  const inputDir = positional[0];
  if (!inputDir) {
    console.error('Usage: npx tsx eval/converters/mpiifacegaze.ts <mpii-participant-dir> [output-dir] [options]');
    console.error('  --calibration-count=9  --max-eval=200  --frame-duration=33  --viewport=1280x720');
    process.exit(1);
  }

  const outputDir = positional[1] ?? path.resolve(__dirname, '../datasets/mpii-converted');
  const calibrationCount = Number(opts['calibration-count'] ?? 9);
  const maxEval = Number(opts['max-eval'] ?? 200);
  const frameDuration = Number(opts['frame-duration'] ?? 33);
  const [vpW, vpH] = (opts['viewport'] ?? '1280x720').split('x').map(Number);

  return { inputDir, outputDir, calibrationCount, maxEval, frameDuration, vpW, vpH };
}

// ---------------------------------------------------------------------------
// Parse annotation file
// ---------------------------------------------------------------------------

interface MpiiAnnotation {
  imagePath: string;
  screenX: number;
  screenY: number;
}

function parseAnnotations(txtPath: string): MpiiAnnotation[] {
  const content = fs.readFileSync(txtPath, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());

  return lines.map(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 3) throw new Error(`Invalid annotation line: ${line}`);
    return {
      imagePath: parts[0],
      screenX: parseFloat(parts[1]),
      screenY: parseFloat(parts[2]),
    };
  });
}

// ---------------------------------------------------------------------------
// Detect screen resolution from Calibration folder or fallback
// ---------------------------------------------------------------------------

function detectScreenSize(inputDir: string): { w: number; h: number } {
  // Try reading screenSize.mat (MATLAB format — we can't parse easily, so look for text)
  const calibDir = path.join(inputDir, 'Calibration');
  if (fs.existsSync(calibDir)) {
    // Check for a monitorPose.mat or similar text file
    const files = fs.readdirSync(calibDir);
    for (const f of files) {
      if (f.includes('screenSize') || f.includes('monitor')) {
        // .mat files are binary — skip unless it's text
        const content = fs.readFileSync(path.join(calibDir, f));
        if (content.toString('utf-8').includes(',')) {
          // Try to parse as CSV
          const nums = content.toString('utf-8').trim().split(/[,\s]+/).map(Number);
          if (nums.length >= 2 && nums[0] > 100 && nums[1] > 100) {
            return { w: nums[0], h: nums[1] };
          }
        }
      }
    }
  }

  // Infer from max screen coordinates in annotations
  const participantId = path.basename(inputDir);
  const txtPath = path.join(inputDir, `${participantId}.txt`);
  if (fs.existsSync(txtPath)) {
    const annotations = parseAnnotations(txtPath);
    const maxX = Math.max(...annotations.map(a => a.screenX));
    const maxY = Math.max(...annotations.map(a => a.screenY));
    // Round up to common resolutions
    const w = maxX > 1800 ? 1920 : maxX > 1400 ? 1680 : 1280;
    const h = maxY > 1000 ? 1080 : maxY > 800 ? 900 : 768;
    console.log(`  Inferred screen resolution from max coords (${Math.round(maxX)}, ${Math.round(maxY)}): ${w}x${h}`);
    return { w, h };
  }

  // Default
  console.log('  Using default screen resolution: 1920x1080');
  return { w: 1920, h: 1080 };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const { inputDir, outputDir, calibrationCount, maxEval, frameDuration, vpW, vpH } = parseArgs();

  console.log(`MPIIFaceGaze converter`);
  console.log(`  Input:  ${inputDir}`);
  console.log(`  Output: ${outputDir}`);
  console.log(`  Viewport: ${vpW}x${vpH}`);

  // Find annotation file
  const participantId = path.basename(inputDir);
  const txtPath = path.join(inputDir, `${participantId}.txt`);
  if (!fs.existsSync(txtPath)) {
    console.error(`Annotation file not found: ${txtPath}`);
    process.exit(1);
  }

  // Parse
  const annotations = parseAnnotations(txtPath);
  console.log(`  Annotations: ${annotations.length}`);

  // Verify images exist
  const validAnnotations = annotations.filter(a => {
    const imgPath = path.join(inputDir, a.imagePath);
    return fs.existsSync(imgPath);
  });
  console.log(`  Valid images: ${validAnnotations.length}`);

  if (validAnnotations.length < calibrationCount + 10) {
    console.error(`Not enough valid images (need at least ${calibrationCount + 10})`);
    process.exit(1);
  }

  // Detect original screen resolution
  const screen = detectScreenSize(inputDir);
  const scaleX = vpW / screen.w;
  const scaleY = vpH / screen.h;
  console.log(`  Screen scale: ${scaleX.toFixed(3)}x, ${scaleY.toFixed(3)}y`);

  // Split calibration / evaluation
  const calibImages = validAnnotations.slice(0, calibrationCount);
  const evalImages = validAnnotations.slice(calibrationCount, calibrationCount + maxEval);

  // Build ground truth
  let currentMs = 0;
  const calibrationGT: GroundTruthPoint[] = calibImages.map(a => {
    const start = currentMs;
    currentMs += frameDuration;
    return {
      startMs: start,
      endMs: currentMs,
      x: Math.max(0, Math.min(1, (a.screenX * scaleX) / vpW)),
      y: Math.max(0, Math.min(1, (a.screenY * scaleY) / vpH)),
    };
  });

  // Gap between calibration and evaluation
  currentMs += 500;

  const evaluationGT: GroundTruthPoint[] = evalImages.map(a => {
    const start = currentMs;
    currentMs += frameDuration;
    return {
      startMs: start,
      endMs: currentMs,
      x: Math.max(0, Math.min(1, (a.screenX * scaleX) / vpW)),
      y: Math.max(0, Math.min(1, (a.screenY * scaleY) / vpH)),
    };
  });

  const gt: GroundTruth = { calibration: calibrationGT, evaluation: evaluationGT };

  // Create output dir
  fs.mkdirSync(outputDir, { recursive: true });

  // Write ground truth
  fs.writeFileSync(path.join(outputDir, 'ground-truth.json'), JSON.stringify(gt, null, 2));
  console.log(`  Wrote ground-truth.json (${calibrationGT.length} cal + ${evaluationGT.length} eval)`);

  // Write metadata
  const metadata = {
    name: `mpii-${participantId}`,
    source: 'MPIIFaceGaze',
    license: 'CC BY-NC-SA 4.0',
    description: `Converted from MPIIFaceGaze ${participantId}`,
    originalScreenWidth: screen.w,
    originalScreenHeight: screen.h,
    targetViewportWidth: vpW,
    targetViewportHeight: vpH,
    calibrationCount,
    evaluationCount: evalImages.length,
    frameDurationMs: frameDuration,
    totalDurationMs: currentMs,
    warning: 'MPIIFaceGaze images have masked backgrounds. Model behavior may differ from live webcam.',
  };
  fs.writeFileSync(path.join(outputDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

  // Create frame list for ffmpeg
  const allImages = [...calibImages, ...evalImages];
  const frameListPath = path.join(outputDir, 'frames.txt');
  const frameList = allImages.map(a => {
    const absPath = path.resolve(inputDir, a.imagePath);
    return `file '${absPath}'\nduration ${frameDuration / 1000}`;
  }).join('\n');
  fs.writeFileSync(frameListPath, frameList);

  // Assemble Y4M via ffmpeg
  const y4mPath = path.join(outputDir, 'video.y4m');
  const fps = Math.round(1000 / frameDuration);

  try {
    console.log(`  Assembling Y4M (${allImages.length} frames at ${fps}fps)...`);
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${frameListPath}" -pix_fmt yuv420p -r ${fps} "${y4mPath}"`,
      { stdio: 'pipe' },
    );
    const sizeMB = (fs.statSync(y4mPath).size / (1024 * 1024)).toFixed(1);
    console.log(`  Wrote video.y4m (${sizeMB} MB)`);
  } catch {
    console.warn('  ffmpeg failed — video.y4m not created. Install ffmpeg or assemble manually.');
    console.warn(`  Command: ffmpeg -y -f concat -safe 0 -i "${frameListPath}" -pix_fmt yuv420p -r ${fps} "${y4mPath}"`);
  }

  // Cleanup
  fs.unlinkSync(frameListPath);

  console.log(`\nDone. To run evaluation:`);
  console.log(`  EVAL_VIDEO_PATH=${y4mPath} EVAL_DATASET_DIR=${outputDir} npx playwright test --config eval/playwright/playwright.eval.config.ts`);
}

main();
