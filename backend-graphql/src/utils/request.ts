import type { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Extracts the request origin from API Gateway headers.
 * @param event - API Gateway event
 * @returns Origin string if present, otherwise null
 */
export const getRequestOrigin = (event: APIGatewayProxyEvent): string | null => {
    const originHeader: string | undefined =
        (event.headers?.Origin as string | undefined) ?? (event.headers?.origin as string | undefined);
    return originHeader ?? null;
};


