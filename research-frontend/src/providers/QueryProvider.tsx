import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';

/**
 * Configuración optimizada de React Query
 * - staleTime: 5 minutos - los datos se consideran frescos por 5 minutos
 * - cacheTime: 10 minutos - los datos en caché se mantienen 10 minutos
 * - refetchOnWindowFocus: false - no refetch automático al cambiar de ventana
 * - refetchOnReconnect: true - refetch cuando se recupera la conexión
 */
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutos
            gcTime: 10 * 60 * 1000, // 10 minutos (antes cacheTime)
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: 1,
            retryDelay: 1000,
            // CRÍTICO: Deduplicar peticiones simultáneas
            networkMode: 'always',
        },
        mutations: {
            retry: 1,
        },
    },
});

interface QueryProviderProps {
    children: ReactNode;
}

/**
 * Provider de React Query para gestión optimizada de estado del servidor
 */
export const QueryProvider = ({ children }: QueryProviderProps) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

