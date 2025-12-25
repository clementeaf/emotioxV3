import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { cognitoConfig } from '../config/cognito';
import { APIGatewayProxyEvent } from 'aws-lambda';

export type AuthErrorCode = 'NO_TOKEN' | 'INVALID_TOKEN';

/**
 * Represents an authentication error that should be returned as HTTP 401.
 */
export class AuthError extends Error {
    public readonly statusCode: number = 401;
    public readonly code: AuthErrorCode;

    /**
     * Creates an AuthError instance.
     * @param message - Human readable error message
     * @param code - Stable auth error code
     */
    constructor(message: string, code: AuthErrorCode) {
        super(message);
        this.name = 'AuthError';
        this.code = code;
    }
}

/**
 * Type guard for AuthError.
 * @param value - Unknown value
 * @returns True if value is an AuthError
 */
export const isAuthError = (value: unknown): value is AuthError => {
    return value instanceof AuthError;
};

// Inicializar jwksClient solo si Cognito está configurado
let client: ReturnType<typeof jwksClient> | null = null;

try {
    if (cognitoConfig.userPoolId) {
        client = jwksClient({
            jwksUri: `${cognitoConfig.issuer}/.well-known/jwks.json`,
        });
    }
} catch (error) {
    console.error('Error inicializando jwksClient:', error);
}

function getKey(
    header: { kid?: string; alg?: string },
    callback: (err: Error | null, key?: string) => void
): void {
    if (!client) {
        callback(new Error('Cognito no está configurado. jwksClient no inicializado.'));
        return;
    }
    
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err);
            return;
        }
        const signingKey = key?.getPublicKey();
        callback(null, signingKey);
    });
}

export interface DecodedToken {
    sub: string;
    email: string;
    'cognito:username': string;
    [key: string]: string | number | boolean | undefined;
}

export const verifyToken = (token: string): Promise<DecodedToken> => {
    return new Promise((resolve, reject) => {
        if (!cognitoConfig.userPoolId) {
            reject(new Error('Cognito no está configurado. COGNITO_USER_POOL_ID es requerido.'));
            return;
        }
        
        if (!client) {
            reject(new Error('jwksClient no está inicializado. Cognito no está configurado correctamente.'));
            return;
        }
        
        try {
            jwt.verify(
                token,
                getKey,
                {
                    issuer: cognitoConfig.issuer,
                    algorithms: ['RS256'],
                },
                (err, decoded) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(decoded as DecodedToken);
                    }
                }
            );
        } catch (error) {
            reject(error instanceof Error ? error : new Error('Error verificando token'));
        }
    });
};

export const getUserFromToken = async (token: string): Promise<DecodedToken> => {
    try {
        const decoded = await verifyToken(token);
        return decoded;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('getUserFromToken error:', {
            error: errorMessage,
            tokenLength: token.length,
            tokenPreview: token.substring(0, 20) + '...',
        });
        throw new AuthError('Invalid or expired token', 'INVALID_TOKEN');
    }
};

/**
 * Extrae el token de las cookies o del header Authorization
 */
const extractToken = (event: APIGatewayProxyEvent): string | null => {
    // API Gateway puede enviar cookies en diferentes formatos
    // Intentar todos los posibles nombres de headers
    const cookieHeaders = [
        event.headers.Cookie,
        event.headers.cookie,
        event.headers['Cookie'],
        event.headers['cookie'],
        // API Gateway también puede usar multiValueHeaders
        event.multiValueHeaders?.Cookie?.[0],
        event.multiValueHeaders?.cookie?.[0],
    ].filter(Boolean) as string[];

    // Log para debugging
    console.log('Extracting token - Available headers:', {
        hasCookie: !!event.headers.Cookie || !!event.headers.cookie,
        hasMultiValueCookie: !!event.multiValueHeaders?.Cookie || !!event.multiValueHeaders?.cookie,
        cookieHeaders: cookieHeaders.length,
        allHeaders: Object.keys(event.headers),
    });

    // Buscar en todos los headers de cookies
    for (const cookies of cookieHeaders) {
        if (!cookies) continue;
        
        // Dividir por punto y coma y buscar accessToken
        const cookieParts = cookies.split(';');
        for (const cookie of cookieParts) {
            const trimmed = cookie.trim();
            if (trimmed.startsWith('accessToken=')) {
                const token = trimmed.substring('accessToken='.length).trim();
                if (token) {
                    console.log('Token found in cookies, length:', token.length);
                    return token;
                }
            }
        }
    }
    
    // Fallback a Authorization header (para compatibilidad)
    const authHeaders = [
        event.headers.Authorization,
        event.headers.authorization,
        event.headers['Authorization'],
        event.headers['authorization'],
    ].filter(Boolean) as string[];

    for (const authHeader of authHeaders) {
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring('Bearer '.length).trim();
            if (token) {
                console.log('Token found in Authorization header, length:', token.length);
                return token;
            }
        }
    }
    
    console.log('No token found in cookies or Authorization header');
    return null;
};

export const requireAuth = async (event: APIGatewayProxyEvent): Promise<DecodedToken> => {
    if (!cognitoConfig.userPoolId || !cognitoConfig.clientId) {
        throw new Error('Cognito no está configurado. Configure COGNITO_USER_POOL_ID y COGNITO_CLIENT_ID.');
    }
    
    const token = extractToken(event);

    if (!token) {
        throw new AuthError('No token provided', 'NO_TOKEN');
    }

    try {
        return await getUserFromToken(token);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido al verificar token';
        console.error('requireAuth error:', {
            error: errorMessage,
            hasToken: !!token,
            tokenLength: token.length,
            cognitoConfigured: !!cognitoConfig.userPoolId,
        });
        if (isAuthError(error)) {
            throw error;
        }
        throw new AuthError('Invalid or expired token', 'INVALID_TOKEN');
    }
};
