import React from 'react';

const NoResearchIdError: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-4">
          ⚠️ Enlace de Acceso Inválido
        </h2>
        <p className="text-gray-600 mb-4">
          No se encontró un identificador de investigación válido.
        </p>
        <div className="text-sm text-gray-500 mb-4">
          <p className="font-medium mb-2">El enlace debe contener al menos:</p>
          <code className="bg-gray-100 px-2 py-1 rounded block">
            ?researchId=XXX
          </code>
          <p className="text-xs mt-3 text-gray-400 mb-2">
            Para participantes reales (con guardado de respuestas):
          </p>
          <code className="bg-gray-100 px-2 py-1 rounded block">
            ?researchId=XXX&participantId=YYY
          </code>
        </div>
        <p className="text-xs text-gray-400">
          Si no tienes tu enlace, contacta al investigador o administrador del estudio.
        </p>
      </div>
    </div>
  );
};

export default NoResearchIdError;
