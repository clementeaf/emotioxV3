import React from 'react';
import { DisqualifiedScreenProps } from './ThankYouScreenTypes';

/**
 * Componente para pantalla de descalificación
 */
export const DisqualifiedScreen: React.FC<DisqualifiedScreenProps> = ({ 
  eyeTrackingConfig 
}) => {
  return (
    <div className='flex flex-col items-center justify-center h-full w-full'>
      <div className="text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          No calificas para esta investigación
        </h2>
        <p className="text-gray-600 mb-6">
          Lamentamos informarte que no cumples con los criterios requeridos para participar en este estudio.
        </p>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Información adicional
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Para más información sobre los criterios de participación, visita:
          </p>
          <a
            href={eyeTrackingConfig.backlinks?.disqualified}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Ver criterios de participación
          </a>
        </div>
      </div>
    </div>
  );
};
