import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { ErrorPage } from '../pages/ErrorPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ResearchPage } from '../pages/research/ResearchPage';
import { ResearchBuilderPage } from '../pages/research/ResearchBuilderPage';
import { ResearchResultsPage } from '../pages/research/ResearchResultsPage';
import { ResearchProgressPage } from '../pages/research/ResearchProgressPage';
import { ModulesPage } from '../pages/modules/ModulesPage';
import { ModuleBuilderPage } from '../pages/modules/ModuleBuilderPage';
import { ResearchTypesPage } from '../pages/research-types/ResearchTypesPage';
import { ResearchTypeBuilderPage } from '../pages/research-types/ResearchTypeBuilderPage';
import { ModuleTemplateAssignationPage } from '../pages/research-types/ModuleTemplateAssignationPage';
import { ResearchTechniquesPage } from '../pages/research-techniques/ResearchTechniquesPage';
import { ResearchTechniqueBuilderPage } from '../pages/research-techniques/ResearchTechniqueBuilderPage';
import { UserManagementPage } from '../pages/admin/UserManagementPage';

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

    // Public Admin Routes (No Auth)
    {
        path: '/admin/users',
        element: <UserManagementPage />,
        layout: 'none',
        errorBoundary: { context: 'general', pageName: 'User Management' },
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
    {
        path: '/research/:id/builder',
        element: <ResearchBuilderPage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Research Builder' },
    },
    {
        path: '/research/:id/builder/settings',
        element: <ResearchBuilderPage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Research Settings' },
    },
    {
        path: '/research/:id/builder/module/:moduleId',
        element: <ResearchBuilderPage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Research Module Builder' },
    },
    {
        path: '/research/:id/builder/progress',
        element: <ResearchProgressPage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Research Progress' },
    },
    {
        path: '/research/:id/builder/results',
        element: <ResearchResultsPage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Research Results' },
    },
    {
        path: '/modules',
        element: <ModulesPage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Modules' },
    },
    {
        path: '/modules/new',
        element: <ModuleBuilderPage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Create Module' },
    },
    {
        path: '/modules/:id',
        element: <ModuleBuilderPage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Edit Module' },
    },
    {
        path: '/research-types',
        element: <ResearchTypesPage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Research Types' },
    },
    {
        path: '/research-types/new',
        element: <ResearchTypeBuilderPage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Create Research Type' },
    },
    {
        path: '/research-types/:id',
        element: <ResearchTypeBuilderPage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Edit Research Type' },
    },
    {
        path: '/research-types/:id/module-template-assignation',
        element: <ModuleTemplateAssignationPage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Assign Module Templates' },
    },
    {
        path: '/research-techniques',
        element: <ResearchTechniquesPage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Research Techniques' },
    },
    {
        path: '/research-techniques/new',
        element: <ResearchTechniqueBuilderPage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Create Research Technique' },
    },
    {
        path: '/research-techniques/:id',
        element: <ResearchTechniqueBuilderPage />,
        layout: 'dashboard',
        isProtected: true,
        errorBoundary: { context: 'dashboard', pageName: 'Edit Research Technique' },
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


