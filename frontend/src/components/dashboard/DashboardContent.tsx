'use client';

import { memo, useMemo } from 'react';
import { DashboardMainContent } from './DashboardMainContent';
import { DashboardStats } from './DashboardStats';

interface DashboardContentProps {
  researchList: Array<{
    id: string;
    name: string;
    status: string;
    technique?: string;
    createdAt?: string;
  }>;
}

/**
 * Componente simplificado del contenido del dashboard
 * Solo maneja renderizado, sin lógica compleja
 */
export const DashboardContent = memo<DashboardContentProps>(({ researchList }) => {
  const dashboardStats = useMemo(() => {
    const totalResearch = researchList.length;
    const inProgress = researchList.filter(r => r?.status === 'in-progress' || r?.status === 'active').length;
    const completed = researchList.filter(r => r?.status === 'completed').length;
    const participants = 0;

    return { totalResearch, inProgress, completed, participants };
  }, [researchList]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto px-6 py-8 w-full">
        <DashboardStats {...dashboardStats} />
        <DashboardMainContent />
      </div>
    </div>
  );
});

DashboardContent.displayName = 'DashboardContent';
