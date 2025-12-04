import React, { Component, type ReactNode } from 'react';
import { RouteErrorFallbackWrapper } from './RouteErrorFallback';

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



