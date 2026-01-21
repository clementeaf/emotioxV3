import React, { Component, type ReactNode } from 'react';
import { PageErrorFallbackWrapper } from './PageErrorFallback';

interface PageErrorBoundaryProps {
    children: ReactNode;
    pageName?: string;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface PageErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary specific for individual pages
 * Allows isolating errors at page level
 */
export class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
    constructor(props: PageErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<PageErrorBoundaryState> {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error(`[PageErrorBoundary] [${this.props.pageName || 'unknown'}] ERROR CAUGHT:`, error);
        console.error(`[PageErrorBoundary] Error message:`, error.message);
        console.error(`[PageErrorBoundary] Error stack:`, error.stack);
        console.error(`[PageErrorBoundary] Error name:`, error.name);
        console.error(`[PageErrorBoundary] ErrorInfo:`, errorInfo);
        console.error(`[PageErrorBoundary] Component stack:`, errorInfo.componentStack);
        
        this.setState({
            error,
            errorInfo,
        });

        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
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
                <PageErrorFallbackWrapper
                    error={this.state.error}
                    errorInfo={this.state.errorInfo}
                    pageName={this.props.pageName}
                    onReset={this.handleReset}
                />
            );
        }

        return this.props.children;
    }
}



