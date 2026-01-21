import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';

interface PageErrorFallbackProps {
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
    pageName?: string;
    onReset: () => void;
}

/**
 * Wrapper funcional para usar hooks de React Router
 */
export const PageErrorFallbackWrapper: React.FC<Omit<PageErrorFallbackProps, 'navigate'>> = (props) => {
    const navigate = useNavigate();
    return <PageErrorFallback {...props} navigate={navigate} />;
};

interface PageErrorFallbackPropsWithHooks extends Omit<PageErrorFallbackProps, 'navigate'> {
    navigate: ReturnType<typeof useNavigate>;
}

/**
 * Fallback component for page errors
 */
const PageErrorFallback: React.FC<PageErrorFallbackPropsWithHooks> = ({ error, errorInfo, pageName, onReset, navigate }) => {
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

                    {error && (
                        <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-md">
                            <h3 className="text-sm font-semibold text-red-800 mb-2">Error details:</h3>
                            <pre className="text-xs text-red-700 overflow-auto max-h-48">
                                <code>{error.toString()}</code>
                            </pre>
                            {error.stack && (
                                <details className="mt-2">
                                    <summary className="text-xs text-red-600 cursor-pointer">Stack trace</summary>
                                    <pre className="text-xs text-red-600 overflow-auto max-h-32 mt-1">
                                        <code>{error.stack}</code>
                                    </pre>
                                </details>
                            )}
                        </div>
                    )}
                    {errorInfo && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <h3 className="text-sm font-semibold text-yellow-800 mb-2">Component stack:</h3>
                            <pre className="text-xs text-yellow-700 overflow-auto max-h-32">
                                <code>{errorInfo.componentStack}</code>
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
