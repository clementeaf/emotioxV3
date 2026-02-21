/**
 * Ridge Regression for mapping iris coordinates to screen positions.
 * Pure matrix algebra implementation — no external dependencies.
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
  // Augmented matrix [m | I]
  const aug: Matrix = m.map((row, i) => {
    const iRow = new Array(n).fill(0);
    iRow[i] = 1;
    return [...row, ...iRow];
  });

  for (let col = 0; col < n; col++) {
    // Partial pivoting
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

export class RidgeRegression {
  private samplesX: number[][] = [];
  private samplesYx: number[] = [];
  private samplesYy: number[] = [];
  private weightsX: Vector | null = null;
  private weightsY: Vector | null = null;

  /** Add a calibration sample: features (iris coords) → target (screen x, y) */
  addSample(features: number[], target: [number, number]): void {
    // Add bias term
    this.samplesX.push([...features, 1]);
    this.samplesYx.push(target[0]);
    this.samplesYy.push(target[1]);
  }

  /** Train the model using Ridge Regression: w = (X^T X + λI)^-1 X^T y */
  train(lambda = 1.0): void {
    const X: Matrix = this.samplesX;
    const n = X[0].length;
    const Xt = transpose(X);
    const XtX = multiply(Xt, X);
    const reg = scaleMatrix(identity(n), lambda);
    const XtX_reg = addMatrices(XtX, reg);
    const inv = invert(XtX_reg);
    const XtInv = multiply(inv, Xt);

    // Convert y vectors to column matrices for multiplication
    const yx: Matrix = this.samplesYx.map(v => [v]);
    const yy: Matrix = this.samplesYy.map(v => [v]);

    const wx = multiply(XtInv, yx);
    const wy = multiply(XtInv, yy);

    this.weightsX = wx.map(r => r[0]);
    this.weightsY = wy.map(r => r[0]);
  }

  /** Predict screen position from iris features */
  predict(features: number[]): [number, number] {
    if (!this.weightsX || !this.weightsY) {
      throw new Error('Model not trained yet');
    }
    const f = [...features, 1]; // bias term
    const x = multiplyMV([this.weightsX], f)[0];
    const y = multiplyMV([this.weightsY], f)[0];
    return [x, y];
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
