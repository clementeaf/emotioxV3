import React from 'react';

interface StarSelectorProps {
    max: number; // Usually 5
    value: number | null;
    onChange: (value: number) => void;
    onComplete?: () => void;
}

export const StarSelector: React.FC<StarSelectorProps> = ({
    max,
    value,
    onChange,
    onComplete
}) => {
    const handleChange = (newValue: number): void => {
        onChange(newValue);
        // Auto-advance after a short delay if onComplete is provided
        if (onComplete) {
            setTimeout(() => {
                onComplete();
            }, 500);
        }
    };
    const stars = Array.from({ length: max }, (_, i) => i + 1);

    return (
        <div className="flex justify-center items-center gap-2">
            {stars.map((starValue) => {
                const isSelected = value !== null && starValue <= value;

                return (
                    <button
                        key={starValue}
                        type="button"
                        onClick={() => handleChange(starValue)}
                        className="transition-transform hover:scale-110 focus:outline-none"
                    >
                        <svg
                            className={`w-12 h-12 transition-colors ${isSelected
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300 fill-current hover:text-yellow-200'
                                }`}
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                    </button>
                );
            })}
        </div>
    );
};
