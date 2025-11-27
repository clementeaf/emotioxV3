import { AlertTriangle, Info, XCircle } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: {
    type: 'error' | 'warning' | 'info';
    title?: string;
    message: string;
  };
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ 
  isOpen, 
  onClose, 
  error 
}) => {
  if (!isOpen || !error) {
    return null;
  }

  const getModalTitle = () => {
    switch (error.type) {
      case 'error':
        return 'Error';
      case 'info':
        return 'Información';
      default:
        return error.title || 'Aviso';
    }
  };

  const getModalStyle = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return {
          Icon: XCircle,
          colorClass: 'text-red-600', 
          bgColorClass: 'bg-red-50' 
        };
      case 'warning':
        return {
          Icon: AlertTriangle,
          colorClass: 'text-yellow-600',
          bgColorClass: 'bg-yellow-50'
        };
      case 'info':
      default:
        return {
          Icon: Info,
          colorClass: 'text-blue-600',
          bgColorClass: 'bg-blue-50'
        };
    }
  };

  const { Icon, colorClass, bgColorClass } = getModalStyle(error.type);
  const title = getModalTitle();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={bgColorClass}>
        <DialogHeader className="flex flex-row items-center space-x-3">
          <Icon className={`h-6 w-6 ${colorClass}`} aria-hidden="true" />
          <DialogTitle className={`text-lg font-medium ${colorClass}`}>{title}</DialogTitle>
        </DialogHeader>
        <DialogDescription className={`mt-2 text-sm ${colorClass}`}>
          {error.message}
        </DialogDescription>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
