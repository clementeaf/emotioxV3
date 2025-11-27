import React from 'react';
import { Button } from '@/components/ui/Button';
import { AlertCircle, FileText, Info } from 'lucide-react';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onNew: () => void;
  title: string;
  message: string;
  continueText: string;
  newText: string;
  variant?: 'info' | 'warning' | 'draft';
  icon?: React.ReactNode;
  className?: string;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  onContinue,
  onNew,
  title,
  message,
  continueText,
  newText,
  variant = 'info',
  icon,
  className = ''
}) => {
  if (!isOpen) {
    return null;
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          headerBg: 'bg-amber-50',
          headerBorder: 'border-amber-100',
          iconColor: 'text-amber-600',
          defaultIcon: <AlertCircle className="w-6 h-6" />
        };
      case 'draft':
        return {
          headerBg: 'bg-amber-50',
          headerBorder: 'border-amber-100',
          iconColor: 'text-amber-600',
          defaultIcon: <FileText className="w-6 h-6" />
        };
      case 'info':
      default:
        return {
          headerBg: 'bg-blue-50',
          headerBorder: 'border-blue-100',
          iconColor: 'text-blue-600',
          defaultIcon: <Info className="w-6 h-6" />
        };
    }
  };

  const styles = getVariantStyles();
  const displayIcon = icon || styles.defaultIcon;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Cabecera con fondo de color */}
        <div className={`${styles.headerBg} border-b ${styles.headerBorder} px-6 py-4`}>
          <div className="flex items-center gap-2">
            <div className={styles.iconColor}>
              {displayIcon}
            </div>
            <h2 className="text-xl font-semibold text-neutral-900">
              {title}
            </h2>
          </div>
        </div>

        {/* Contenido */}
        <div className="px-6 py-5">
          <p className="text-neutral-700 mb-6 leading-relaxed">
            {message}
          </p>

          {/* Botones principales */}
          <div className="space-y-3">
            <Button
              onClick={onContinue}
              className="w-full flex items-center justify-center gap-2 py-2.5"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{continueText}</span>
            </Button>

            <Button
              onClick={onNew}
              variant="outline"
              className={`w-full flex items-center justify-center gap-2 py-2.5 ${
                variant === 'warning' 
                  ? 'text-red-600 border-red-200 hover:bg-red-50' 
                  : ''
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>{newText}</span>
            </Button>
          </div>
        </div>

        {/* Pie del modal */}
        <div className="bg-neutral-50 border-t border-neutral-200 px-6 py-3">
          <button
            onClick={onClose}
            className="w-full text-center text-neutral-600 hover:text-neutral-900 text-sm py-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionModal;
