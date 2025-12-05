import type { ReactNode } from 'react';

interface ResultsStateHandlerProps {
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  loadingSkeleton: ReactNode;
  children: ReactNode;
}

export const ResultsStateHandler = ({
  isLoading,
  error,
  onRetry,
  loadingSkeleton,
  children
}: ResultsStateHandlerProps) => {
  if (isLoading) {
    return <>{loadingSkeleton}</>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading data</h3>
          <p className="text-sm text-gray-500 mb-4">{error.message}</p>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
