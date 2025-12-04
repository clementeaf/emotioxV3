import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    className,
    fullWidth = false,
    children,
    ...props
}) => {
    return (
        <button
            className={cn(
                "inline-flex items-center justify-center rounded-xl text-base font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-white",
                // Primary Blue Style matching the reference 'Chat' bubble and active states
                "bg-[#2563EB] text-white hover:bg-[#1D4ED8] active:scale-[0.98]",
                "h-14 px-8 py-3", // Slightly taller for better touch target
                "shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.3)]",
                fullWidth ? "w-full" : "w-full sm:w-auto min-w-[240px]", // Wider minimum width
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};
