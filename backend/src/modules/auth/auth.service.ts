import {
    CognitoIdentityProviderClient,
    SignUpCommand,
    InitiateAuthCommand,
    AdminGetUserCommand,
    AdminSetUserPasswordCommand,
    AdminUpdateUserAttributesCommand,
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

        const signUpResult = await cognitoClient.send(signUpCommand);
        const cognitoSub = signUpResult.UserSub!;

        // 2. Auto-confirm user (for development)
        const setPasswordCommand = new AdminSetUserPasswordCommand({
            UserPoolId: cognitoConfig.userPoolId,
            Username: email,
            Password: password,
            Permanent: true,
        });
        await cognitoClient.send(setPasswordCommand);

        // 3. Create user in database
        const query = `
      INSERT INTO users (email, cognito_sub, role, first_name, last_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, role, first_name, last_name, created_at
    `;
        const result = await pool.query(query, [email, cognitoSub, role, firstName, lastName]);

        return result.rows[0];
    } catch (error: any) {
        console.error('Register error:', error);
        throw new Error(error.message || 'Failed to register user');
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

export const deleteAccount = async (userId: string) => {
    try {
        const query = `
      UPDATE users
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `;
        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            throw new Error('User not found');
        }

        return { message: 'Account deleted successfully' };
    } catch (error: any) {
        console.error('DeleteAccount error:', error);
        throw new Error(error.message || 'Failed to delete account');
    }
};
