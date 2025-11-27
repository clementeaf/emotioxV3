import { useCallback, useRef, useMemo } from 'react';

/**
 * Hook para callbacks optimizados que previenen re-renders innecesarios
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: React.DependencyList
): T {
  const callbackRef = useRef<T>(callback);
  const dependenciesRef = useRef<React.DependencyList>(dependencies);

  // Actualizar la referencia del callback solo si las dependencias cambiaron
  const shouldUpdate = useMemo(() => {
    if (dependencies.length !== dependenciesRef.current.length) {
      return true;
    }
    
    return dependencies.some((dep, index) => 
      !Object.is(dep, dependenciesRef.current[index])
    );
  }, dependencies);

  if (shouldUpdate) {
    callbackRef.current = callback;
    dependenciesRef.current = dependencies;
  }

  return useCallback(callbackRef.current, [shouldUpdate]) as T;
}

/**
 * Hook para memoizar valores complejos
 */
export function useDeepMemo<T>(
  factory: () => T,
  dependencies: React.DependencyList
): T {
  const depsRef = useRef<React.DependencyList>();
  const valueRef = useRef<T>();

  const depsChanged = !depsRef.current || 
    depsRef.current.length !== dependencies.length ||
    dependencies.some((dep, i) => !Object.is(dep, depsRef.current![i]));

  if (depsChanged) {
    valueRef.current = factory();
    depsRef.current = dependencies;
  }

  return valueRef.current as T;
}

/**
 * Hook para throttle de callbacks
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const now = Date.now();
    const timeSinceLastRun = now - lastRun.current;

    if (timeSinceLastRun >= delay) {
      callback(...args);
      lastRun.current = now;
    } else {
      timeoutRef.current = setTimeout(() => {
        callback(...args);
        lastRun.current = Date.now();
      }, delay - timeSinceLastRun);
    }
  }, [callback, delay]) as T;
}

/**
 * Hook para debounce de callbacks
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
}

/**
 * Hook para memoizar props de objetos
 */
export function useMemoizedProps<T extends Record<string, any>>(props: T): T {
  return useMemo(() => props, Object.values(props));
}

/**
 * Hook para callbacks estables (nunca cambian la referencia)
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef<T>(callback);
  
  // Actualizar la referencia sin cambiar la identidad del callback
  callbackRef.current = callback;

  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}