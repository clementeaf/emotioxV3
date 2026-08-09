/**
 * Runtime Quality Monitor — guards during stimulus viewing.
 *
 * Monitors: face loss (pause), orientation change (pause),
 * head pose drift (flag for micro-recalibration).
 *
 * Pure event-driven — no React dependency. Attach/detach with start/stop.
 */

export interface RuntimeQualityCallbacks {
  onFaceLost: () => void;
  onFaceRecovered: () => void;
  onOrientationInvalid: () => void;
  onOrientationValid: () => void;
  onHeadPoseDrift: (yawDeg: number, pitchDeg: number) => void;
}

export interface RuntimeQualityConfig {
  faceLostThresholdMs: number;
  headPoseDriftThresholdDeg: number;
  requireLandscape: boolean;
}

export class RuntimeQualityMonitor {
  private config: RuntimeQualityConfig;
  private callbacks: RuntimeQualityCallbacks;
  private faceLostTimer: ReturnType<typeof setTimeout> | null = null;
  private isFaceLost = false;
  private orientationHandler: (() => void) | null = null;
  private running = false;

  constructor(config: RuntimeQualityConfig, callbacks: RuntimeQualityCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  start(): void {
    this.running = true;
    this.isFaceLost = false;

    if (this.config.requireLandscape) {
      this.orientationHandler = () => {
        if (!this.running) return;
        const isLandscape = window.innerWidth > window.innerHeight;
        if (!isLandscape) this.callbacks.onOrientationInvalid();
        else this.callbacks.onOrientationValid();
      };
      window.addEventListener('resize', this.orientationHandler);
      // screen.orientation is more reliable when available
      if (screen.orientation) {
        screen.orientation.addEventListener('change', this.orientationHandler);
      }
    }
  }

  stop(): void {
    this.running = false;
    if (this.faceLostTimer) { clearTimeout(this.faceLostTimer); this.faceLostTimer = null; }
    if (this.orientationHandler) {
      window.removeEventListener('resize', this.orientationHandler);
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', this.orientationHandler);
      }
      this.orientationHandler = null;
    }
  }

  /** Call every gaze frame with current face detection state + head pose. */
  reportFrame(faceDetected: boolean, yawDeg: number, pitchDeg: number): void {
    if (!this.running) return;

    // Face loss detection
    if (faceDetected) {
      if (this.faceLostTimer) { clearTimeout(this.faceLostTimer); this.faceLostTimer = null; }
      if (this.isFaceLost) {
        this.isFaceLost = false;
        this.callbacks.onFaceRecovered();
      }
    } else if (!this.faceLostTimer && !this.isFaceLost) {
      this.faceLostTimer = setTimeout(() => {
        this.isFaceLost = true;
        this.faceLostTimer = null;
        this.callbacks.onFaceLost();
      }, this.config.faceLostThresholdMs);
    }

    // Head pose drift
    if (faceDetected) {
      const drift = Math.max(Math.abs(yawDeg), Math.abs(pitchDeg));
      if (drift > this.config.headPoseDriftThresholdDeg) {
        this.callbacks.onHeadPoseDrift(yawDeg, pitchDeg);
      }
    }
  }
}
