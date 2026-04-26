import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
    /** Icon element (lucide icon recommended) */
    icon?: ReactNode;
    /** Main title */
    title?: string;
    /** Description text */
    description?: string;
    /** Optional action (button, link, etc.) */
    action?: ReactNode;
    /** Container className override */
    className?: string;
}

export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
        {icon && <div className="text-gray-300 mb-3">{icon}</div>}
        {title && <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>}
        {description && <p className="text-sm text-gray-500 max-w-md">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);
