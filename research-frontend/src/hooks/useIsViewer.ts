import { useAuthStore } from '../stores/auth.store';

/** Returns true if the current user has viewer (read-only) role. */
export function useIsViewer(): boolean {
  const role = useAuthStore((state) => state.user?.role);
  return role === 'viewer';
}
