import { S3Client } from '@aws-sdk/client-s3';

/**
 * Configura el cliente S3 para generación de presigned URLs.
 * @returns Cliente S3 configurado
 */
function buildS3Client(): S3Client {
    const region = process.env.APP_AWS_REGION || process.env.AWS_REGION || 'us-east-1';

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const sessionToken = process.env.AWS_SESSION_TOKEN;

    if (!accessKeyId || !secretAccessKey) {
        return new S3Client({ region });
    }

    return new S3Client({
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
            sessionToken: sessionToken || undefined,
        },
    });
}

const s3Client = buildS3Client();

export default s3Client;
