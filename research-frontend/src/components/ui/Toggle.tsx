import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from './Button';

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: string;
    error?: string;
    description?: string;
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
    ({ className, label, error, description, id, checked, ...props }, ref) => {
        return (
            <div className="w-full">
                <div className="flex items-center justify-between">
                    {(label || description) && (
                        <div className="flex-1">
                            {label && (
                                <label htmlFor={id} className="block text-sm font-medium text-gray-700 cursor-pointer">
                                    {label}
                                </label>
                            )}
                            {description && (
                                <p className="text-sm text-gray-500 mt-0.5">{description}</p>
                            )}
                        </div>
                    )}
                    <div className="relative inline-block">
                        <input
                            id={id}
                            ref={ref}
                            type="checkbox"
                            checked={checked}
                            className="sr-only peer"
                            {...props}
                        />
                        <div
                            className={cn(
                                'w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-400 peer-checked:bg-blue-600 transition-colors cursor-pointer',
                                'after:content-[""] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5',
                                error && 'peer-focus:ring-red-400',
                                props.disabled && 'opacity-50 cursor-not-allowed',
                                className
                            )}
                        />
                    </div>
                </div>
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            </div>
        );
    }
);

Toggle.displayName = 'Toggle';

export { Toggle };
