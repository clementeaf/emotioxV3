import * as authService from '../../modules/auth/auth.service';
import { createCookie } from '../../utils/response';
import { GraphQLContext } from '../context';

// Helper to handle cookie attributes consistent with controller
const resolveCookieAttributes = (origin: string | undefined) => {
    const raw = origin || '';
    const isLocal =
        raw.includes('http://localhost') ||
        raw.includes('http://127.0.0.1') ||
        raw.includes('http://0.0.0.0');

    if (isLocal) {
        return { secure: false, sameSite: 'Lax' as const };
    }
    return { secure: true, sameSite: 'None' as const };
};

export const resolvers = {
    Mutation: {
        login: async (_: any, { input }: any, context: GraphQLContext) => {
            const { email, password, rememberMe } = input;
            const tokens = await authService.login({ email, password });

            if (!tokens.accessToken) {
                throw new Error('Failed to generate access token');
            }

            // Get user info to return
            const user = await authService.getMe(tokens.idToken ? (await import('jsonwebtoken')).decode(tokens.idToken)?.sub as string : '');
            // Better: authService.login returns tokens. We need to fetch user.
            // Wait, we need the sub. In the controller we don't return the User object on login usually?
            // Controller returns { message, token, refreshToken, expiresIn }.
            // OUR SCHEMA requires 'user'.
            // So we must fetch the user.
            // 'tokens' has 'idToken'. Decode it to get sub.
            const jwt = await import('jsonwebtoken');
            // @ts-ignore
            const decodedId = jwt.decode(tokens.idToken) as { sub: string };
            const fetchedUser = await authService.getMe(decodedId.sub);


            // Set Cookies
            const origin = context.event.headers.Origin || context.event.headers.origin;
            const cookieAttrs = resolveCookieAttributes(origin);
            const cookies: string[] = [];

            cookies.push(createCookie('accessToken', tokens.accessToken, {
                maxAge: tokens.expiresIn || 3600,
                httpOnly: true,
                secure: cookieAttrs.secure,
                sameSite: cookieAttrs.sameSite,
                path: '/',
            }));

            if (tokens.refreshToken) {
                cookies.push(createCookie('refreshToken', tokens.refreshToken, {
                    maxAge: rememberMe ? 30 * 24 * 60 * 60 : undefined,
                    httpOnly: true,
                    secure: cookieAttrs.secure,
                    sameSite: cookieAttrs.sameSite,
                    path: '/',
                }));
            }

            // Pass headers to context
            // Note: Our handler needs to look for 'Set-Cookie' or multiValueHeaders logic
            // Since Set-Cookie can appear multiple times, in headers object it usually needs array if supported,
            // or we use a custom property.
            context.responseHeaders['Set-Cookie'] = cookies;

            return {
                user: fetchedUser,
                message: 'Login successful'
            };
        },

        register: async (_: any, { input }: any, context: GraphQLContext) => {
            const user = await authService.register(input);
            return {
                user,
                message: 'Registration successful'
            };
        },

        logout: async (_: any, __: any, context: GraphQLContext) => {
            const cookies: string[] = [
                createCookie('accessToken', '', { maxAge: 0 }),
                createCookie('refreshToken', '', { maxAge: 0 }),
            ];
            context.responseHeaders['Set-Cookie'] = cookies;
            return true;
        }
    },

    Query: {
        me: async (_: any, __: any, context: GraphQLContext) => {
            // We need to implement requireAuth logic similar to utils/auth.ts
            // but reading from context.event
            // Ideally we reuse utils/auth logic.
            const { requireAuth } = await import('../../utils/auth');
            try {
                const decoded = await requireAuth(context.event);
                const user = await authService.getMe(decoded.sub);
                return user;
            } catch (e) {
                return null; // Or throw, depending on if we want null or error. Schema says 'User' nullable.
            }
        }
    }
};
