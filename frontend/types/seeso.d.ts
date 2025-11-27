declare module 'seeso/easy-seeso' {
  interface EasySeeSo {
    init(licenseKey: string, onSuccess: () => void, onError: (error: any) => void): void;
    setGazeListener(listener: (gazeInfo: any) => void): void;
    startTracking(): void;
    stopTracking(): void;
    deinit(): void;
  }
  
  const EasySeeSo: EasySeeSo;
  export default EasySeeSo;
}

declare module 'seeso' {
  enum TrackingState {
    SUCCESS = 'SUCCESS',
    FAIL = 'FAIL'
  }
  
  export { TrackingState };
}
