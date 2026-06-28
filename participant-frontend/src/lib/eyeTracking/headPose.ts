import type { Matrix } from '@mediapipe/tasks-vision';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RotationRowMajor = [
  number, number, number,
  number, number, number,
  number, number, number,
];

export interface EulerAngles {
  /** Pitch: rotation around X axis (positive = looking down). Degrees. */
  readonly pitch: number;
  /** Yaw: rotation around Y axis (positive = looking right). Degrees. */
  readonly yaw: number;
  /** Roll: rotation around Z axis (positive = head tilted clockwise). Degrees. */
  readonly roll: number;
}

export interface HeadPoseCompensationResult {
  readonly x: number;
  readonly y: number;
  /** True when roll exceeds threshold — gaze data may be unreliable. */
  readonly rollWarning: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Pixels of gaze correction per degree of yaw. */
export const HEAD_POSE_GAIN_X = 2.5;

/** Pixels of gaze correction per degree of pitch. */
export const HEAD_POSE_GAIN_Y = 3.0;

/** Roll beyond this (degrees) flags unreliable data. */
export const HEAD_POSE_ROLL_WARNING_THRESHOLD = 15;

/** Maximum correction in any axis (prevents overcorrection on extreme angles). */
export const HEAD_POSE_MAX_CORRECTION_PX = 100;

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

/**
 * Parses Face Landmarker 4x4 facial transform (face mesh space to camera).
 * Assumes row-major storage with rotation in the upper-left 3x3 and translation in the fourth column (indices 3, 7, 11).
 * @param matrix - Output from `facialTransformationMatrixes` when enabled on FaceLandmarker
 * @returns Rotation (9) and translation (3), or null if layout is unexpected
 */
export function parseFacialTransformationMatrix(matrix: Matrix): {
  rotationRowMajor: RotationRowMajor;
  translation: [number, number, number];
} | null {
  const isValid = matrix.rows === 4 && matrix.columns === 4 && matrix.data.length === 16;
  return isValid
    ? (() => {
        const d = matrix.data;
        return {
          rotationRowMajor: [d[0], d[1], d[2], d[4], d[5], d[6], d[8], d[9], d[10]] as RotationRowMajor,
          translation: [d[3], d[7], d[11]] as [number, number, number],
        };
      })()
    : null;
}

// ---------------------------------------------------------------------------
// Euler angle extraction
// ---------------------------------------------------------------------------

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Extract Euler angles (pitch, yaw, roll) from a 3×3 rotation matrix.
 *
 * Convention: R = Rz(roll) × Ry(yaw) × Rx(pitch) — extrinsic XYZ / intrinsic ZYX.
 * This matches face tracking semantics:
 *   - Pitch = nodding (rotation around X)
 *   - Yaw   = head shake (rotation around Y)
 *   - Roll  = head tilt (rotation around Z)
 *
 * @param r - Row-major 3×3 rotation matrix [r00, r01, r02, r10, r11, r12, r20, r21, r22]
 */
export function extractEulerAngles(r: RotationRowMajor): EulerAngles {
  const [r00, , , r10, , , r20, r21, r22] = r;

  // yaw = asin(-r20)
  const sinYaw = Math.max(-1, Math.min(1, -r20));
  const yaw = Math.asin(sinYaw) * RAD_TO_DEG;

  const cosYaw = Math.cos(Math.asin(sinYaw));
  const isGimbalLock = cosYaw < 1e-6;

  // pitch = atan2(r21, r22)  — rotation around X
  const pitch = isGimbalLock
    ? 0
    : Math.atan2(r21, r22) * RAD_TO_DEG;

  // roll = atan2(r10, r00)   — rotation around Z
  const roll = isGimbalLock
    ? Math.atan2(r10, r00) * RAD_TO_DEG
    : Math.atan2(r10, r00) * RAD_TO_DEG;

  return { pitch, yaw, roll };
}

// ---------------------------------------------------------------------------
// Compensation
// ---------------------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

/**
 * Compensate gaze coordinates for head pose rotation.
 *
 * Applies linear correction proportional to yaw (horizontal) and pitch (vertical).
 * Roll is not corrected — only flagged when excessive.
 *
 * Insert in pipeline between One-Euro filter and IDW calibration.
 *
 * @param gazeX       — viewport X (filtered)
 * @param gazeY       — viewport Y (filtered)
 * @param angles      — current head pose (from extractEulerAngles)
 * @param viewportW   — viewport width for clamping
 * @param viewportH   — viewport height for clamping
 * @param gainX       — px per degree of yaw (default HEAD_POSE_GAIN_X)
 * @param gainY       — px per degree of pitch (default HEAD_POSE_GAIN_Y)
 */
export function compensateHeadPose(
  gazeX: number,
  gazeY: number,
  angles: EulerAngles,
  viewportW: number,
  viewportH: number,
  gainX = HEAD_POSE_GAIN_X,
  gainY = HEAD_POSE_GAIN_Y,
): HeadPoseCompensationResult {
  // Handle NaN/undefined gracefully — passthrough
  const safeYaw = Number.isFinite(angles.yaw) ? angles.yaw : 0;
  const safePitch = Number.isFinite(angles.pitch) ? angles.pitch : 0;
  const safeRoll = Number.isFinite(angles.roll) ? angles.roll : 0;

  const rawDx = -safeYaw * gainX;
  const rawDy = -safePitch * gainY;

  const dx = clamp(rawDx, -HEAD_POSE_MAX_CORRECTION_PX, HEAD_POSE_MAX_CORRECTION_PX);
  const dy = clamp(rawDy, -HEAD_POSE_MAX_CORRECTION_PX, HEAD_POSE_MAX_CORRECTION_PX);

  return {
    x: clamp(gazeX + dx, 0, viewportW),
    y: clamp(gazeY + dy, 0, viewportH),
    rollWarning: Math.abs(safeRoll) > HEAD_POSE_ROLL_WARNING_THRESHOLD,
  };
}
