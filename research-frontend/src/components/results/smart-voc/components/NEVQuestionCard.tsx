import { Target } from 'lucide-react';
import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';

interface NEVQuestionCardProps {
  questionNumber: string;
  title: string;
  questionText: string;
  score: number;
  responses: number;
  positivePercentage: number;
  negativePercentage: number;
  emotionalStates: Record<string, number>;
  longTermClusters: Array<{ name: string; percentage: number }>;
  shortTermClusters: Array<{ name: string; percentage: number }>;
  badges?: Array<{ label: string; color: string }>;
  className?: string;
}

export const NEVQuestionCard = ({
  questionNumber,
  title,
  questionText,
  score,
  responses,
  positivePercentage,
  negativePercentage,
  emotionalStates,
  longTermClusters,
  shortTermClusters,
  badges = [
    { label: 'Linear Scale question', color: 'text-green-600 bg-green-50' },
    { label: 'Conditionality disabled', color: 'text-blue-600 bg-blue-50' },
    { label: 'Required', color: 'text-red-600 bg-red-50' }
  ],
  className
}: NEVQuestionCardProps) => {
  const totalEmotions = Object.values(emotionalStates).reduce((sum, val) => sum + val, 0);
  const positiveEmotions = ['joy', 'anticipation', 'trust', 'surprise'];

  return (
    <Card className={cn('p-6', className)}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-medium text-gray-900">{questionNumber} - Question: {title}</h3>
          <button className="text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge, index) => (
            <span key={index} className={cn('px-2 py-1 text-xs font-medium rounded', badge.color)}>
              {badge.label}
            </span>
          ))}
        </div>
      </div>

      {/* Progress bars + Score */}
      <div className="flex gap-8 mb-6">
        <div className="flex-1 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Positive Emotions</span>
              <span className="text-gray-500">{positivePercentage}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${positivePercentage}%` }} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Negative Emotions</span>
              <span className="text-gray-500">{negativePercentage}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 transition-all" style={{ width: `${negativePercentage}%` }} />
            </div>
          </div>
        </div>

        {/* Right side: Score */}
        <div className="flex flex-col items-end gap-4">
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
              <span>Responses</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-gray-900">{responses.toLocaleString()}</div>
            <div className="text-xs text-gray-400">28s</div>
          </div>

          {/* Circular score */}
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#6366F1"
                strokeWidth="8"
                strokeDasharray={`${(score / 100) * 264} 264`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">{score}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Question text */}
      <div className="flex items-start gap-3 pt-4 border-t border-gray-100 mb-6">
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
          <Target className="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900 mb-1">{title}'s question</div>
          <p className="text-sm text-gray-500">{questionText}</p>
        </div>
      </div>

      {/* Emotional States Section */}
      <div className="pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-700">Emotional states</h4>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{positivePercentage}% Positive</div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="mb-6">
          <div className="flex items-end justify-between gap-1 h-48">
            {Object.entries(emotionalStates).map(([emotion, count]) => {
              const percentage = totalEmotions > 0 ? (count / totalEmotions) * 100 : 0;
              const height = percentage;
              const isPositive = positiveEmotions.includes(emotion.toLowerCase());
              
              return (
                <div key={emotion} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center justify-end h-40">
                    <span className="text-xs text-gray-900 mb-1">{percentage.toFixed(0)}%</span>
                    <div
                      className="w-full rounded-t transition-all"
                      style={{
                        height: `${height}%`,
                        backgroundColor: isPositive ? '#22c55e' : '#ef4444'
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-2 capitalize">{emotion}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clusters */}
        <div className="grid grid-cols-2 gap-6">
          {/* Long Term Value */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">Clusters that Drives Long Term Value</h5>
            <div className="space-y-2">
              {longTermClusters.map((cluster, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{cluster.name}</span>
                  <span className="font-medium" style={{ color: cluster.percentage > 50 ? '#22c55e' : '#ef4444' }}>
                    {cluster.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Short Term Value */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">Clusters that Drives Short Term Value</h5>
            <div className="space-y-2">
              {shortTermClusters.map((cluster, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{cluster.name}</span>
                  <span className="font-medium" style={{ color: cluster.percentage > 50 ? '#22c55e' : '#ef4444' }}>
                    {cluster.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
