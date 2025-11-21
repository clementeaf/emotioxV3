import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

/**
 * Página de error para errores de routing
 * Se muestra cuando ocurre un error en las rutas de React Router
 */
export const ErrorPage = () => {
    const error = useRouteError();

    let errorMessage = 'Ha ocurrido un error inesperado';
    let errorStatus = 500;

    if (isRouteErrorResponse(error)) {
        errorMessage = error.statusText || error.data?.message || errorMessage;
        errorStatus = error.status;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-2xl w-full">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="flex items-center justify-center mb-6">
                        <AlertTriangle className="h-16 w-16 text-red-500" />
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
                        Error {errorStatus}
                    </h1>

                    <p className="text-gray-600 text-center mb-8">{errorMessage}</p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/">
                            <Button className="flex items-center justify-center gap-2">
                                <Home className="h-4 w-4" />
                                Ir al inicio
                            </Button>
                        </Link>
                        <Link to="..">
                            <Button variant="outline" className="flex items-center justify-center gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Volver
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

