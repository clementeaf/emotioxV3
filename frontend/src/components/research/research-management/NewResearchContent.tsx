import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useState } from 'react';
import { SuccessData } from '../../../shared/interfaces/research-creation.interface';
import { CreateSection, ErrorSection, StagesSection, SuccessSection } from '../sections';

/**
 * Componente principal del contenido de creación de investigación
 */
export const NewResearchContent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const step = searchParams?.get('step') || 'create';
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  // Función para manejar creación exitosa
  const handleSuccess = useCallback((id: string, name: string) => {
    setSuccessData({ id, name });
    // La redirección será manejada por el hook useCreateResearchForm
    // Este callback es solo para casos especiales
    router.push(`/dashboard?research=${id}`);
  }, [router]);

  // Función para navegar al inicio
  const navigateToStart = useCallback(() => {
    router.push('/dashboard/research/new');
  }, [router]);

  // Función para ir al dashboard con la investigación seleccionada
  const handleClose = useCallback(() => {
    if (successData?.id) {
      router.push(`/dashboard?research=${successData.id}`);
    } else if (searchParams?.get('id')) {
      router.push(`/dashboard?research=${searchParams.get('id')}`);
    } else {
      router.push('/dashboard');
    }
  }, [router, successData, searchParams]);

  // Determinar el contenido basado en el paso actual
  if (step === 'create') {
    return <CreateSection onResearchCreated={handleSuccess} />;
  }

  if (step === 'success' && searchParams?.get('id')) {
    const id = searchParams.get('id') || '';
    return (
      <SuccessSection
        id={id}
        name={successData?.name || 'Nueva Investigación'}
        onClose={handleClose}
      />
    );
  }

  if (step === 'stages' && searchParams?.get('id')) {
    const id = searchParams.get('id') || '';
    return <StagesSection id={id} />;
  }

  return <ErrorSection onNavigateToStart={navigateToStart} />;
};
