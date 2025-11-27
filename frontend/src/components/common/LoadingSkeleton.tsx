import React from 'react';

interface LoadingSkeletonProps {
  type?: 'form' | 'card' | 'text' | 'button' | 'steps' | 'table' | 'dashboard' | 'layout';
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
            {/* Título del formulario */}
            <div className={`${baseClasses} h-8 w-3/4`}></div>
            
            {/* Campos del formulario */}
            {Array.from({ length: count || 3 }, (_, i) => (
              <div key={i} className="space-y-2">
                <div className={`${baseClasses} h-4 w-1/3`}></div>
                <div className={`${baseClasses} h-10 w-full`}></div>
              </div>
            ))}
            
            {/* Botón */}
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

      case 'table':
        return (
          <div className={`${className}`}>
            {/* Header */}
            <div className="flex space-x-4 mb-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className={`${baseClasses} h-8 flex-1`}></div>
              ))}
            </div>
            {/* Rows */}
            {Array.from({ length: count || 5 }, (_, i) => (
              <div key={i} className="flex space-x-4 mb-3">
                {Array.from({ length: 4 }, (_, j) => (
                  <div key={j} className={`${baseClasses} h-10 flex-1`}></div>
                ))}
              </div>
            ))}
          </div>
        );

      case 'dashboard':
        return (
          <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className={`${baseClasses} h-12 w-1/2`}></div>
            
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className={`${baseClasses} h-32`}></div>
              ))}
            </div>
            
            {/* Chart area */}
            <div className={`${baseClasses} h-64 w-full`}></div>
            
            {/* Table */}
            <div className={`${baseClasses} h-48 w-full`}></div>
          </div>
        );

      case 'layout':
        return (
          <div className={`flex h-screen bg-neutral-50 ${className}`}>
            {/* Barra lateral simulada */}
            <div className="w-60">
              <div className="bg-white rounded-lg shadow-sm mx-4 mt-4 p-6">
                <div className={`${baseClasses} h-8 w-3/4 mb-8`}></div>

                <div className="space-y-6">
                  <div>
                    <div className={`${baseClasses} h-4 w-1/3 mb-3`}></div>
                    <div className="space-y-2">
                      <div className={`${baseClasses} h-8 rounded-md`}></div>
                      <div className={`${baseClasses} h-8 rounded-md`}></div>
                      <div className={`${baseClasses} h-8 rounded-md`}></div>
                    </div>
                  </div>

                  <div>
                    <div className={`${baseClasses} h-4 w-1/3 mb-3`}></div>
                    <div className="space-y-2">
                      <div className={`${baseClasses} h-8 rounded-md`}></div>
                      <div className={`${baseClasses} h-8 rounded-md`}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenido principal */}
            <div className="flex-1 flex flex-col mt-12 pr-7 pb-4">
              <div className="flex-1 overflow-y-auto mt-4 ml-4 bg-white p-4 rounded-lg border border-neutral-150">
                <div className="mx-auto px-6 py-8">
                  <div className={`${baseClasses} h-64 w-full`}></div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div className={`${baseClasses} h-20 w-full ${className}`}></div>;
    }
  };

  return renderSkeleton();
};

export default LoadingSkeleton;