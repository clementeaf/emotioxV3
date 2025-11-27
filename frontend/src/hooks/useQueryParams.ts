import { useMemo } from 'react';

export function useQueryParams() {
  return useMemo(() => {
    if (typeof window === 'undefined') return {};
    return Object.fromEntries(new URLSearchParams(window.location.search));
  }, [typeof window !== 'undefined' ? window.location.search : '']);
}
