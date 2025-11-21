import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, asChild, ...props }, ref) => {
        const variants = {
            primary: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-400 shadow-sm',
            secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-300',
            outline: 'border border-gray-200 bg-transparent hover:bg-gray-50 text-gray-700 hover:border-gray-300',
            ghost: 'bg-transparent hover:bg-gray-50 text-gray-700',
            danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400',
        };

        const sizes = {
            sm: 'h-8 px-3 text-sm',
            md: 'h-10 px-4 py-2',
            lg: 'h-12 px-6 text-lg',
        };

        const baseClasses = cn(
            'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
            variants[variant],
            sizes[size],
            className
        );

        // asChild feature removed - use Link component directly instead
        if (asChild) {
            console.warn('Button asChild prop is deprecated. Use Link component directly instead.');
        }

        return (
            <button
                ref={ref}
                className={baseClasses}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

export { Button, cn };
