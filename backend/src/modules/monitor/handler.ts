import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { monitorService } from './monitor.service';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Configurar cliente JWKS (copiado de auth logic general)
// En un entorno serverless "puro", deberíamos inyectar esto o reutilizar un validador compartido
const client = jwksClient({
    jwksUri: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`
});

const getKey = (header: any, callback: any) => {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err, null);
        } else {
            const signingKey = key?.getPublicKey();
            callback(null, signingKey);
        }
    });
};

const verifyToken = (token: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, getKey, {}, (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });
};

export const handleSocket: APIGatewayProxyHandler = async (event) => {
    const { connectionId, eventType } = event.requestContext;
    const routeKey = event.requestContext.routeKey;

    try {
        if (routeKey === '$connect') {
            // Validar token y researchId
            const queryParams = event.queryStringParameters || {};
            const token = queryParams.token;
            const researchId = queryParams.researchId;

            if (!token || !researchId) {
                return { statusCode: 400, body: 'Missing token or researchId' };
            }

            // Validar JWT
            // Nota: En desarrollo local puede ser más laxo si el token es simulado, pero mantenemos rigurosidad
            try {
                // En un entorno de producción, validamos contra Cognito.
                // Para evitar timeouts en Lambda por cold-start de JWKS, a veces se usa un Authorizer Lambda separado.
                // Aquí lo hacemos inline por simplicidad dado el scope.
                // SI es localhost y token es "dev-token", lo permitimos para debugging rápido si fuera necesario, 
                // pero el frontend ya manda tokens reales.
                await verifyToken(token);

                // Decodificar payload para obtener userId si lo necesitamos
                // const decoded = jwt.decode(token) as any;
                // const userId = decoded.sub; 

                await monitorService.registerConnection(connectionId!, researchId);
                return { statusCode: 200, body: 'Connected' };

            } catch (err) {
                console.error('Token validation failed:', err);
                return { statusCode: 401, body: 'Unauthorized' };
            }
        }

        if (routeKey === '$disconnect') {
            await monitorService.removeConnection(connectionId!);
            return { statusCode: 200, body: 'Disconnected' };
        }

        return { statusCode: 200, body: 'Default route' };

    } catch (error) {
        console.error('WebSocket error:', error);
        return { statusCode: 500, body: 'Internal server error' };
    }
};
