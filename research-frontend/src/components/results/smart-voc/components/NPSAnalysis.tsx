import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';

interface NPSAnalysisProps {
  score: number;
  promoters: number;
  neutrals: number;
  detractors: number;
  className?: string;
}

export const NPSAnalysis = ({
  score,
  promoters,
  neutrals,
  detractors,
  className
}: NPSAnalysisProps) => {
  return (
    <Card className={cn('p-6', className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">NPS Analysis</h3>
      
      <div className="flex items-center justify-between mb-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-600">{score}</div>
          <div className="text-sm text-gray-500 mt-1">NPS Score</div>
        </div>
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-2xl font-semibold text-green-600">{promoters}%</div>
            <div className="text-xs text-gray-500">Promoters</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-yellow-600">{neutrals}%</div>
            <div className="text-xs text-gray-500">Neutrals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-red-600">{detractors}%</div>
            <div className="text-xs text-gray-500">Detractors</div>
          </div>
        </div>
      </div>

      <div className="h-4 flex rounded-full overflow-hidden">
        <div
          className="bg-green-500"
          style={{ width: `${promoters}%` }}
        />
        <div
          className="bg-yellow-500"
          style={{ width: `${neutrals}%` }}
        />
        <div
          className="bg-red-500"
          style={{ width: `${detractors}%` }}
        />
      </div>
    </Card>
  );
};
