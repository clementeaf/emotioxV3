/**
 * Genera headers CORS basados en el origen de la petición
 * Cuando se usan cookies (withCredentials), NO se puede usar '*'
 * Debe ser el origen específico
 */
export const getCorsHeaders = (origin?: string | null): Record<string, string> => {
    // Lista de orígenes permitidos (desarrollo y producción)
    // Incluye CloudFront URLs para research-frontend y participant-frontend
    const allowedOrigins = [
        // Development - Local
        'http://localhost:12500',  // research-frontend local
        'http://localhost:12600',  // participant-frontend local
        'http://localhost:3000',   // backend local / legacy
        'http://localhost:5173',   // vite default port
        'http://localhost:5174',   // vite alternative port

        // Production - Domains (new subdomain structure)
        'https://portal.emotiox.org',      // research-frontend production
        'https://app.emotiox.org',         // participant-frontend production

        // Production - Domains (legacy)
        'https://research.useremotion.com',
        'https://participant.useremotion.com',
        'https://research.emotiox.org',
        'https://participant.emotiox.org',
        'https://useremotion.com',
        'https://www.useremotion.com',

        // Production - CloudFront
        'https://d2mgq2ppntnjct.cloudfront.net',  // research-frontend
        'https://d2am10cly7c9kf.cloudfront.net',  // participant-frontend
    ];

    // Si hay un origen y está en la lista permitida, usarlo
    // También aceptar cualquier subdominio de emotiox.org o useremotion.com
    let allowedOrigin: string;
    if (origin && (allowedOrigins.includes(origin) ||
                   origin.endsWith('.emotiox.org') ||
                   origin.endsWith('.useremotion.com'))) {
        allowedOrigin = origin;
    } else {
        allowedOrigin = allowedOrigins[0];
    }

    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,Cookie,Set-Cookie,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
        'Access-Control-Expose-Headers': 'Set-Cookie',
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
        secure = options.secure !== undefined ? options.secure : false, // Usar el valor pasado o false por defecto
        sameSite = options.sameSite || 'Lax', // Usar el valor pasado o 'Lax' por defecto
        path = '/',
        domain, // Domain puede ser especificado explícitamente
    } = options;

    let cookie = `${name}=${value}`;

    if (maxAge) {
        cookie += `; Max-Age=${maxAge}`;
    }

    if (path) {
        cookie += `; Path=${path}`;
    }

    // Establecer domain para compartir cookies entre subdominios
    // Si no se especifica domain explícitamente, usar .emotiox.org para producción
    // Esto permite que las cookies funcionen entre portal.emotiox.org, app.emotiox.org, server.emotiox.org, etc.
    if (domain) {
        cookie += `; Domain=${domain}`;
    } else if (secure && sameSite === 'None') {
        // Solo establecer domain compartido en producción (HTTPS + SameSite=None)
        // Esto permite compartir cookies entre subdominios de emotiox.org
        cookie += `; Domain=.emotiox.org`;
    }
    // En localhost, no establecer domain para que funcione correctamente

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
