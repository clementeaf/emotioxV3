import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/Button';

interface ErrorFallbackProps {
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
    onReset: () => void;
    onGoHome: () => void;
}

/**
 * Componente de fallback que se muestra cuando ocurre un error
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, errorInfo, onReset, onGoHome }) => {
    const isDevelopment = import.meta.env.DEV;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-2xl w-full">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="flex items-center justify-center mb-6">
                        <AlertTriangle className="h-16 w-16 text-red-500" />
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">
                        Something went wrong
                    </h1>

                    <p className="text-gray-600 text-center mb-8">
                        We're sorry, an unexpected error occurred. Please try reloading the page
                        or go back to the home page.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                        <Button onClick={onReset} className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Try again
                        </Button>
                        <Button
                            onClick={onGoHome}
                            variant="outline"
                            className="flex items-center justify-center gap-2"
                        >
                            <Home className="h-4 w-4" />
                            Go to home
                        </Button>
                    </div>

                    {isDevelopment && error && (
                        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-md">
                            <h2 className="text-lg font-semibold text-red-800 mb-2">
                                Error details (development only):
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
