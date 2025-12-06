import type { ReactNode, CSSProperties } from 'react';
import { useMemo } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemCount: number;
  itemSize: number; // Height of each item in pixels
  height: number; // Height of the scrollable area
  width: string | number; // Width of the scrollable area
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode;
}

/**
 * Simplified virtualized list component
 * For full virtualization with react-window, use a more complete implementation
 */
export function VirtualizedList<T>({
  items,
  itemCount,
  itemSize,
  height,
  width,
  renderItem,
}: VirtualizedListProps<T>) {
  const visibleCount = useMemo(() => Math.ceil(height / itemSize) + 2, [height, itemSize]);
  const visibleItems = useMemo(() => items.slice(0, Math.min(visibleCount, itemCount)), [items, visibleCount, itemCount]);

  return (
    <div 
      style={{ 
        height, 
        width: typeof width === 'string' ? width : `${width}px`,
        overflowY: 'auto',
        overflowX: 'hidden'
      }}
    >
      {visibleItems.map((item, index) => {
        const style: CSSProperties = {
          height: itemSize,
          minHeight: itemSize,
        };
        return (
          <div key={index} style={style}>
            {renderItem(item, index, style)}
          </div>
        );
      })}
      {itemCount > visibleCount && (
        <div className="text-center text-gray-500 text-sm py-4">
          ... and {itemCount - visibleCount} more items
        </div>
      )}
    </div>
  );
}
