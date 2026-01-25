import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { error } from '../../utils/response';
import { monitorSSEService } from './monitor-sse.service';
import crypto from 'crypto';
import { verifyToken } from '../../utils/auth.local';

/**
 * Controller for SSE monitor endpoints
 * Handles Server-Sent Events connections for real-time research monitoring
 */
export const handleSSEConnection = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const { httpMethod, path, queryStringParameters, headers } = event;
        const origin = headers.origin || headers.Origin || null;

        // Extract researchId from path: /monitor/events/:researchId
        const researchIdMatch = path.match(/\/monitor\/events\/([^/]+)/);
        const researchId = researchIdMatch ? researchIdMatch[1] : null;

        if (!researchId) {
            return error('Research ID is required', 400, undefined, origin);
        }

        // Verify authentication token
        const token = queryStringParameters?.token;
        if (!token) {
            return error('Authentication token is required', 401, undefined, origin);
        }

        try {
            const decoded = await verifyToken(token);
            const userId = decoded.sub;

            // For Express/cPanel integration, this will be handled differently
            // This controller is for Lambda/serverless environment
            // The actual SSE connection will be managed by Express middleware
            
            // Generate unique connection ID
            const connectionId = crypto.randomUUID();

            // Return connection info (actual SSE handling is done by Express)
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin || '*',
                    'Access-Control-Allow-Credentials': 'true',
                },
                body: JSON.stringify({
                    message: 'SSE endpoint ready',
                    connectionId,
                    researchId
                })
            };
        } catch (authError) {
            console.error('Token verification failed:', authError);
            return error('Invalid or expired token', 401, undefined, origin);
        }

    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Internal server error';
        console.error('Monitor SSE error:', errorMessage);
        return error(errorMessage, 500);
    }
};
