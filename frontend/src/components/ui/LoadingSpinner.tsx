import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  message?: string;
  centered?: boolean;
  className?: string;
}

const sizes = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12'
};

const colors = {
  primary: 'border-blue-600',
  secondary: 'border-gray-600',
  white: 'border-white'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  message,
  centered = true,
  className = ''
}) => {
  const spinnerClasses = `
    animate-spin rounded-full border-2 border-solid border-t-transparent
    ${sizes[size]}
    ${colors[color]}
    ${className}
  `.trim();

  const containerClasses = `
    ${centered ? 'flex justify-center items-center' : ''}
    ${message ? 'flex-col gap-2' : ''}
    py-8
  `.trim();

  return (
    <div className={containerClasses}>
      <div className={spinnerClasses} role="status" aria-label="Cargando">
        <span className="sr-only">Cargando...</span>
      </div>
      {message && (
        <p className="text-sm text-gray-600 text-center">{message}</p>
      )}
    </div>
  );
};

export const SimpleSpinner: React.FC = () => (
  <LoadingSpinner size="md" color="primary" centered />
);

export const ButtonSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <LoadingSpinner
    size="sm"
    color="white"
    centered={false}
    className={className}
  />
);

export default LoadingSpinner;
