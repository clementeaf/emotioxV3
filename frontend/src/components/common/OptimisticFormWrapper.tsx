import React, { useState } from 'react';
import LoadingSkeleton from './LoadingSkeleton';
import OptimisticButton from './OptimisticButton';

interface OptimisticFormWrapperProps {
  children: React.ReactNode;
  onSubmit: () => Promise<void>;
  isLoading?: boolean;
  submitButtonText?: string;
  loadingText?: string;
  successText?: string;
  className?: string;
  skeletonType?: 'form' | 'card' | 'text' | 'dashboard';
  skeletonCount?: number;
}

export const OptimisticFormWrapper: React.FC<OptimisticFormWrapperProps> = ({
  children,
  onSubmit,
  isLoading = false,
  submitButtonText = 'Guardar',
  loadingText = 'Guardando...',
  successText = '✓ Guardado',
  className = '',
  skeletonType = 'form',
  skeletonCount = 3
}) => {
  const [showOptimisticContent, setShowOptimisticContent] = useState(false);

  const handleSubmit = async () => {
    setShowOptimisticContent(true);
    
    try {
      await onSubmit();
    } catch (error) {
      console.error('Form submission failed:', error);
    } finally {
      // Keep optimistic state for a bit to show success
      setTimeout(() => {
        setShowOptimisticContent(false);
      }, 2000);
    }
  };

  if (isLoading && !showOptimisticContent) {
    return (
      <div className={`transition-opacity duration-300 ${className}`}>
        <LoadingSkeleton 
          type={skeletonType} 
          count={skeletonCount}
        />
      </div>
    );
  }

  return (
    <div className={`transition-all duration-300 ${className}`}>
      <div className={showOptimisticContent ? 'opacity-75 pointer-events-none' : 'opacity-100'}>
        {children}
      </div>
      
      <div className="mt-6 flex justify-end space-x-4">
        <OptimisticButton
          onClick={handleSubmit}
          loadingText={loadingText}
          successText={successText}
          className="px-8"
        >
          {submitButtonText}
        </OptimisticButton>
      </div>
    </div>
  );
};

export default OptimisticFormWrapper;