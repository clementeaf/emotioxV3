import React, { Component, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';

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
        this.setState({
            error,
            errorInfo,
        });

        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        console.error(`PageErrorBoundary [${this.props.pageName || 'unknown'}] caught an error:`, error, errorInfo);
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

interface PageErrorFallbackProps {
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
    pageName?: string;
    onReset: () => void;
}

/**
 * Wrapper funcional para usar hooks de React Router
 */
const PageErrorFallbackWrapper: React.FC<Omit<PageErrorFallbackProps, 'navigate'>> = (props) => {
    const navigate = useNavigate();
    return <PageErrorFallback {...props} navigate={navigate} />;
};

interface PageErrorFallbackPropsWithHooks extends Omit<PageErrorFallbackProps, 'navigate'> {
    navigate: ReturnType<typeof useNavigate>;
}

/**
 * Fallback component for page errors
 */
const PageErrorFallback: React.FC<PageErrorFallbackPropsWithHooks> = ({ error, pageName, onReset, navigate }) => {
    const isDevelopment = import.meta.env.DEV;

    return (
        <div className="min-h-[400px] flex items-center justify-center px-4 py-12">
            <div className="max-w-xl w-full">
                <div className="bg-white rounded-lg shadow-md p-6 border border-red-200">
                    <div className="flex items-center justify-center mb-4">
                        <AlertTriangle className="h-12 w-12 text-red-500" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
                        Error on {pageName || 'this page'}
                    </h2>

                    <p className="text-gray-600 text-center mb-6">
                        An error occurred while loading this page. You can try reloading or going back.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button onClick={onReset} size="sm" className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Retry
                        </Button>
                        <Button
                            onClick={() => navigate(-1)}
                            variant="outline"
                            size="sm"
                            className="flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Go Back
                        </Button>
                    </div>

                    {isDevelopment && error && (
                        <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-md">
                            <h3 className="text-sm font-semibold text-red-800 mb-2">Error details:</h3>
                            <pre className="text-xs text-red-700 overflow-auto max-h-48">
                                <code>{error.toString()}</code>
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

