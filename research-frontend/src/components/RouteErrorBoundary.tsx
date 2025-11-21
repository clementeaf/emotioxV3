import React, { Component, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';

interface RouteErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    context?: 'auth' | 'dashboard' | 'general';
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface RouteErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary specific for routes
 * Allows isolating errors by application section
 */
export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
    constructor(props: RouteErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        this.setState({
            error,
            errorInfo,
        });

        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        console.error(`RouteErrorBoundary [${this.props.context || 'general'}] caught an error:`, error, errorInfo);
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return <>{this.props.fallback}</>;
            }

            return (
                <RouteErrorFallbackWrapper
                    error={this.state.error}
                    errorInfo={this.state.errorInfo}
                    context={this.props.context}
                    onReset={this.handleReset}
                />
            );
        }

        return this.props.children;
    }
}

interface RouteErrorFallbackProps {
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
    context?: 'auth' | 'dashboard' | 'general';
    onReset: () => void;
}

/**
 * Wrapper funcional para usar hooks de React Router
 */
const RouteErrorFallbackWrapper: React.FC<Omit<RouteErrorFallbackProps, 'navigate' | 'location'>> = (props) => {
    const navigate = useNavigate();
    const location = useLocation();
    return <RouteErrorFallback {...props} navigate={navigate} location={location} />;
};

interface RouteErrorFallbackPropsWithHooks extends Omit<RouteErrorFallbackProps, 'navigate' | 'location'> {
    navigate: ReturnType<typeof useNavigate>;
    location: ReturnType<typeof useLocation>;
}

/**
 * Route-specific fallback component
 * Adapts message according to context
 */
const RouteErrorFallback: React.FC<RouteErrorFallbackPropsWithHooks> = ({ error, errorInfo, context, onReset, navigate, location }) => {
    const isDevelopment = import.meta.env.DEV;

    const getContextualMessage = (): { title: string; message: string; actionLabel: string } => {
        switch (context) {
            case 'auth':
                return {
                    title: 'Authentication Error',
                    message: 'An error occurred while loading the authentication page. Please try again.',
                    actionLabel: 'Go to Login',
                };
            case 'dashboard':
                return {
                    title: 'Dashboard Error',
                    message: 'An error occurred while loading this section. You can try reloading or navigating to another page.',
                    actionLabel: 'Go to Dashboard',
                };
            default:
                return {
                    title: 'Something went wrong',
                    message: 'An unexpected error occurred on this page. Please try again.',
                    actionLabel: 'Go Back',
                };
        }
    };

    const { title, message, actionLabel } = getContextualMessage();

    const handleGoBack = (): void => {
        if (context === 'auth') {
            navigate('/login');
        } else if (context === 'dashboard') {
            navigate('/dashboard');
        } else {
            navigate(-1);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-2xl w-full">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="flex items-center justify-center mb-6">
                        <AlertTriangle className="h-16 w-16 text-red-500" />
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">{title}</h1>

                    <p className="text-gray-600 text-center mb-8">{message}</p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                        <Button onClick={onReset} className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Intentar de nuevo
                        </Button>
                        <Button
                            onClick={handleGoBack}
                            variant="outline"
                            className="flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {actionLabel}
                        </Button>
                    </div>

                    {isDevelopment && error && (
                        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-md">
                            <h2 className="text-lg font-semibold text-red-800 mb-2">
                                Error details (development only):
                            </h2>
                            <div className="text-xs text-gray-500 mb-2">
                                Route: {location.pathname} | Context: {context || 'general'}
                            </div>
                            <pre className="text-sm text-red-700 overflow-auto max-h-64">
                                <code>{error.toString()}</code>
                                {errorInfo && (
                                    <div className="mt-2">
                                        <strong>Stack trace:</strong>
                                        <pre className="mt-1 whitespace-pre-wrap">
                                            {errorInfo.componentStack}
                                        </pre>
                                    </div>
                                )}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

