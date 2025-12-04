import React from 'react';

interface RankingSelectorProps {
    items: string[];
    onChange: (newItems: string[]) => void;
}

export const RankingSelector: React.FC<RankingSelectorProps> = ({ items, onChange }) => {
    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const newItems = [...items];
        [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
        onChange(newItems);
    };

    const handleMoveDown = (index: number) => {
        if (index === items.length - 1) return;
        const newItems = [...items];
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        onChange(newItems);
    };

    return (
        <div className="w-full space-y-3">
            {items.map((item, index) => (
                <div
                    key={`${item}-${index}`}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-300 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 rounded-full font-bold text-sm">
                            {index + 1}
                        </div>
                        <span className="text-gray-700 font-medium">{item}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className={`p-1 rounded hover:bg-gray-100 ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-blue-600'
                                }`}
                            aria-label="Mover arriba"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === items.length - 1}
                            className={`p-1 rounded hover:bg-gray-100 ${index === items.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-blue-600'
                                }`}
                            aria-label="Mover abajo"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                </div>
            ))}
            <p className="text-sm text-gray-500 text-center mt-4 italic">
                Usa las flechas para ordenar las opciones según tu preferencia (arriba = mayor preferencia)
            </p>
        </div>
    );
};
