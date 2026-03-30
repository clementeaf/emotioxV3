import { type InputHTMLAttributes, forwardRef, useId, useState } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    /** Inline: label and input on one row (e.g. Screener header). */
    labelPosition?: 'above' | 'inline';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, labelPosition = 'above', id: propId, onFocus, onBlur, placeholder, value, onChange, ...props }, ref) => {
        const generatedId = useId();
        const id = propId || generatedId;
        const [isFocused, setIsFocused] = useState(false);

        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(true);
            onFocus?.(e);
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(false);
            onBlur?.(e);
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            console.log('[Input] onChange triggered:', { id, value: e.target.value });
            onChange?.(e);
        };

        const isInline = labelPosition === 'inline';

        const inputClassName = cn(
            'flex h-10 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            isInline ? 'min-w-0 flex-1 w-auto' : 'w-full',
            error && 'border-red-300 focus:ring-red-400 focus:border-red-400',
            className
        );

        return (
            <div className="w-full">
                {isInline && label ? (
                    <div className="flex flex-row flex-wrap items-center gap-3 min-w-0">
                        <label
                            htmlFor={id}
                            className="shrink-0 whitespace-nowrap text-sm font-medium text-gray-700"
                        >
                            {label}
                        </label>
                        <input
                            id={id}
                            name={id}
                            ref={ref}
                            className={inputClassName}
                            value={value}
                            onChange={handleChange}
                            placeholder={isFocused ? '' : placeholder}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            {...props}
                        />
                    </div>
                ) : (
                    <>
                        {label && (
                            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
                                {label}
                            </label>
                        )}
                        <input
                            id={id}
                            name={id}
                            ref={ref}
                            className={inputClassName}
                            value={value}
                            onChange={handleChange}
                            placeholder={isFocused ? '' : placeholder}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            {...props}
                        />
                    </>
                )}
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';

export { Input };
