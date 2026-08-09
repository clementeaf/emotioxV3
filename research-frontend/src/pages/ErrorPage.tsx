import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

/**
 * Error page for routing errors
 * Displayed when an error occurs in React Router routes
 * Compatible with both BrowserRouter and data routers
 */
export const ErrorPage = () => {
    const location = useLocation();
    
    // Try to get error from location state (works with both router types)
    const error = location.state?.error as Error | { status?: number; statusText?: string; message?: string } | undefined;
    
    let errorMessage = 'Something went wrong';
    let errorStatus = 404;

    if (error) {
        if ('status' in error && error.status) {
            errorStatus = error.status;
            errorMessage = error.statusText || error.message || errorMessage;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'object' && 'message' in error) {
            errorMessage = String(error.message);
        }
    } else if (location.pathname !== '/') {
        // If no error in state but we're on a non-root path, it's likely a 404
        errorMessage = 'Page not found';
        errorStatus = 404;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-2xl w-full">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="flex items-center justify-center mb-6">
                        <AlertTriangle className="h-16 w-16 text-red-500" />
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
                        {errorStatus === 404 ? 'Page not found' : 'Something went wrong'}
                    </h1>

                    <p className="text-gray-600 text-center mb-8">
                        {errorMessage || 'We\'re sorry, an unexpected error occurred. Please try reloading the page or go back to the home page.'}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/">
                            <Button className="flex items-center justify-center gap-2">
                                <Home className="h-4 w-4" />
                                Go to home
                            </Button>
                        </Link>
                        <Button 
                            variant="outline" 
                            className="flex items-center justify-center gap-2"
                            onClick={() => window.history.back()}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Go back
                        </Button>
                        <Button 
                            variant="outline" 
                            className="flex items-center justify-center gap-2"
                            onClick={() => window.location.reload()}
                        >
                            <AlertTriangle className="h-4 w-4" />
                            Try again
                        </Button>
                    </div>
                    
                    {import.meta.env.DEV && error && (
                        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <h3 className="text-sm font-semibold text-red-800 mb-2">
                                Error details (development only):
                            </h3>
                            <pre className="text-xs text-red-700 overflow-auto max-h-64">
                                {error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

