import { useAuthDebugger } from '@/hooks/useAuthDebugger';

export function AuthDebugger() {
  const {
    showDebugger,
    localToken,
    sessionToken,
    token,
    user,
    tokenInfo,
    toggleDebugger,
    handleFix,
    logout,
    getStatusInfo
  } = useAuthDebugger();

  if (!showDebugger) {
    return (
      <button
        onClick={toggleDebugger}
        className="fixed bottom-4 right-4 bg-gray-800 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg z-50 opacity-70 hover:opacity-100"
        title="Depurador de autenticación"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      </button>
    );
  }

  const { statusClass, statusMessage } = getStatusInfo();

  return (
    <div className="fixed bottom-0 right-0 p-4 w-full md:w-96 z-50">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="flex justify-between items-center bg-gray-800 text-white px-4 py-2">
          <h3 className="font-medium">Depurador de Autenticación</h3>
          <button onClick={toggleDebugger} className="text-white hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className={`px-4 py-2 ${statusClass} border-l-4 border-current`}>
          <p className="font-medium">{statusMessage}</p>
          {tokenInfo.timeRemaining && <p className="text-sm">{tokenInfo.timeRemaining}</p>}
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Token en localStorage:</span>
              <span className="text-sm">{localToken ? "✅" : "❌"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Token en sessionStorage:</span>
              <span className="text-sm">{sessionToken ? "✅" : "❌"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Token en contexto:</span>
              <span className="text-sm">{token ? "✅" : "❌"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Usuario en contexto:</span>
              <span className="text-sm">{user ? "✅" : "❌"}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleFix}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
            >
              Reparar autenticación
            </button>

            <button
              onClick={logout}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
