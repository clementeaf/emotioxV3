import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import pool from '../../config/database';

export class MonitorService {
    private client: ApiGatewayManagementApiClient | null = null;

    /**
     * Initializes the API Gateway Management API Client
     * @param endpoint - The callback URL for the WebSocket API
     */
    initClient(endpoint: string) {
        // Remove wss:// or https:// protocol for the endpoint if present, but AWS SDK usually handles the full URL
        // Actually, for AWS SDK v3, we verify how endpoint should be passed.
        // It's often just the domain + stage.
        // But for local testing (serverless-offline), it might be http://localhost:3001
        this.client = new ApiGatewayManagementApiClient({
            apiVersion: '2018-11-29',
            endpoint: endpoint
        });
    }

    /**
     * Registers a new connection
     */
    async registerConnection(connectionId: string, researchId: string, userId?: string) {
        // MySQL compatible: use ON DUPLICATE KEY UPDATE instead of ON CONFLICT
        const query = `
            INSERT INTO monitoring_connections (connection_id, research_id, user_id)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            research_id = VALUES(research_id), user_id = VALUES(user_id), last_ping_at = NOW()
        `;
        await pool.query(query, [connectionId, researchId, userId || null]);
    }

    /**
     * Removes a connection
     */
    async removeConnection(connectionId: string) {
        await pool.query('DELETE FROM monitoring_connections WHERE connection_id = ?', [connectionId]);
    }

    /**
     * Gets all active connections for a research
     */
    async getConnections(researchId: string) {
        const result = await pool.query(
            'SELECT connection_id FROM monitoring_connections WHERE research_id = ?',
            [researchId]
        );
        return result.rows.map(row => row.connection_id);
    }

    /**
     * Sends an update to all connected clients for a specific research
     */
    async notifyResearchUpdate(researchId: string, data: any, endpoint: string) {
        if (!this.client) {
            this.initClient(endpoint);
        }

        const connections = await this.getConnections(researchId);
        const textData = JSON.stringify(data);
        const encoder = new TextEncoder();
        const byteData = encoder.encode(textData);

        const promises = connections.map(async (connectionId) => {
            try {
                const command = new PostToConnectionCommand({
                    ConnectionId: connectionId,
                    Data: byteData
                });
                await this.client!.send(command);
            } catch (error: any) {
                if (error.statusCode === 410 || error.name === 'GoneException') {
                    // Stale connection, remove it
                    await this.removeConnection(connectionId);
                } else {
                    console.error(`Failed to send message to ${connectionId}:`, error);
                }
            }
        });

        await Promise.all(promises);
    }
}

export const monitorService = new MonitorService();
