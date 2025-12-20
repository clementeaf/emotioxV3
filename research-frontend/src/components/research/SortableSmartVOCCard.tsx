import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { Module } from '../../services/research.service';

interface SortableSmartVOCCardProps {
    module: Module;
    children: React.ReactNode;
}

/**
 * Wrapper component that adds drag & drop functionality to SmartVOCModuleCard
 */
export const SortableSmartVOCCard = ({ module, children }: SortableSmartVOCCardProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: module.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <div className="relative">
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="absolute left-2 top-6 cursor-grab hover:cursor-grabbing z-10"
                    title="Drag to reorder"
                >
                    <GripVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </div>
                {/* Original Card Content */}
                {children}
            </div>
        </div>
    );
};
