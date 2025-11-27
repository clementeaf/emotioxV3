import React, { useState } from 'react';
import { GripVertical, X } from 'lucide-react';

interface ReorderableItem {
  id: string;
  [key: string]: any;
}

interface ReorderableGridProps<T extends ReorderableItem> {
  items: T[];
  onReorder: (items: T[]) => void;
  onRemove?: (id: string) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  columns?: number;
  gap?: string;
  className?: string;
  showDragHandle?: boolean;
  showRemoveButton?: boolean;
  disabled?: boolean;
}

export const ReorderableGrid = <T extends ReorderableItem>({
  items,
  onReorder,
  onRemove,
  renderItem,
  columns = 3,
  gap = '1rem',
  className = '',
  showDragHandle = true,
  showRemoveButton = true,
  disabled = false
}: ReorderableGridProps<T>) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (disabled) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (disabled) return;
    setDragOverIndex(index);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (disabled || draggedIndex === null || draggedIndex === dropIndex) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    
    // Remove dragged item from original position
    newItems.splice(draggedIndex, 1);
    
    // Insert at new position
    const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newItems.splice(adjustedDropIndex, 0, draggedItem);
    
    onReorder(newItems);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleRemove = (id: string) => {
    if (onRemove) {
      onRemove(id);
    }
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap
  };

  return (
    <div className={`reorderable-grid ${className}`} style={gridStyle}>
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`
            relative group border border-gray-200 rounded-lg p-4 bg-white
            ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
            ${dragOverIndex === index ? 'ring-2 ring-blue-500' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-move'}
            transition-all duration-200 hover:shadow-md
          `}
          draggable={!disabled}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          onDrop={(e) => handleDrop(e, index)}
        >
          {/* Drag Handle */}
          {showDragHandle && !disabled && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-4 w-4 text-gray-400 cursor-grab active:cursor-grabbing" />
            </div>
          )}

          {/* Remove Button */}
          {showRemoveButton && onRemove && !disabled && (
            <button
              onClick={() => handleRemove(item.id)}
              className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
              title="Eliminar"
            >
              <X className="h-3 w-3" />
            </button>
          )}

          {/* Item Content */}
          <div className="pr-8">
            {renderItem(item, index)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReorderableGrid;
