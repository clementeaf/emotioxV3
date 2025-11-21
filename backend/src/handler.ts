import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { route } from './router';
import { error } from './utils/response';

export const handler = async (
    event: APIGatewayProxyEvent,
    context: Context
): Promise<APIGatewayProxyResult> => {
    // Enable connection reuse for Lambda
    context.callbackWaitsForEmptyEventLoop = false;

    try {
        return await route(event);
    } catch (err: any) {
        console.error('Handler error:', err);
        return error(err.message || 'Internal server error', 500);
    }
};
