import React from 'react';
import { PrivacyNotice } from '../components/common/PrivacyNotice';

const PrivacyNoticePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Aviso de Privacidad
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Protegemos su privacidad y nos comprometemos a ser transparentes sobre cómo recopilamos,
            utilizamos y protegemos su información personal.
          </p>
          <div className="mt-4 flex items-center justify-center space-x-4 text-sm text-gray-500">
            <span>Última actualización: {new Date().toLocaleDateString('es-ES')}</span>
            <span>•</span>
            <span>Versión 1.0</span>
            <span>•</span>
            <span className="text-green-600 font-medium">Cumple GDPR</span>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li>
              <a href="/" className="hover:text-blue-600 transition-colors">
                Inicio
              </a>
            </li>
            <li>
              <span className="text-gray-400">/</span>
            </li>
            <li className="text-gray-900 font-medium">
              Aviso de Privacidad
            </li>
          </ol>
        </nav>

        {/* Componente de Aviso de Privacidad */}
        <PrivacyNotice
          researchId="general"
          researchTitle="EmotioX Research Platform"
          className="shadow-xl"
        />

        {/* Información adicional */}
        <div className="mt-12 grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📋 Documentos Relacionados
            </h2>
            <ul className="space-y-3">
              <li>
                <a
                  href="/terms"
                  className="text-blue-600 hover:text-blue-800 transition-colors flex items-center"
                >
                  <span className="mr-2">📄</span>
                  Términos y Condiciones
                </a>
              </li>
              <li>
                <a
                  href="/cookies"
                  className="text-blue-600 hover:text-blue-800 transition-colors flex items-center"
                >
                  <span className="mr-2">🍪</span>
                  Política de Cookies
                </a>
              </li>
              <li>
                <a
                  href="/gdpr-test"
                  className="text-blue-600 hover:text-blue-800 transition-colors flex items-center"
                >
                  <span className="mr-2">🔒</span>
                  Test de Consentimiento GDPR
                </a>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📞 Contacto Rápido
            </h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="mr-3">📧</span>
                <div>
                  <p className="font-medium text-gray-900">Email Principal</p>
                  <a
                    href="mailto:privacy@emotiox.com"
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    privacy@emotiox.com
                  </a>
                </div>
              </div>
              <div className="flex items-center">
                <span className="mr-3">👤</span>
                <div>
                  <p className="font-medium text-gray-900">Delegado de Protección de Datos</p>
                  <a
                    href="mailto:dpo@emotiox.com"
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    dpo@emotiox.com
                  </a>
                </div>
              </div>
              <div className="flex items-center">
                <span className="mr-3">🌐</span>
                <div>
                  <p className="font-medium text-gray-900">Sitio Web</p>
                  <a
                    href="https://www.emotiox.com/privacy"
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    www.emotiox.com/privacy
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer de la página */}
        <div className="mt-12 text-center">
          <div className="inline-flex space-x-4">
            <a
              href="/"
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              ← Volver al inicio
            </a>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              🖨️ Imprimir
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              🔄 Recargar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyNoticePage;
