
import { Card } from '@/components/ui/Card';

interface QuestionResultProps {
  questionNumber: string;
  title: string;
  questionType: string;
  responses: {
    count: number;
    timeAgo: string;
  };
  score: number;
  distribution: Array<{
    label: string;
    percentage: number;
    color: string;
  }>;
  monthlyData?: Array<{
    month: string;
    promoters: number;
    neutrals: number;
    detractors: number;
    npsRatio: number;
  }>;
  loyaltyEvolution?: {
    promoters: number;
    promotersTrend: 'up' | 'down';
    detractors: number;
    detractorsTrend: 'up' | 'down';
    neutrals: number;
    neutralsTrend: 'up' | 'down';
    changePercentage: number;
  };
}

// Componente para el gauge circular azul
const BlueGauge = ({ value, size = 120 }: { value: number; size?: number }) => {
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(value / 100) * circumference} ${circumference}`;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
        {/* Fondo del gauge */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="8"
        />
        {/* Valor del gauge */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="8"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={circumference / 4}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {/* Valor en el centro */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
      </div>
    </div>
  );
};

export function QuestionResults({
  questionNumber,
  title,
  questionType,
  responses,
  score,
  distribution,
  monthlyData,
  loyaltyEvolution
}: QuestionResultProps) {
  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-4">
        {/* Header - Solo mostrar el título de la pregunta */}
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">{questionNumber}- {title}</h3>
        </div>

        {/* Layout principal: barras horizontales + responses + gauge */}
        <div className="flex items-start gap-8">
          {/* Barras horizontales */}
          <div className="flex-1 space-y-4">
            {distribution.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-medium">{item.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color === '#10B981' ? '#10B981' :
                        item.color === '#F59E0B' ? '#F59E0B' : '#EF4444'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Responses y Gauge */}
          <div className="flex flex-col items-center gap-4">
            {/* Responses */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Responses</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{responses.count.toLocaleString()}</span>
                <span className="text-sm text-gray-500">{responses.timeAgo}</span>
              </div>
            </div>

            {/* Gauge circular azul */}
            <BlueGauge value={score} />
          </div>
        </div>
      </div>
    </Card>
  );
}
