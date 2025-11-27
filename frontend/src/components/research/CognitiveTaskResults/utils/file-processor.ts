/**
 * Utilidades para procesar archivos de preguntas
 */

import type { QuestionFile, ResearchConfigQuestionWithFiles } from '../types/data-processing';
import type { ImageFile } from '../components/NavigationFlow/types';

/**
 * Obtiene los archivos de una pregunta desde la configuración
 */
export function getQuestionFiles(
  question: ResearchConfigQuestionWithFiles,
  researchConfig: { questions?: ResearchConfigQuestionWithFiles[] } | null
): Array<QuestionFile | string> {
  let questionFiles = question.files;

  if ((!questionFiles || !Array.isArray(questionFiles) || questionFiles.length === 0) && researchConfig) {
    const configQuestion = researchConfig.questions?.find((q) => q.id === question.id);
    if (configQuestion?.files && Array.isArray(configQuestion.files)) {
      questionFiles = configQuestion.files;
    }
  }

  return questionFiles || [];
}

/**
 * Transforma un array de archivos a formato ImageFile
 */
export function transformFilesToImageFiles(files: Array<QuestionFile | string>): ImageFile[] {
  const filesArray = Array.isArray(files) ? files : [];

  return filesArray
    .map((file): ImageFile | null => {
      if (typeof file === 'string') {
        return {
          id: `file-${Date.now()}-${Math.random()}`,
          url: file,
          name: `Imagen ${filesArray.indexOf(file) + 1}`,
          hitZones: []
        };
      }

      if (file && typeof file === 'object') {
        return {
          id: file.id || file.s3Key || `file-${Date.now()}-${Math.random()}`,
          url: file.url || file.s3Url || file.s3Key || '',
          name: file.name || file.fileName || `Imagen ${filesArray.indexOf(file) + 1}`,
          hitZones: Array.isArray(file.hitZones)
            ? (file.hitZones as ImageFile['hitZones'])
            : Array.isArray(file.hitzones)
              ? (file.hitzones as ImageFile['hitZones'])
              : []
        };
      }

      return null;
    })
    .filter((f): f is ImageFile => f !== null);
}

/**
 * Obtiene la URL de un archivo desde diferentes propiedades posibles
 */
export function getFileUrl(file: QuestionFile | string): string | undefined {
  if (typeof file === 'string') {
    return file;
  }

  return file.url || file.preview || file.path || file.src || file.s3Url || file.s3Key;
}

/**
 * Crea un mapa de archivos indexado por nombre o índice
 */
export function createFilesMap(files: Array<QuestionFile | string>): Map<string, string> {
  const filesMap = new Map<string, string>();

  if (Array.isArray(files)) {
    files.forEach((file, index) => {
      const fileUrl = getFileUrl(file);
      if (fileUrl) {
        const fileKey = (typeof file === 'object' && file.name) || `option-${index + 1}`;
        filesMap.set(fileKey, fileUrl);
        filesMap.set(`option-${index + 1}`, fileUrl);
      }
    });
  }

  return filesMap;
}

/**
 * Busca la URL de una imagen para una opción específica
 * @param filesMap - Mapa de archivos indexado
 * @param questionFiles - Array de archivos de la pregunta
 * @param optionName - Nombre de la opción a buscar
 * @param optionIndex - Índice de la opción (0-based)
 * @returns URL de la imagen encontrada o undefined
 */
export function findImageUrlForOption(
  filesMap: Map<string, string>,
  questionFiles: Array<QuestionFile | string>,
  optionName?: string,
  optionIndex?: number
): string | undefined {
  // Estrategia 1: Buscar por nombre de opción en el mapa
  if (optionName) {
    const url = filesMap.get(optionName);
    if (url) {
      return url;
    }
  }

  // Estrategia 2: Buscar por índice en el mapa
  if (optionIndex !== undefined) {
    const url = filesMap.get(`option-${optionIndex + 1}`);
    if (url) {
      return url;
    }
  }

  // Estrategia 3: Buscar directamente en el array de archivos por índice
  if (optionIndex !== undefined && Array.isArray(questionFiles) && questionFiles[optionIndex]) {
    const file = questionFiles[optionIndex];
    return getFileUrl(file);
  }

  return undefined;
}

/**
 * Transforma archivos de pregunta a formato de imágenes para PreferenceTest
 * @param files - Array de archivos de la pregunta
 * @returns Array de objetos con url, name e id para mostrar en miniatura
 */
export function transformFilesToPreferenceImages(
  files: Array<QuestionFile | string>
): Array<{ url: string; name: string; id: string }> {
  if (!Array.isArray(files)) {
    return [];
  }

  return files
    .map((file) => {
      if (typeof file === 'string') {
        return { url: file, name: 'Imagen', id: file };
      }

      const url = getFileUrl(file);
      return url
        ? {
            url,
            name: file.name || 'Imagen',
            id: file.id || file.name || url
          }
        : null;
    })
    .filter((img): img is { url: string; name: string; id: string } => img !== null);
}

