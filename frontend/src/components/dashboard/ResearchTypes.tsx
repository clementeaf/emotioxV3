'use client';

import { useResearchList } from '@/api/domains/research';
import { ResearchTypesProps } from '@/shared/interfaces/research.interface';
import { ErrorBoundary } from '../common/ErrorBoundary';
import type { ResearchAPIResponse } from '@/shared/types/research.types';

function ResearchTypesContent() {
  // Usar el hook centralizado para obtener research data
  const { data: researchData = [], isLoading, error } = useResearchList();

  // Extraer tipos únicos de investigación
  const researchTypes = Array.from(new Set(researchData.map((research: ResearchAPIResponse) => research.technique || 'unknown')));

  const getTypeDisplayName = (type: string | undefined) => {
    if (!type) return 'Unknown';
    const typeNames: { [key: string]: string } = {
      'eye-tracking': 'Eye Tracking',
      'aim-framework': 'AIM Framework',
      'smart-voc': 'Smart VOC',
      'cognitive-task': 'Tarea Cognitiva'
    };
    return typeNames[type] || type;
  };

  const getTypeCount = (type: string) => {
    return researchData.filter((research: ResearchAPIResponse) => research.technique === type).length;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="text-base font-medium text-neutral-900">Tipos de Investigación</h2>
        </div>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="text-base font-medium text-neutral-900">Tipos de Investigación</h2>
        </div>
        <div className="p-6">
          <div className="text-center text-red-500 text-sm">
            Error al cargar los tipos de investigación
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {researchTypes.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-8">
          No hay tipos de investigación disponibles
        </div>
      ) : (
        <div className="space-y-3">
          {researchTypes.map((type, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:shadow-md transition-all duration-200">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-semibold text-gray-900">
                  {getTypeDisplayName(type)}
                </span>
              </div>
              <span className="text-xs font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                {getTypeCount(type || '')} investigación{getTypeCount(type || '') !== 1 ? 'es' : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ResearchTypes({ className }: ResearchTypesProps) {
  return (
    <ErrorBoundary>
      <div className={className}>
        <ResearchTypesContent />
      </div>
    </ErrorBoundary>
  );
}
