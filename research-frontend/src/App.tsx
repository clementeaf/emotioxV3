import { type ReactElement, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { PageErrorBoundary } from './components/PageErrorBoundary';
import { AuthLayout } from './components/layout/AuthLayout';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastProvider } from './contexts/ToastContext';
import { routesConfig, type RouteConfig } from './config/routes';

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
    component: () => ReactElement;
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
                        <AuthLayout />
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
                            <DashboardLayout />
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
            <ToastProvider>
                <BrowserRouter>
                    <Routes>{routes}</Routes>
                </BrowserRouter>
            </ToastProvider>
        </ErrorBoundary>
    );
}

export default App;
