'use client';

import { AlertTriangle, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteConfirmModal({ isOpen, onClose, onConfirm, isDeleting }: DeleteConfirmModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Confirmar eliminación
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                ¿Estás seguro de que deseas eliminar todos los datos de reclutamiento ocular?
              </h3>
              <p className="text-sm text-gray-600">
                Esta acción eliminará permanentemente todos los datos de demographics (edad, país, género, etc.)
                de esta investigación. Esta acción no se puede deshacer.
              </p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-xs text-red-700">
              <strong>⚠️ Advertencia:</strong> Una vez eliminados, no podrás recuperar estos datos.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            loading={isDeleting}
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar datos'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
