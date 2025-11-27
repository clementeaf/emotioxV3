'use client';


interface SpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Spinner = ({ message = "Cargando...", size = 'md' }: SpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className={`inline-block ${sizeClasses[size]} animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent`} role="status">
          <span className="sr-only">{message}</span>
        </div>
        <p className="mt-4 text-neutral-700">{message}</p>
      </div>
    </div>
  );
};
