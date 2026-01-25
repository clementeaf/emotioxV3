import { Response } from 'express';
import pool from '../../config/database';
import { verifyToken } from '../../utils/auth.local';

interface SSEConnection {
    res: Response;
    researchId: string;
    userId?: string;
    lastPing: number;
}

/**
 * Service for managing Server-Sent Events (SSE) connections for real-time monitoring
 * Replaces WebSocket implementation for better cPanel/Passenger compatibility
 */
export class MonitorSSEService {
    private connections: Map<string, SSEConnection> = new Map();
    private pingInterval: NodeJS.Timeout | null = null;
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Ping clients every 30 seconds to keep connection alive
        this.pingInterval = setInterval(() => this.pingAll(), 30000);
        
        // Cleanup stale connections every 60 seconds
        this.cleanupInterval = setInterval(() => this.cleanupStale(), 60000);
    }

    /**
     * Registers a new SSE connection
     */
    async registerConnection(connectionId: string, researchId: string, userId: string | undefined, res: Response): Promise<void> {
        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

        // Store connection
        this.connections.set(connectionId, {
            res,
            researchId,
            userId,
            lastPing: Date.now()
        });

        // Store in database for tracking
        const query = `
            INSERT INTO monitoring_connections (connection_id, research_id, user_id)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            research_id = VALUES(research_id), user_id = VALUES(user_id), last_ping_at = NOW()
        `;
        await pool.query(query, [connectionId, researchId, userId || null]);

        // Send initial connection event
        this.sendEvent(connectionId, 'connected', { researchId, timestamp: new Date().toISOString() });

        // Handle client disconnect
        res.on('close', () => {
            this.removeConnection(connectionId);
        });
    }

    /**
     * Removes a connection
     */
    async removeConnection(connectionId: string): Promise<void> {
        this.connections.delete(connectionId);
        await pool.query('DELETE FROM monitoring_connections WHERE connection_id = ?', [connectionId]);
    }

    /**
     * Sends an event to a specific connection
     */
    sendEvent(connectionId: string, event: string, data: any): boolean {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            return false;
        }

        try {
            const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            connection.res.write(message);
            connection.lastPing = Date.now();
            return true;
        } catch (error) {
            console.error(`Failed to send event to ${connectionId}:`, error);
            this.removeConnection(connectionId);
            return false;
        }
    }

    /**
     * Broadcasts an event to all connections of a specific research
     */
    async broadcastToResearch(researchId: string, event: string, data: any): Promise<void> {
        const connections = Array.from(this.connections.entries())
            .filter(([_, conn]) => conn.researchId === researchId);

        for (const [connectionId, _] of connections) {
            this.sendEvent(connectionId, event, data);
        }
    }

    /**
     * Sends ping to all connections to keep them alive
     */
    private pingAll(): void {
        const now = Date.now();
        for (const [connectionId, conn] of this.connections) {
            try {
                conn.res.write(': ping\n\n');
                conn.lastPing = now;
            } catch (error) {
                console.error(`Ping failed for ${connectionId}:`, error);
                this.removeConnection(connectionId);
            }
        }
    }

    /**
     * Removes stale connections (no ping in last 2 minutes)
     */
    private cleanupStale(): void {
        const now = Date.now();
        const staleTimeout = 2 * 60 * 1000; // 2 minutes

        for (const [connectionId, conn] of this.connections) {
            if (now - conn.lastPing > staleTimeout) {
                console.log(`Removing stale connection: ${connectionId}`);
                this.removeConnection(connectionId);
            }
        }
    }

    /**
     * Gets count of active connections for a research
     */
    getConnectionCount(researchId: string): number {
        return Array.from(this.connections.values())
            .filter(conn => conn.researchId === researchId)
            .length;
    }

    /**
     * Cleanup on service shutdown
     */
    destroy(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.connections.clear();
    }
}

export const monitorSSEService = new MonitorSSEService();
