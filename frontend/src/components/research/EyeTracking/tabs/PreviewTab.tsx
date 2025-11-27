import React from 'react';
import { EYE_TRACKING_VALIDATION, EyeTrackingFormData, PresentationSequenceType } from 'shared/interfaces/eye-tracking.interface';

import { Input } from '@/components/ui/Input';

interface PreviewTabProps {
  formData: EyeTrackingFormData;
  updateFormData: (path: string, value: any) => void;
}

export const PreviewTab: React.FC<PreviewTabProps> = ({ formData, updateFormData }) => {
  return (
    <>
      <div className="space-y-6">
        {/* Blue navigation bar */}
        <div className="bg-blue-500 text-white p-3 rounded-t-lg flex items-center justify-between">
          <span className="font-medium">Navegación del experimento</span>
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-xs bg-blue-600 rounded hover:bg-blue-700 transition-colors">
              Anterior
            </button>
            <button className="px-3 py-1 text-xs bg-blue-600 rounded hover:bg-blue-700 transition-colors">
              Siguiente
            </button>
          </div>
        </div>

        {/* Common initial screen */}
        <div className="border border-neutral-200 rounded-b-lg">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50">
            <h3 className="text-sm font-medium">Pantalla inicial común</h3>
          </div>
          <div className="p-6 text-center">
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-semibold mb-4">Bienvenido al experimento de seguimiento ocular</h2>
              <p className="text-neutral-600 mb-6">
                A continuación, se te mostrarán una serie de imágenes. Por favor, observa cada imagen de forma natural.
                Tus movimientos oculares serán registrados con fines de investigación.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-blue-800">
                  Haz clic en &quot;Comenzar&quot; cuando estés listo para iniciar el experimento.
                </p>
              </div>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                Comenzar
              </button>
            </div>
          </div>
        </div>

        {/* Experiment sequence information */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Orden recomendado del estudio</h3>
          <p className="text-sm text-blue-700 mb-3">
            Generalmente, se recomienda colocar el bloque "Smart VOC" primero, seguido del bloque "Tarea Cognitiva"
          </p>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs mr-2">1</span>
              <span className="text-sm font-medium">Smart VOC</span>
            </div>
            <div className="flex items-center">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs mr-2">2</span>
              <span className="text-sm font-medium">Tarea Cognitiva</span>
            </div>
            <div className="flex items-center">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs mr-2">3</span>
              <span className="text-sm font-medium">Seguimiento Ocular</span>
            </div>
          </div>
        </div>

        <div className="bg-neutral-800 rounded-lg overflow-hidden">
          <div className="aspect-video relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-center">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium">Haz clic para iniciar la vista previa</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-900">Secuencia de presentación</h3>
            <select
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              value={formData.stimuli.presentationSequence}
              onChange={(e) => updateFormData('stimuli.presentationSequence', e.target.value as PresentationSequenceType)}
            >
              <option value="sequential">Secuencial</option>
              <option value="random">Aleatoria</option>
              <option value="custom">Personalizada</option>
            </select>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-900">Duración por estímulo</h3>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={formData.stimuli.durationPerStimulus}
                onChange={(e) => updateFormData('stimuli.durationPerStimulus', parseInt(e.target.value))}
                min={EYE_TRACKING_VALIDATION.durationPerStimulus.min}
                max={EYE_TRACKING_VALIDATION.durationPerStimulus.max}
                className="w-full"
              />
              <span className="text-sm text-neutral-500">segundos</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
