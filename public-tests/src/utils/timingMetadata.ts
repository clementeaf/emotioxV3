
interface TimingData {
  startTime: number;
  endTime?: number;
  duration?: number;
}

interface TimingMetadata {
  timingInfo?: {
    startTime?: number;
    endTime?: number;
    duration?: number;
    sectionTimings?: Array<{
      sectionId: string;
      startTime: number;
      endTime?: number;
      duration?: number;
    }>;
  };
}

export const buildTimingMetadata = (
  questionKey: string,
  timingData: TimingData | null,
  existingMetadata: Record<string, unknown> = {}
): Record<string, unknown> => {
  if (!timingData) {
    return existingMetadata;
  }

  const timingInfo = {
    startTime: timingData.startTime,
    endTime: timingData.endTime,
    duration: timingData.duration,
    sectionTimings: [
      {
        sectionId: questionKey,
        startTime: timingData.startTime,
        endTime: timingData.endTime,
        duration: timingData.duration
      }
    ]
  };

  return {
    ...existingMetadata,
    timingInfo
  };
};

export const shouldTrackResponseTimes = (researchId: string | null): boolean => {
  // 🎯 VERIFICAR CONFIGURACIÓN REAL
  // Por ahora retornamos false para no afectar funcionamiento actual
  // Se puede implementar consulta real a la API cuando sea necesario
  return false;
};
