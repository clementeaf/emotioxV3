import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { graphqlHandler } from './graphql';
import { route } from './router'; // Mantenemos el router REST por si acaso, o para migración gradual
import { error } from './utils/response';

export const handler = async (
    event: APIGatewayProxyEvent,
    context: Context
): Promise<APIGatewayProxyResult> => {
    // Enable connection reuse for Lambda
    context.callbackWaitsForEmptyEventLoop = false;

    try {
        // Enrutamiento simple: Si empieza con /graphql, usa Yoga
        if (event.path.startsWith('/graphql')) {
            return await graphqlHandler(event, context);
        }

        // Si no, usa el router REST existente (para mantener compatibilidad mientras migramos)
        return await route(event);
    } catch (err: any) {
        console.error('Handler error:', err);
        const origin = event.headers.Origin || event.headers.origin || null;
        return error(err.message || 'Internal server error', 500, undefined, origin);
    }
};
