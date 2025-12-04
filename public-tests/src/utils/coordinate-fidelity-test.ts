// Stub para coordinate-fidelity-test - funcionalidad de testing eliminada

export const coordinateFidelityTester = {
  startTest: (testId: string) => {
    // No-op stub
  },
  recordOriginalClick: (
    testId: string,
    event: MouseEvent,
    element: HTMLElement,
    naturalSize: { width: number; height: number },
    renderSize: { width: number; height: number }
  ) => {
    // No-op stub
  },
  recordProcessedClick: (testId: string, point: { x: number; y: number }) => {
    // No-op stub
  }
};

export const injectFidelityTest = () => {
  // No-op stub - funcionalidad de testing eliminada
};