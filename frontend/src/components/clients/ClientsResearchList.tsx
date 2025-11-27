'use client';

import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ResearchListProps } from '@/shared/interfaces/research.interface';
import { useDeleteResearch } from '@/api/domains/research';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface ClientsResearchListProps extends ResearchListProps {
  onDuplicateSuccess?: (newResearchId: string) => void;
  onDeleteSuccess?: (deletedResearchId: string) => void;
}

export function ClientsResearchList({
  className,
  data = [],
  onDuplicateSuccess,
  onDeleteSuccess
}: ClientsResearchListProps) {
  const router = useRouter();
  const deleteResearchMutation = useDeleteResearch();

  const handleView = (researchId: string) => {
    router.push(`/research/${researchId}`);
  };

  const handleDelete = async (researchId: string, researchName: string) => {
    const confirmed = window.confirm(
      `¿Estás seguro de que quieres eliminar la investigación "${researchName}"? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      await deleteResearchMutation.mutateAsync(researchId);
      onDeleteSuccess?.(researchId);
    } catch (error) {
      console.error('Error deleting research:', error);
    }
  };

  const handleDuplicate = (researchId: string, researchName: string) => {
    // ❌ FUNCIONALIDAD NO DISPONIBLE - Backend no soporta duplicación
    alert(`La funcionalidad de duplicar "${researchName}" no está disponible actualmente.`);
  };
  return (
    <div className={cn('bg-white rounded-lg shadow-sm overflow-hidden', className)}>
      <div className="p-6">
        <h3 className="text-base font-medium text-neutral-900 mb-4">
          List of research
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="whitespace-nowrap py-3 text-left text-sm font-medium text-neutral-600">Name</th>
                <th className="whitespace-nowrap py-3 text-left text-sm font-medium text-neutral-600">Status</th>
                <th className="whitespace-nowrap py-3 text-left text-sm font-medium text-neutral-600">Progress</th>
                <th className="whitespace-nowrap py-3 text-left text-sm font-medium text-neutral-600">Date</th>
                <th className="whitespace-nowrap py-3 text-left text-sm font-medium text-neutral-600">Researcher</th>
                <th className="whitespace-nowrap py-3 text-left text-sm font-medium text-neutral-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.length > 0 ? (
                data.map((research) => (
                  <tr key={research.id}>
                    <td className="whitespace-nowrap py-3 text-sm text-neutral-900">
                      {research.name}
                    </td>
                    <td className="whitespace-nowrap py-3">
                      <StatusBadge status={research.status} />
                    </td>
                    <td className="whitespace-nowrap py-3">
                      <ProgressBar progress={research.progress} />
                    </td>
                    <td className="whitespace-nowrap py-3 text-sm text-neutral-600">
                      {research.date}
                    </td>
                    <td className="whitespace-nowrap py-3 text-sm text-neutral-600">
                      {research.researcher}
                    </td>
                    <td className="whitespace-nowrap py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(research.id)}
                          title={`Ver investigación: ${research.name}`}
                        >
                          Ver
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(research.id, research.name)}
                          title={`Duplicar investigación: ${research.name}`}
                          disabled
                        >
                          Duplicar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(research.id, research.name)}
                          title={`Eliminar investigación: ${research.name}`}
                          className="text-red-600 hover:text-red-700"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-neutral-600">
                    No research data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
