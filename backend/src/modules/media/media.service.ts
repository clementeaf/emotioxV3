import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client from '../../config/s3';
import pool from '../../config/database';

const BUCKET_NAME = process.env.S3_BUCKET_NAME || '';

interface MediaUrlResult {
    id?: string;
    url: string;
    expires_in: number;
    source: 'db' | 's3_fallback';
}

/**
 * Validates that an S3 key is safe to use for generating a presigned URL.
 * This prevents generating URLs for unexpected bucket paths.
 * @param s3Key - Raw S3 key
 * @returns The normalized key if valid
 */
const validateResearchS3Key = (s3Key: string): string => {
    const key = s3Key.trim();
    if (key.length === 0) {
        throw new Error('s3_key is required');
    }

    // Disallow path traversal and absolute paths
    if (key.includes('..') || key.startsWith('/') || key.startsWith('\\')) {
        throw new Error('Invalid s3_key');
    }

    // Only allow research-scoped keys
    if (!key.startsWith('research/')) {
        throw new Error('Invalid s3_key');
    }

    // Basic character allowlist (safe subset)
    // Allow spaces in filenames (S3 supports them)
    const allowed = /^[A-Za-z0-9/_\-. ]+$/;
    if (!allowed.test(key)) {
        throw new Error('Invalid s3_key');
    }

    return key;
};

export const generateUploadUrl = async (researchId: string, fileName: string, contentType: string) => {
    const key = `research/${researchId}/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });

    const url = await getSignedUrl(s3Client, command, { 
        expiresIn: 3600,
    });

    return { upload_url: url, s3_key: key, expires_in: 3600 };
};

export const saveMetadata = async (researchId: string, questionId: string | null, s3Key: string, metadata: Record<string, unknown>) => {
    const query = `
    INSERT INTO media (research_id, question_id, s3_key, s3_bucket, file_name, file_type, file_size, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
    const result = await pool.query(query, [
        researchId,
        questionId,
        s3Key,
        BUCKET_NAME,
        metadata.fileName,
        metadata.fileType,
        metadata.fileSize,
        JSON.stringify(metadata),
    ]);
    return result.rows[0];
};

export const getMediaUrl = async (mediaId: string) => {
    const query = `SELECT s3_key, s3_bucket FROM media WHERE id = $1`;
    const result = await pool.query(query, [mediaId]);

    if (result.rows.length === 0) throw new Error('Media not found');

    const { s3_key, s3_bucket } = result.rows[0];

    const command = new GetObjectCommand({
        Bucket: s3_bucket,
        Key: s3_key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return { url, expires_in: 3600 };
};

const getContentTypeFromKey = (s3Key: string, fileType?: string): string => {
    if (fileType) return fileType;
    const ext = s3Key.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
};

/**
 * Generates a presigned GET URL for an S3 key, using DB metadata when available.
 * Falls back to S3-only presigning when the media row is missing.
 * @param rawS3Key - S3 key
 * @returns Presigned URL result
 */
export const getMediaUrlByS3Key = async (rawS3Key: string): Promise<MediaUrlResult> => {
    const s3Key = validateResearchS3Key(rawS3Key);

    const query = `SELECT id, s3_key, s3_bucket, file_type FROM media WHERE s3_key = $1`;
    const result = await pool.query(query, [s3Key]);

    if (result.rows.length > 0) {
        const row = result.rows[0] as { id: string; s3_key: string; s3_bucket: string; file_type?: string | null };
        const contentType = getContentTypeFromKey(row.s3_key, row.file_type ?? undefined);
        const command = new GetObjectCommand({
            Bucket: row.s3_bucket,
            Key: row.s3_key,
            ResponseContentType: contentType,
            ResponseContentDisposition: `inline; filename="${row.s3_key.split('/').pop() || 'file'}"`,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return { id: row.id, url, expires_in: 3600, source: 'db' };
    }

    // Fallback: presign directly from S3 bucket when DB row is missing.
    const contentType = getContentTypeFromKey(s3Key);
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        ResponseContentType: contentType,
        ResponseContentDisposition: `inline; filename="${s3Key.split('/').pop() || 'file'}"`,
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return { url, expires_in: 3600, source: 's3_fallback' };
};

export const deleteMedia = async (mediaId: string) => {
    const query = `SELECT s3_key, s3_bucket FROM media WHERE id = $1`;
    const result = await pool.query(query, [mediaId]);

    if (result.rows.length === 0) throw new Error('Media not found');

    const { s3_key, s3_bucket } = result.rows[0];

    // Delete from S3
    const command = new DeleteObjectCommand({
        Bucket: s3_bucket,
        Key: s3_key,
    });
    await s3Client.send(command);

    // Delete from DB
    await pool.query('DELETE FROM media WHERE id = $1', [mediaId]);

    return { message: 'Media deleted successfully' };
};
