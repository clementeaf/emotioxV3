import React, { useCallback } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useErrorLog } from '@/components/utils/ErrorLogger';

interface SettingsTabProps {
  formData: any;
  onUpdate: (data: any) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  formData,
  onUpdate
}) => {
  const { debug } = useErrorLog();

  // Manejar cambio en el modo de captura
  const handleCaptureModeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({
      settings: {
        ...formData.settings,
        captureMode: e.target.value
      }
    });
    debug('SettingsTab - Modo de captura actualizado', { newMode: e.target.value });
  }, [formData, onUpdate, debug]);

  // Manejar cambio en la tasa de muestreo
  const handleSampleRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    onUpdate({
      settings: {
        ...formData.settings,
        sampleRate: value
      }
    });
    debug('SettingsTab - Tasa de muestreo actualizada', { newRate: value });
  }, [formData, onUpdate, debug]);

  // Manejar cambio en grabación de audio
  const handleRecordAudioChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      settings: {
        ...formData.settings,
        recordAudio: e.target.checked
      }
    });
    debug('SettingsTab - Grabación de audio actualizada', { enabled: e.target.checked });
  }, [formData, onUpdate, debug]);

  // Manejar cambio en mostrar punto de mirada
  const handleShowGazeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      settings: {
        ...formData.settings,
        showGaze: e.target.checked
      }
    });
    debug('SettingsTab - Mostrar punto de mirada actualizado', { enabled: e.target.checked });
  }, [formData, onUpdate, debug]);

  // Manejar cambio en permitir pausa
  const handleAllowPauseChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      settings: {
        ...formData.settings,
        allowPause: e.target.checked
      }
    });
    debug('SettingsTab - Permitir pausa actualizado', { enabled: e.target.checked });
  }, [formData, onUpdate, debug]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Configuración de Captura</h3>
        <p className="text-sm text-neutral-500 mb-6">
          Configura los parámetros técnicos para la captura de datos de seguimiento ocular.
        </p>

        <div className="space-y-8">
          {/* Modo de captura */}
          <div className="space-y-3">
            <label htmlFor="captureMode" className="text-sm font-medium">Modo de captura</label>
            <select 
              id="captureMode"
              value={formData.settings.captureMode} 
              onChange={handleCaptureModeChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="continuous">Continuo</option>
              <option value="fixation">Solo fijaciones</option>
              <option value="saccade">Solo sacadas</option>
              <option value="blink">Incluir parpadeos</option>
            </select>
            <p className="text-xs text-neutral-500">
              El modo continuo recopila todos los datos, los otros modos filtran datos específicos.
            </p>
          </div>

          {/* Tasa de muestreo */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Tasa de muestreo: {formData.settings.sampleRate} Hz</label>
            <input
              type="range"
              min="30"
              max="120"
              step="10"
              value={formData.settings.sampleRate}
              onChange={handleSampleRateChange}
              className="w-full"
            />
            <p className="text-xs text-neutral-500">
              Tasas más altas capturan más detalles pero requieren más recursos.
            </p>
          </div>

          <hr className="border-t border-gray-200 my-6" />

          {/* Opciones adicionales con interruptores */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="recordAudio" className="text-sm font-medium block">Grabar audio</label>
                <p className="text-xs text-neutral-500">
                  Captura comentarios verbales del participante durante la prueba.
                </p>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  id="recordAudio"
                  checked={formData.settings.recordAudio}
                  onChange={handleRecordAudioChange}
                  className="h-4 w-4"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="showGaze" className="text-sm font-medium block">Mostrar punto de mirada</label>
                <p className="text-xs text-neutral-500">
                  Muestra al participante dónde está mirando en tiempo real.
                </p>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  id="showGaze"
                  checked={formData.settings.showGaze}
                  onChange={handleShowGazeChange}
                  className="h-4 w-4"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="allowPause" className="text-sm font-medium block">Permitir pausar</label>
                <p className="text-xs text-neutral-500">
                  Permite al participante pausar la prueba si es necesario.
                </p>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  id="allowPause"
                  checked={formData.settings.allowPause}
                  onChange={handleAllowPauseChange}
                  className="h-4 w-4"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Configuración avanzada</h3>
        
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">
            La configuración avanzada permite un mayor control sobre el proceso de seguimiento ocular, 
            pero requiere conocimientos técnicos específicos.
          </p>
          
          <Button variant="outline" className="w-full">
            Abrir configuración avanzada
          </Button>
        </div>
      </Card>
    </div>
  );
}; 