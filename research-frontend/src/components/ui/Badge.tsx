import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant =
    | 'default'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'blue'
    | 'green'
    | 'red'
    | 'amber'
    | 'purple';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
    variant?: BadgeVariant;
    /** Use pill shape (rounded-full) or square-ish (rounded). Default: pill */
    shape?: 'pill' | 'square';
    /** Compact size for tight spaces */
    size?: 'default' | 'sm';
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    // Softer variants (bg-50, text-600) — used in question cards, results
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-600',
};

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, variant = 'default', shape = 'pill', size = 'default', children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'inline-flex items-center font-medium',
                    shape === 'pill' ? 'rounded-full' : 'rounded',
                    size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
                    VARIANT_CLASSES[variant],
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Badge.displayName = 'Badge';

export { Badge };
