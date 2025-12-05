import type { ReactNode } from 'react';

interface ResultsLayoutProps {
    title: string;
    description?: string;
    filters?: ReactNode;
    children: ReactNode;
    className?: string;
}

/**
 * Layout común para todas las páginas de resultados
 * Proporciona estructura consistente con título, descripción y área de filtros
 */
export const ResultsLayout = ({
    title,
    description,
    filters,
    children,
    className = ''
}: ResultsLayoutProps) => {
    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Header */}
            <div className="border-b border-gray-200 pb-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {description && (
                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                )}
            </div>

            {/* Content Area */}
            <div className="flex gap-6 flex-1 min-h-0">
                {/* Main Content */}
                <div className="flex-1 overflow-auto">
                    {children}
                </div>

                {/* Filters Sidebar */}
                {filters && (
                    <div className="w-80 flex-shrink-0">
                        <div className="sticky top-0">
                            {filters}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
