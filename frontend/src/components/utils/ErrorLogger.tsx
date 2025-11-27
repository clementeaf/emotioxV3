import React, { createContext, useContext, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { toast } from 'react-hot-toast';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMessage {
  id: string;
  level: LogLevel;
  message: string;
  details?: any;
  timestamp: Date;
}

interface ErrorLogContextType {
  logs: LogMessage[];
  debug: (message: string, details?: any) => void;
  info: (message: string, details?: any) => void;
  warn: (message: string, details?: any) => void;
  error: (message: string, details?: any) => void;
  clearLogs: () => void;
  showLogModal: (id?: string) => void;
  hideLogModal: () => void;
}

const ErrorLogContext = createContext<ErrorLogContextType | null>(null);

export const useErrorLog = () => {
  const context = useContext(ErrorLogContext);
  if (!context) {
    throw new Error('useErrorLog must be used within an ErrorLogProvider');
  }
  return context;
};

interface ErrorLogProviderProps {
  children: React.ReactNode;
}

export const ErrorLogProvider: React.FC<ErrorLogProviderProps> = ({ children }) => {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Usar una referencia para evitar problemas de actualización
  const logsRef = useRef<LogMessage[]>([]);
  const isRenderingRef = useRef(true);
  const pendingLogsRef = useRef<LogMessage[]>([]);
  
  // Actualizar la referencia cuando cambia el estado
  useLayoutEffect(() => {
    logsRef.current = logs;
    
    // Procesar mensajes de log pendientes después del renderizado
    isRenderingRef.current = false;
    
    // Si hay logs pendientes, procesarlos ahora
    if (pendingLogsRef.current.length > 0) {
      setLogs(prevLogs => [...pendingLogsRef.current, ...prevLogs]);
      pendingLogsRef.current = [];
    }
    
    // Marcar como renderizando en la siguiente actualización
    return () => {
      isRenderingRef.current = true;
    };
  }, [logs]);

  const addLog = useCallback((level: LogLevel, message: string, details?: any) => {
    const newLog: LogMessage = {
      id: Math.random().toString(36).substring(2, 15),
      level,
      message,
      details,
      timestamp: new Date()
    };

    // Si estamos en medio de un renderizado, encolar el log para procesarlo después
    if (isRenderingRef.current) {
      pendingLogsRef.current.push(newLog);
      
      // Mostrar notificaciones incluso durante el renderizado
      if (level === 'error') {
        setTimeout(() => toast.error(message), 0);
      } else if (level === 'warn') {
        setTimeout(() => toast(message, { icon: '⚠️' }), 0);
      }
    } else {
      // Actualización segura fuera del ciclo de renderizado
      setLogs(prevLogs => [newLog, ...prevLogs]);
      
      // También mostrar notificación toast para errores y advertencias
      if (level === 'error') {
        toast.error(message);
      } else if (level === 'warn') {
        toast(message, { icon: '⚠️' });
      }
    }

    return newLog.id;
  }, []);

  const debug = useCallback((message: string, details?: any) => {
    return addLog('debug', message, details);
  }, [addLog]);

  const info = useCallback((message: string, details?: any) => {
    return addLog('info', message, details);
  }, [addLog]);

  const warn = useCallback((message: string, details?: any) => {
    return addLog('warn', message, details);
  }, [addLog]);

  const error = useCallback((message: string, details?: any) => {
    return addLog('error', message, details);
  }, [addLog]);

  const clearLogs = useCallback(() => {
    if (isRenderingRef.current) {
      // Posponer la limpieza hasta después del renderizado
      setTimeout(() => setLogs([]), 0);
    } else {
      setLogs([]);
    }
  }, []);

  const showLogModal = useCallback((id?: string) => {
    if (isRenderingRef.current) {
      // Posponer hasta después del renderizado
      setTimeout(() => {
        if (id) {
          setSelectedLog(id);
        }
        setIsModalOpen(true);
      }, 0);
    } else {
      if (id) {
        setSelectedLog(id);
      }
      setIsModalOpen(true);
    }
  }, []);

  const hideLogModal = useCallback(() => {
    if (isRenderingRef.current) {
      // Posponer hasta después del renderizado
      setTimeout(() => {
        setIsModalOpen(false);
        setSelectedLog(null);
      }, 0);
    } else {
      setIsModalOpen(false);
      setSelectedLog(null);
    }
  }, []);

  // Valores memoizados para evitar recreaciones
  const contextValue = React.useMemo(() => ({
    logs,
    debug,
    info,
    warn,
    error,
    clearLogs,
    showLogModal,
    hideLogModal
  }), [logs, debug, info, warn, error, clearLogs, showLogModal, hideLogModal]);

  return (
    <ErrorLogContext.Provider value={contextValue}>
      {children}
      {isModalOpen && <LogDetailsModal logId={selectedLog} onClose={hideLogModal} logs={logs} />}
    </ErrorLogContext.Provider>
  );
};

// Componente para mostrar detalles del log
const LogDetailsModal: React.FC<{
  logId: string | null;
  logs: LogMessage[];
  onClose: () => void;
}> = ({ logId, logs, onClose }) => {
  // Si logId es null, mostrar todos los logs
  const logsToShow = logId ? logs.filter(log => log.id === logId) : logs;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {logId ? 'Detalles del evento' : 'Registro de eventos'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {logId ? 'Información detallada del evento seleccionado' : 'Historial de eventos del sistema'}
          </p>
        </div>
        <div className="p-6 overflow-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {logsToShow.length === 0 ? (
            <p className="text-center text-gray-500">No hay eventos para mostrar</p>
          ) : (
            logsToShow.map(log => (
              <div
                key={log.id}
                className={`mb-4 p-4 rounded-md ${
                  log.level === 'error' 
                    ? 'bg-red-50 border-l-4 border-red-500' 
                    : log.level === 'warn'
                    ? 'bg-yellow-50 border-l-4 border-yellow-500'
                    : log.level === 'info'
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : 'bg-gray-50 border-l-4 border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    log.level === 'error' 
                      ? 'text-red-700' 
                      : log.level === 'warn'
                      ? 'text-yellow-700'
                      : log.level === 'info'
                      ? 'text-blue-700'
                      : 'text-gray-700'
                  }`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {log.timestamp.toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-800 mb-2">{log.message}</p>
                {log.details && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Detalles:</h4>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-[200px]">
                      {typeof log.details === 'string' 
                        ? log.details 
                        : JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente para visualizar todos los logs
export const LogViewer: React.FC = () => {
  const { logs, showLogModal } = useErrorLog();

  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <button
        type="button"
        className="flex items-center justify-center p-3 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50"
        onClick={() => showLogModal()}
      >
        <span className="sr-only">Ver logs</span>
        <span className="relative">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={1.5} 
            stroke="currentColor" 
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {logs.some(log => log.level === 'error' || log.level === 'warn') && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
          )}
        </span>
      </button>
    </div>
  );
}; 