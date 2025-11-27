'use client';

import { DashboardContainer } from '@/components/dashboard/DashboardContainer';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Página principal del dashboard
 */
export default function DashboardPage() {
  const { user, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si no está autenticado después de verificar, redirigir a login
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  // Si no hay usuario, mostrar nada (redirección en progreso)
  if (!user) {
    return null;
  }

  return <DashboardContainer />;
}
