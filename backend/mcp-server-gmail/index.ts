#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.DOTENV_CONFIG_DEBUG = 'false';
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Interfaz para representar un email simplificado
 */
interface EmailMessage {
    id: string;
    threadId: string;
    subject: string;
    from: string;
    to: string[];
    date: string;
    snippet: string;
    body?: string;
    labels?: string[];
}

/**
 * Servidor MCP para Gmail API
 * Permite listar, leer y buscar correos electrónicos de Gmail
 */
class GmailMCPServer {
    private server: Server;
    private oauth2Client: OAuth2Client | null = null;
    private gmail: ReturnType<typeof google.gmail> | null = null;
    private tokenPath: string;

    constructor() {
        this.server = new Server(
            {
                name: 'gmail',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                    resources: {},
                },
            }
        );

        this.tokenPath = path.join(__dirname, 'token.json');
        this.setupHandlers();
        this.initializeAuth();
    }

    /**
     * Inicializa la autenticación OAuth 2.0 con Google
     */
    private initializeAuth(): void {
        const clientId = process.env.GMAIL_CLIENT_ID;
        const clientSecret = process.env.GMAIL_CLIENT_SECRET;
        const redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth2callback';

        if (!clientId || !clientSecret) {
            console.error('GMAIL_CLIENT_ID y GMAIL_CLIENT_SECRET deben estar configurados en .env');
            return;
        }

        this.oauth2Client = new OAuth2Client({
            clientId,
            clientSecret,
            redirectUri,
        });

        // Cargar token guardado si existe
        if (existsSync(this.tokenPath)) {
            try {
                const token = JSON.parse(readFileSync(this.tokenPath, 'utf-8'));
                if (this.oauth2Client) {
                    this.oauth2Client.setCredentials(token);
                    this.refreshTokenIfNeeded();
                }
            } catch (error) {
                console.error('Error cargando token:', error);
            }
        } else {
            console.error('Token no encontrado. Ejecuta el script de autenticación primero.');
        }

        if (this.oauth2Client) {
            this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
        }
    }

    /**
     * Refresca el token si está cerca de expirar
     */
    private async refreshTokenIfNeeded(): Promise<void> {
        if (!this.oauth2Client) return;

        try {
            const token = this.oauth2Client.credentials;
            if (token.expiry_date && token.expiry_date <= Date.now() + 60000) {
                const { credentials } = await this.oauth2Client.refreshAccessToken();
                this.oauth2Client.setCredentials(credentials);
                this.saveToken(credentials);
            }
        } catch (error) {
            console.error('Error refrescando token:', error);
        }
    }

    /**
     * Guarda el token en un archivo
     */
    private saveToken(token: unknown): void {
        try {
            writeFileSync(this.tokenPath, JSON.stringify(token, null, 2));
        } catch (error) {
            console.error('Error guardando token:', error);
        }
    }

    /**
     * Verifica que la autenticación esté lista
     */
    private ensureAuthenticated(): void {
        if (!this.oauth2Client || !this.gmail) {
            throw new Error('Gmail no está autenticado. Ejecuta el script de autenticación primero.');
        }

        const token = this.oauth2Client.credentials;
        if (!token.access_token) {
            throw new Error('No hay token de acceso. Ejecuta el script de autenticación primero.');
        }
    }

    /**
     * Configura los handlers para las herramientas y recursos
     */
    private setupHandlers(): void {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'list_emails',
                    description: 'Lista correos electrónicos de Gmail con filtros opcionales',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'Query de búsqueda de Gmail (ej: "from:example@gmail.com", "subject:test", "is:unread")',
                            },
                            maxResults: {
                                type: 'number',
                                description: 'Número máximo de resultados (default: 10, max: 100)',
                            },
                            pageToken: {
                                type: 'string',
                                description: 'Token de paginación para obtener más resultados',
                            },
                        },
                    },
                },
                {
                    name: 'get_email',
                    description: 'Obtiene el contenido completo de un correo electrónico por ID',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            messageId: {
                                type: 'string',
                                description: 'ID del mensaje de Gmail',
                            },
                            format: {
                                type: 'string',
                                enum: ['full', 'metadata', 'minimal', 'raw'],
                                description: 'Formato de respuesta (default: full)',
                            },
                        },
                        required: ['messageId'],
                    },
                },
                {
                    name: 'search_emails',
                    description: 'Busca correos electrónicos usando la sintaxis de búsqueda de Gmail',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'Query de búsqueda de Gmail (ej: "from:example@gmail.com subject:test")',
                            },
                            maxResults: {
                                type: 'number',
                                description: 'Número máximo de resultados (default: 10, max: 100)',
                            },
                        },
                        required: ['query'],
                    },
                },
                {
                    name: 'get_email_thread',
                    description: 'Obtiene un hilo completo de conversación por threadId',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            threadId: {
                                type: 'string',
                                description: 'ID del hilo de conversación',
                            },
                        },
                        required: ['threadId'],
                    },
                },
                {
                    name: 'get_labels',
                    description: 'Lista todas las etiquetas (labels) de Gmail',
                    inputSchema: {
                        type: 'object',
                    },
                },
            ],
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                this.ensureAuthenticated();
                await this.refreshTokenIfNeeded();

                switch (name) {
                    case 'list_emails':
                        return await this.handleListEmails(
                            args?.query as string | undefined,
                            args?.maxResults as number | undefined,
                            args?.pageToken as string | undefined
                        );
                    case 'get_email':
                        return await this.handleGetEmail(
                            args?.messageId as string,
                            (args?.format as string | undefined) || 'full'
                        );
                    case 'search_emails':
                        return await this.handleSearchEmails(
                            args?.query as string,
                            args?.maxResults as number | undefined
                        );
                    case 'get_email_thread':
                        return await this.handleGetEmailThread(args?.threadId as string);
                    case 'get_labels':
                        return await this.handleGetLabels();
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${errorMessage}`,
                        },
                    ],
                    isError: true,
                };
            }
        });

        this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
            resources: [
                {
                    uri: 'gmail://labels',
                    name: 'Gmail Labels',
                    description: 'Lista de todas las etiquetas de Gmail',
                    mimeType: 'application/json',
                },
            ],
        }));

        this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const { uri } = request.params;

            if (uri === 'gmail://labels') {
                try {
                    this.ensureAuthenticated();
                    await this.refreshTokenIfNeeded();
                    const labels = await this.getLabelsList();
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify(labels, null, 2),
                            },
                        ],
                    };
                } catch (error) {
                    throw new Error(`Error obteniendo labels: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            throw new Error(`Unknown resource: ${uri}`);
        });
    }

    /**
     * Lista correos electrónicos
     */
    private async handleListEmails(
        query?: string,
        maxResults?: number,
        pageToken?: string
    ): Promise<{ content: Array<{ type: string; text: string }> }> {
        if (!this.gmail) throw new Error('Gmail no inicializado');

        const params: {
            userId: string;
            q?: string;
            maxResults?: number;
            pageToken?: string;
        } = {
            userId: 'me',
            maxResults: Math.min(maxResults || 10, 100),
        };

        if (query) params.q = query;
        if (pageToken) params.pageToken = pageToken;

        const response = await this.gmail.users.messages.list(params);

        const messages = response.data.messages || [];
        const nextPageToken = response.data.nextPageToken;

        const emailDetails: EmailMessage[] = [];

        for (const message of messages.slice(0, params.maxResults)) {
            try {
                const email = await this.getMessageDetails(message.id || '');
                if (email) {
                    emailDetails.push(email);
                }
            } catch (error) {
                console.error(`Error obteniendo mensaje ${message.id}:`, error);
            }
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            count: emailDetails.length,
                            nextPageToken: nextPageToken || null,
                            emails: emailDetails,
                        },
                        null,
                        2
                    ),
                },
            ],
        };
    }

    /**
     * Obtiene detalles de un correo específico
     */
    private async handleGetEmail(
        messageId: string,
        format: string
    ): Promise<{ content: Array<{ type: string; text: string }> }> {
        if (!this.gmail) throw new Error('Gmail no inicializado');

        const response = await this.gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: format as 'full' | 'metadata' | 'minimal' | 'raw',
        });

        const message = response.data;
        const email = await this.parseMessage(message);

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(email, null, 2),
                },
            ],
        };
    }

    /**
     * Busca correos electrónicos
     */
    private async handleSearchEmails(
        query: string,
        maxResults?: number
    ): Promise<{ content: Array<{ type: string; text: string }> }> {
        return await this.handleListEmails(query, maxResults);
    }

    /**
     * Obtiene un hilo completo de conversación
     */
    private async handleGetEmailThread(
        threadId: string
    ): Promise<{ content: Array<{ type: string; text: string }> }> {
        if (!this.gmail) throw new Error('Gmail no inicializado');

        const response = await this.gmail.users.threads.get({
            userId: 'me',
            id: threadId,
            format: 'full',
        });

        const thread = response.data;
        const messages: EmailMessage[] = [];

        for (const message of thread.messages || []) {
            const email = await this.parseMessage(message);
            if (email) {
                messages.push(email);
            }
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            threadId: thread.id,
                            historyId: thread.historyId,
                            snippet: thread.snippet,
                            messageCount: messages.length,
                            messages,
                        },
                        null,
                        2
                    ),
                },
            ],
        };
    }

    /**
     * Obtiene todas las etiquetas de Gmail
     */
    private async handleGetLabels(): Promise<{ content: Array<{ type: string; text: string }> }> {
        const labels = await this.getLabelsList();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            count: labels.length,
                            labels,
                        },
                        null,
                        2
                    ),
                },
            ],
        };
    }

    /**
     * Obtiene la lista de labels
     */
    private async getLabelsList(): Promise<Array<{ id: string; name: string; type: string }>> {
        if (!this.gmail) throw new Error('Gmail no inicializado');

        const response = await this.gmail.users.labels.list({
            userId: 'me',
        });

        return (
            response.data.labels?.map((label) => ({
                id: label.id || '',
                name: label.name || '',
                type: label.type || '',
            })) || []
        );
    }

    /**
     * Obtiene detalles de un mensaje por ID
     */
    private async getMessageDetails(messageId: string): Promise<EmailMessage | null> {
        if (!this.gmail) return null;

        try {
            const response = await this.gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'metadata',
                metadataHeaders: ['From', 'To', 'Subject', 'Date'],
            });

            return await this.parseMessage(response.data);
        } catch (error) {
            console.error(`Error obteniendo mensaje ${messageId}:`, error);
            return null;
        }
    }

    /**
     * Parsea un mensaje de Gmail a formato EmailMessage
     */
    private async parseMessage(message: {
        id?: string | null;
        threadId?: string | null;
        snippet?: string | null;
        payload?: {
            headers?: Array<{ name?: string | null; value?: string | null }>;
            body?: { data?: string | null };
            parts?: Array<unknown>;
        };
        labelIds?: string[] | null;
        internalDate?: string | null;
    }): Promise<EmailMessage | null> {
        if (!message.id || !message.payload) return null;

        const headers = message.payload.headers || [];
        const getHeader = (name: string): string => {
            const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
            return header?.value || '';
        };

        const subject = getHeader('Subject');
        const from = getHeader('From');
        const to = getHeader('To');
        const date = getHeader('Date') || (message.internalDate ? new Date(parseInt(message.internalDate)).toISOString() : '');

        let body = '';
        if (message.payload.body?.data) {
            body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
        } else if (message.payload.parts) {
            for (const part of message.payload.parts) {
                if (part && typeof part === 'object' && 'body' in part) {
                    const partBody = part.body as { data?: string | null };
                    if (partBody?.data) {
                        body += Buffer.from(partBody.data, 'base64').toString('utf-8');
                    }
                }
            }
        }

        return {
            id: message.id,
            threadId: message.threadId || '',
            subject,
            from,
            to: to.split(',').map((email) => email.trim()),
            date,
            snippet: message.snippet || '',
            body: body || undefined,
            labels: message.labelIds || undefined,
        };
    }

    /**
     * Inicia el servidor MCP
     */
    async start(): Promise<void> {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Gmail MCP Server running on stdio');
    }
}

const server = new GmailMCPServer();
void server.start();
