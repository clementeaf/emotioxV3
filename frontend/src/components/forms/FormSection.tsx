import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}

export const FormSection: React.FC<FormSectionProps> = memo(({
  title,
  description,
  children,
  className,
  required = false
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <h2 className="text-lg font-medium text-neutral-900">
          {title}
          {required && <span className="text-red-500 ml-1">*</span>}
        </h2>
        {description && (
          <p className="text-neutral-500 text-sm mt-1">
            {description}
          </p>
        )}
      </div>
      
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
});

FormSection.displayName = 'FormSection';