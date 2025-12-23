import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { isAuthError, requireAuth } from '../../utils/auth';
import * as authService from './auth.service';

type CookieSameSite = 'Lax' | 'None';

/**
 * Resolve cookie security attributes based on request origin.
 * - Localhost: allow HTTP cookies with SameSite=Lax.
 * - Non-local (HTTPS): use Secure + SameSite=None to allow cross-site XHR (frontend ↔ API).
 * @param origin - Request origin header
 * @returns Cookie attributes to apply
 */
const resolveCookieAttributes = (origin: string | null): { secure: boolean; sameSite: CookieSameSite } => {
    const raw = typeof origin === 'string' ? origin : '';
    const isLocal =
        raw.includes('http://localhost') ||
        raw.includes('http://127.0.0.1') ||
        raw.includes('http://0.0.0.0');

    if (isLocal) {
        return { secure: false, sameSite: 'Lax' };
    }

    return { secure: true, sameSite: 'None' };
};

export const handleAuthRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path, headers } = event;
    const origin = headers.Origin || headers.origin || null;

    try {
        // POST /auth/register
        if (path === '/auth/register' && httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const user = await authService.register(body);
            return success({ user }, 201, undefined, origin);
        }

        // POST /auth/login
        if (path === '/auth/login' && httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const rememberMe = typeof body.rememberMe === 'boolean' ? body.rememberMe : false;
            const tokens = await authService.login({ email: body.email, password: body.password });
            
            if (!tokens.accessToken) {
                return error('Failed to generate access token', 500, undefined, origin);
            }
            
            // Crear cookies para los tokens
            const { createCookie } = await import('../../utils/response');
            const cookies: string[] = [];
            const cookieAttrs = resolveCookieAttributes(origin);
            
            // Access token cookie (expira en 1 hora)
            cookies.push(createCookie('accessToken', tokens.accessToken, {
                maxAge: tokens.expiresIn || 3600,
                httpOnly: true,
                secure: cookieAttrs.secure,
                sameSite: cookieAttrs.sameSite,
                path: '/',
            }));
            
            // Refresh token cookie: persistent only when rememberMe=true, otherwise session cookie
            if (tokens.refreshToken) {
                cookies.push(createCookie('refreshToken', tokens.refreshToken, {
                    maxAge: rememberMe ? 30 * 24 * 60 * 60 : undefined, // 30 días o sesión
                    httpOnly: true,
                    secure: cookieAttrs.secure,
                    sameSite: cookieAttrs.sameSite,
                    path: '/',
                }));
            }
            
            // TEMPORAL: Enviar token en el body también porque API Gateway no está pasando cookies
            // Esto es menos seguro pero necesario hasta que resolvamos el problema de cookies
            return success({ 
                message: 'Login successful',
                token: tokens.accessToken, // TEMPORAL: para que el frontend pueda usarlo
                refreshToken: tokens.refreshToken,
                expiresIn: tokens.expiresIn,
            }, 200, cookies, origin);
        }

        // POST /auth/refresh
        if (path === '/auth/refresh' && httpMethod === 'POST') {
            // Prefer cookie refreshToken; fallback to body for clients that can't send cookies (e.g. cross-site).
            const cookieHeader = event.headers.Cookie || event.headers.cookie || '';
            const refreshTokenMatch = cookieHeader
                .split(';')
                .find(c => c.trim().startsWith('refreshToken='));
            
            const cookieRefreshToken = refreshTokenMatch?.split('=')[1]?.trim();
            const body = JSON.parse(event.body || '{}') as Record<string, unknown>;
            const bodyRefreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : undefined;
            const refreshToken = cookieRefreshToken || bodyRefreshToken;
            
            if (!refreshToken) {
                return error('Refresh token not found', 401, undefined, origin);
            }
            
            const tokens = await authService.refreshToken({ refreshToken: refreshToken });
            
            if (!tokens.accessToken) {
                return error('Failed to refresh access token', 500, undefined, origin);
            }
            
            // Actualizar cookies
            const { createCookie } = await import('../../utils/response');
            const cookies: string[] = [];
            const cookieAttrs = resolveCookieAttributes(origin);
            
            cookies.push(createCookie('accessToken', tokens.accessToken, {
                maxAge: tokens.expiresIn || 3600,
                httpOnly: true,
                secure: cookieAttrs.secure,
                sameSite: cookieAttrs.sameSite,
                path: '/',
            }));
            
            // Return access token for header-based clients
            return success({ message: 'Token refreshed successfully', token: tokens.accessToken, expiresIn: tokens.expiresIn }, 200, cookies, origin);
        }

        // GET /auth/me
        if (path === '/auth/me' && httpMethod === 'GET') {
            try {
                const decoded = await requireAuth(event);
                // Token decoded successfully, proceeding with request
                
                const user = await authService.getMe(decoded.sub);
                return success({ user }, 200, undefined, origin);
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error('GET /auth/me error:', {
                    error: errorMessage,
                    hasCookies: !!(event.headers.Cookie || event.headers.cookie),
                    hasAuthHeader: !!(event.headers.Authorization || event.headers.authorization),
                });
                throw error;
            }
        }
        // PUT /auth/me (update profile)
        if (path === '/auth/me' && httpMethod === 'PUT') {
            const decoded = await requireAuth(event);
            const body = JSON.parse(event.body || '{}');
            const updatedUser = await authService.updateUser(decoded.sub, body);
            return success({ user: updatedUser }, 200, undefined, origin);
        }
        // DELETE /auth/me
        if (path === '/auth/me' && httpMethod === 'DELETE') {
            const decoded = await requireAuth(event);
            const result = await authService.deleteAccount(decoded.sub);
            
            // Limpiar cookies al eliminar cuenta
            const { createCookie } = await import('../../utils/response');
            const cookies: string[] = [
                createCookie('accessToken', '', { maxAge: 0 }),
                createCookie('refreshToken', '', { maxAge: 0 }),
            ];
            
            return success(result, 200, cookies, origin);
        }
        
        // POST /auth/logout
        if (path === '/auth/logout' && httpMethod === 'POST') {
            // Limpiar cookies
            const { createCookie } = await import('../../utils/response');
            const cookies: string[] = [
                createCookie('accessToken', '', { maxAge: 0 }),
                createCookie('refreshToken', '', { maxAge: 0 }),
            ];
            
            return success({ message: 'Logged out successfully' }, 200, cookies, origin);
        }

        return error('Route not found', 404, undefined, origin);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        const errorStack = err instanceof Error ? err.stack : undefined;
        
        // Determinar código de error apropiado
        let statusCode = 500;
        if (isAuthError(err)) {
            statusCode = err.statusCode;
        }
        
        // Errores de autenticación (Cognito)
        if (errorMessage.includes('Incorrect username or password') ||
            errorMessage.includes('NotAuthorizedException') ||
            errorMessage.includes('UserNotFoundException')) {
            statusCode = 401;
        } else if (errorMessage.includes('User not found')) {
            statusCode = 404;
        } else if (errorMessage.includes('already exists') ||
                   errorMessage.includes('UsernameExistsException')) {
            statusCode = 409;
        } else if (errorMessage.includes('Invalid') ||
                   errorMessage.includes('required')) {
            statusCode = 400;
        }
        
        console.error('Auth controller error:', {
            error: errorMessage,
            stack: errorStack,
            statusCode,
            path,
            httpMethod,
        });
        
        return error(errorMessage, statusCode, undefined, origin);
    }
};
