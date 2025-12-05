import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';

interface EmotionalStatesProps {
  data: Array<{
    emotion: string;
    count: number;
    percentage: number;
  }>;
  className?: string;
}

export const EmotionalStates = ({ data, className }: EmotionalStatesProps) => {
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className={cn('p-6', className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Emotional States</h3>
      
      <div className="space-y-3">
        {data.map((item) => {
          const percentage = totalCount > 0 ? (item.count / totalCount) * 100 : 0;
          
          return (
            <div key={item.emotion} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium capitalize">{item.emotion}</span>
                <span className="text-gray-500">{item.count} ({percentage.toFixed(1)}%)</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
