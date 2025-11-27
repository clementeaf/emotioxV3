import { memo } from 'react';
import { ResearchTable } from './ResearchTable';
import { ResearchTypes } from './ResearchTypes';

/**
 * Contenido principal del dashboard con tabla de investigaciones y tipos
 */
export const DashboardMainContent = memo(() => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 p-6 hover:scale-[1.01]">
      <ResearchTable />
    </div>
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 p-6 hover:scale-[1.01]">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Tipos de Investigación</h2>
      <ResearchTypes />
    </div>
  </div>
));

DashboardMainContent.displayName = 'DashboardMainContent';
