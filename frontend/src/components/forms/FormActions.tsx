import React, { memo } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Action {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
}

interface FormActionsProps {
  primaryAction?: Action;
  secondaryAction?: Action;
  tertiaryActions?: Action[];
  className?: string;
  alignment?: 'left' | 'right' | 'between' | 'center';
}

export const FormActions: React.FC<FormActionsProps> = memo(({
  primaryAction,
  secondaryAction,
  tertiaryActions = [],
  className,
  alignment = 'between'
}) => {
  const getAlignment = () => {
    switch (alignment) {
      case 'left':
        return 'justify-start';
      case 'right':
        return 'justify-end';
      case 'center':
        return 'justify-center';
      case 'between':
      default:
        return 'justify-between';
    }
  };

  return (
    <div className={cn('flex items-center gap-3', getAlignment(), className)}>
      {/* Acciones secundarias a la izquierda */}
      <div className="flex items-center gap-2">
        {secondaryAction && (
          <Button
            type={secondaryAction.type || 'button'}
            variant={secondaryAction.variant || 'outline'}
            onClick={secondaryAction.onClick}
            disabled={secondaryAction.disabled}
            loading={secondaryAction.loading}
          >
            {secondaryAction.label}
          </Button>
        )}
        
        {tertiaryActions.map((action, index) => (
          <Button
            key={index}
            type={action.type || 'button'}
            variant={action.variant || 'ghost'}
            onClick={action.onClick}
            disabled={action.disabled}
            loading={action.loading}
          >
            {action.label}
          </Button>
        ))}
      </div>

      {/* Acción primaria a la derecha */}
      {primaryAction && (
        <Button
          type={primaryAction.type || 'button'}
          variant={primaryAction.variant || 'default'}
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
          loading={primaryAction.loading}
        >
          {primaryAction.label}
        </Button>
      )}
    </div>
  );
});

FormActions.displayName = 'FormActions';