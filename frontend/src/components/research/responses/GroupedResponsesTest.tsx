"use client";

import React, { useState } from 'react';
import { useResearchDataContext } from './GroupedResponsesPage';

interface GroupedResponsesTestProps {
  researchId: string;
}

/**
 * Componente de prueba para verificar el endpoint de respuestas agrupadas
 */
export const GroupedResponsesTest: React.FC<GroupedResponsesTestProps> = ({ researchId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { groupedResponses, isLoading: queryLoading, error, refetch } = useResearchDataContext();

  const handleTestEndpoint = async () => {
    setIsLoading(true);
    try {
      await refetch();
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  if (queryLoading || isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Probando endpoint...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error al probar endpoint</h3>
        <p className="text-red-600 text-sm mt-1">{error.message}</p>
        <button
          onClick={handleTestEndpoint}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-green-800 font-medium">✅ Endpoint funcionando correctamente</h3>
                  <p className="text-green-600 text-sm mt-1">
            URL: <code>/module-responses/grouped-by-question/{researchId}</code>
          </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-blue-800 font-medium">📊 Datos recibidos:</h4>
        <div className="text-sm text-blue-600 mt-2">
          <p>• Total de preguntas: {groupedResponses?.length || 0}</p>
          <p>• Research ID: {researchId}</p>
          <p>• Estructura: Agrupada por pregunta ✅</p>
        </div>
      </div>

      {groupedResponses && groupedResponses.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-gray-800 font-medium">📋 Ejemplo de estructura:</h4>
          <div className="text-sm text-gray-600 mt-2 space-y-2">
            {groupedResponses.slice(0, 3).map((question: any, index: number) => (
              <div key={question.questionKey} className="border-l-2 border-gray-300 pl-3">
                <p><strong>Pregunta {index + 1}:</strong> {question.questionKey}</p>
                <p><strong>Respuestas:</strong> {question.responses.length}</p>
                {question.responses.length > 0 && (
                  <p><strong>Ejemplo:</strong> {JSON.stringify(question.responses[0].value).slice(0, 50)}...</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleTestEndpoint}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Probar endpoint nuevamente
      </button>
    </div>
  );
};
