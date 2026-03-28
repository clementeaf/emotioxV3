declare module 'webgazer' {
  interface GazeData {
    x: number;
    y: number;
  }
  const webgazer: {
    begin(): Promise<typeof webgazer>;
    end(): typeof webgazer;
    pause(): typeof webgazer;
    resume(): Promise<typeof webgazer>;
    isReady(): boolean;
    setGazeListener(
      listener: (data: GazeData | null, elapsedTime: number) => void,
    ): typeof webgazer;
    clearGazeListener(): typeof webgazer;
    showVideoPreview(val: boolean): typeof webgazer;
    showVideo(val: boolean): typeof webgazer;
    showFaceOverlay(val: boolean): typeof webgazer;
    showFaceFeedbackBox(val: boolean): typeof webgazer;
    showPredictionPoints(val: boolean): typeof webgazer;
    applyKalmanFilter(val: boolean): typeof webgazer;
    saveDataAcrossSessions(val: boolean): typeof webgazer;
    setRegression(name: 'ridge' | 'weightedRidge' | 'threadedRidge'): typeof webgazer;
    getCurrentPrediction(): GazeData | null;
    recordScreenPosition(x: number, y: number, eventType?: string): typeof webgazer;
    clearData(): Promise<void>;
  };
  export default webgazer;
}
