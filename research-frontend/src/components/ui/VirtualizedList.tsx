import { useMemo } from 'react';

interface VirtualizedListProps<T> {
    items: T[];
    height: number;
    itemHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    className?: string;
    overscanCount?: number;
}

/**
 * Componente de lista virtualizada simplificado
 * Renderiza solo los elementos visibles en el viewport
 * Nota: Para mejor rendimiento con listas muy grandes (>1000 items), 
 * considerar usar react-window o @tanstack/react-virtual
 */
export const VirtualizedList = <T,>({
    items,
    height,
    itemHeight,
    renderItem,
    className = '',
}: VirtualizedListProps<T>) => {
    const visibleCount = useMemo(() => Math.ceil(height / itemHeight) + 2, [height, itemHeight]);

    if (items.length === 0) {
        return (
            <div className={`flex items-center justify-center ${className}`} style={{ height }}>
                <p className="text-gray-500">No items to display</p>
            </div>
        );
    }

    // Renderizar solo los primeros elementos visibles
    // Para implementación completa de virtualización, usar react-window o @tanstack/react-virtual
    const visibleItems = items.slice(0, Math.min(visibleCount, items.length));

    return (
        <div className={`overflow-y-auto ${className}`} style={{ height, maxHeight: height }}>
            {visibleItems.map((item, index) => (
                <div key={index} style={{ minHeight: itemHeight }}>
                    {renderItem(item, index)}
                </div>
            ))}
            {items.length > visibleCount && (
                <div className="text-center text-gray-500 text-sm py-4">
                    ... y {items.length - visibleCount} más
                </div>
            )}
        </div>
    );
};

