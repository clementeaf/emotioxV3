import { memo } from 'react';

/**
 * Header del dashboard con título principal
 */
export const DashboardHeader = memo(() => (
  <div className="mb-8">
    <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
  </div>
));

DashboardHeader.displayName = 'DashboardHeader';
