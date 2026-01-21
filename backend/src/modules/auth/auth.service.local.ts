/**
 * Servicio de autenticación local (cPanel)
 * Reemplaza Cognito con JWT local + bcrypt
 */

import pool from '../../config/database';
import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');

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

/**
 * Genera un ID único para el usuario (equivalente a cognito_sub)
 */
const generateUserSub = (): string => {
    return uuidv4();
};

/**
 * Registra un nuevo usuario
 */
export const register = async (data: RegisterData) => {
    const { email, password, firstName, lastName, role = 'researcher' } = data;
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
    }
    
    // Validar password
    if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }
    
    try {
        // Verificar si el usuario ya existe
        const existingUserQuery = `
            SELECT id, email, cognito_sub, role, first_name, last_name, metadata, created_at
            FROM users
            WHERE email = ? AND deleted_at IS NULL
            LIMIT 1
        `;
        const existingUserResult = await pool.query(existingUserQuery, [email]);
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
        
        if (existingUserResult.rows.length > 0) {
            // Usuario existe, verificar si tiene password_hash
            const existingUser = existingUserResult.rows[0];
            const existingMetadata = (existingUser.metadata as Record<string, unknown>) || {};
            const hasPasswordHash = existingMetadata.password_hash as string | undefined;
            
            // Si el usuario no tiene password_hash, actualizarlo
            if (!hasPasswordHash) {
                const updatedMetadata = {
                    ...existingMetadata,
                    password_hash: hashedPassword,
                    auth_provider: 'local',
                };
                
                const updateQuery = `
                    UPDATE users 
                    SET metadata = ?, updated_at = NOW()
                    WHERE email = ? AND deleted_at IS NULL
                `;
                
                await pool.query(updateQuery, [
                    JSON.stringify(updatedMetadata),
                    email
                ]);
                
                console.log(`Updated password_hash for existing user: ${email}`);
            }
            
            // Retornar usuario (actualizado o existente)
            const getUserQuery = `
                SELECT id, email, role, first_name, last_name, created_at
                FROM users
                WHERE email = ? AND deleted_at IS NULL
                LIMIT 1
            `;
            const result = await pool.query(getUserQuery, [email]);
            return result.rows[0];
        }
        
        // Usuario no existe, crear nuevo
        const userSub = generateUserSub();
        
        // Crear usuario en base de datos
        const insertQuery = `
            INSERT INTO users (email, cognito_sub, role, first_name, last_name, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const metadata = {
            password_hash: hashedPassword,
            auth_provider: 'local',
        };
        
        await pool.query(insertQuery, [
            email,
            userSub,
            role,
            firstName,
            lastName,
            JSON.stringify(metadata),
        ]);
        
        // Obtener el usuario creado
        const getUserQuery = `
            SELECT id, email, role, first_name, last_name, created_at
            FROM users
            WHERE email = ? AND deleted_at IS NULL
            LIMIT 1
        `;
        const result = await pool.query(getUserQuery, [email]);
        return result.rows[0];
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to register user';
        console.error('Register error:', error);
        throw new Error(errorMessage);
    }
};

/**
 * Login de usuario
 */
export const login = async (data: LoginData) => {
    const { email, password } = data;
    
    try {
        // Buscar usuario en base de datos
        const userQuery = `
            SELECT id, email, cognito_sub, role, first_name, last_name, metadata
            FROM users
            WHERE email = ? AND deleted_at IS NULL
            LIMIT 1
        `;
        const userResult = await pool.query(userQuery, [email]);
        
        if (userResult.rows.length === 0) {
            throw new Error('Invalid email or password');
        }
        
        const user = userResult.rows[0];
        const metadata = (user.metadata as Record<string, unknown>) || {};
        const passwordHash = metadata.password_hash as string;
        
        if (!passwordHash) {
            throw new Error('User account not configured for local authentication');
        }
        
        // Verificar password
        const passwordValid = await bcrypt.compare(password, passwordHash);
        if (!passwordValid) {
            throw new Error('Invalid email or password');
        }
        
        // Generar tokens JWT
        const payload = {
            sub: user.cognito_sub,
            email: user.email,
            role: user.role,
        };
        
        const accessToken = jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        } as jwt.SignOptions);
        
        const refreshToken = jwt.sign({ sub: user.cognito_sub }, JWT_REFRESH_SECRET, {
            expiresIn: JWT_REFRESH_EXPIRES_IN,
        } as jwt.SignOptions);
        
        // Calcular expiresIn en segundos
        const expiresInSeconds = JWT_EXPIRES_IN.includes('h')
            ? parseInt(JWT_EXPIRES_IN) * 3600
            : parseInt(JWT_EXPIRES_IN) * 60;
        
        return {
            accessToken,
            idToken: accessToken, // Para compatibilidad
            refreshToken,
            expiresIn: expiresInSeconds,
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to login';
        console.error('Login error:', error);
        throw new Error(errorMessage);
    }
};

/**
 * Obtiene información del usuario
 */
export const getMe = async (userSub: string): Promise<{ id: string; email: string; role: string; first_name?: string | null; last_name?: string | null; created_at: Date; updated_at: Date }> => {
    try {
        if (!userSub) {
            throw new Error('userSub is required');
        }
        
        const query = `
            SELECT id, email, role, first_name, last_name, created_at, updated_at
            FROM users
            WHERE cognito_sub = ? AND deleted_at IS NULL
        `;
        const result = await pool.query(query, [userSub]);
        
        if (result.rows.length === 0) {
            throw new Error(`User not found for sub: ${userSub}`);
        }
        
        const row = result.rows[0];
        return {
            id: row.id,
            email: row.email,
            role: row.role,
            first_name: row.first_name,
            last_name: row.last_name,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to get user';
        console.error('GetMe error:', error);
        throw new Error(errorMessage);
    }
};

/**
 * Refresca el token de acceso
 */
export const refreshToken = async (data: RefreshTokenData) => {
    const { refreshToken: token } = data;
    
    try {
        // Verificar refresh token
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { sub: string };
        
        // Obtener usuario
        const user = await getMe(decoded.sub);
        
        // Usar decoded.sub como cognito_sub (es el mismo valor)
        const cognitoSub = decoded.sub;
        
        // Generar nuevo access token
        const payload = {
            sub: cognitoSub,
            email: user.email,
            role: user.role,
        };
        
        const accessToken = jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        } as jwt.SignOptions);
        
        const expiresInSeconds = JWT_EXPIRES_IN.includes('h')
            ? parseInt(JWT_EXPIRES_IN) * 3600
            : parseInt(JWT_EXPIRES_IN) * 60;
        
        return {
            accessToken,
            idToken: accessToken,
            expiresIn: expiresInSeconds,
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to refresh token';
        console.error('Refresh token error:', error);
        
        if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
            const refreshError = new Error('Refresh token expired or invalid');
            (refreshError as Error & { statusCode?: number }).statusCode = 401;
            throw refreshError;
        }
        
        throw new Error(errorMessage);
    }
};

/**
 * Actualiza perfil de usuario
 */
export interface UpdateUserData {
    first_name?: string;
    last_name?: string;
    email?: string;
}

export const updateUser = async (userSub: string, data: UpdateUserData): Promise<unknown> => {
    try {
        const fields: string[] = [];
        const values: (string | undefined)[] = [];
        let idx = 1;
        
        if (data.first_name !== undefined) {
            fields.push('first_name = ?');
            values.push(data.first_name);
        }
        if (data.last_name !== undefined) {
            fields.push('last_name = ?');
            values.push(data.last_name);
        }
        if (data.email !== undefined) {
            fields.push('email = ?');
            values.push(data.email);
        }
        
        if (fields.length === 0) {
            throw new Error('No fields to update');
        }
        
        values.push(userSub);
        const query = `
            UPDATE users SET ${fields.join(', ')}, updated_at = NOW()
            WHERE cognito_sub = ?
        `;
        await pool.query(query, values);
        
        // Obtener el usuario actualizado
        const getUserQuery = `
            SELECT id, email, role, first_name, last_name, created_at, updated_at
            FROM users
            WHERE cognito_sub = ?
        `;
        const result = await pool.query(getUserQuery, [userSub]);
        return result.rows[0];
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to update user';
        console.error('UpdateUser error:', error);
        throw new Error(message);
    }
};

/**
 * Elimina cuenta de usuario
 */
export const deleteAccount = async (userSub: string): Promise<{ message: string }> => {
    try {
        const query = `
            UPDATE users
            SET deleted_at = NOW()
            WHERE cognito_sub = ? AND deleted_at IS NULL
        `;
        await pool.query(query, [userSub]);
        
        // Verificar que se actualizó
        const verifyQuery = `
            SELECT id FROM users WHERE cognito_sub = ? AND deleted_at IS NOT NULL LIMIT 1
        `;
        const result = await pool.query(verifyQuery, [userSub]);
        
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

/**
 * Obtiene o crea cliente OAuth2 de Google
 */
const getGoogleOAuthClient = (): OAuth2Client => {
    const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || 
        path.join(__dirname, '../../google-credentials.json');
    
    let credentials: { web?: { client_id?: string; client_secret?: string; redirect_uris?: string[] } };
    
    try {
        if (fs.existsSync(credentialsPath)) {
            const fileContent = fs.readFileSync(credentialsPath, 'utf8');
            credentials = JSON.parse(fileContent);
        } else {
            // Fallback a variables de entorno
            const clientId = process.env.GOOGLE_CLIENT_ID;
            const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
            
            if (!clientId || !clientSecret) {
                throw new Error('Google OAuth credentials not found. Set GOOGLE_CREDENTIALS_PATH or GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET');
            }
            
            credentials = {
                web: {
                    client_id: clientId,
                    client_secret: clientSecret,
                },
            };
        }
        
        if (!credentials.web?.client_id || !credentials.web?.client_secret) {
            throw new Error('Google OAuth credentials incomplete');
        }
        
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';
        const client = new OAuth2Client(
            credentials.web.client_id,
            credentials.web.client_secret,
            redirectUri
        );
        
        return client;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load Google OAuth credentials';
        console.error('Google OAuth client error:', error);
        throw new Error(errorMessage);
    }
};

/**
 * Interfaz para datos de usuario de Google
 */
export interface GoogleUserData {
    email: string;
    given_name?: string;
    family_name?: string;
    name?: string;
    picture?: string;
    sub: string;
}

/**
 * Intercambia código de autorización de Google por tokens y obtiene información del usuario
 */
export const exchangeGoogleCode = async (code: string, redirectUri: string): Promise<{
    user: GoogleUserData;
    tokens: { accessToken: string; refreshToken?: string; expiresIn: number };
}> => {
    try {
        // Crear cliente con el redirectUri específico
        const fs = await import('fs');
        const path = await import('path');
        
        const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || 
            path.join(process.cwd(), 'google-credentials.json');
        
        let credentials: { web?: { client_id?: string; client_secret?: string } };
        let clientId: string;
        
        if (fs.existsSync(credentialsPath)) {
            const fileContent = fs.readFileSync(credentialsPath, 'utf8');
            credentials = JSON.parse(fileContent);
            clientId = credentials.web?.client_id || '';
        } else {
            const envClientId = process.env.GOOGLE_CLIENT_ID;
            const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;
            
            if (!envClientId || !envClientSecret) {
                throw new Error('Google OAuth credentials not found');
            }
            
            credentials = {
                web: {
                    client_id: envClientId,
                    client_secret: envClientSecret,
                },
            };
            clientId = envClientId;
        }
        
        if (!credentials.web?.client_id || !credentials.web?.client_secret) {
            throw new Error('Google OAuth credentials incomplete');
        }
        
        const client = new OAuth2Client(
            credentials.web.client_id,
            credentials.web.client_secret,
            redirectUri
        );
        
        // Intercambiar código por tokens
        const { tokens } = await client.getToken(code);
        
        if (!tokens.access_token) {
            throw new Error('Failed to get access token from Google');
        }
        
        // Configurar credenciales en el cliente
        client.setCredentials(tokens);
        
        // Obtener información del usuario
        if (!tokens.id_token) {
            throw new Error('ID token not received from Google');
        }
        
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: clientId,
        });
        
        const payload = ticket.getPayload();
        if (!payload) {
            throw new Error('Failed to get user info from Google');
        }
        
        const userData: GoogleUserData = {
            email: payload.email || '',
            given_name: payload.given_name,
            family_name: payload.family_name,
            name: payload.name,
            picture: payload.picture,
            sub: payload.sub,
        };
        
        if (!userData.email) {
            throw new Error('Email not provided by Google');
        }
        
        // Calcular expiresIn en segundos
        const expiresIn = tokens.expiry_date 
            ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
            : 3600; // Default 1 hour
        
        return {
            user: userData,
            tokens: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || undefined,
                expiresIn,
            },
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to exchange Google code';
        console.error('ExchangeGoogleCode error:', error);
        throw new Error(errorMessage);
    }
};

/**
 * Obtiene o crea usuario desde datos de Google OAuth
 */
export const getOrCreateGoogleUser = async (googleUser: GoogleUserData): Promise<{
    id: string;
    email: string;
    role: string;
    first_name?: string | null;
    last_name?: string | null;
    created_at: Date;
    updated_at: Date;
    cognito_sub: string;
}> => {
    try {
        // Buscar usuario por email o cognito_sub (usando sub de Google)
        const existingUserQuery = `
            SELECT id, email, cognito_sub, role, first_name, last_name, created_at, updated_at
            FROM users
            WHERE (email = ? OR cognito_sub = ?) AND deleted_at IS NULL
            LIMIT 1
        `;
        const existingUser = await pool.query(existingUserQuery, [googleUser.email, googleUser.sub]);
        
        if (existingUser.rows.length > 0) {
            const user = existingUser.rows[0];
            // Si el usuario existe pero no tiene el cognito_sub de Google, actualizarlo
            if (user.cognito_sub !== googleUser.sub) {
                const updateQuery = `
                    UPDATE users
                    SET cognito_sub = ?, updated_at = NOW()
                    WHERE id = ?
                `;
                await pool.query(updateQuery, [googleUser.sub, user.id]);
            }
            // Actualizar nombre si está disponible
            if (googleUser.given_name || googleUser.family_name) {
                const updateFields: string[] = [];
                const updateValues: unknown[] = [];
                if (googleUser.given_name && !user.first_name) {
                    updateFields.push('first_name = ?');
                    updateValues.push(googleUser.given_name);
                }
                if (googleUser.family_name && !user.last_name) {
                    updateFields.push('last_name = ?');
                    updateValues.push(googleUser.family_name);
                }
                if (updateFields.length > 0) {
                    updateValues.push(user.id);
                    const updateQuery = `
                        UPDATE users
                        SET ${updateFields.join(', ')}, updated_at = NOW()
                        WHERE id = ?
                    `;
                    await pool.query(updateQuery, updateValues);
                }
            }
            return {
                id: user.id,
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name,
                created_at: user.created_at,
                updated_at: user.updated_at,
                cognito_sub: googleUser.sub, // Usar el sub de Google
            };
        }
        
        // Crear nuevo usuario
        const userSub = googleUser.sub;
        const metadata = {
            auth_provider: 'google',
            google_id: googleUser.sub,
            picture: googleUser.picture,
        };
        
        const insertQuery = `
            INSERT INTO users (email, cognito_sub, role, first_name, last_name, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        await pool.query(insertQuery, [
            googleUser.email,
            userSub,
            'researcher', // Default role
            googleUser.given_name || null,
            googleUser.family_name || null,
            JSON.stringify(metadata),
        ]);
        
        // Obtener el usuario creado (MySQL doesn't support RETURNING)
        const getUserQuery = `
            SELECT id, email, cognito_sub, role, first_name, last_name, created_at, updated_at
            FROM users
            WHERE email = ? AND deleted_at IS NULL
            LIMIT 1
        `;
        const result = await pool.query(getUserQuery, [googleUser.email]);
        
        if (result.rows.length === 0) {
            throw new Error('Failed to create user');
        }
        
        return {
            id: result.rows[0].id,
            email: result.rows[0].email,
            role: result.rows[0].role,
            first_name: result.rows[0].first_name,
            last_name: result.rows[0].last_name,
            created_at: result.rows[0].created_at,
            updated_at: result.rows[0].updated_at,
            cognito_sub: result.rows[0].cognito_sub,
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to get or create Google user';
        console.error('GetOrCreateGoogleUser error:', error);
        throw new Error(errorMessage);
    }
};
