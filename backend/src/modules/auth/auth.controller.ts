import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { requireAuth } from '../../utils/auth';
import * as authService from './auth.service';

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
            const tokens = await authService.login(body);
            
            if (!tokens.accessToken) {
                return error('Failed to generate access token', 500, undefined, origin);
            }
            
            // Crear cookies para los tokens
            const { createCookie } = await import('../../utils/response');
            const cookies: string[] = [];
            
            // Access token cookie (expira en 1 hora)
            // IMPORTANTE: secure=false para que funcione en localhost (HTTP)
            cookies.push(createCookie('accessToken', tokens.accessToken, {
                maxAge: tokens.expiresIn || 3600,
                httpOnly: true,
                secure: false, // false para localhost, cambiar a true en producción
                sameSite: 'Lax',
                path: '/',
            }));
            
            // Refresh token cookie (expira en 30 días)
            if (tokens.refreshToken) {
                cookies.push(createCookie('refreshToken', tokens.refreshToken, {
                    maxAge: 30 * 24 * 60 * 60, // 30 días
                    httpOnly: true,
                    secure: false, // false para localhost, cambiar a true en producción
                    sameSite: 'Lax',
                    path: '/',
                }));
            }
            
            // TEMPORAL: Enviar token en el body también porque API Gateway no está pasando cookies
            // Esto es menos seguro pero necesario hasta que resolvamos el problema de cookies
            return success({ 
                message: 'Login successful',
                token: tokens.accessToken, // TEMPORAL: para que el frontend pueda usarlo
            }, 200, cookies, origin);
        }

        // POST /auth/refresh
        if (path === '/auth/refresh' && httpMethod === 'POST') {
            // El refresh token viene de la cookie, no del body
            const cookieHeader = event.headers.Cookie || event.headers.cookie || '';
            const refreshTokenMatch = cookieHeader
                .split(';')
                .find(c => c.trim().startsWith('refreshToken='));
            
            const refreshToken = refreshTokenMatch?.split('=')[1]?.trim();
            
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
            
            cookies.push(createCookie('accessToken', tokens.accessToken, {
                maxAge: tokens.expiresIn || 3600,
                httpOnly: true,
                secure: false, // false para localhost
                sameSite: 'Lax',
                path: '/',
            }));
            
            // No retornar tokens en el body
            return success({ message: 'Token refreshed successfully' }, 200, cookies, origin);
        }

        // GET /auth/me
        if (path === '/auth/me' && httpMethod === 'GET') {
            try {
                const decoded = await requireAuth(event);
                console.log('GET /auth/me - Token decoded:', {
                    sub: decoded.sub,
                    email: decoded.email,
                    username: decoded['cognito:username'],
                });
                
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
        console.error('Auth controller error:', {
            error: errorMessage,
            stack: errorStack,
            path,
            httpMethod,
        });
        return error(errorMessage, 500, undefined, origin);
    }
};
