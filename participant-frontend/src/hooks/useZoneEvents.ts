import { useEffect, useRef, useState, useCallback } from 'react';
import type { ZoneEventEmitter, ZoneState } from '../lib/eyeTracking/zoneEventEmitter';

const THROTTLE_MS = 250;

const INITIAL_STATE: ZoneState = {
  currentZone: null,
  confidence: 0,
  dwellTime: 0,
  fixationActive: false,
  emotion: null,
};

/**
 * React hook that subscribes to a ZoneEventEmitter and exposes
 * reactive ZoneState. Updates are throttled to avoid render storms.
 */
export function useZoneEvents(emitter: ZoneEventEmitter | null): ZoneState {
  const [state, setState] = useState<ZoneState>(INITIAL_STATE);
  const lastUpdateRef = useRef(0);

  const syncState = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;
    if (elapsed >= THROTTLE_MS && emitter) {
      lastUpdateRef.current = now;
      setState(emitter.getState());
    }
  }, [emitter]);

  useEffect(() => {
    lastUpdateRef.current = 0;

    const handler = () => syncState();

    emitter?.on('zone_enter', handler);
    emitter?.on('zone_leave', handler);
    emitter?.on('fixation_start', handler);
    emitter?.on('fixation_end', handler);

    return () => {
      emitter?.off('zone_enter', handler);
      emitter?.off('zone_leave', handler);
      emitter?.off('fixation_start', handler);
      emitter?.off('fixation_end', handler);
    };
  }, [emitter, syncState]);

  return state;
}
