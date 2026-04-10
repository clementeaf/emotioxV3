/**
 * 1€ filter (Casiez et al., 2012) — adaptive low-pass: smooth when velocity is low, less lag when moving.
 * Two separate instances are used for screen X and Y.
 */

/**
 * Single-axis 1€ filter.
 */
export class OneEuroFilter1D {
  private x = 0;
  private dx = 0;
  private tPrev: number | null = null;
  private first = true;

  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;

  /**
   * @param minCutoff - Minimum cutoff frequency (Hz); lower = smoother at rest
   * @param beta - Speed of cutoff increase with velocity (reduces lag during fast motion)
   * @param dCutoff - Cutoff frequency (Hz) for derivative low-pass
   */
  constructor(minCutoff: number, beta: number, dCutoff: number) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  /**
   * Clears internal state (call when starting a new tracking session).
   */
  reset(): void {
    this.first = true;
    this.tPrev = null;
    this.dx = 0;
    this.x = 0;
  }

  /**
   * @param value - Sample
   * @param tSec - Timestamp in seconds (monotonic, e.g. performance.now() / 1000)
   * @returns Filtered value
   */
  filter(value: number, tSec: number): number {
    if (this.first) {
      this.first = false;
      this.x = value;
      this.tPrev = tSec;
      return value;
    }

    const dt = Math.max(tSec - (this.tPrev ?? tSec), 1e-6);
    this.tPrev = tSec;

    const dxNew = (value - this.x) / dt;
    const aD = this.alpha(dt, this.dCutoff);
    this.dx = aD * dxNew + (1 - aD) * this.dx;

    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    const a = this.alpha(dt, cutoff);
    const filtered = a * value + (1 - a) * this.x;
    this.x = filtered;
    return filtered;
  }

  /**
   * @param dt - Time delta in seconds
   * @param cutoff - Cutoff frequency in Hz
   * @returns Interpolation factor alpha in (0,1]
   */
  private alpha(dt: number, cutoff: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }
}
