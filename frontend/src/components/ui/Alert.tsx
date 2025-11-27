import React from 'react';
import { cn } from '@/lib/utils';

interface AlertProps {
  variant?: 'default' | 'destructive' | 'success';
  className?: string;
  children?: React.ReactNode;
}

export const Alert = React.forwardRef<
  HTMLDivElement,
  AlertProps
>(({ variant = 'default', className, children, ...props }, ref) => {
  const variantClasses = {
    default: 'bg-blue-50 border-blue-200 text-blue-800',
    destructive: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800'
  };

  return (
    <div
      ref={ref}
      className={cn(
        'p-4 rounded-md border',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Alert.displayName = 'Alert';

interface AlertTitleProps {
  className?: string;
  children?: React.ReactNode;
}

export const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  AlertTitleProps
>(({ className, children, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('font-medium text-sm mb-1', className)}
    {...props}
  >
    {children}
  </p>
));

AlertTitle.displayName = 'AlertTitle';

interface AlertDescriptionProps {
  className?: string;
  children?: React.ReactNode;
}

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  AlertDescriptionProps
>(({ className, children, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm', className)}
    {...props}
  >
    {children}
  </p>
));

AlertDescription.displayName = 'AlertDescription'; 