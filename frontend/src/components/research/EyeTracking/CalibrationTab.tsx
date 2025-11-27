import React, { useCallback } from 'react';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useErrorLog } from '@/components/utils/ErrorLogger';

interface CalibrationTabProps {
  formData: any;
  onUpdate: (data: any) => void;
}

export const CalibrationTab: React.FC<CalibrationTabProps> = ({
  formData,
  onUpdate
}) => {
  const { debug } = useErrorLog();

  // Manejar cambio en el tipo de calibración
  const handleTypeChange = useCallback((value: string) => {
    onUpdate({
      calibration: {
        ...formData.calibration,
        type: value
      }
    });
    debug('CalibrationTab - Tipo de calibración actualizado', { newType: value });
  }, [formData, onUpdate, debug]);

  // Manejar cambio en el número de puntos
  const handlePointCountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    onUpdate({
      calibration: {
        ...formData.calibration,
        pointCount: value
      }
    });
    debug('CalibrationTab - Número de puntos actualizado', { newCount: value });
  }, [formData, onUpdate, debug]);

  // Manejar cambio en el tamaño del objetivo
  const handleTargetSizeChange = useCallback((value: string) => {
    onUpdate({
      calibration: {
        ...formData.calibration,
        targetSize: value
      }
    });
    debug('CalibrationTab - Tamaño del objetivo actualizado', { newSize: value });
  }, [formData, onUpdate, debug]);

  // Manejar cambio en el color del objetivo
  const handleTargetColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      calibration: {
        ...formData.calibration,
        targetColor: e.target.value
      }
    });
    debug('CalibrationTab - Color del objetivo actualizado', { newColor: e.target.value });
  }, [formData, onUpdate, debug]);

  // Manejar cambio en el color de fondo
  const handleBackgroundColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      calibration: {
        ...formData.calibration,
        backgroundColor: e.target.value
      }
    });
    debug('CalibrationTab - Color de fondo actualizado', { newColor: e.target.value });
  }, [formData, onUpdate, debug]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Configuración de Calibración</h3>
        <p className="text-sm text-neutral-500 mb-6">
          Define cómo se realizará la calibración de seguimiento ocular para los participantes.
        </p>

        <div className="space-y-8">
          {/* Tipo de calibración */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Tipo de calibración</label>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="standard"
                  name="calibrationType"
                  value="standard"
                  checked={formData.calibration.type === 'standard'}
                  onChange={() => handleTypeChange('standard')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="standard" className="text-sm">Estándar (5 puntos)</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="advanced"
                  name="calibrationType"
                  value="advanced"
                  checked={formData.calibration.type === 'advanced'}
                  onChange={() => handleTypeChange('advanced')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="advanced" className="text-sm">Avanzada (9 puntos)</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="custom"
                  name="calibrationType"
                  value="custom"
                  checked={formData.calibration.type === 'custom'}
                  onChange={() => handleTypeChange('custom')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="custom" className="text-sm">Personalizada</label>
              </div>
            </div>
          </div>

          {/* Número de puntos (solo visible si es personalizada) */}
          {formData.calibration.type === 'custom' && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Número de puntos de calibración: {formData.calibration.pointCount}</label>
              <input
                type="range"
                min="3"
                max="16"
                step="1"
                value={formData.calibration.pointCount}
                onChange={handlePointCountChange}
                className="w-full"
              />
            </div>
          )}

          {/* Tamaño del objetivo */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Tamaño del objetivo</label>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="small"
                  name="targetSize"
                  value="small"
                  checked={formData.calibration.targetSize === 'small'}
                  onChange={() => handleTargetSizeChange('small')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="small" className="text-sm">Pequeño</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="medium"
                  name="targetSize"
                  value="medium"
                  checked={formData.calibration.targetSize === 'medium'}
                  onChange={() => handleTargetSizeChange('medium')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="medium" className="text-sm">Mediano</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="large"
                  name="targetSize"
                  value="large"
                  checked={formData.calibration.targetSize === 'large'}
                  onChange={() => handleTargetSizeChange('large')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="large" className="text-sm">Grande</label>
              </div>
            </div>
          </div>

          {/* Colores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">Color del objetivo</label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={formData.calibration.targetColor}
                  onChange={handleTargetColorChange}
                  className="w-12 h-12 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.calibration.targetColor}
                  onChange={handleTargetColorChange}
                  className="w-32"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium">Color de fondo</label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={formData.calibration.backgroundColor}
                  onChange={handleBackgroundColorChange}
                  className="w-12 h-12 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.calibration.backgroundColor}
                  onChange={handleBackgroundColorChange}
                  className="w-32"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Vista previa</h3>
        <div 
          className="border rounded-md overflow-hidden h-64 flex items-center justify-center" 
          style={{ backgroundColor: formData.calibration.backgroundColor }}
        >
          <div 
            className="rounded-full" 
            style={{ 
              backgroundColor: formData.calibration.targetColor,
              width: formData.calibration.targetSize === 'small' ? '20px' : 
                formData.calibration.targetSize === 'medium' ? '30px' : '40px',
              height: formData.calibration.targetSize === 'small' ? '20px' : 
                formData.calibration.targetSize === 'medium' ? '30px' : '40px'
            }}
          />
        </div>
      </Card>
    </div>
  );
}; 