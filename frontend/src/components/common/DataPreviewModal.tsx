import React, { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

interface DataPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  data: any;
  pendingAction: 'save' | 'preview' | null;
  title?: string;
  description?: string;
}

/**
 * Componente genérico para mostrar vista previa de datos
 * Reutilizable en cualquier formulario que necesite preview de datos
 */
export const DataPreviewModal: React.FC<DataPreviewModalProps> = ({
  isOpen,
  onClose,
  onContinue,
  data,
  pendingAction,
  title = "Vista Previa",
  description = "Revisa los datos antes de continuar"
}) => {
  const [showRawData, setShowRawData] = useState(false);
  
  if (!isOpen) return null;
  
  const handleContinue = () => {
    if (pendingAction === 'preview') {
      // Abre una nueva ventana con la vista previa real
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${title}</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                margin: 0;
                padding: 0;
                min-height: 100vh;
                background-color: #f5f5f5;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
              }
              .container {
                max-width: 800px;
                width: 90%;
                margin: 40px auto;
                padding: 40px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              h1 {
                font-size: 28px;
                color: #333;
                margin-bottom: 20px;
                text-align: center;
              }
              .data-section {
                margin-bottom: 30px;
                padding: 20px;
                border: 1px solid #eaeaea;
                border-radius: 8px;
              }
              .data-title {
                font-size: 18px;
                color: #333;
                margin-bottom: 12px;
                font-weight: 600;
              }
              .data-content {
                font-size: 14px;
                color: #555;
                line-height: 1.6;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>${title}</h1>
              <div class="data-section">
                <div class="data-title">Datos del formulario</div>
                <div class="data-content">
                  ${JSON.stringify(data, null, 2)}
                </div>
              </div>
            </div>
          </body>
          </html>
        `);
        previewWindow.document.close();
      }
    }
    onContinue();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-gray-600 mt-2">{description}</p>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Toggle para mostrar datos raw */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showRawData"
                checked={showRawData}
                onChange={(e) => setShowRawData(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="showRawData" className="text-sm text-gray-700">
                Mostrar datos JSON
              </label>
            </div>
          </div>

          {/* Vista previa de datos */}
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            {showRawData ? (
              <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                {JSON.stringify(data, null, 2)}
              </pre>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <strong>Datos del formulario:</strong>
                </div>
                <div className="text-sm text-gray-800">
                  {Object.keys(data).length} campos configurados
                </div>
                {data.questions && (
                  <div className="text-sm text-gray-800">
                    {data.questions.length} preguntas configuradas
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleContinue}>
              {pendingAction === 'preview' ? 'Ver Vista Previa' : 'Continuar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DataPreviewModal;
