declare module 'webgazer' {
  interface WebGazer {
    begin(): Promise<void>;
    end(): void;
    calibrate(): Promise<void>;
    setGazeListener(callback: (data: any, clock: any) => void): WebGazer;
    showVideoPreview(show: boolean): void;
    showPredictionPoints(show: boolean): void;
    showFaceOverlay(show: boolean): void;
    showFaceFeedbackBox(show: boolean): void;
  }
  
  const webgazer: WebGazer;
  export default webgazer;
}
