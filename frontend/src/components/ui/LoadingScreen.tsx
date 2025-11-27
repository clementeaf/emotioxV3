import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Redirigiendo...' }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center flex-col gap-4 transition-opacity duration-300">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin">
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin" 
               style={{ 
                 animationDirection: 'reverse',
                 animationDuration: '1s',
                 clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)'
               }}>
          </div>
        </div>
      </div>
      <p className="text-lg text-neutral-600 animate-pulse">{message}</p>
    </div>
  );
} 