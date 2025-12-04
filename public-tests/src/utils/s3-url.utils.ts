/**
 * Utilidades para generar URLs de S3 dinámicamente
 * Basado en el stage y región configurados en el backend
 */

/**
 * Genera una URL de S3 dinámicamente basada en el stage actual
 * @param s3Key - Clave del objeto en S3
 * @param stage - Stage del entorno (dev, prod, etc.)
 * @param region - Región de AWS
 * @returns URL completa del objeto S3
 */
export function generateS3Url(s3Key: string, stage?: string, region?: string): string {
  // Obtener stage del endpoint API actual o usar 'dev' como fallback
  const currentStage = stage || extractStageFromApiUrl() || 'dev';
  const currentRegion = region || 'us-east-1';
  
  const bucketName = `emotioxv2-uploads-${currentStage}`;
  
  return `https://${bucketName}.s3.${currentRegion}.amazonaws.com/${s3Key}`;
}

/**
 * Extrae el stage de la URL del API actual
 * @returns Stage detectado o undefined si no se puede detectar
 */
function extractStageFromApiUrl(): string | undefined {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (!apiUrl) return undefined;
  
  // Buscar patrones como /dev, /prod al final de la URL
  const stageMatch = apiUrl.match(/\/([^/]+)$/);
  return stageMatch?.[1];
}

/**
 * Genera la URL final para un archivo, usando la URL existente o generando una de S3
 * @param file - Objeto archivo con posibles URLs existentes
 * @returns URL final para el archivo
 */
export function generateFileUrl(file: Record<string, unknown>): string {
  // Prioridad: url existente -> fileUrl existente -> generar desde s3Key -> generar desde id
  const existingUrl = file.url || file.fileUrl;
  
  if (existingUrl && typeof existingUrl === 'string' && existingUrl.startsWith('http')) {
    return existingUrl;
  }
  
  // Si no hay URL válida, generar desde s3Key o id
  const s3Key = file.s3Key || file.id;
  
  if (s3Key && typeof s3Key === 'string') {
    return generateS3Url(s3Key);
  }
  
  // Fallback: devolver string vacío si no hay datos suficientes
  console.warn('No se pudo generar URL para el archivo:', file);
  return '';
}

/**
 * Procesa un array de archivos agregando URLs dinámicas
 * @param files - Array de archivos a procesar
 * @returns Array de archivos con URLs generadas
 */
export function processFilesWithUrls(files: Record<string, unknown>[]): Record<string, unknown>[] {
  const processedFiles = files.map(file => {
    const generatedUrl = generateFileUrl(file);
    
    return {
      ...file,
      url: generatedUrl,
      fileUrl: generatedUrl,
      id: String(file.id || ''),
      name: String(file.name || '')
    };
  });
  
  return processedFiles;
}