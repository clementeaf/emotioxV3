/**
 * Ridge regression for mapping gaze features to screen coordinates.
 * Pure matrix algebra — no external dependencies.
 */

type Matrix = number[][];
type Vector = number[];

function transpose(m: Matrix): Matrix {
  const rows = m.length;
  const cols = m[0].length;
  const result: Matrix = Array.from({ length: cols }, () => new Array(rows));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = m[i][j];
    }
  }
  return result;
}

function multiply(a: Matrix, b: Matrix): Matrix {
  const aRows = a.length;
  const aCols = a[0].length;
  const bCols = b[0].length;
  const result: Matrix = Array.from({ length: aRows }, () => new Array(bCols).fill(0));
  for (let i = 0; i < aRows; i++) {
    for (let j = 0; j < bCols; j++) {
      let sum = 0;
      for (let k = 0; k < aCols; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function identity(n: number): Matrix {
  const m: Matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) m[i][i] = 1;
  return m;
}

function addMatrices(a: Matrix, b: Matrix): Matrix {
  return a.map((row, i) => row.map((val, j) => val + b[i][j]));
}

function scaleMatrix(m: Matrix, s: number): Matrix {
  return m.map(row => row.map(val => val * s));
}

/** Gauss-Jordan inversion for small matrices */
function invert(m: Matrix): Matrix {
  const n = m.length;
  const aug: Matrix = m.map((row, i) => {
    const iRow = new Array(n).fill(0);
    iRow[i] = 1;
    return [...row, ...iRow];
  });

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) {
      throw new Error('Matrix is singular and cannot be inverted');
    }

    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  return aug.map(row => row.slice(n));
}

function multiplyMV(m: Matrix, v: Vector): Vector {
  return m.map(row => row.reduce((sum, val, i) => sum + val * v[i], 0));
}

/** Epsilon below which calibration raw predictions are treated as degenerate (one location). */
const DEGENERATE_PRED_SPAN_PX = 1e-4;

interface AxisStretch {
  readonly predMin: number;
  readonly predMax: number;
  readonly targMin: number;
  readonly targMax: number;
}

/**
 * Affine map so calibration raw min/max align exactly with target min/max.
 * A previous "floor" on the denominator wrongly capped the output short of targMax (bias to top-left).
 * @param raw - Linear model output
 * @param axis - Min/max of raw preds and of ground-truth targets from calibration
 * @returns Scaled coordinate (may extrapolate past targRange when raw leaves the calibration span)
 */
function applyAxisStretch(raw: number, axis: AxisStretch): number {
  const predSpan = axis.predMax - axis.predMin;
  const targSpan = axis.targMax - axis.targMin;
  if (targSpan <= 0) return raw;
  if (predSpan <= DEGENERATE_PRED_SPAN_PX) {
    return (axis.targMin + axis.targMax) / 2;
  }
  return axis.targMin + ((raw - axis.predMin) / predSpan) * targSpan;
}

export class RidgeRegression {
  private samplesX: number[][] = [];
  private samplesYx: number[] = [];
  private samplesYy: number[] = [];
  private weightsX: Vector | null = null;
  private weightsY: Vector | null = null;
  private stretchX: AxisStretch | null = null;
  private stretchY: AxisStretch | null = null;

  /** Add a calibration sample: features → target (screen x, y) */
  addSample(features: number[], target: [number, number]): void {
    this.samplesX.push([...features, 1]);
    this.samplesYx.push(target[0]);
    this.samplesYy.push(target[1]);
  }

  /** Train: w = (X^T X + λI)^-1 X^T y, then fit range stretch so preds cover calibration extent */
  train(lambda = 1.0): void {
    const X: Matrix = this.samplesX;
    const n = X[0].length;
    const Xt = transpose(X);
    const XtX = multiply(Xt, X);
    const reg = scaleMatrix(identity(n), lambda);
    const XtX_reg = addMatrices(XtX, reg);
    const inv = invert(XtX_reg);
    const XtInv = multiply(inv, Xt);

    const yx: Matrix = this.samplesYx.map(v => [v]);
    const yy: Matrix = this.samplesYy.map(v => [v]);

    const wx = multiply(XtInv, yx);
    const wy = multiply(XtInv, yy);

    this.weightsX = wx.map(r => r[0]);
    this.weightsY = wy.map(r => r[0]);

    this.stretchX = null;
    this.stretchY = null;
    this.computeCalibrationStretch();
  }

  /**
   * Linear prediction (before iris range stretch).
   * @param featureRow - Augmented row [..., 1] matching addSample
   * @returns Raw x and y
   */
  private predictLinearFromRow(featureRow: Vector): [number, number] {
    if (!this.weightsX || !this.weightsY) {
      throw new Error('Model not trained yet');
    }
    const x = multiplyMV([this.weightsX], featureRow)[0];
    const y = multiplyMV([this.weightsY], featureRow)[0];
    return [x, y];
  }

  /**
   * Builds per-axis min/max stretch from calibration rows so compressed iris features still span screen targets.
   */
  private computeCalibrationStretch(): void {
    if (!this.weightsX || !this.weightsY || this.samplesX.length === 0) return;

    const rawXs: number[] = [];
    const rawYs: number[] = [];
    for (const row of this.samplesX) {
      const [rx, ry] = this.predictLinearFromRow(row);
      rawXs.push(rx);
      rawYs.push(ry);
    }

    const predMinX = Math.min(...rawXs);
    const predMaxX = Math.max(...rawXs);
    const predMinY = Math.min(...rawYs);
    const predMaxY = Math.max(...rawYs);

    const targMinX = Math.min(...this.samplesYx);
    const targMaxX = Math.max(...this.samplesYx);
    const targMinY = Math.min(...this.samplesYy);
    const targMaxY = Math.max(...this.samplesYy);

    this.stretchX = { predMin: predMinX, predMax: predMaxX, targMin: targMinX, targMax: targMaxX };
    this.stretchY = { predMin: predMinY, predMax: predMaxY, targMin: targMinY, targMax: targMaxY };
  }

  /** Predict screen position from feature vector */
  predict(features: number[]): [number, number] {
    if (!this.weightsX || !this.weightsY) {
      throw new Error('Model not trained yet');
    }
    const f = [...features, 1];
    const rawX = multiplyMV([this.weightsX], f)[0];
    const rawY = multiplyMV([this.weightsY], f)[0];

    if (this.stretchX && this.stretchY) {
      return [
        applyAxisStretch(rawX, this.stretchX),
        applyAxisStretch(rawY, this.stretchY),
      ];
    }
    return [rawX, rawY];
  }

  /** Whether the model has been trained */
  isReady(): boolean {
    return this.weightsX !== null && this.weightsY !== null;
  }

  /** Number of samples collected */
  get sampleCount(): number {
    return this.samplesX.length;
  }
}
