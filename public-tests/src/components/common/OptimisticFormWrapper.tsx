import React, { useState, useEffect } from 'react';
import { useFormLoadingState } from '../../hooks/useFormLoadingState';
import LoadingSkeleton from './LoadingSkeleton';

interface OptimisticFormWrapperProps {
  questionKey: string;
  children: (props: {
    isLoading: boolean;
    formValues: Record<string, unknown>;
    setFormValues: (values: Record<string, unknown>) => void;
    handleInputChange: (key: string, value: unknown) => void;
    saveToStore: (data: Record<string, unknown>) => void;
  }) => React.ReactNode;
  loadingType?: 'form' | 'card' | 'text';
  loadingCount?: number;
  onDataLoaded?: (data: Record<string, unknown>) => void;
}

export const OptimisticFormWrapper: React.FC<OptimisticFormWrapperProps> = ({
  questionKey,
  children,
  loadingType = 'form',
  loadingCount = 3,
  onDataLoaded
}) => {
  const [showOptimisticContent, setShowOptimisticContent] = useState(true);
  
  const {
    isLoading,
    hasLoadedData,
    formValues,
    setFormValues,
    handleInputChange,
    saveToStore
  } = useFormLoadingState({
    questionKey,
    onDataLoaded
  });

  useEffect(() => {
    if (!isLoading && hasLoadedData) {
      const timer = setTimeout(() => {
        setShowOptimisticContent(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isLoading, hasLoadedData]);

  useEffect(() => {
    setShowOptimisticContent(true);
  }, [questionKey]);

  if (isLoading && showOptimisticContent) {
    return (
      <div className="transition-opacity duration-300">
        <LoadingSkeleton 
          type={loadingType} 
          count={loadingCount}
          className="max-w-2xl mx-auto" 
        />
      </div>
    );
  }

  return (
    <div className={`transition-all duration-300 ${
      showOptimisticContent ? 'opacity-0' : 'opacity-100'
    }`}>
      {children({
        isLoading,
        formValues,
        setFormValues,
        handleInputChange,
        saveToStore
      })}
    </div>
  );
};

export default OptimisticFormWrapper;