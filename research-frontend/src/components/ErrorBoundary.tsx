import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/Button';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary para capturar errores de renderizado en componentes React
 * Muestra una UI de fallback cuando ocurre un error
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    /**
     * Método estático que se ejecuta cuando un error es capturado
     * @param error - Error capturado
     * @param errorInfo - Información adicional del error
     */
    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return {
            hasError: true,
            error,
        };
    }

    /**
     * Se ejecuta después de que un error es capturado
     * Útil para logging o reportar errores
     * @param error - Error capturado
     * @param errorInfo - Información adicional del error
     */
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        this.setState({
            error,
            errorInfo,
        });

        // Llamar callback personalizado si existe
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Log del error en consola (en producción podría enviarse a un servicio de logging)
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    /**
     * Resetea el estado del error boundary
     */
    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    /**
     * Redirige a la página de inicio
     */
    handleGoHome = (): void => {
        window.location.href = '/';
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Si hay un fallback personalizado, usarlo
            if (this.props.fallback) {
                return <>{this.props.fallback}</>;
            }

            // Renderizar UI de error por defecto
            return (
                <ErrorFallback
                    error={this.state.error}
                    errorInfo={this.state.errorInfo}
                    onReset={this.handleReset}
                    onGoHome={this.handleGoHome}
                />
            );
        }

        return this.props.children;
    }
}

interface ErrorFallbackProps {
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
    onReset: () => void;
    onGoHome: () => void;
}

/**
 * Componente de fallback que se muestra cuando ocurre un error
 */
const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, errorInfo, onReset, onGoHome }) => {
    const isDevelopment = import.meta.env.DEV;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-2xl w-full">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="flex items-center justify-center mb-6">
                        <AlertTriangle className="h-16 w-16 text-red-500" />
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">
                        Algo salió mal
                    </h1>

                    <p className="text-gray-600 text-center mb-8">
                        Lo sentimos, ha ocurrido un error inesperado. Por favor, intenta recargar la página
                        o regresa al inicio.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                        <Button onClick={onReset} className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Intentar de nuevo
                        </Button>
                        <Button
                            onClick={onGoHome}
                            variant="outline"
                            className="flex items-center justify-center gap-2"
                        >
                            <Home className="h-4 w-4" />
                            Ir al inicio
                        </Button>
                    </div>

                    {isDevelopment && error && (
                        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-md">
                            <h2 className="text-lg font-semibold text-red-800 mb-2">
                                Detalles del error (solo en desarrollo):
                            </h2>
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

