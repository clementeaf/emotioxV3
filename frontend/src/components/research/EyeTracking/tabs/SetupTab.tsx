import React from 'react';
import { TrackingDeviceType, EYE_TRACKING_VALIDATION, EyeTrackingFormData } from 'shared/interfaces/eye-tracking.interface';

import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';

interface SetupTabProps {
  formData: EyeTrackingFormData;
  updateFormData: (path: string, value: any) => void;
}

export const SetupTab: React.FC<SetupTabProps> = ({ formData, updateFormData }) => {
  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
          <div className="space-y-0.5">
            <h2 className="text-sm font-medium text-neutral-900">Activar seguimiento ocular</h2>
            <p className="text-sm text-neutral-500">Incluir funcionalidad de seguimiento ocular en este estudio.</p>
          </div>
          <Switch 
            checked={formData.config.enabled} 
            onCheckedChange={(checked: boolean) => updateFormData('config.enabled', checked)} 
          />
        </div>

        {formData.config.enabled && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-900">Dispositivo de seguimiento</h3>
                <select 
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  value={formData.config.trackingDevice}
                  onChange={(e) => updateFormData('config.trackingDevice', e.target.value as TrackingDeviceType)}
                >
                  <option value="webcam">Webcam estándar</option>
                  <option value="tobii">Tobii Eye Tracker 5</option>
                  <option value="gazepoint">GazePoint GP3 HD</option>
                  <option value="eyetech">EyeTech VT3 Mini</option>
                </select>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-900">Frecuencia de muestreo</h3>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    value={formData.config.parameters.samplingRate}
                    onChange={(e) => updateFormData('config.parameters.samplingRate', parseInt(e.target.value))}
                    min={EYE_TRACKING_VALIDATION.samplingRate.min}
                    max={EYE_TRACKING_VALIDATION.samplingRate.max}
                    className="w-full"
                  />
                  <span className="text-sm text-neutral-500">Hz</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-900">Opciones de seguimiento</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <span className="text-sm text-neutral-800">Calibración</span>
                  <Switch 
                    checked={formData.config.calibration} 
                    onCheckedChange={(checked: boolean) => updateFormData('config.calibration', checked)} 
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <span className="text-sm text-neutral-800">Validación</span>
                  <Switch 
                    checked={formData.config.validation} 
                    onCheckedChange={(checked: boolean) => updateFormData('config.validation', checked)} 
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <span className="text-sm text-neutral-800">Grabar audio</span>
                  <Switch 
                    checked={formData.config.recording.audio} 
                    onCheckedChange={(checked: boolean) => updateFormData('config.recording.audio', checked)} 
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <span className="text-sm text-neutral-800">Grabar vídeo</span>
                  <Switch 
                    checked={formData.config.recording.video} 
                    onCheckedChange={(checked: boolean) => updateFormData('config.recording.video', checked)} 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-900">Visualización en tiempo real</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <span className="text-sm text-neutral-800">Mostrar mirada</span>
                  <Switch 
                    checked={formData.config.visualization.showGaze} 
                    onCheckedChange={(checked: boolean) => updateFormData('config.visualization.showGaze', checked)} 
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <span className="text-sm text-neutral-800">Mostrar fijaciones</span>
                  <Switch 
                    checked={formData.config.visualization.showFixations} 
                    onCheckedChange={(checked: boolean) => updateFormData('config.visualization.showFixations', checked)} 
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <span className="text-sm text-neutral-800">Mostrar movimientos sacádicos</span>
                  <Switch 
                    checked={formData.config.visualization.showSaccades} 
                    onCheckedChange={(checked: boolean) => updateFormData('config.visualization.showSaccades', checked)} 
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <span className="text-sm text-neutral-800">Mostrar mapa de calor</span>
                  <Switch 
                    checked={formData.config.visualization.showHeatmap} 
                    onCheckedChange={(checked: boolean) => updateFormData('config.visualization.showHeatmap', checked)} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}; 