import { Card } from '../../ui/Card';
import { Filters } from '../smart-voc/components/Filters';
import { VOCComments } from '../smart-voc/components/VOCComments';
import { cn } from '../../../lib/utils';
import { useCognitiveTaskResults } from '../../../hooks/useCognitiveTaskResults';
import { ResultsStateHandler } from '../shared/ResultsStateHandler';
import { NavigationFlowResultsWrapper } from './NavigationFlowResultsWrapper';
import { PreferenceTestResultsWrapper } from './PreferenceTestResultsWrapper';
import { ChoiceResultsWrapper } from './ChoiceResultsWrapper';
import { ScaleResultsWrapper } from './ScaleResultsWrapper';
import { RankingResultsWrapper } from './RankingResultsWrapper';

interface CognitiveTaskResultsProps {
  researchId: string;
  className?: string;
}

interface ModuleData {
  moduleId: string;
  moduleName: string;
  description: string;
  totalResponses: number;
  responses: Array<{
    participantId: string;
    value?: string | unknown;
    responseData?: Record<string, unknown>;
    moduleId?: string;
    createdAt: string;
  }>;
}

interface TextResponseFormatted {
  text: string;
  mood: string;
}

export const CognitiveTaskResults = ({ researchId, className }: CognitiveTaskResultsProps) => {
  const { data, isLoading, error, refetch } = useCognitiveTaskResults(researchId);

  console.log('Cognitive Task Results Data:', data);

  // Helper to detect module type
  const detectModuleType = (moduleName: string): string => {
    const normalized = moduleName.toLowerCase();
    if (normalized.includes('navigation flow') || normalized.includes('navigation_flow')) return 'navigation_flow';
    if (normalized.includes('preference test') || normalized.includes('preference_test')) return 'preference_test';
    if (normalized.includes('short text') || normalized.includes('short_text')) return 'short_text';
    if (normalized.includes('long text') || normalized.includes('long_text')) return 'long_text';
    if (normalized.includes('single choice') || normalized.includes('single_choice')) return 'single_choice';
    if (normalized.includes('multiple choice') || normalized.includes('multiple_choice')) return 'multiple_choice';
    if (normalized.includes('linear scale') || normalized.includes('linear_scale')) return 'linear_scale';
    if (normalized.includes('ranking')) return 'ranking';
    return 'unknown';
  };

  // Renderizar cada módulo según su tipo
  const renderModuleResults = (module: ModuleData, index: number) => {
    const moduleType = detectModuleType(module.moduleName);
    const questionNumber = `3.${index + 1}`;

    switch (moduleType) {
      case 'navigation_flow':
        return (
          <NavigationFlowResultsWrapper
            key={module.moduleId}
            researchId={researchId}
            moduleId={module.moduleId}
            moduleName={module.moduleName}
            questionNumber={questionNumber}
          />
        );

      case 'preference_test':
        return (
          <PreferenceTestResultsWrapper
            key={module.moduleId}
            researchId={researchId}
            moduleId={module.moduleId}
            moduleName={module.moduleName}
            questionNumber={questionNumber}
          />
        );

      case 'short_text':
      case 'long_text':
        // Usamos VOCComments para mostrar respuestas de texto
        const textResponses = module.responses
          .map((r): TextResponseFormatted | null => {
            try {
              const value = typeof r.value === 'string' ? r.value : JSON.stringify(r.value);
              return { text: value, mood: 'Positive' };
            } catch {
              return null;
            }
          })
          .filter((r): r is TextResponseFormatted => r !== null);

        return (
          <VOCComments
            key={module.moduleId}
            questionNumber={questionNumber}
            questionText={module.moduleName}
            comments={textResponses.length > 0 ? textResponses : [{ text: 'No responses yet', mood: 'gray' }]}
          />
        );

      case 'single_choice':
        return (
          <ChoiceResultsWrapper
            key={module.moduleId}
            researchId={researchId}
            moduleId={module.moduleId}
            moduleName={module.moduleName}
            questionNumber={questionNumber}
            isSingleChoice={true}
          />
        );

      case 'multiple_choice':
        return (
          <ChoiceResultsWrapper
            key={module.moduleId}
            researchId={researchId}
            moduleId={module.moduleId}
            moduleName={module.moduleName}
            questionNumber={questionNumber}
            isSingleChoice={false}
          />
        );

      case 'linear_scale':
        return (
          <ScaleResultsWrapper
            key={module.moduleId}
            researchId={researchId}
            moduleId={module.moduleId}
            moduleName={module.moduleName}
            questionNumber={questionNumber}
          />
        );

      case 'ranking':
        return (
          <RankingResultsWrapper
            key={module.moduleId}
            researchId={researchId}
            moduleId={module.moduleId}
            moduleName={module.moduleName}
            questionNumber={questionNumber}
          />
        );

      // Otros tipos se mostrarán en la siguiente fase
      default:
        return (
          <Card key={module.moduleId} className="p-6">
            <h3 className="text-lg font-semibold">{questionNumber}- {module.moduleName}</h3>
            <p className="text-sm text-gray-500 mt-2">Type: {moduleType}</p>
            <p className="text-sm text-gray-600 mt-1">{module.totalResponses} responses</p>
          </Card>
        );
    }
  };
  
  return (
    <ResultsStateHandler
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      loadingSkeleton={
        <div className="p-6 space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      }
    >
      <div className={cn('max-h-[calc(100vh-9rem)] overflow-y-auto', className)}>
      {/* Main Content + Sidebar */}
      <div className="flex gap-6">
        {/* Left: Main Content */}
        <div className="flex-1 space-y-6">
          {/* Cognitive Task Header */}
          <Card className="p-4 bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900">Cognitive Tasks Results</h2>
            {data && (
              <p className="text-sm text-gray-600 mt-1">
                {data.modules.length} modules • {data.modules.reduce((sum, m) => sum + m.totalResponses, 0)} total responses
              </p>
            )}
          </Card>

          {/* Dynamic Module Rendering */}
          {data?.modules && data.modules.length > 0 ? (
            data.modules.map((module, index) => renderModuleResults(module, index))
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No cognitive task modules found for this research.</p>
            </Card>
          )}
        </div>

        {/* Right: Filters Sidebar */}
        <div className="w-80 shrink-0">
          <Filters researchId={researchId} />
        </div>
      </div>
    </div>
    </ResultsStateHandler>
  );
};
