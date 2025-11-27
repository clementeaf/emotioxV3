interface StatusMessageProps {
  type: 'error' | 'success' | 'info';
  message: string;
  showSpinner?: boolean;
}

export const StatusMessage = ({ type, message, showSpinner = false }: StatusMessageProps) => {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700'
  };

  const spinnerColors = {
    error: 'border-red-600',
    success: 'border-green-600',
    info: 'border-blue-600'
  };

  return (
    <div className={`${styles[type]} border rounded-lg p-4 mb-6 animate-fade-in`}>
      <div className="flex items-center justify-center gap-2">
        {showSpinner && (
          <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${spinnerColors[type]}`} />
        )}
        <p className="text-center text-sm">{message}</p>
      </div>
    </div>
  );
};
