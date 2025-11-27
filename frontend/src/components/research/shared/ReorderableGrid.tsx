import React from 'react';

interface ReorderableGridProps {
  items: any[];
  onReorder: (items: any[]) => void;
  onRemove: (id: string) => void;
  renderItem: (item: any) => React.ReactNode;
}

export const ReorderableGrid: React.FC<ReorderableGridProps> = ({
  items,
  onReorder,
  onRemove,
  renderItem
}) => {
  // Implementación básica sin funcionalidad de reordenamiento real
  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.id} className="relative">
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}; 