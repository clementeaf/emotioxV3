import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { getStats, clearAll, clearByPattern } from './cache.service';

export const handleCacheRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;

    try {
        // GET /cache/stats - Get cache statistics
        if (path === '/cache/stats' && httpMethod === 'GET') {
            const stats = getStats();
            return success(stats);
        }

        // DELETE /cache/clear - Clear all caches (admin only)
        if (path === '/cache/clear' && httpMethod === 'DELETE') {
            clearAll();
            return success({ message: 'All caches cleared successfully' });
        }

        // DELETE /cache/pattern - Clear caches by pattern (admin only)
        if (path === '/cache/pattern' && httpMethod === 'DELETE') {
            const body = JSON.parse(event.body || '{}');
            const { pattern } = body;
            
            if (!pattern) {
                return error('Pattern is required', 400);
            }
            
            const count = clearByPattern(pattern);
            return success({ 
                message: `Cleared ${count} cache entries`,
                count 
            });
        }

        return error('Cache route not found', 404);
    } catch (err: any) {
        console.error('Cache controller error:', err);
        return error(err.message || 'Internal server error', 500);
    }
};
