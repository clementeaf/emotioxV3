/* eslint-disable react-refresh/only-export-components -- test utilities, not HMR targets */
import { type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0 },
            mutations: { retry: false },
        },
    });

interface WrapperProps {
    children: ReactNode;
    route?: string;
}

const TestWrapper = ({ children, route = '/' }: WrapperProps) => {
    const queryClient = createTestQueryClient();
    return (
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[route]}>
                {children}
            </MemoryRouter>
        </QueryClientProvider>
    );
};

export const renderWithProviders = (
    ui: React.ReactElement,
    options?: Omit<RenderOptions, 'wrapper'> & { route?: string }
) => {
    const { route, ...renderOptions } = options || {};
    return render(ui, {
        wrapper: ({ children }) => <TestWrapper route={route}>{children}</TestWrapper>,
        ...renderOptions,
    });
};

export { createTestQueryClient };
