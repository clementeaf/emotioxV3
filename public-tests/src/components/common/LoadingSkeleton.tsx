import React from 'react';

interface LoadingSkeletonProps {
  type?: 'form' | 'card' | 'text' | 'button' | 'steps';
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  type = 'form', 
  count = 1,
  className = ''
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';

  const renderSkeleton = () => {
    switch (type) {
      case 'form':
        return (
          <div className={`space-y-4 ${className}`}>
            <div className={`${baseClasses} h-8 w-3/4`}></div>
            {Array.from({ length: count || 3 }, (_, i) => (
              <div key={i} className="space-y-2">
                <div className={`${baseClasses} h-4 w-1/3`}></div>
                <div className={`${baseClasses} h-10 w-full`}></div>
              </div>
            ))}
            <div className={`${baseClasses} h-12 w-48 mx-auto`}></div>
          </div>
        );

      case 'card':
        return (
          <div className={`${baseClasses} ${className}`} style={{ height: '200px' }}>
            <div className="p-4 space-y-4">
              <div className={`${baseClasses} h-6 w-3/4`}></div>
              <div className={`${baseClasses} h-4 w-1/2`}></div>
              <div className={`${baseClasses} h-4 w-full`}></div>
              <div className={`${baseClasses} h-4 w-2/3`}></div>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className={`space-y-2 ${className}`}>
            {Array.from({ length: count || 3 }, (_, i) => (
              <div key={i} className={`${baseClasses} h-4 w-full`}></div>
            ))}
          </div>
        );

      case 'button':
        return (
          <div className={`${baseClasses} h-12 w-48 ${className}`}></div>
        );

      case 'steps':
        return (
          <div className={`space-y-3 ${className}`}>
            {Array.from({ length: count || 5 }, (_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className={`${baseClasses} h-8 w-8 rounded-full`}></div>
                <div className={`${baseClasses} h-4 w-32`}></div>
              </div>
            ))}
          </div>
        );

      default:
        return <div className={`${baseClasses} h-20 w-full ${className}`}></div>;
    }
  };

  return renderSkeleton();
};

export default LoadingSkeleton;