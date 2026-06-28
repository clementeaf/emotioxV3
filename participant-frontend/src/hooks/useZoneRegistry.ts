import { useEffect, useState } from 'react';
import { ZoneRegistry } from '../lib/eyeTracking/zoneRegistry';

/**
 * Manages a ZoneRegistry lifecycle tied to a React component.
 * Creates the registry on mount, destroys on unmount.
 */
export function useZoneRegistry(): ZoneRegistry {
  const [registry] = useState(() => new ZoneRegistry());

  useEffect(() => {
    return () => {
      registry.destroy();
    };
  }, [registry]);

  return registry;
}
