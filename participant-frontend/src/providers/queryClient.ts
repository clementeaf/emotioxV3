import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 2, // 2 minutes — prevent cache buildup across participant sessions
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
