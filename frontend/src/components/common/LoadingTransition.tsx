'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface LoadingTransitionProps {
  redirectTo: string;
  message?: string;
  delay?: number;
  className?: string;
  showSpinner?: boolean;
  spinnerSize?: 'sm' | 'md' | 'lg';
}

export const LoadingTransition: React.FC<LoadingTransitionProps> = ({
  redirectTo,
  message = "Cargando...",
  delay = 1000,
  className = '',
  showSpinner = true,
  spinnerSize = 'md'
}) => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(redirectTo);
    }, delay);

    return () => clearTimeout(timer);
  }, [redirectTo, delay, router]);

  const getSpinnerSize = () => {
    switch (spinnerSize) {
      case 'sm':
        return 'w-6 h-6';
      case 'lg':
        return 'w-16 h-16';
      default:
        return 'w-12 h-12';
    }
  };

  return (
    <div className={`flex items-center justify-center min-h-screen bg-neutral-50 ${className}`}>
      <div className="text-center">
        {showSpinner && (
          <div className="mb-4">
            <svg
              className={`${getSpinnerSize()} mx-auto text-neutral-400 animate-spin`}
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
        <p className="text-sm text-neutral-600">{message}</p>
      </div>
    </div>
  );
};

export default LoadingTransition;
