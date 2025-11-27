'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

/**
 * Componente cliente para la página 404
 */
export function NotFoundClient() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Página no encontrada</h2>
        <p className="text-gray-500 mb-8">
          La página que buscas no existe o ha sido movida.
        </p>
        <Button onClick={() => router.push('/dashboard')}>
          Volver al Dashboard
        </Button>
      </div>
    </div>
  );
}

