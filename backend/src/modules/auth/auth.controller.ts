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
    const { httpMethod, path, headers, requestContext } = event;
    const origin = headers.Origin || headers.origin || null;

    // Build API base URL from request context or environment
    const getApiBaseUrl = async (): Promise<string> => {
        // Try to get from SSM Parameter Store first
        try {
            const { loadSsmParameters } = await import('../../config/ssm');
            const ssmPrefix = process.env.SSM_PREFIX || `/emotioxv3/${process.env.API_STAGE || 'dev'}`;
            const ssmRegion = process.env.SSM_REGION || process.env.AWS_REGION || 'us-east-1';

            const ssmParams = await loadSsmParameters({
                names: ['API_BASE_URL'],
                prefix: ssmPrefix,
                region: ssmRegion
            });

            if (ssmParams.API_BASE_URL) {
                return ssmParams.API_BASE_URL;
            }
        } catch (error) {
            console.warn('Failed to load API_BASE_URL from SSM:', error);
        }

        // Fallback to environment variable
        if (process.env.API_BASE_URL) {
            return process.env.API_BASE_URL;
        }

        // Build from request context (API Gateway)
        if (requestContext?.domainName) {
            // Determine protocol: check X-Forwarded-Proto header first, then requestContext
            let protocol = 'https';
            const forwardedProto = headers['X-Forwarded-Proto'] || headers['x-forwarded-proto'];
            if (forwardedProto && (forwardedProto === 'http' || forwardedProto === 'https')) {
                protocol = forwardedProto;
            } else if (requestContext.protocol && requestContext.protocol !== 'HTTP/1.1') {
                protocol = requestContext.protocol;
            }

            const domainName = requestContext.domainName;

            // Custom domains (like server.emotiox.org) don't include stage in path
            // API Gateway URLs (like *.execute-api.*.amazonaws.com) do include stage
            if (domainName.includes('.execute-api.') || domainName.includes('.amazonaws.com')) {
                // API Gateway URL - include stage
                if (requestContext.stage) {
                    return `${protocol}://${domainName}/${requestContext.stage}`;
                }
            }
            // Custom domain - don't include stage
            return `${protocol}://${domainName}`;
        }

        // Fallback to origin if available
        if (origin) {
            return origin.replace(/\/$/, '');
        }

        // Last resort: construct from environment
        const region = process.env.APP_AWS_REGION || 'us-east-1';
        const stage = process.env.API_STAGE || 'dev';
        // This is a fallback and may not be accurate
        return `https://api.execute-api.${region}.amazonaws.com/${stage}`;
    };

    // Get frontend URL from SSM or use origin
    const getFrontendUrl = async (overrideOrigin?: string | null): Promise<string> => {
        // Use override origin if provided
        const targetOrigin = overrideOrigin || origin;

        // First, try to use origin if available (most reliable)
        if (targetOrigin) {
            // Keep localhost for development
            if (targetOrigin.includes('localhost') || targetOrigin.includes('127.0.0.1')) {
                return targetOrigin.replace(/\/$/, '');
            }

            // If origin is a known frontend domain, use it
            if (targetOrigin.includes('portal.emotiox.org') || targetOrigin.includes('app.emotiox.org') ||
                targetOrigin.includes('research.emotiox.org') || targetOrigin.includes('participant.emotiox.org') ||
                targetOrigin.includes('useremotion.com')) {
                return targetOrigin.replace(/\/$/, '');
            }
        }

        // Try to load from SSM Parameter Store
        try {
            const { loadSsmParameters } = await import('../../config/ssm');
            const ssmPrefix = process.env.SSM_PREFIX || `/emotioxv3/${process.env.API_STAGE || 'dev'}`;
            const ssmRegion = process.env.SSM_REGION || process.env.AWS_REGION || 'us-east-1';

            const ssmParams = await loadSsmParameters({
                names: ['RESEARCH_FRONTEND_URL', 'PARTICIPANT_FRONTEND_URL'],
                prefix: ssmPrefix,
                region: ssmRegion
            });

            // Prefer RESEARCH_FRONTEND_URL (portal.emotiox.org) as default
            if (ssmParams.RESEARCH_FRONTEND_URL) {
                return ssmParams.RESEARCH_FRONTEND_URL;
            }
            if (ssmParams.PARTICIPANT_FRONTEND_URL) {
                return ssmParams.PARTICIPANT_FRONTEND_URL;
            }
        } catch (error) {
            console.warn('Failed to load FRONTEND_URL from SSM:', error);
        }

        // Fallback to environment variable
        if (process.env.FRONTEND_URL) {
            return process.env.FRONTEND_URL;
        }

        // Last resort: use origin if available, otherwise use production URL
        if (targetOrigin) {
            return targetOrigin.replace(/\/$/, '');
        }

        // Default to production research frontend
        return 'https://portal.emotiox.org';
    };

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
                maxAge: tokens.expiresIn || 86400, // 24 hours
                httpOnly: true,
                secure: cookieAttrs.secure,
                sameSite: cookieAttrs.sameSite,
                path: '/',
            }));

            // Refresh token cookie: persistent only when rememberMe=true, otherwise session cookie
            if (tokens.refreshToken) {
                cookies.push(createCookie('refreshToken', tokens.refreshToken, {
                    maxAge: rememberMe ? 2 * 24 * 60 * 60 : undefined, // 2 días (48 horas) o sesión - matches Cognito RefreshTokenValidity
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

            try {
                const tokens = await authService.refreshToken({ refreshToken: refreshToken });

                if (!tokens.accessToken) {
                    return error('Failed to refresh access token', 500, undefined, origin);
                }

                // Actualizar cookies
                const { createCookie } = await import('../../utils/response');
                const cookies: string[] = [];
                const cookieAttrs = resolveCookieAttributes(origin);

                cookies.push(createCookie('accessToken', tokens.accessToken, {
                    maxAge: tokens.expiresIn || 86400, // 24 hours
                    httpOnly: true,
                    secure: cookieAttrs.secure,
                    sameSite: cookieAttrs.sameSite,
                    path: '/',
                }));

                // Return access token for header-based clients
                return success({ message: 'Token refreshed successfully', token: tokens.accessToken, expiresIn: tokens.expiresIn }, 200, cookies, origin);
            } catch (serviceError: unknown) {
                // Si el refresh token expiró o es inválido, devolver 401
                const errorMessage = serviceError instanceof Error ? serviceError.message : 'Failed to refresh token';
                const statusCode = (serviceError as Error & { statusCode?: number }).statusCode || 500;

                if (statusCode === 401 || errorMessage.includes('expired') || errorMessage.includes('invalid')) {
                    return error('Refresh token expired or invalid', 401, undefined, origin);
                }

                return error(errorMessage, statusCode, undefined, origin);
            }
        }

        // GET /auth/me
        if (path === '/auth/me' && httpMethod === 'GET') {
            try {
                const decoded = await requireAuth(event);
                // Token decoded successfully, proceeding with request

                const username = decoded['cognito:username'] || decoded.sub;
                const email = decoded.email;
                const user = await authService.getMe(decoded.sub, username, email);
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

        // GET /auth/google - Initiate Google OAuth flow
        if (path === '/auth/google' && httpMethod === 'GET') {
            // Build Cognito Hosted UI URL with Google as identity provider
            // This requires Google to be configured as an Identity Provider in Cognito User Pool
            let cognitoDomain = process.env.COGNITO_DOMAIN;
            const clientId = process.env.COGNITO_CLIENT_ID;

            // Try to load COGNITO_DOMAIN from SSM if not in environment
            if (!cognitoDomain) {
                try {
                    const { loadSsmParameters } = await import('../../config/ssm');
                    const ssmPrefix = process.env.SSM_PREFIX || `/emotioxv3/${process.env.API_STAGE || 'dev'}`;
                    const ssmRegion = process.env.SSM_REGION || process.env.AWS_REGION || 'us-east-1';

                    const ssmParams = await loadSsmParameters({
                        names: ['COGNITO_DOMAIN'],
                        prefix: ssmPrefix,
                        region: ssmRegion
                    });

                    cognitoDomain = ssmParams.COGNITO_DOMAIN;
                } catch (error) {
                    console.warn('Failed to load COGNITO_DOMAIN from SSM:', error);
                }
            }

            if (!cognitoDomain || !clientId) {
                return error(
                    'Google OAuth not configured. Please set COGNITO_DOMAIN and COGNITO_CLIENT_ID in SSM Parameter Store.',
                    500,
                    undefined,
                    origin
                );
            }

            // Build redirect URI - must match exactly what's configured in Cognito
            // Use the API Gateway base URL for the callback
            const apiBaseUrl = await getApiBaseUrl();
            const redirectUri = `${apiBaseUrl}/auth/google/callback`;
            const encodedRedirectUri = encodeURIComponent(redirectUri);

            // Pass origin in state parameter so we can use it in callback
            // Priority: 1. redirect_origin query param (most reliable for browser navigation)
            //           2. Origin header
            //           3. Referer header
            const queryParams = event.queryStringParameters || {};
            let safeOrigin = queryParams.redirect_origin ? decodeURIComponent(queryParams.redirect_origin) : null;

            if (!safeOrigin) {
                safeOrigin = origin;
            }

            if (!safeOrigin) {
                const referer = headers.Referer || headers.referer;
                if (referer) {
                    try {
                        const refererUrl = new URL(referer);
                        safeOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
                    } catch (e) {
                        // Invalid referer URL, ignore
                    }
                }
            }

            const state = safeOrigin ? encodeURIComponent(safeOrigin) : '';

            // Cognito Hosted UI URL with Google identity provider
            let cognitoUrl = `https://${cognitoDomain}/oauth2/authorize?` +
                `identity_provider=Google&` +
                `redirect_uri=${encodedRedirectUri}&` +
                `response_type=CODE&` +
                `client_id=${clientId}&` +
                `scope=openid+email+profile`;

            // Add state parameter if we have origin
            if (state) {
                cognitoUrl += `&state=${state}`;
            }

            // Return redirect response
            return {
                statusCode: 302,
                headers: {
                    'Location': cognitoUrl,
                    'Access-Control-Allow-Origin': origin || '*',
                    'Access-Control-Allow-Credentials': 'true',
                },
                body: '',
            };
        }

        // GET /auth/google/callback - Handle Google OAuth callback
        if (path === '/auth/google/callback' && httpMethod === 'GET') {
            const queryParams = event.queryStringParameters || {};
            const code = queryParams.code;
            const errorParam = queryParams.error;
            const state = queryParams.state;

            // Try to get origin from state parameter (passed from initial OAuth request)
            // This is the most reliable way since Cognito redirects don't include Origin header
            let effectiveOrigin = origin;
            if (!effectiveOrigin && state) {
                try {
                    effectiveOrigin = decodeURIComponent(state);
                } catch (e) {
                    console.warn('Failed to decode state parameter:', e);
                }
            }

            // Fallback: Try to get origin from Referer header if still not available
            if (!effectiveOrigin) {
                const referer = headers.Referer || headers.referer;
                if (referer) {
                    try {
                        const refererUrl = new URL(referer);
                        effectiveOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
                    } catch (e) {
                        // Invalid referer URL, ignore
                    }
                }
            }

            if (errorParam) {
                const errorDescription = queryParams.error_description || 'OAuth error';
                // Redirect to frontend login page with error
                // Use effectiveOrigin (from Origin or Referer) for getFrontendUrl
                const frontendUrl = await getFrontendUrl(effectiveOrigin);
                return {
                    statusCode: 302,
                    headers: {
                        'Location': `${frontendUrl}/login?error=${encodeURIComponent(errorDescription)}`,
                        'Access-Control-Allow-Origin': effectiveOrigin || origin || '*',
                    },
                    body: '',
                };
            }

            if (!code) {
                return error('Authorization code not provided', 400, undefined, origin);
            }

            // Exchange authorization code for tokens using Cognito
            try {
                let cognitoDomain = process.env.COGNITO_DOMAIN;
                const clientId = process.env.COGNITO_CLIENT_ID;

                // Try to load COGNITO_DOMAIN from SSM if not in environment
                if (!cognitoDomain) {
                    try {
                        const { loadSsmParameters } = await import('../../config/ssm');
                        const ssmPrefix = process.env.SSM_PREFIX || `/emotioxv3/${process.env.API_STAGE || 'dev'}`;
                        const ssmRegion = process.env.SSM_REGION || process.env.AWS_REGION || 'us-east-1';

                        const ssmParams = await loadSsmParameters({
                            names: ['COGNITO_DOMAIN'],
                            prefix: ssmPrefix,
                            region: ssmRegion
                        });

                        cognitoDomain = ssmParams.COGNITO_DOMAIN;
                    } catch (error) {
                        console.warn('Failed to load COGNITO_DOMAIN from SSM:', error);
                    }
                }

                if (!cognitoDomain || !clientId) {
                    return error('Cognito not configured', 500, undefined, origin);
                }

                // Get client secret from SSM if app client requires it
                let clientSecret: string | undefined;
                try {
                    const { loadSsmParameters } = await import('../../config/ssm');
                    const ssmPrefix = process.env.SSM_PREFIX || `/emotioxv3/${process.env.API_STAGE || 'dev'}`;
                    const ssmRegion = process.env.SSM_REGION || process.env.AWS_REGION || 'us-east-1';

                    const ssmParams = await loadSsmParameters({
                        names: ['COGNITO_CLIENT_SECRET'],
                        prefix: ssmPrefix,
                        region: ssmRegion
                    });

                    clientSecret = ssmParams.COGNITO_CLIENT_SECRET;
                } catch (error) {
                    // Client secret is optional - only needed if app client requires secret
                    console.log('COGNITO_CLIENT_SECRET not found in SSM, assuming app client does not require secret');
                }

                // Build redirect URI - must match exactly what was used in authorization
                const apiBaseUrl = await getApiBaseUrl();
                const redirectUri = `${apiBaseUrl}/auth/google/callback`;

                // Exchange code for tokens
                const tokenUrl = `https://${cognitoDomain}/oauth2/token`;
                const tokenParams = new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: clientId,
                    code: code,
                    redirect_uri: redirectUri,
                });

                // Add client_secret only if app client requires it
                if (clientSecret) {
                    tokenParams.append('client_secret', clientSecret);
                }

                const tokenResponse = await fetch(tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: tokenParams.toString(),
                });

                if (!tokenResponse.ok) {
                    const errorText = await tokenResponse.text();
                    console.error('Token exchange failed:', errorText);
                    throw new Error('Failed to exchange authorization code for tokens');
                }

                const tokenData = await tokenResponse.json() as {
                    access_token?: string;
                    id_token?: string;
                    refresh_token?: string;
                    expires_in?: number;
                };
                const accessToken = tokenData.access_token;
                const idToken = tokenData.id_token;
                const refreshToken = tokenData.refresh_token;

                if (!accessToken || !idToken) {
                    throw new Error('Tokens not received from Cognito');
                }

                // Decode ID token to get user info (without verification for now, will be verified by getMe)
                // The ID token from Cognito is already verified by Cognito
                const jwt = await import('jsonwebtoken');
                const decodedToken = jwt.decode(idToken) as {
                    sub?: string;
                    email?: string;
                    given_name?: string;
                    family_name?: string;
                    name?: string;
                    preferred_username?: string;
                } | null;

                if (!decodedToken || !decodedToken.sub) {
                    throw new Error('Invalid ID token: missing sub claim');
                }

                const cognitoSub = decodedToken.sub;
                const email = decodedToken.email;
                const firstName = decodedToken.given_name;
                const lastName = decodedToken.family_name;
                const username = decodedToken.preferred_username;

                // Get or create user in database
                // Pass email, username, firstName, and lastName from token to enable automatic user creation
                const user = await authService.getMe(cognitoSub, username, email, firstName, lastName);

                // Create cookies for tokens
                const { createCookie } = await import('../../utils/response');
                const cookies: string[] = [];
                const cookieAttrs = resolveCookieAttributes(effectiveOrigin || origin);

                // Access token cookie (24 hours = 86400 seconds)
                cookies.push(createCookie('accessToken', accessToken, {
                    maxAge: tokenData.expires_in || 86400,
                    httpOnly: true,
                    secure: cookieAttrs.secure,
                    sameSite: cookieAttrs.sameSite,
                    path: '/',
                }));

                // Refresh token cookie (if provided) - 2 days (48 hours) to match Cognito configuration
                if (refreshToken) {
                    cookies.push(createCookie('refreshToken', refreshToken, {
                        maxAge: 2 * 24 * 60 * 60, // 2 days (48 hours) - matches Cognito RefreshTokenValidity
                        httpOnly: true,
                        secure: cookieAttrs.secure,
                        sameSite: cookieAttrs.sameSite,
                        path: '/',
                    }));
                }

                // Redirect to frontend dashboard with success
                // API Gateway requires multiValueHeaders for multiple Set-Cookie headers
                const frontendUrl = await getFrontendUrl(effectiveOrigin);

                // For localhost, pass tokens in URL since cross-site cookies don't work with HTTP
                // This is less secure but necessary for local development
                const isLocalhost = frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1');
                let redirectUrl = `${frontendUrl}/dashboard`;

                if (isLocalhost) {
                    // Pass tokens as URL parameters for localhost (will be captured by frontend)
                    const params = new URLSearchParams();
                    params.set('token', accessToken);
                    if (refreshToken) {
                        params.set('refreshToken', refreshToken);
                    }
                    redirectUrl = `${frontendUrl}/auth/callback?${params.toString()}`;
                }

                const responseHeaders: Record<string, string> = {
                    'Location': redirectUrl,
                    'Access-Control-Allow-Origin': effectiveOrigin || origin || '*',
                    'Access-Control-Allow-Credentials': 'true',
                };

                const response: APIGatewayProxyResult = {
                    statusCode: 302,
                    headers: responseHeaders,
                    body: '',
                };

                // Add cookies via multiValueHeaders for API Gateway
                // For production (non-localhost), cookies will work properly
                if (cookies.length > 0) {
                    response.multiValueHeaders = {
                        'Set-Cookie': cookies,
                    };
                }

                return response;
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to complete Google OAuth';
                console.error('Google OAuth callback error:', err);
                const frontendUrl = await getFrontendUrl(effectiveOrigin);
                return {
                    statusCode: 302,
                    headers: {
                        'Location': `${frontendUrl}/login?error=${encodeURIComponent(errorMessage)}`,
                        'Access-Control-Allow-Origin': origin || '*',
                    },
                    body: '',
                };
            }
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
