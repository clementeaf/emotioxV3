import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface HitzoneProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Whether the hitzone is disabled
     */
    disabled?: boolean;
    /**
     * Size of the hitzone
     */
    size?: 'sm' | 'md' | 'lg' | 'full';
    /**
     * Whether to show hover effects
     */
    showHover?: boolean;
}

const sizeClasses = {
    sm: 'min-h-[40px] min-w-[40px]',
    md: 'min-h-[60px] min-w-[60px]',
    lg: 'min-h-[80px] min-w-[80px]',
    full: 'min-h-full min-w-full',
};

/**
 * Hitzone component - An invisible clickable area
 * Useful for expanding click targets for better UX
 */
const Hitzone = forwardRef<HTMLDivElement, HitzoneProps>(
    ({ className, disabled = false, size = 'md', showHover = false, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'relative cursor-pointer select-none',
                    sizeClasses[size],
                    showHover && 'hover:bg-gray-100 rounded-lg transition-colors',
                    disabled && 'cursor-not-allowed opacity-50 pointer-events-none',
                    className
                )}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-disabled={disabled}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Hitzone.displayName = 'Hitzone';

export { Hitzone };
