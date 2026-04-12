import React from 'react';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo): void {
        console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
    }

    render(): React.ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="fixed inset-0 flex items-center justify-center bg-white p-6">
                    <div className="text-center max-w-md">
                        <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            An unexpected error occurred. Your responses have been saved up to this point.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Reload page
                        </button>
                        {this.state.error && (
                            <p className="mt-4 text-xs text-gray-400 font-mono break-all">
                                {this.state.error.message}
                            </p>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
