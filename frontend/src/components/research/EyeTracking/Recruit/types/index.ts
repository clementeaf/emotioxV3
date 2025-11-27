import { ReactNode } from 'react';

// Interfaz para los props del ErrorModal
export interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: ErrorModalData | null;
}

// Interfaz para los datos que se muestran en el modal
export interface ErrorModalData {
  title?: string;
  message: string;
  type: 'error' | 'info' | 'warning';
} 