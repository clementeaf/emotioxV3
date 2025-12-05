import { AlertTriangle } from 'lucide-react';
import { Button } from '../../ui/Button';

interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    className?: string;
}

/**
 * Componente de estado de error reutilizable
 */
export const ErrorState = ({
    title = 'Error loading results',
    message = 'Something went wrong. Please try again.',
    onRetry,
    className = ''
}: ErrorStateProps) => {
    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
            <div className="bg-red-50 rounded-full p-4 mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {title}
            </h3>
            <p className="text-sm text-gray-500 text-center max-w-md mb-4">
                {message}
            </p>
            {onRetry && (
                <Button onClick={onRetry} variant="outline">
                    Try again
                </Button>
            )}
        </div>
    );
};
