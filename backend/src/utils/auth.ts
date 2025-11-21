import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { cognitoConfig } from '../config/cognito';
import { APIGatewayProxyEvent } from 'aws-lambda';

const client = jwksClient({
    jwksUri: `${cognitoConfig.issuer}/.well-known/jwks.json`,
});

function getKey(header: any, callback: any) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err);
            return;
        }
        const signingKey = key?.getPublicKey();
        callback(null, signingKey);
    });
}

export interface DecodedToken {
    sub: string;
    email: string;
    'cognito:username': string;
    [key: string]: any;
}

export const verifyToken = (token: string): Promise<DecodedToken> => {
    return new Promise((resolve, reject) => {
        jwt.verify(
            token,
            getKey,
            {
                issuer: cognitoConfig.issuer,
                algorithms: ['RS256'],
            },
            (err, decoded) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(decoded as DecodedToken);
                }
            }
        );
    });
};

export const getUserFromToken = async (token: string): Promise<DecodedToken> => {
    try {
        const decoded = await verifyToken(token);
        return decoded;
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};

export const requireAuth = async (event: APIGatewayProxyEvent): Promise<DecodedToken> => {
    const authHeader = event.headers.Authorization || event.headers.authorization;

    if (!authHeader) {
        throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
        throw new Error('No token provided');
    }

    return await getUserFromToken(token);
};
