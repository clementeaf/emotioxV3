import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { ErrorPage } from '../pages/ErrorPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';

export interface RouteConfig {
    path: string;
    element: ReactNode;
    layout?: 'auth' | 'dashboard' | 'none';
    isProtected?: boolean;
    errorBoundary?: {
        context?: 'auth' | 'dashboard' | 'general';
        pageName?: string;
    };
}

/**
 * Configuración centralizada de todas las rutas
 * Facilita el mantenimiento y la escalabilidad
 */
export const routesConfig: RouteConfig[] = [
    // Rutas públicas - Autenticación
    {
        path: '/login',
        element: <LoginPage />,
        layout: 'auth',
        errorBoundary: { context: 'auth', pageName: 'Login' },
    },
    {
        path: '/register',
        element: <RegisterPage />,
        layout: 'auth',
        errorBoundary: { context: 'auth', pageName: 'Register' },
    },

    // Rutas protegidas - Dashboard
    {
        path: '/dashboard',
        element: <DashboardPage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Dashboard' },
    },
    {
        path: '/profile',
        element: <ProfilePage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Profile' },
    },

    // Redirección por defecto
    {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
        layout: 'none',
    },

    // Ruta de error 404
    {
        path: '*',
        element: <ErrorPage />,
        layout: 'none',
    },
];


