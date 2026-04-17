import type { Module, Stage } from '../../../services/research.service';

interface ReorderArrowsProps {
    modules: Module[];
    stage: Stage;
    index: number;
    onMoveModule: (modules: Module[], stage: Stage, index: number, direction: 'up' | 'down') => void;
}

export const ReorderArrows = ({ modules, stage, index, onMoveModule }: ReorderArrowsProps) => {
    if (modules.length <= 1) return null;

    return (
        <div className="flex flex-col gap-1 pt-4 flex-shrink-0">
            <button
                onClick={() => onMoveModule(modules, stage, index, 'up')}
                disabled={index === 0}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move up"
            >
                <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
            </button>
            <button
                onClick={() => onMoveModule(modules, stage, index, 'down')}
                disabled={index === modules.length - 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move down"
            >
                <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    );
};
