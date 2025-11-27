import React from 'react';

import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onReload: () => void;
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  // isOpen, // No usamos este prop, siempre será false
  onClose,
  onLogin,
  onReload,
  title,
  message,
  type
}) => {
  // Configurar clases de estilo basadas en el tipo
  const getHeaderClass = () => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // Siempre forzamos isOpen a false para que nunca se muestre
  const isOpen = false;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className={`px-4 py-3 rounded-t ${getHeaderClass()}`}>
            <DialogTitle className="font-semibold">{title}</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="py-4 px-1">
          <p className="text-gray-600">{message}</p>
        </div>
        
        <div className="flex gap-2 w-full justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          
          <Button variant="outline" onClick={onReload}>
            Recargar página
          </Button>
          
          <Button onClick={onLogin}>
            Ir a iniciar sesión
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 