import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';

interface TrustFlowChartProps {
  data: Array<{
    stage: string;
    nps: number;
    nev: number;
    timestamp: string;
  }>;
  timeRange: 'today' | 'week' | 'month';
  onTimeRangeChange: (range: 'today' | 'week' | 'month') => void;
  className?: string;
}

export const TrustFlowChart = ({ className }: TrustFlowChartProps) => {
  return (
    <Card className={cn('p-6 h-96', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Trust Relationship Flow</h3>
      </div>
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Trust flow visualization - Coming soon</p>
      </div>
    </Card>
  );
};
