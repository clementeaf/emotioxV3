import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: ReactNode;
    action?: ReactNode;
    className?: string;
}

/**
 * Componente de estado vacío reutilizable
 */
export const EmptyState = ({
    title,
    description,
    icon,
    action,
    className = ''
}: EmptyStateProps) => {
    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
            <div className="bg-gray-50 rounded-full p-4 mb-4">
                {icon || <AlertCircle className="h-8 w-8 text-gray-400" />}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {title}
            </h3>
            {description && (
                <p className="text-sm text-gray-500 text-center max-w-md mb-4">
                    {description}
                </p>
            )}
            {action}
        </div>
    );
};
