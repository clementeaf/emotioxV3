import type { Matrix } from '@mediapipe/tasks-vision';

/**
 * Parses Face Landmarker 4x4 facial transform (face mesh space to camera).
 * Assumes row-major storage with rotation in the upper-left 3x3 and translation in the fourth column (indices 3, 7, 11).
 * @param matrix - Output from `facialTransformationMatrixes` when enabled on FaceLandmarker
 * @returns Rotation (9) and translation (3), or null if layout is unexpected
 */
export function parseFacialTransformationMatrix(matrix: Matrix): {
  rotationRowMajor: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  translation: [number, number, number];
} | null {
  if (matrix.rows !== 4 || matrix.columns !== 4 || matrix.data.length !== 16) {
    return null;
  }
  const d = matrix.data;
  return {
    rotationRowMajor: [d[0], d[1], d[2], d[4], d[5], d[6], d[8], d[9], d[10]],
    translation: [d[3], d[7], d[11]],
  };
}
