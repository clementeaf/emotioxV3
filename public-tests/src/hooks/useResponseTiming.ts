import { useCallback, useRef, useState } from 'react';

interface TimingData {
  startTime: number;
  endTime?: number;
  duration?: number;
}

interface UseResponseTimingProps {
  questionKey: string;
  enabled?: boolean;
}

interface UseResponseTimingReturn {
  startTiming: () => void;
  endTiming: () => void;
  getTimingData: () => TimingData | null;
  isTracking: boolean;
}

export const useResponseTiming = ({
  questionKey,
  enabled = false
}: UseResponseTimingProps): UseResponseTimingReturn => {
  const [isTracking, setIsTracking] = useState(false);
  const timingRef = useRef<TimingData | null>(null);

  const startTiming = useCallback(() => {
    if (!enabled) return;

    timingRef.current = {
      startTime: Date.now()
    };
    setIsTracking(true);
  }, [enabled]);

  const endTiming = useCallback(() => {
    if (!enabled || !timingRef.current) return;

    const endTime = Date.now();
    const duration = endTime - timingRef.current.startTime;

    timingRef.current = {
      ...timingRef.current,
      endTime,
      duration
    };

    setIsTracking(false);
  }, [enabled]);

  const getTimingData = useCallback(() => {
    return timingRef.current;
  }, []);

  return {
    startTiming,
    endTiming,
    getTimingData,
    isTracking
  };
};
