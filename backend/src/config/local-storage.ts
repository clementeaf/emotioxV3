/**
 * Configuración de almacenamiento local para cPanel
 * Reemplaza S3 con almacenamiento en el sistema de archivos
 */

import path from 'path';
import fs from 'fs';

const MEDIA_BASE_DIR = process.env.MEDIA_BASE_DIR || path.join(process.cwd(), 'media');
const MEDIA_PUBLIC_URL = process.env.MEDIA_PUBLIC_URL || '/media';

/**
 * Obtiene la ruta completa para un archivo de media
 * @param relativePath - Ruta relativa (ej: research/{id}/{file})
 * @returns Ruta absoluta en el sistema de archivos
 */
export const getMediaPath = (relativePath: string): string => {
    // Validar que no haya path traversal
    if (relativePath.includes('..') || relativePath.startsWith('/') || relativePath.startsWith('\\')) {
        throw new Error('Invalid media path');
    }
    
    const fullPath = path.join(MEDIA_BASE_DIR, relativePath);
    
    // Asegurar que está dentro del directorio base
    if (!fullPath.startsWith(path.resolve(MEDIA_BASE_DIR))) {
        throw new Error('Invalid media path: outside base directory');
    }
    
    return fullPath;
};

/**
 * Obtiene la URL pública para un archivo de media
 * @param relativePath - Ruta relativa (ej: research/{id}/{file})
 * @returns URL pública accesible
 */
export const getMediaUrl = (relativePath: string): string => {
    // Normalizar separadores de ruta
    const normalizedPath = relativePath.replace(/\\/g, '/');
    
    // Si MEDIA_PUBLIC_URL ya incluye el dominio completo, usarlo
    if (MEDIA_PUBLIC_URL.startsWith('http://') || MEDIA_PUBLIC_URL.startsWith('https://')) {
        return `${MEDIA_PUBLIC_URL}/${normalizedPath}`;
    }
    
    // Para cPanel: el backend está en /api, pero los archivos se sirven en /media
    // Las URLs relativas funcionan porque Express sirve los archivos estáticos
    // La URL será /media/research/... y el middleware de Express la servirá
    return `${MEDIA_PUBLIC_URL}/${normalizedPath}`;
};

/**
 * Asegura que el directorio para un archivo existe
 * @param filePath - Ruta completa del archivo
 */
export const ensureDirectoryExists = (filePath: string): void => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

/**
 * Inicializa el directorio base de media
 */
export const initializeMediaDirectory = (): void => {
    if (!fs.existsSync(MEDIA_BASE_DIR)) {
        fs.mkdirSync(MEDIA_BASE_DIR, { recursive: true });
        console.log(`✓ Media directory created: ${MEDIA_BASE_DIR}`);
    }
};

export default {
    MEDIA_BASE_DIR,
    MEDIA_PUBLIC_URL,
    getMediaPath,
    getMediaUrl,
    ensureDirectoryExists,
    initializeMediaDirectory,
};
