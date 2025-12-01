import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from './Button';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: string;
    error?: string;
    description?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, label, error, description, id, ...props }, ref) => {
        return (
            <div className="w-full">
                <div className="flex items-start">
                    <div className="flex items-center h-5">
                        <input
                            id={id}
                            ref={ref}
                            type="checkbox"
                            className={cn(
                                'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-offset-0 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
                                error && 'border-red-300 focus:ring-red-400',
                                className
                            )}
                            {...props}
                        />
                    </div>
                    {(label || description) && (
                        <div className="ml-3 text-sm">
                            {label && (
                                <label htmlFor={id} className="font-medium text-gray-700 cursor-pointer">
                                    {label}
                                </label>
                            )}
                            {description && (
                                <p className="text-gray-500 mt-0.5">{description}</p>
                            )}
                        </div>
                    )}
                </div>
                {error && <p className="mt-1 text-sm text-red-500 ml-7">{error}</p>}
            </div>
        );
    }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
