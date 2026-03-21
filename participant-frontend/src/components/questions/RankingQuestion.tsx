import { useState, useEffect } from 'react';
import { useResponse } from '../../hooks/useResponse';

interface RankingItem {
    id: string;
    label: string;
}

interface RankingQuestionProps {
    moduleId: string;
    componentId: string;
    title?: string;
    description?: string;
    items: RankingItem[];
    required?: boolean;
    randomize?: boolean;
}

// Fisher-Yates shuffle (stable per-render, not per-rerender)
function shuffleArray<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export const RankingQuestion = ({
    moduleId,
    componentId,
    title,
    description,
    items,
    required = false,
    randomize = false,
}: RankingQuestionProps) => {
    const { value: storedValue, save } = useResponse({ moduleId, componentId });

    const [rankedItems, setRankedItems] = useState<RankingItem[]>(() => {
        if (Array.isArray(storedValue)) {
            // Reorder items based on stored ranking (array of IDs)
            const ordered = (storedValue as string[])
                .map(id => items.find(item => item.id === id))
                .filter((item): item is RankingItem => item !== undefined);
            // Append any items not in the stored ranking
            const ids = storedValue as string[];
            const remaining = items.filter(item => !ids.includes(item.id));
            return [...ordered, ...remaining];
        }
        return randomize ? shuffleArray(items) : items;
    });
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    useEffect(() => {
        // Save ranking as array of IDs
        const ranking = rankedItems.map(item => item.id);
        save(ranking, {
            itemCount: rankedItems.length,
        });
    }, [rankedItems, save, moduleId, componentId]);

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        
        if (draggedIndex === null || draggedIndex === index) return;

        const newItems = [...rankedItems];
        const draggedItem = newItems[draggedIndex];
        
        // Remove dragged item
        newItems.splice(draggedIndex, 1);
        // Insert at new position
        newItems.splice(index, 0, draggedItem);
        
        setRankedItems(newItems);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const moveUp = (index: number) => {
        if (index === 0) return;
        const newItems = [...rankedItems];
        [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
        setRankedItems(newItems);
    };

    const moveDown = (index: number) => {
        if (index === rankedItems.length - 1) return;
        const newItems = [...rankedItems];
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        setRankedItems(newItems);
    };

    return (
        <div className="w-full space-y-4">
            {title && (
                <h2 className="text-xl font-semibold text-gray-900">
                    {title}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </h2>
            )}

            {description && (
                <p className="text-gray-600">{description}</p>
            )}

            <p className="text-sm text-gray-500">
                Arrastra para ordenar o usa las flechas
            </p>

            <div className="space-y-2">
                {rankedItems.map((item, index) => (
                    <div
                        key={item.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`
                            flex items-center gap-3 p-4 rounded-lg border-2 bg-white cursor-move transition-all
                            ${draggedIndex === index
                                ? 'border-blue-500 shadow-lg opacity-50'
                                : 'border-gray-300 hover:border-blue-300'
                            }
                        `}
                    >
                        {/* Rank number */}
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold text-sm">
                            {index + 1}
                        </div>

                        {/* Item label */}
                        <span className="flex-1 text-gray-900">{item.label}</span>

                        {/* Arrow buttons */}
                        <div className="flex gap-1">
                            <button
                                onClick={() => moveUp(index)}
                                disabled={index === 0}
                                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <button
                                onClick={() => moveDown(index)}
                                disabled={index === rankedItems.length - 1}
                                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
