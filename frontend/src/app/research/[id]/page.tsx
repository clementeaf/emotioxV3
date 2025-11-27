import ResearchClient from './client';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// Requerido para la exportación estática con output: export
export function generateStaticParams() {
  // Proporcionamos IDs específicos para pre-renderizar
  return [
    { id: 'demo' },
    { id: 'test' },
    { id: 'example' }
  ];
}

export default async function ResearchPage({ params }: PageProps) {
  const { id } = await params;
  return <ResearchClient id={id} />;
}
