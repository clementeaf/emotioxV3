'use client';

import React from 'react';

/**
 * Página de Demo para Eye Tracking
 * Versión simplificada para evitar errores de build
 */
export default function EyeTrackingDemo() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Eye Tracking Demo
        </h1>
        <p className="text-gray-600 mb-6">
          Esta funcionalidad está en desarrollo. Pronto estará disponible.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            🚧 En construcción - Sistema de seguimiento ocular avanzado
          </p>
        </div>
      </div>
    </div>
  );
}