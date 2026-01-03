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

    // Validar que Cognito esté configurado
    if (!cognitoConfig.clientId || !cognitoConfig.userPoolId) {
        throw new Error('Cognito no está configurado. Por favor, configure COGNITO_CLIENT_ID y COGNITO_USER_POOL_ID en las variables de entorno.');
    }

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

export const getMe = async (cognitoSub: string, username?: string, emailFromToken?: string) => {
    try {
        if (!cognitoSub) {
            throw new Error('cognitoSub is required');
        }

        const query = `
            SELECT id, email, role, first_name, last_name, created_at, updated_at
            FROM users
            WHERE cognito_sub = $1 AND deleted_at IS NULL
        `;
        const result = await pool.query(query, [cognitoSub]);

        if (result.rows.length > 0) {
            return result.rows[0];
        }

        console.log(`[AuthService] User not found in DB for sub ${cognitoSub}, attempting to sync...`);

        // Use email from token if available, otherwise fetch from Cognito
        let email = emailFromToken;
        let firstName: string | undefined;
        let lastName: string | undefined;

        if (!email) {
            try {
                console.log(`[AuthService] No email in token, fetching from Cognito using username: ${username || cognitoSub}`);
                // Use username for AdminGetUser, not sub
                const adminGetUserCommand = new AdminGetUserCommand({
                    UserPoolId: cognitoConfig.userPoolId,
                    Username: username || cognitoSub,
                });
                const cognitoUser = await cognitoClient.send(adminGetUserCommand);

                email = cognitoUser.UserAttributes?.find(a => a.Name === 'email')?.Value;
                firstName = cognitoUser.UserAttributes?.find(a => a.Name === 'given_name')?.Value;
                lastName = cognitoUser.UserAttributes?.find(a => a.Name === 'family_name')?.Value;
            } catch (cognitoError) {
                console.error('[AuthService] Failed to fetch user from Cognito:', cognitoError);
                throw new Error(`User not found for cognito_sub: ${cognitoSub} and failed to sync`);
            }
        }

        if (!email) {
            console.error('[AuthService] No email found for user', cognitoSub);
            throw new Error(`User not found for cognito_sub: ${cognitoSub} (No Email)`);
        }

        console.log(`[AuthService] Syncing user ${email} to DB...`);

        // Check if cognito_sub already exists (to avoid duplicate key error)
        const subCheckQuery = 'SELECT id, email, role, first_name, last_name, created_at, updated_at FROM users WHERE cognito_sub = $1';
        const subCheck = await pool.query(subCheckQuery, [cognitoSub]);
        
        if (subCheck.rows.length > 0) {
            console.log(`[AuthService] User already exists with cognito_sub ${cognitoSub}`);
            return subCheck.rows[0];
        }

        // Check if user exists by email (to avoid duplicate key error if sub mismatch)
        const emailCheckQuery = 'SELECT id, cognito_sub FROM users WHERE email = $1';
        const emailCheck = await pool.query(emailCheckQuery, [email]);

        if (emailCheck.rows.length > 0) {
            const existingUser = emailCheck.rows[0];
            // If the existing user has a different cognito_sub, we can't update it (would violate unique constraint)
            if (existingUser.cognito_sub && existingUser.cognito_sub !== cognitoSub) {
                console.error(`[AuthService] User with email ${email} already exists with different cognito_sub: ${existingUser.cognito_sub}`);
                throw new Error(`User with email ${email} already exists with different Cognito identity`);
            }
            
            // Update cognito_sub if it's null or matches
            console.log(`[AuthService] User exists by email ${email}, updating cognito_sub...`);
            const updateSubQuery = `
                UPDATE users 
                SET cognito_sub = $1, deleted_at = NULL 
                WHERE email = $2 AND (cognito_sub IS NULL OR cognito_sub = $1)
                RETURNING id, email, role, first_name, last_name, created_at, updated_at
            `;
            const updateResult = await pool.query(updateSubQuery, [cognitoSub, email]);
            
            if (updateResult.rows.length > 0) {
                return updateResult.rows[0];
            }
            
            // If update didn't affect any rows, user might have been created by another request
            // Try to fetch again
            const retryQuery = 'SELECT id, email, role, first_name, last_name, created_at, updated_at FROM users WHERE cognito_sub = $1';
            const retryResult = await pool.query(retryQuery, [cognitoSub]);
            if (retryResult.rows.length > 0) {
                return retryResult.rows[0];
            }
        }

        // Create new user with ON CONFLICT handling
        const insertQuery = `
            INSERT INTO users (email, cognito_sub, role, first_name, last_name)
            VALUES ($1, $2, 'researcher', $3, $4)
            ON CONFLICT ON CONSTRAINT users_cognito_sub_key DO UPDATE SET
                deleted_at = NULL,
                email = EXCLUDED.email,
                first_name = COALESCE(EXCLUDED.first_name, users.first_name),
                last_name = COALESCE(EXCLUDED.last_name, users.last_name)
            RETURNING id, email, role, first_name, last_name, created_at, updated_at
        `;
        
        try {
            const insertResult = await pool.query(insertQuery, [email, cognitoSub, firstName, lastName]);
            console.log(`[AuthService] User synced successfully: ${insertResult.rows[0].id}`);
            return insertResult.rows[0];
        } catch (insertError: unknown) {
            // If insert fails due to duplicate key, try to fetch the existing user
            const errorMessage = insertError instanceof Error ? insertError.message : 'Unknown error';
            if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
                console.log(`[AuthService] Duplicate key detected, fetching existing user...`);
                const fetchQuery = 'SELECT id, email, role, first_name, last_name, created_at, updated_at FROM users WHERE cognito_sub = $1';
                const fetchResult = await pool.query(fetchQuery, [cognitoSub]);
                if (fetchResult.rows.length > 0) {
                    return fetchResult.rows[0];
                }
            }
            throw insertError;
        }

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to get user';
        console.error('GetMe error:', {
            error: errorMessage,
            cognitoSub,
            errorType: error instanceof Error ? error.constructor.name : typeof error,
        });
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
