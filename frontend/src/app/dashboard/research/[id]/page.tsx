import { GroupedResponsesPageContent } from '@/components/research/responses/GroupedResponsesPage';

interface ResearchPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Genera parámetros estáticos para exportación estática
 * Requerido cuando output: 'export' está habilitado
 */
export async function generateStaticParams() {
  return [
    { id: 'demo' },
    { id: 'test' },
    { id: 'example' }
  ];
}

/**
 * Página principal de investigación
 * Muestra el dashboard con respuestas agrupadas por pregunta
 */
export default async function ResearchPage({ params }: ResearchPageProps) {
  const { id: researchId } = await params;

  if (!researchId) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-gray-500">ID de investigación no válido</p>
        </div>
      </div>
    );
  }

  return <GroupedResponsesPageContent researchId={researchId} />;
}
