/**
 * In-memory job registry for video prediction SSE progress.
 * Jobs are short-lived — created when prediction starts, removed 60s after completion.
 */

import type { Response } from 'express';

export interface VideoJobEvent {
    type: 'frame-complete' | 'frame-error' | 'accumulating' | 'hybrid' | 'complete' | 'error';
    frameIndex?: number;
    totalFrames: number;
    mediaId?: string;
    timestamp?: number;
    successfulFrames?: number;
    failedFrames?: number;
    processingTimeMs?: number;
    error?: string;
}

interface VideoJob {
    researchId: string;
    status: 'processing' | 'complete' | 'error';
    sseConnections: Set<Response>;
    totalFrames: number;
    completedFrames: number;
    cleanupTimer?: ReturnType<typeof setTimeout>;
}

const jobs = new Map<string, VideoJob>();

export function registerJob(jobId: string, researchId: string, totalFrames: number): void {
    jobs.set(jobId, {
        researchId,
        status: 'processing',
        sseConnections: new Set(),
        totalFrames,
        completedFrames: 0,
    });
}

/**
 * Attach an Express SSE response to a job.
 * Returns false if job not found.
 */
export function attachSSE(jobId: string, res: Response): boolean {
    const job = jobs.get(jobId);
    if (!job) return false;
    job.sseConnections.add(res);
    return true;
}

export function detachSSE(jobId: string, res: Response): void {
    const job = jobs.get(jobId);
    if (job) job.sseConnections.delete(res);
}

export function broadcastProgress(jobId: string, event: VideoJobEvent): void {
    const job = jobs.get(jobId);
    if (!job) return;

    if (event.type === 'frame-complete') {
        job.completedFrames++;
    }
    if (event.type === 'complete') {
        job.status = 'complete';
    }
    if (event.type === 'error') {
        job.status = 'error';
    }

    const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

    for (const res of job.sseConnections) {
        try {
            res.write(payload);
        } catch {
            job.sseConnections.delete(res);
        }
    }

    // Schedule cleanup after terminal events
    if (event.type === 'complete' || event.type === 'error') {
        scheduleCleanup(jobId);
    }
}

export function removeJob(jobId: string): void {
    const job = jobs.get(jobId);
    if (!job) return;
    for (const res of job.sseConnections) {
        try { res.end(); } catch { /* noop */ }
    }
    if (job.cleanupTimer) clearTimeout(job.cleanupTimer);
    jobs.delete(jobId);
}

function scheduleCleanup(jobId: string): void {
    const job = jobs.get(jobId);
    if (!job) return;
    if (job.cleanupTimer) clearTimeout(job.cleanupTimer);
    job.cleanupTimer = setTimeout(() => {
        // Close remaining SSE connections
        for (const res of job.sseConnections) {
            try { res.end(); } catch { /* noop */ }
        }
        jobs.delete(jobId);
    }, 60_000);
}

export function getJob(jobId: string): { status: string; totalFrames: number; completedFrames: number } | null {
    const job = jobs.get(jobId);
    if (!job) return null;
    return { status: job.status, totalFrames: job.totalFrames, completedFrames: job.completedFrames };
}
