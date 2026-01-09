#!/usr/bin/env node

/**
 * Script de autenticación OAuth 2.0 para Gmail
 * Ejecuta este script una vez para obtener y guardar el token de acceso
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

/**
 * Carga o solicita credenciales al usuario
 */
async function loadSavedCredentialsIfExist(): Promise<OAuth2Client | null> {
    try {
        const content = readFileSync(TOKEN_PATH, 'utf-8');
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials) as OAuth2Client;
    } catch (err) {
        return null;
    }
}

/**
 * Guarda las credenciales en un archivo
 */
async function saveCredentials(client: OAuth2Client): Promise<void> {
    const content = readFileSync(CREDENTIALS_PATH, 'utf-8');
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    writeFileSync(TOKEN_PATH, payload);
}

/**
 * Obtiene y guarda nuevas credenciales
 */
async function authorize(): Promise<void> {
    let client: OAuth2Client | null = await loadSavedCredentialsIfExist();
    if (client) {
        console.log('Credenciales encontradas. Verificando validez...');
        return;
    }

    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth2callback';

    if (!clientId || !clientSecret) {
        throw new Error('GMAIL_CLIENT_ID y GMAIL_CLIENT_SECRET deben estar en .env');
    }

    client = new OAuth2Client({
        clientId,
        clientSecret,
        redirectUri,
    });

    const authUrl = client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    console.log('Autoriza esta aplicación visitando esta URL:');
    console.log(authUrl);
    console.log('\nEsperando código de autorización...');

    const code = await getAuthorizationCode(redirectUri);

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    await saveCredentials(client);
    console.log('Token guardado exitosamente en', TOKEN_PATH);
}

/**
 * Obtiene el código de autorización del usuario
 */
function getAuthorizationCode(redirectUri: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = new URL(redirectUri);
        const port = url.port ? parseInt(url.port) : url.protocol === 'https:' ? 443 : 80;
        const server = createServer((req, res) => {
            if (req.url?.startsWith('/oauth2callback')) {
                const queryParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
                const code = queryParams.get('code');
                const error = queryParams.get('error');

                res.writeHead(200, { 'Content-Type': 'text/html' });
                if (code) {
                    res.end(`
                        <html>
                            <body>
                                <h1>Autenticación exitosa</h1>
                                <p>Puedes cerrar esta ventana.</p>
                            </body>
                        </html>
                    `);
                    server.close();
                    resolve(code);
                } else if (error) {
                    res.end(`
                        <html>
                            <body>
                                <h1>Error de autenticación</h1>
                                <p>${error}</p>
                            </body>
                        </html>
                    `);
                    server.close();
                    reject(new Error(error));
                } else {
                    res.end(`
                        <html>
                            <body>
                                <h1>Esperando autorización...</h1>
                            </body>
                        </html>
                    `);
                }
            }
        });

        server.listen(port, () => {
            console.log(`Servidor escuchando en ${redirectUri}`);
        });

        server.on('error', (err) => {
            reject(err);
        });
    });
}

void authorize().catch(console.error);
