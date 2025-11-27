import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

/**
 * Componente Badge
 * Permite mostrar etiquetas o insignias con diferentes estilos
 */
export function Badge({ 
  className, 
  variant = 'default', 
  ...props 
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    destructive: 'bg-red-500 text-white',
    outline: 'border border-input bg-background'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export default Badge; 