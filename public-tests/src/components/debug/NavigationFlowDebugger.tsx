import { useState } from 'react';

interface VisualClickPoint {
  x: number;
  y: number;
  timestamp: number;
  isCorrect: boolean;
  imageIndex: number;
}

interface NavigationFlowDebuggerProps {
  currentImageIndex: number;
  visualClickPoints: Record<number, VisualClickPoint[]>;
  onClearPoints?: () => void;
  onExportData?: () => void;
}

export function NavigationFlowDebugger({
  currentImageIndex,
  visualClickPoints,
  onClearPoints,
  onExportData
}: NavigationFlowDebuggerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showStats, setShowStats] = useState(true);

  const totalPoints = Object.values(visualClickPoints).flat().length;
  const correctPoints = Object.values(visualClickPoints).flat().filter(p => p.isCorrect).length;
  const incorrectPoints = totalPoints - correctPoints;
  const currentImagePoints = visualClickPoints[currentImageIndex] || [];

  const accuracyRate = totalPoints > 0 ? (correctPoints / totalPoints) * 100 : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Botón de toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Debug Navigation Flow"
      >
        🎯
      </button>

      {/* Panel expandido */}
      {isExpanded && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-300 rounded-lg shadow-xl p-4 min-w-80 max-w-96">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Navigation Flow Debug
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Estadísticas generales */}
          {showStats && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">📊 Estadísticas Generales</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Total puntos:</span>
                  <span className="ml-2 font-semibold">{totalPoints}</span>
                </div>
                <div>
                  <span className="text-gray-600">Precisión:</span>
                  <span className="ml-2 font-semibold">{accuracyRate.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-green-600">✅ Correctos:</span>
                  <span className="ml-2 font-semibold">{correctPoints}</span>
                </div>
                <div>
                  <span className="text-red-600">❌ Incorrectos:</span>
                  <span className="ml-2 font-semibold">{incorrectPoints}</span>
                </div>
              </div>
            </div>
          )}

          {/* Imagen actual */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">
              🖼️ Imagen Actual: {currentImageIndex + 1}
            </h4>
            <div className="text-sm">
              <div className="flex justify-between">
                <span>Puntos en esta imagen:</span>
                <span className="font-semibold">{currentImagePoints.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Correctos:</span>
                <span className="text-green-600 font-semibold">
                  {currentImagePoints.filter(p => p.isCorrect).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Incorrectos:</span>
                <span className="text-red-600 font-semibold">
                  {currentImagePoints.filter(p => !p.isCorrect).length}
                </span>
              </div>
            </div>
          </div>

          {/* Lista de puntos de la imagen actual */}
          {currentImagePoints.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">
                📍 Puntos en Imagen {currentImageIndex + 1}
              </h4>
              <div className="max-h-32 overflow-y-auto">
                {currentImagePoints.map((point, index) => (
                  <div
                    key={`${point.timestamp}-${index}`}
                    className={`text-xs p-2 mb-1 rounded ${point.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                  >
                    <div className="flex justify-between">
                      <span>
                        {point.isCorrect ? '✅' : '❌'} ({point.x}, {point.y})
                      </span>
                      <span className="text-gray-500">
                        {new Date(point.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumen por imagen */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">📋 Resumen por Imagen</h4>
            <div className="space-y-1">
              {Object.entries(visualClickPoints).map(([imageIndex, points]) => (
                <div
                  key={imageIndex}
                  className={`text-xs p-2 rounded ${parseInt(imageIndex) === currentImageIndex
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-gray-100 text-gray-700'
                    }`}
                >
                  <div className="flex justify-between">
                    <span>Imagen {parseInt(imageIndex) + 1}:</span>
                    <span className="font-semibold">{points.length} puntos</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">
                      ✅ {points.filter(p => p.isCorrect).length}
                    </span>
                    <span className="text-red-600">
                      ❌ {points.filter(p => !p.isCorrect).length}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controles */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className="flex-1 px-3 py-2 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              {showStats ? 'Ocultar Stats' : 'Mostrar Stats'}
            </button>
            {onClearPoints && (
              <button
                onClick={onClearPoints}
                className="flex-1 px-3 py-2 text-xs bg-red-500 text-white rounded hover:bg-red-600"
              >
                Limpiar
              </button>
            )}
            {onExportData && (
              <button
                onClick={onExportData}
                className="flex-1 px-3 py-2 text-xs bg-green-500 text-white rounded hover:bg-green-600"
              >
                Exportar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NavigationFlowDebugger;
