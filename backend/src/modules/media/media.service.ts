import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client from '../../config/s3';
import pool from '../../config/database';

const BUCKET_NAME = process.env.S3_BUCKET_NAME || '';

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

export const getMediaUrlByS3Key = async (s3Key: string) => {
    const query = `SELECT id, s3_key, s3_bucket, file_type FROM media WHERE s3_key = $1`;
    const result = await pool.query(query, [s3Key]);

    if (result.rows.length === 0) throw new Error('Media not found');

    const { id, s3_key, s3_bucket, file_type } = result.rows[0];

    const contentType = getContentTypeFromKey(s3_key, file_type);

    const command = new GetObjectCommand({
        Bucket: s3_bucket,
        Key: s3_key,
        ResponseContentType: contentType,
        ResponseContentDisposition: `inline; filename="${s3_key.split('/').pop() || 'file'}"`,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return { id, url, expires_in: 3600 };
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
