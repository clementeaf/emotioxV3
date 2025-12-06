import { useState, useEffect } from 'react';

/**
 * Hook para debouncing de valores
 * Útil para búsquedas y filtros que no deben ejecutarse en cada keystroke
 * @param value - Valor a debounce
 * @param delay - Delay en milisegundos (default: 300ms)
 * @returns Valor debounced
 */
export const useDebounce = <T,>(value: T, delay = 300): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

