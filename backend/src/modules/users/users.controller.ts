import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import * as usersService from './users.service';

export const handleUsersRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    const origin = event.headers.Origin || event.headers.origin || null;

    try {
        // GET /users
        if (path === '/users' && httpMethod === 'GET') {
            const users = await usersService.getAllUsers();
            return success({ users }, 200, undefined, origin);
        }

        // GET /users/:id
        const matchId = path.match(/^\/users\/([a-zA-Z0-9-]+)$/);
        if (matchId && httpMethod === 'GET') {
            const id = matchId[1];
            const user = await usersService.getUserById(id);
            if (!user) {
                return error('User not found', 404, undefined, origin);
            }
            return success({ user }, 200, undefined, origin);
        }

        // POST /users
        if (path === '/users' && httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            try {
                const user = await usersService.createUser({
                    email: body.email,
                    password: body.password,
                    first_name: body.first_name,
                    last_name: body.last_name,
                    role: body.role
                });
                return success({ user }, 201, undefined, origin);
            } catch (err) {
                return error(err instanceof Error ? err.message : 'Failed to create user', 400, undefined, origin);
            }
        }

        // PUT /users/:id
        if (matchId && httpMethod === 'PUT') {
            const id = matchId[1];
            const body = JSON.parse(event.body || '{}');
            try {
                const user = await usersService.updateUser(id, {
                    email: body.email,
                    first_name: body.first_name,
                    last_name: body.last_name,
                    role: body.role
                });
                return success({ user }, 200, undefined, origin);
            } catch (err) {
                return error(err instanceof Error ? err.message : 'Failed to update user', 400, undefined, origin);
            }
        }

        // DELETE /users/:id
        if (matchId && httpMethod === 'DELETE') {
            const id = matchId[1];
            try {
                const result = await usersService.deleteUser(id);
                return success(result, 200, undefined, origin);
            } catch (err) {
                return error(err instanceof Error ? err.message : 'Failed to delete user', 400, undefined, origin);
            }
        }

        return error('Route not found', 404, undefined, origin);
    } catch (err) {
        console.error('Users controller error:', err);
        return error('Internal server error', 500, undefined, origin);
    }
};
