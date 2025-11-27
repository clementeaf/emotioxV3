import { useRouter } from 'next/navigation';
import React from 'react';

/**
 * Componente provisional para reemplazar RecruitEyeTrackingForm
 * No utiliza el hook problemático
 */
const RecruitEyeTrackingForm: React.FC<{ researchId: string; className?: string }> = ({ 
  researchId,
  className = '' 
}) => {
  const router = useRouter();

  return (
    <div className={`p-6 bg-white rounded-lg shadow-sm ${className}`}>
      <div className="text-center py-10">
        <h2 className="text-2xl font-medium text-gray-800 mb-4">Configuración de Reclutamiento</h2>
        <div className="mb-6 text-gray-600">
          <p>El módulo de reclutamiento para Eye Tracking está actualmente en mantenimiento.</p>
          <p className="mt-2">Utiliza el módulo principal de Eye Tracking para configurar tu estudio.</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-md inline-block text-left mb-8">
          <h3 className="text-blue-800 font-medium mb-2">Nota técnica:</h3>
          <p className="text-sm text-blue-700">
            El componente original presentaba problemas con las APIs y las definiciones de tipos.
            Se ha implementado una versión simplificada para mantener la funcionalidad básica.
          </p>
        </div>
        <div className="flex justify-center space-x-4">
          <button 
            onClick={() => {
              alert('La funcionalidad de Eye Tracking está temporalmente deshabilitada. Se está trabajando en una nueva implementación.');
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Ir a Eye Tracking
          </button>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecruitEyeTrackingForm; 