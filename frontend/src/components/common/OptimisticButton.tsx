import React, { useState } from 'react';

interface OptimisticButtonProps {
  children: React.ReactNode;
  onClick: () => Promise<void> | void;
  className?: string;
  disabled?: boolean;
  loadingText?: string;
  successText?: string;
  successDuration?: number;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
}

export const OptimisticButton: React.FC<OptimisticButtonProps> = ({
  children,
  onClick,
  className = '',
  disabled = false,
  loadingText = 'Cargando...',
  successText = '✓ Completado',
  successDuration = 1500,
  type = 'button',
  variant = 'primary'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'secondary':
        return 'bg-gray-600 hover:bg-gray-700 text-white';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  const handleClick = async () => {
    if (disabled || isLoading || showSuccess) return;

    setIsLoading(true);
    
    try {
      await onClick();
      
      // Show optimistic success state
      setIsLoading(false);
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
      }, successDuration);
      
    } catch (error) {
      setIsLoading(false);
      console.error('Button action failed:', error);
    }
  };

  const isDisabled = disabled || isLoading || showSuccess;
  const variantClasses = getVariantClasses();

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        px-6 py-3 rounded-lg font-semibold transition-all duration-200 
        ${isDisabled 
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
          : variantClasses
        }
        ${className}
      `}
    >
      {isLoading && (
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>{loadingText}</span>
        </div>
      )}
      
      {showSuccess && (
        <div className="flex items-center justify-center space-x-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>{successText}</span>
        </div>
      )}
      
      {!isLoading && !showSuccess && children}
    </button>
  );
};

export default OptimisticButton;