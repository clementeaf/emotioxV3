import { NotFoundClient } from '@/components/common/NotFoundClient';

/**
 * Página 404 personalizada
 * Server Component para permitir prerender con output: 'export'
 */
export default function NotFound() {
  return <NotFoundClient />;
}

