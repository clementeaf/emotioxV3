import { type ReactElement, type ReactNode, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { PageErrorBoundary } from './components/PageErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastProvider } from './contexts/ToastContext';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './providers/AuthProvider';
import { routesConfig, type RouteConfig } from './config/routes';

// Lazy load layouts para code splitting
const AuthLayout = lazy(() =>
    import('./components/layout/AuthLayout').then(m => ({ default: m.AuthLayout }))
) as React.LazyExoticComponent<() => ReactElement>;

const DashboardLayout = lazy(() =>
    import('./components/layout/DashboardLayout').then(m => ({ default: m.DashboardLayout }))
) as React.LazyExoticComponent<() => ReactElement>;

// Loading fallback component
const LayoutLoader = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
);

/**
 * Renders an element with its ErrorBoundaries if configured
 */
const renderWithErrorBoundaries = (route: RouteConfig): ReactNode => {
    let element = route.element;

    if (route.errorBoundary?.pageName) {
        element = <PageErrorBoundary pageName={route.errorBoundary.pageName}>{element}</PageErrorBoundary>;
    }

    return element;
};

interface LayoutConfig {
    component: (() => ReactElement) | React.LazyExoticComponent<() => ReactElement>;
    context?: 'auth' | 'dashboard' | 'general';
    isProtected?: boolean;
    renderRoutes: (routes: RouteConfig[]) => ReactElement[];
}

/**
 * Available layouts configuration
 */
const layoutsConfig: Record<string, LayoutConfig> = {
    auth: {
        component: AuthLayout,
        context: 'auth',
        renderRoutes: (routes) => [
            <Route
                key="auth-layout"
                element={
                    <RouteErrorBoundary context="auth">
                        <Suspense fallback={<LayoutLoader />}>
                            <AuthLayout />
                        </Suspense>
                    </RouteErrorBoundary>
                }
            >
                {routes.map((route) => (
                    <Route key={route.path} path={route.path} element={renderWithErrorBoundaries(route)} />
                ))}
            </Route>,
        ],
    },
    dashboard: {
        component: DashboardLayout,
        context: 'dashboard',
        isProtected: true,
        renderRoutes: (routes) => [
            <Route
                key="dashboard-layout"
                element={
                    <RouteErrorBoundary context="dashboard">
                        <ProtectedRoute>
                            <Suspense fallback={<LayoutLoader />}>
                                <DashboardLayout />
                            </Suspense>
                        </ProtectedRoute>
                    </RouteErrorBoundary>
                }
            >
                {routes.map((route) => (
                    <Route key={route.path} path={route.path} element={renderWithErrorBoundaries(route)} />
                ))}
            </Route>,
        ],
    },
    none: {
        component: () => <></>,
        renderRoutes: (routes) =>
            routes.map((route) => <Route key={route.path} path={route.path} element={route.element} />),
    },
};

/**
 * Generates all routes from configuration
 */
const generateRoutes = (): ReactElement[] => {
    const routesByLayout = new Map<string, RouteConfig[]>();

    routesConfig.forEach((route) => {
        const layout = route.layout || 'none';
        if (!routesByLayout.has(layout)) {
            routesByLayout.set(layout, []);
        }
        routesByLayout.get(layout)?.push(route);
    });

    const routes: ReactElement[] = [];

    routesByLayout.forEach((routesInLayout, layoutKey) => {
        const layoutConfig = layoutsConfig[layoutKey] || layoutsConfig.none;
        routes.push(...layoutConfig.renderRoutes(routesInLayout));
    });

    return routes;
};

function App() {
    const routes = generateRoutes();

    return (
        <ErrorBoundary>
            <QueryProvider>
                <ToastProvider>
                    <BrowserRouter>
                        <AuthProvider>
                            <Routes>{routes}</Routes>
                        </AuthProvider>
                    </BrowserRouter>
                </ToastProvider>
            </QueryProvider>
        </ErrorBoundary>
    );
}

export default App;
