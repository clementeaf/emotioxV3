/**
 * Genera headers CORS basados en el origen de la petición
 * Cuando se usan cookies (withCredentials), NO se puede usar '*'
 * Debe ser el origen específico
 */
export const getCorsHeaders = (origin?: string | null): Record<string, string> => {
    // Lista de orígenes permitidos (desarrollo y producción)
    const allowedOrigins = [
        // Development - Local
        'http://localhost:12500',  // research-frontend local
        'http://localhost:12600',  // participant-frontend local
        'http://localhost:3000',   // backend local / legacy
        'http://localhost:5173',   // vite default port
        'http://localhost:5174',   // vite alternative port
        
        // Production - Domains
        'https://research.useremotion.com',
        'https://participant.useremotion.com',
        'https://useremotion.com',
        'https://www.useremotion.com',
        
        // Production - S3/CloudFront (agregar IDs específicos si los tienes)
        // Formato: 'https://[DISTRIBUTION-ID].cloudfront.net'
        // Ejemplo: 'https://d1234567890abc.cloudfront.net',
    ];

    // Si hay un origen y está en la lista permitida, usarlo
    // Si no hay origen o no está permitido, usar el primero de la lista (localhost por defecto)
    const allowedOrigin = origin && allowedOrigins.includes(origin)
        ? origin
        : allowedOrigins[0];

    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    };
};

/**
 * Genera headers para cookies httpOnly
 * API Gateway REST API requiere multiValueHeaders para múltiples cookies
 */
const getCookieHeaders = (cookies: string[], origin?: string | null): {
    headers: Record<string, string>;
    multiValueHeaders?: Record<string, string[]>;
} => {
    const corsHeaders = getCorsHeaders(origin);
    const result: {
        headers: Record<string, string>;
        multiValueHeaders?: Record<string, string[]>;
    } = {
        headers: { ...corsHeaders },
    };
    
    // API Gateway REST API requiere multiValueHeaders para múltiples Set-Cookie
    if (cookies.length > 0) {
        result.multiValueHeaders = {
            'Set-Cookie': cookies,
        };
    }
    
    return result;
};

/**
 * Crea una cookie httpOnly segura
 */
export const createCookie = (
    name: string,
    value: string,
    options: {
        maxAge?: number; // en segundos
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: 'Strict' | 'Lax' | 'None';
        path?: string;
        domain?: string;
    } = {}
): string => {
    const {
        maxAge,
        httpOnly = true,
        // En desarrollo, NO usar Secure porque localhost no es HTTPS
        // En producción, usar Secure
        secure = false, // Cambiado: false para permitir cookies en localhost
        sameSite = 'Lax',
        path = '/',
        domain, // No establecer domain para que funcione en cualquier dominio
    } = options;

    let cookie = `${name}=${value}`;

    if (maxAge) {
        cookie += `; Max-Age=${maxAge}`;
    }

    if (path) {
        cookie += `; Path=${path}`;
    }

    // NO establecer domain para que funcione en localhost y en el dominio de producción
    // Si se establece domain, las cookies solo funcionarán en ese dominio específico

    if (httpOnly) {
        cookie += '; HttpOnly';
    }

    if (secure) {
        cookie += '; Secure';
    }

    cookie += `; SameSite=${sameSite}`;

    return cookie;
};

export const success = <T>(
    data: T,
    statusCode: number = 200,
    cookies?: string[],
    origin?: string | null
) => {
    if (cookies && cookies.length > 0) {
        const cookieHeaders = getCookieHeaders(cookies, origin);
        return {
            statusCode,
            headers: cookieHeaders.headers,
            multiValueHeaders: cookieHeaders.multiValueHeaders,
            body: JSON.stringify(data),
        };
    }
    
    return {
        statusCode,
        headers: getCorsHeaders(origin),
        body: JSON.stringify(data),
    };
};

export const error = (
    message: string,
    statusCode: number = 400,
    cookies?: string[],
    origin?: string | null
) => {
    if (cookies && cookies.length > 0) {
        const cookieHeaders = getCookieHeaders(cookies, origin);
        return {
            statusCode,
            headers: cookieHeaders.headers,
            multiValueHeaders: cookieHeaders.multiValueHeaders,
            body: JSON.stringify({ error: message }),
        };
    }
    
    return {
        statusCode,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({ error: message }),
    };
};
