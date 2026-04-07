import type { NormalizedLandmark } from './types';
import { FACE_OVAL_INDICES } from './faceOval';
import { LANDMARK_INDICES } from './constants';

// Eye contour indices (MediaPipe 478-landmark topology)
const LEFT_EYE_CONTOUR = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE_CONTOUR = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];

// Iris rings (5 points each: center + 4 cardinal)
const LEFT_IRIS = [468, 469, 470, 471, 472];
const RIGHT_IRIS = [473, 474, 475, 476, 477];

/**
 * Structural wireframe: straight lines connecting key landmarks to show
 * how MediaPipe distributes facial volume (forehead, cheeks, jaw, nose bridge, etc.).
 * Each pair [a, b] draws a line from landmark a to landmark b.
 */
const STRUCTURE_LINES: [number, number][] = [
  // --- Vertical center axis (forehead → chin) ---
  [10, 151],   // top forehead → mid forehead
  [151, 6],    // mid forehead → nose bridge top
  [6, 197],    // nose bridge top → nose bridge mid
  [197, 195],  // nose bridge mid → nose tip area
  [195, 5],    // nose tip area → upper lip center
  [5, 4],      // → philtrum
  [4, 1],      // → nose tip
  [1, 2],      // nose tip → below nose
  [2, 164],    // → lower lip center
  [164, 0],    // → lip bottom
  [0, 17],     // → chin top
  [17, 18],    // → chin mid
  [18, 152],   // → chin bottom

  // --- Horizontal cross: cheek to cheek through nose ---
  [234, 93],   // left temple → left cheek outer
  [93, 132],   // left cheek outer → left cheek
  [132, 49],   // left cheek → left nostril area
  [49, 279],   // left nostril → right nostril
  [279, 361],  // right nostril → right cheek
  [361, 323],  // right cheek → right cheek outer
  [323, 454],  // right cheek outer → right temple

  // --- Eyebrow ridges ---
  [70, 63],    // left brow inner segments
  [63, 105],
  [105, 66],
  [66, 107],
  [107, 55],
  [55, 65],
  [65, 52],
  [52, 53],
  [53, 46],    // left brow outer

  [300, 293],  // right brow inner segments
  [293, 334],
  [334, 296],
  [296, 336],
  [336, 285],
  [285, 295],
  [295, 282],
  [282, 283],
  [283, 276],  // right brow outer

  // --- Nose bridge to brows (volume connections) ---
  [6, 55],     // bridge top → left brow inner
  [6, 285],    // bridge top → right brow inner

  // --- Cheekbone lines (brow outer → cheek → jaw) ---
  [46, 116],   // left brow outer → left cheekbone
  [116, 123],  // cheekbone → lower cheek
  [123, 147],  // lower cheek → jaw
  [276, 345],  // right brow outer → right cheekbone
  [345, 352],  // cheekbone → lower cheek
  [352, 376],  // lower cheek → jaw

  // --- Jawline structure ---
  [234, 127],  // left temple → jaw start
  [127, 162],
  [162, 21],
  [21, 54],
  [54, 103],
  [103, 67],
  [67, 109],
  [109, 10],   // → forehead top (closes left side)

  [454, 356],  // right temple → jaw start
  [356, 389],
  [389, 251],
  [251, 284],
  [284, 332],
  [332, 297],
  [297, 338],
  [338, 10],   // → forehead top (closes right side)

  // --- Nose wings to cheek volume ---
  [129, 49],   // left nose wing
  [49, 131],
  [358, 279],  // right nose wing
  [279, 360],

  // --- Lip contour structure ---
  [61, 185],   // left mouth corner connections
  [185, 40],
  [40, 39],
  [39, 37],
  [37, 0],
  [0, 267],
  [267, 269],
  [269, 270],
  [270, 409],
  [409, 291],  // right mouth corner

  [61, 146],   // lower lip left
  [146, 91],
  [91, 181],
  [181, 84],
  [84, 17],
  [17, 314],
  [314, 405],
  [405, 321],
  [321, 375],
  [375, 291],  // lower lip right
];

/**
 * Draws face oval contour and a soft fill on canvas (normalized landmarks → pixels).
 * @param ctx - 2D context sized to the video display area
 * @param landmarks - Full face landmark list from Face Landmarker
 * @param width - Canvas width (CSS pixels)
 * @param height - Canvas height (CSS pixels)
 * @param mirrored - Match CSS mirror on video (scaleX(-1))
 * @param featuresReady - Tint green when gaze features pass visibility + matrix checks
 */
export function drawFaceOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  mirrored: boolean,
  featuresReady: boolean,
  video?: HTMLVideoElement | null,
): void {
  ctx.clearRect(0, 0, width, height);
  if (landmarks.length < 478) return;

  // Compute the actual rendered area of the video inside the object-contain box
  let offsetX = 0;
  let offsetY = 0;
  let renderW = width;
  let renderH = height;

  if (video && video.videoWidth > 0 && video.videoHeight > 0) {
    const videoAspect = video.videoWidth / video.videoHeight;
    const containerAspect = width / height;

    if (videoAspect > containerAspect) {
      // Video wider than container — letterbox top/bottom
      renderW = width;
      renderH = width / videoAspect;
      offsetY = (height - renderH) / 2;
    } else {
      // Video taller — pillarbox left/right
      renderH = height;
      renderW = height * videoAspect;
      offsetX = (width - renderW) / 2;
    }
  }

  const mapX = (x: number): number => offsetX + (mirrored ? 1 - x : x) * renderW;
  const mapY = (y: number): number => offsetY + y * renderH;

  ctx.save();
  ctx.beginPath();
  const first = landmarks[FACE_OVAL_INDICES[0]];
  if (!first) {
    ctx.restore();
    return;
  }
  ctx.moveTo(mapX(first.x), mapY(first.y));
  for (let i = 1; i < FACE_OVAL_INDICES.length; i++) {
    const idx = FACE_OVAL_INDICES[i];
    const lm = landmarks[idx];
    if (lm) ctx.lineTo(mapX(lm.x), mapY(lm.y));
  }
  ctx.closePath();

  ctx.fillStyle = featuresReady ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.15)';
  ctx.fill();
  ctx.strokeStyle = featuresReady ? 'rgba(34, 197, 94, 0.85)' : 'rgba(234, 179, 8, 0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // --- Structural wireframe (volume lines) ---
  ctx.save();
  ctx.strokeStyle = featuresReady ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.25)';
  ctx.lineWidth = 1;
  for (const [a, b] of STRUCTURE_LINES) {
    const la = landmarks[a];
    const lb = landmarks[b];
    if (!la || !lb) continue;
    ctx.beginPath();
    ctx.moveTo(mapX(la.x), mapY(la.y));
    ctx.lineTo(mapX(lb.x), mapY(lb.y));
    ctx.stroke();
  }
  ctx.restore();

  // --- Eye contours ---
  const eyeColor = featuresReady ? 'rgba(56, 189, 248, 0.9)' : 'rgba(234, 179, 8, 0.7)';

  function drawContour(indices: readonly number[]): void {
    ctx.beginPath();
    const f = landmarks[indices[0]];
    if (!f) return;
    ctx.moveTo(mapX(f.x), mapY(f.y));
    for (let i = 1; i < indices.length; i++) {
      const lm = landmarks[indices[i]];
      if (lm) ctx.lineTo(mapX(lm.x), mapY(lm.y));
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.save();
  ctx.strokeStyle = eyeColor;
  ctx.lineWidth = 1.5;
  drawContour(LEFT_EYE_CONTOUR);
  drawContour(RIGHT_EYE_CONTOUR);
  ctx.restore();

  // --- Iris circles ---
  const irisColor = featuresReady ? 'rgba(74, 222, 128, 0.95)' : 'rgba(234, 179, 8, 0.8)';

  function drawIris(centerIdx: number, ringIndices: readonly number[]): void {
    const center = landmarks[centerIdx];
    if (!center) return;

    // Radius from center to cardinal points
    let radius = 0;
    let count = 0;
    for (let i = 1; i < ringIndices.length; i++) {
      const p = landmarks[ringIndices[i]];
      if (!p) continue;
      const dx = (p.x - center.x) * renderW;
      const dy = (p.y - center.y) * renderH;
      radius += Math.hypot(dx, dy);
      count++;
    }
    radius = count > 0 ? radius / count : 3;

    const cx = mapX(center.x);
    const cy = mapY(center.y);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.strokeStyle = irisColor;
  ctx.fillStyle = irisColor;
  ctx.lineWidth = 1.5;
  drawIris(LANDMARK_INDICES.leftIrisCenter, LEFT_IRIS);
  drawIris(LANDMARK_INDICES.rightIrisCenter, RIGHT_IRIS);
  ctx.restore();
}
