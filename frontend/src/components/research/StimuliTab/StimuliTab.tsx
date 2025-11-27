import React from 'react';

import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

interface StimuliTabProps {
  formData: any;
  onUpdate: (data: any) => void;
  researchId: string;
}

export const StimuliTab: React.FC<StimuliTabProps> = ({
  formData,
  onUpdate,
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium mb-4">Estímulos</h3>
      
      <Alert className="mb-4">
        <AlertDescription>
          Sube las imágenes o videos que serán utilizados como estímulos durante la prueba.
        </AlertDescription>
      </Alert>
      
      <div className="p-4 border-2 border-dashed border-gray-300 rounded text-center">
        <p className="text-gray-500">Arrastra y suelta o haz clic para seleccionar imágenes o videos</p>
        <Button 
          className="mt-4"
          onClick={() => onUpdate({...formData})}
        >
          Seleccionar archivos
        </Button>
      </div>
      
      {formData?.stimuli?.items?.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {formData.stimuli.items.map((item: any) => (
            <div key={item.id} className="relative bg-white rounded-lg shadow p-4">
              <p className="font-medium">{item.fileName || 'Archivo'}</p>
              <button 
                onClick={() => {
                  onUpdate({
                    stimuli: {
                      ...formData.stimuli,
                      items: formData.stimuli.items.filter((i: any) => i.id !== item.id)
                    }
                  });
                }}
                className="text-red-500 text-sm mt-2"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No hay estímulos todavía. Sube algunos archivos para comenzar.</p>
        </div>
      )}
    </div>
  );
}; 