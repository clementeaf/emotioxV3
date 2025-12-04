import { useState } from 'react';
import { checkEnvironmentVariables, testWebSocketConnection } from '../../utils/websocket-diagnostic';

interface WebSocketDiagnosticProps {
  className?: string;
}

export function WebSocketDiagnostic({ className = '' }: WebSocketDiagnosticProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
    details?: unknown;
  } | null>(null);
  const [envVars, setEnvVars] = useState<Record<string, unknown> | null>(null);

  const runDiagnostic = async () => {
    setIsTesting(true);
    setTestResult(null);
    setEnvVars(null);

    try {
      const env = checkEnvironmentVariables();
      setEnvVars(env);

      const result = await testWebSocketConnection();
      setTestResult(result);

    } catch (error) {
      setTestResult({
        success: false,
        error: 'Error en diagnóstico',
        details: { error }
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className={`p-4 bg-gray-50 rounded-lg border ${className}`}>
      <h3 className="text-lg font-semibold mb-4">🧪 Diagnóstico WebSocket</h3>

      <div className="space-y-4">
        <button
          onClick={runDiagnostic}
          disabled={isTesting}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isTesting ? 'Diagnosticando...' : 'Ejecutar Diagnóstico'}
        </button>

        {envVars && (
          <div className="p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
            <strong>Variables de Entorno:</strong>
            <pre className="mt-2 text-sm overflow-auto">
              {JSON.stringify(envVars, null, 2)}
            </pre>
          </div>
        )}

        {testResult && (
          <div className={`p-3 border rounded ${testResult.success
              ? 'bg-green-100 border-green-400 text-green-700'
              : 'bg-red-100 border-red-400 text-red-700'
            }`}>
            <strong>Resultado del Test:</strong>
            <pre className="mt-2 text-sm overflow-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p><strong>Instrucciones:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Ejecuta el diagnóstico para verificar la conectividad</li>
            <li>Revisa las variables de entorno</li>
            <li>Si hay errores, verifica la configuración</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
