import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { ErrorPage } from '../pages/ErrorPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ResearchPage } from '../pages/research/ResearchPage';

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
 * Centralized configuration of all routes
 * Facilitates maintenance and scalability
 */
export const routesConfig: RouteConfig[] = [
    // Public routes - Authentication
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

    // Protected routes - Dashboard
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
    {
        path: '/research',
        element: <ResearchPage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Research' },
    },

    // Default redirect
    {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
        layout: 'none',
    },

    // 404 error route
    {
        path: '*',
        element: <ErrorPage />,
        layout: 'none',
    },
];


