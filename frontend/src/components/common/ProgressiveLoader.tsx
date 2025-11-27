import React, { useState, useEffect } from 'react';
import LoadingSkeleton from './LoadingSkeleton';

interface ProgressiveLoaderProps {
  children: React.ReactNode;
  isLoading: boolean;
  type?: 'form' | 'card' | 'text' | 'button' | 'steps' | 'table' | 'dashboard';
  count?: number;
  delay?: number;
  fadeInDuration?: number;
  className?: string;
  loadingText?: string;
  showSpinner?: boolean;
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  children,
  isLoading,
  type = 'form',
  count = 3,
  delay = 0,
  fadeInDuration = 300,
  className = '',
  loadingText,
  showSpinner = true
}) => {
  const [showContent, setShowContent] = useState(!isLoading);
  const [fadeClass, setFadeClass] = useState('opacity-0');

  useEffect(() => {
    if (isLoading) {
      setShowContent(false);
      setFadeClass('opacity-0');
    } else {
      // Add delay before showing content
      const timer = setTimeout(() => {
        setShowContent(true);
        // Small additional delay for smooth transition
        setTimeout(() => {
          setFadeClass('opacity-100');
        }, 50);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [isLoading, delay]);

  if (isLoading) {
    return (
      <div className={`${className}`}>
        {showSpinner && loadingText && (
          <div className="flex items-center justify-center mb-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">{loadingText}</span>
          </div>
        )}
        <LoadingSkeleton type={type} count={count} />
      </div>
    );
  }

  return (
    <div 
      className={`transition-opacity duration-${fadeInDuration} ${fadeClass} ${className}`}
      style={{ transitionDuration: `${fadeInDuration}ms` }}
    >
      {showContent && children}
    </div>
  );
};

export default ProgressiveLoader;