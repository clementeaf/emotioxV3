/**
 * Media Service
 * Handles media file operations for participant-frontend
 * Fetches images from S3 via backend
 */

import { configService } from './config.service';

interface MediaUrlResponse {
    url: string;
    expires_in: number;
    id?: string;
}

/**
 * Resolves a relative media URL against the backend origin.
 */
export function resolveMediaUrl(url: string): string {
    if (!url || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
        return url;
    }
    try {
        const baseUrl = configService.getBaseUrl();
        const origin = new URL(baseUrl).origin;
        return `${origin}${url}`;
    } catch {
        return url;
    }
}

class MediaService {
    private urlCache: Map<string, { url: string; expiresAt: number }> = new Map();

    /**
     * Get media URL from S3 key
     * @param s3Key - S3 key of the media file
     * @returns Presigned URL to access the file
     */
    async getMediaUrl(s3Key: string): Promise<string> {
        try {
            // Check cache first
            const cached = this.urlCache.get(s3Key);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.url;
            }

            const baseUrl = configService.getBaseUrl();
            const endpoint = configService.getEndpoint('public', 'mediaByKey');
            const url = `${baseUrl}${endpoint}?s3_key=${encodeURIComponent(s3Key)}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch media URL: ${response.statusText}`);
            }

            const data = await response.json() as MediaUrlResponse;
            const resolvedUrl = resolveMediaUrl(data.url);

            // Cache the URL (expires in expires_in seconds - 5 minutes buffer)
            const expiresAt = Date.now() + ((data.expires_in - 300) * 1000);
            this.urlCache.set(s3Key, { url: resolvedUrl, expiresAt });

            return resolvedUrl;
        } catch (error) {
            console.error('Error fetching media URL:', error);
            throw error;
        }
    }

    /**
     * Build S3 URL from component value
     * Handles both s3Key strings and file objects
     * @param value - Component value (can be s3Key, file object, or array)
     * @returns Promise with URL or array of URLs
     */
    async buildMediaUrl(value: unknown): Promise<string | string[] | null> {
        if (!value) return null;

        // Handle array of files
        if (Array.isArray(value)) {
            const urls = await Promise.all(
                value.map(async (item) => {
                    if (typeof item === 'string') {
                        return this.getMediaUrl(item);
                    }
                    if (item && typeof item === 'object' && 's3Key' in item) {
                        return this.getMediaUrl(item.s3Key as string);
                    }
                    return null;
                })
            );
            return urls.filter(url => url !== null) as string[];
        }

        // Handle single s3Key string
        if (typeof value === 'string') {
            return this.getMediaUrl(value);
        }

        // Handle file object with s3Key
        if (value && typeof value === 'object' && 's3Key' in value) {
            return this.getMediaUrl((value as { s3Key: string }).s3Key);
        }

        return null;
    }

    /**
     * Clear URL cache
     */
    clearCache(): void {
        this.urlCache.clear();
    }
}

export const mediaService = new MediaService();

// Export types
export type { MediaUrlResponse };
