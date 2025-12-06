import {
    CognitoIdentityProviderClient,
    SignUpCommand,
    InitiateAuthCommand,
    AdminSetUserPasswordCommand,
    AdminGetUserCommand,
    InitiateAuthCommandInput,
} from '@aws-sdk/client-cognito-identity-provider';
import pool from '../../config/database';
import { cognitoConfig } from '../../config/cognito';

const cognitoClient = new CognitoIdentityProviderClient({
    region: cognitoConfig.region,
});

export interface RegisterData {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: 'admin' | 'researcher';
}

export interface LoginData {
    email: string;
    password: string;
}

export interface RefreshTokenData {
    refreshToken: string;
}

export const register = async (data: RegisterData) => {
    const { email, password, firstName, lastName, role = 'researcher' } = data;

    try {
        // 1. Create user in Cognito
        const signUpCommand = new SignUpCommand({
            ClientId: cognitoConfig.clientId,
            Username: email,
            Password: password,
            UserAttributes: [
                { Name: 'email', Value: email },
                ...(firstName ? [{ Name: 'given_name', Value: firstName }] : []),
                ...(lastName ? [{ Name: 'family_name', Value: lastName }] : []),
            ],
        });

        let signUpResult;
        let cognitoSub: string;

        try {
            signUpResult = await cognitoClient.send(signUpCommand);
            cognitoSub = signUpResult.UserSub!;
        } catch (cognitoError: unknown) {
            // Si el usuario ya existe en Cognito, intentar obtenerlo
            if (cognitoError && typeof cognitoError === 'object' && 'name' in cognitoError) {
                const errorName = (cognitoError as { name?: string }).name;
                if (errorName === 'UsernameExistsException' || errorName === 'AliasExistsException') {
                    // Usuario ya existe, obtener su información
                    const getUserCommand = new AdminGetUserCommand({
                        UserPoolId: cognitoConfig.userPoolId,
                        Username: email,
                    });
                    const getUserResult = await cognitoClient.send(getUserCommand);
                    cognitoSub = getUserResult.Username || email;
                    
                    // Verificar si el usuario ya existe en la base de datos
                    const existingUserQuery = `
                        SELECT id, email, role, first_name, last_name, created_at
                        FROM users
                        WHERE email = $1 OR cognito_sub = $2
                        LIMIT 1
                    `;
                    const existingUser = await pool.query(existingUserQuery, [email, cognitoSub]);
                    
                    if (existingUser.rows.length > 0) {
                        // Usuario ya existe, retornar información existente
                        return existingUser.rows[0];
                    }
                } else {
                    throw cognitoError;
                }
            } else {
                throw cognitoError;
            }
        }

        // 2. Auto-confirm user (for development) - solo si es un usuario nuevo
        if (signUpResult) {
            const setPasswordCommand = new AdminSetUserPasswordCommand({
                UserPoolId: cognitoConfig.userPoolId,
                Username: email,
                Password: password,
                Permanent: true,
            });
            await cognitoClient.send(setPasswordCommand);
        }

        // 3. Create user in database (solo si no existe)
        const checkUserQuery = `
            SELECT id, email, role, first_name, last_name, created_at
            FROM users
            WHERE email = $1 OR cognito_sub = $2
            LIMIT 1
        `;
        const existingUser = await pool.query(checkUserQuery, [email, cognitoSub]);
        
        if (existingUser.rows.length > 0) {
            return existingUser.rows[0];
        }

        const insertQuery = `
            INSERT INTO users (email, cognito_sub, role, first_name, last_name)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, email, role, first_name, last_name, created_at
        `;
        const result = await pool.query(insertQuery, [email, cognitoSub, role, firstName, lastName]);

        return result.rows[0];
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to register user';
        console.error('Register error:', error);
        throw new Error(errorMessage);
    }
};

export const login = async (data: LoginData) => {
    const { email, password } = data;

    try {
        const authCommand = new InitiateAuthCommand({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: cognitoConfig.clientId,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password,
            },
        });

        const authResult = await cognitoClient.send(authCommand);

        if (!authResult.AuthenticationResult) {
            throw new Error('Authentication failed');
        }

        return {
            accessToken: authResult.AuthenticationResult.AccessToken,
            idToken: authResult.AuthenticationResult.IdToken,
            refreshToken: authResult.AuthenticationResult.RefreshToken,
            expiresIn: authResult.AuthenticationResult.ExpiresIn,
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to login';
        console.error('Login error:', error);
        throw new Error(errorMessage);
    }
};

export const getMe = async (cognitoSub: string) => {
    try {
        const query = `
      SELECT id, email, role, first_name, last_name, created_at, updated_at
      FROM users
      WHERE cognito_sub = $1 AND deleted_at IS NULL
    `;
        const result = await pool.query(query, [cognitoSub]);

        if (result.rows.length === 0) {
            throw new Error('User not found');
        }

        return result.rows[0];
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to get user';
        console.error('GetMe error:', error);
        throw new Error(errorMessage);
    }
};
// New interface for updating user profile
export interface UpdateUserData {
    first_name?: string;
    last_name?: string;
    email?: string;
}

// Update user profile by Cognito sub
export const updateUser = async (cognitoSub: string, data: UpdateUserData) => {
    try {
        const fields: string[] = [];
        const values: (string | undefined)[] = [];
        let idx = 1;
        if (data.first_name !== undefined) {
            fields.push(`first_name = $${idx++}`);
            values.push(data.first_name);
        }
        if (data.last_name !== undefined) {
            fields.push(`last_name = $${idx++}`);
            values.push(data.last_name);
        }
        if (data.email !== undefined) {
            fields.push(`email = $${idx++}`);
            values.push(data.email);
        }
        if (fields.length === 0) {
            throw new Error('No fields to update');
        }
        values.push(cognitoSub);
        const query = `
            UPDATE users SET ${fields.join(', ')} WHERE cognito_sub = $${idx} RETURNING id, email, role, first_name, last_name, created_at, updated_at
        `;
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to update user';
        console.error('UpdateUser error:', error);
        throw new Error(message);
    }
};
export const refreshToken = async (data: RefreshTokenData) => {
    const { refreshToken } = data;

    try {
        const authCommand = new InitiateAuthCommand({
            AuthFlow: 'REFRESH_TOKEN_AUTH',
            ClientId: cognitoConfig.clientId,
            AuthParameters: {
                REFRESH_TOKEN: refreshToken,
            },
        } as InitiateAuthCommandInput);

        const authResult = await cognitoClient.send(authCommand);

        if (!authResult.AuthenticationResult) {
            throw new Error('Token refresh failed');
        }

        return {
            accessToken: authResult.AuthenticationResult.AccessToken,
            idToken: authResult.AuthenticationResult.IdToken,
            expiresIn: authResult.AuthenticationResult.ExpiresIn,
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to refresh token';
        console.error('Refresh token error:', error);
        throw new Error(errorMessage);
    }
};

export const deleteAccount = async (cognitoSub: string) => {
    try {
        const query = `
      UPDATE users
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE cognito_sub = $1 AND deleted_at IS NULL
      RETURNING id
    `;
        const result = await pool.query(query, [cognitoSub]);

        if (result.rows.length === 0) {
            throw new Error('User not found');
        }

        return { message: 'Account deleted successfully' };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to delete account';
        console.error('DeleteAccount error:', error);
        throw new Error(message);
    }
};
