import React from 'react';
import { EYE_TRACKING_VALIDATION, EyeTrackingFormData } from 'shared/interfaces/eye-tracking.interface';

import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';

interface AdvancedTabProps {
  formData: EyeTrackingFormData;
  updateFormData: (path: string, value: any) => void;
  addAreaOfInterest: () => void;
  removeAreaOfInterest: (id: string) => void;
}

export const AdvancedTab: React.FC<AdvancedTabProps> = ({
  formData,
  updateFormData,
  addAreaOfInterest,
  removeAreaOfInterest
}) => {
  return (
    <>
      <div className="space-y-6">
        <div className="p-4 border border-neutral-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-neutral-900">Áreas de interés</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Define regiones específicas para seguir la atención del participante
              </p>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-neutral-600 mr-2">Activar</span>
              <Switch
                checked={formData.areasOfInterest.enabled}
                onCheckedChange={(checked: boolean) => updateFormData('areasOfInterest.enabled', checked)}
              />
            </div>
          </div>

          {formData.areasOfInterest.enabled && (
            <>
              <div className="mb-4">
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                  onClick={addAreaOfInterest}
                >
                  + Añadir área de interés
                </button>
              </div>

              {formData.areasOfInterest.areas.length > 0 ? (
                <div className="space-y-4">
                  {formData.areasOfInterest.areas.map((area) => (
                    <div key={area.id} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="flex items-center justify-between mb-3">
                        <Input
                          type="text"
                          value={area.name}
                          onChange={(e) => {
                            const newAreas = [...formData.areasOfInterest.areas];
                            const areaIndex = newAreas.findIndex(a => a.id === area.id);
                            if (areaIndex !== -1) {
                              newAreas[areaIndex] = { ...newAreas[areaIndex], name: e.target.value };
                              updateFormData('areasOfInterest.areas', newAreas);
                            }
                          }}
                          className="w-full max-w-xs"
                          placeholder="Nombre del área"
                        />
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => removeAreaOfInterest(area.id)}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">Posición X</label>
                          <Input
                            type="number"
                            value={area.region.x}
                            onChange={(e) => {
                              const newAreas = [...formData.areasOfInterest.areas];
                              const areaIndex = newAreas.findIndex(a => a.id === area.id);
                              if (areaIndex !== -1) {
                                newAreas[areaIndex] = {
                                  ...newAreas[areaIndex],
                                  region: {
                                    ...newAreas[areaIndex].region,
                                    x: parseInt(e.target.value)
                                  }
                                };
                                updateFormData('areasOfInterest.areas', newAreas);
                              }
                            }}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">Posición Y</label>
                          <Input
                            type="number"
                            value={area.region.y}
                            onChange={(e) => {
                              const newAreas = [...formData.areasOfInterest.areas];
                              const areaIndex = newAreas.findIndex(a => a.id === area.id);
                              if (areaIndex !== -1) {
                                newAreas[areaIndex] = {
                                  ...newAreas[areaIndex],
                                  region: {
                                    ...newAreas[areaIndex].region,
                                    y: parseInt(e.target.value)
                                  }
                                };
                                updateFormData('areasOfInterest.areas', newAreas);
                              }
                            }}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">Ancho</label>
                          <Input
                            type="number"
                            value={area.region.width}
                            onChange={(e) => {
                              const newAreas = [...formData.areasOfInterest.areas];
                              const areaIndex = newAreas.findIndex(a => a.id === area.id);
                              if (areaIndex !== -1) {
                                newAreas[areaIndex] = {
                                  ...newAreas[areaIndex],
                                  region: {
                                    ...newAreas[areaIndex].region,
                                    width: parseInt(e.target.value)
                                  }
                                };
                                updateFormData('areasOfInterest.areas', newAreas);
                              }
                            }}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">Alto</label>
                          <Input
                            type="number"
                            value={area.region.height}
                            onChange={(e) => {
                              const newAreas = [...formData.areasOfInterest.areas];
                              const areaIndex = newAreas.findIndex(a => a.id === area.id);
                              if (areaIndex !== -1) {
                                newAreas[areaIndex] = {
                                  ...newAreas[areaIndex],
                                  region: {
                                    ...newAreas[areaIndex].region,
                                    height: parseInt(e.target.value)
                                  }
                                };
                                updateFormData('areasOfInterest.areas', newAreas);
                              }
                            }}
                            className="w-full"
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-xs text-neutral-500 mb-1">Estímulo asociado</label>
                        <select
                          value={area.stimulusId}
                          onChange={(e) => {
                            const newAreas = [...formData.areasOfInterest.areas];
                            const areaIndex = newAreas.findIndex(a => a.id === area.id);
                            if (areaIndex !== -1) {
                              newAreas[areaIndex] = { ...newAreas[areaIndex], stimulusId: e.target.value };
                              updateFormData('areasOfInterest.areas', newAreas);
                            }
                          }}
                          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                        >
                          <option value="">Seleccionar un estímulo</option>
                          {formData.stimuli.items.map((stimulus) => (
                            <option key={stimulus.id} value={stimulus.id}>
                              {stimulus.fileName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-neutral-50 rounded-lg text-center text-neutral-500">
                  No hay áreas de interés definidas. Haz clic en &quot;Añadir área de interés&quot; para comenzar.
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border border-neutral-200 rounded-lg">
          <h3 className="text-sm font-medium text-neutral-900 mb-4">Parámetros avanzados</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm text-neutral-700">Umbral de fijación (ms)</label>
              <Input
                type="number"
                value={formData.config.parameters.fixationThreshold}
                onChange={(e) => updateFormData('config.parameters.fixationThreshold', parseInt(e.target.value))}
                min={EYE_TRACKING_VALIDATION.fixationThreshold.min}
                max={EYE_TRACKING_VALIDATION.fixationThreshold.max}
                className="w-full"
              />
              <p className="text-xs text-neutral-500">
                Umbral de tiempo (en milisegundos) para clasificar una mirada como fijación
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-neutral-700">Umbral de velocidad sacádica (°/s)</label>
              <Input
                type="number"
                value={formData.config.parameters.saccadeVelocityThreshold}
                onChange={(e) => updateFormData('config.parameters.saccadeVelocityThreshold', parseInt(e.target.value))}
                min={EYE_TRACKING_VALIDATION.saccadeVelocityThreshold.min}
                max={EYE_TRACKING_VALIDATION.saccadeVelocityThreshold.max}
                className="w-full"
              />
              <p className="text-xs text-neutral-500">
                Umbral de velocidad (grados por segundo) para clasificar movimientos oculares como sacadas
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border border-neutral-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-neutral-900">Marco del dispositivo</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Mostrar marco/superposición del dispositivo durante la presentación
              </p>
            </div>
            <Switch
              checked={formData.deviceFrame}
              onCheckedChange={(checked: boolean) => updateFormData('deviceFrame', checked)}
            />
          </div>
        </div>
      </div>
    </>
  );
};
