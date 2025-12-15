import { S3Client } from '@aws-sdk/client-s3';

/**
 * Configura el cliente S3 con credenciales explícitas si están disponibles
 * En Lambda, las credenciales vienen del IAM role automáticamente
 * En local, deben estar en variables de entorno
 */
const s3ClientConfig: {
    region: string;
    requestChecksumCalculation: 'WHEN_REQUIRED';
    responseChecksumValidation: 'WHEN_REQUIRED';
    credentials?: {
        accessKeyId: string;
        secretAccessKey: string;
    };
} = {
    region: process.env.APP_AWS_REGION || 'us-east-1',
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
};

// Solo agregar credenciales explícitas si están en variables de entorno (desarrollo local)
// En producción (Lambda), el SDK usa automáticamente el IAM role
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    s3ClientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
}

const s3Client = new S3Client(s3ClientConfig);

export default s3Client;
