import { Button } from '../ui/Button';
import { BuilderContentSkeleton } from '../ui/Skeleton';

interface LoadingStateProps {
  type: 'loading';
}

interface ErrorStateProps {
  type: 'error';
  error: Error | unknown;
  onBack: () => void;
}

type LoadingErrorStatesProps = LoadingStateProps | ErrorStateProps;

export const LoadingErrorStates = (props: LoadingErrorStatesProps) => {
  if (props.type === 'loading') {
    return <BuilderContentSkeleton />;
  }

  const errorMessage = props.error instanceof Error
    ? props.error.message
    : props.error
      ? String(props.error)
      : 'Research not found';

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Research</h2>
        <p className="text-red-600 mb-4">{errorMessage}</p>
        <Button onClick={props.onBack} variant="outline">
          Back to Research List
        </Button>
      </div>
    </div>
  );
};
