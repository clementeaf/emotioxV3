/**
 * Provider para manejar lazy loading a nivel de aplicación
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface LazyContextType {
  preloadedModules: Set<string>;
  isPreloading: boolean;
  preloadModule: (moduleName: string, importFn: () => Promise<any>) => Promise<void>;
  getPreloadStats: () => {
    totalPreloaded: number;
    isModulePreloaded: (moduleName: string) => boolean;
  };
}

const LazyContext = createContext<LazyContextType | null>(null);

interface LazyProviderProps {
  children: React.ReactNode;
}

export const LazyProvider: React.FC<LazyProviderProps> = ({ children }) => {
  const [preloadedModules, setPreloadedModules] = useState<Set<string>>(new Set());
  const [isPreloading, setIsPreloading] = useState(false);

  const preloadModule = useCallback(async (moduleName: string, importFn: () => Promise<any>) => {
    if (preloadedModules.has(moduleName)) {
      return; // Ya está precargado
    }

    setIsPreloading(true);
    
    try {
      await importFn();
      
      setPreloadedModules(prev => new Set([...Array.from(prev), moduleName]));
    } catch (error) {
    } finally {
      setIsPreloading(false);
    }
  }, [preloadedModules]);

  const getPreloadStats = useCallback(() => ({
    totalPreloaded: preloadedModules.size,
    isModulePreloaded: (moduleName: string) => preloadedModules.has(moduleName)
  }), [preloadedModules]);

  // Precargar módulos críticos al iniciar
  useEffect(() => {
    const criticalModules = [
      {
        name: 'CreateResearchForm',
        importFn: () => import('@/components/research/research-management/CreateResearchFormOptimized')
      },
      {
        name: 'Dashboard',
        importFn: () => import('@/components/dashboard/DashboardContent')
      }
    ];

    // Precargar después de 2 segundos para no interferir con la carga inicial
    const timer = setTimeout(() => {
      criticalModules.forEach(({ name, importFn }) => {
        preloadModule(name, importFn);
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [preloadModule]);

  const contextValue: LazyContextType = {
    preloadedModules,
    isPreloading,
    preloadModule,
    getPreloadStats
  };

  return (
    <LazyContext.Provider value={contextValue}>
      {children}
    </LazyContext.Provider>
  );
};

export const useLazy = () => {
  const context = useContext(LazyContext);
  if (!context) {
    throw new Error('useLazy must be used within a LazyProvider');
  }
  return context;
};