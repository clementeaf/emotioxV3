import React, { Component, type ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';

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



