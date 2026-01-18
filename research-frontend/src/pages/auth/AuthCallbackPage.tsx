import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

/**
 * OAuth callback page for handling tokens passed via URL (localhost development only)
 * In production, tokens are handled via httpOnly cookies
 */
export const AuthCallbackPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setToken, bootstrapSession } = useAuthStore();

    useEffect(() => {
        const handleCallback = async () => {
            const token = searchParams.get('token');
            const refreshToken = searchParams.get('refreshToken');

            if (token) {
                // Save tokens to localStorage for local development
                localStorage.setItem('auth_token', token);
                if (refreshToken) {
                    localStorage.setItem('auth_refresh_token', refreshToken);
                }
                localStorage.setItem('auth_remember_me', 'true');

                // Update store
                setToken(token);

                // Bootstrap session to get user data
                await bootstrapSession();

                // Redirect to dashboard
                navigate('/dashboard', { replace: true });
            } else {
                // No token, redirect to login
                navigate('/login', { replace: true });
            }
        };

        handleCallback();
    }, [searchParams, setToken, bootstrapSession, navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Completing sign in...</p>
            </div>
        </div>
    );
};
