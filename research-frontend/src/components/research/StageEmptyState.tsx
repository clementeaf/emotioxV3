import { Button } from '../ui/Button';

interface StageEmptyStateProps {
  stageName: string;
  stageType: 'smart-voc' | 'cognitive-tasks';
  onAddModule: () => void;
}

export const StageEmptyState = ({ stageType, onAddModule }: StageEmptyStateProps) => {
  const isSmartVOC = stageType === 'smart-voc';

  const title = isSmartVOC ? 'No Smart VOC Modules' : 'No Cognitive Task Modules';
  const description = isSmartVOC
    ? "This Smart VOC stage doesn't have any modules yet. You can add modules from templates."
    : "This Cognitive Tasks stage doesn't have any modules yet. You can add task modules from templates.";
  const deleteSuggestion = isSmartVOC
    ? "Or delete this stage if you don't need it for your research."
    : "Or delete this stage if you only want to use Smart VOC in your research.";

  return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <div className="max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">
          {description}
        </p>
        <Button
          onClick={onAddModule}
          variant="primary"
          className="mt-2"
        >
          Add Module from Template
        </Button>
        <p className="text-xs text-gray-500 mt-4">
          {deleteSuggestion}
        </p>
      </div>
    </div>
  );
};
