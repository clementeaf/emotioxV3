import { eyeTrackingApi } from '@/api/domains/eye-tracking';
import type { EyeTrackingFormData } from '@/api/domains/eye-tracking';

/**
 * Interfaz que extiende los datos del formulario con campos adicionales del servidor
 */
export interface EyeTrackingRecord extends EyeTrackingFormData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Servicio para manejar operaciones relacionadas con el seguimiento ocular
 * Migrated to use domain architecture while maintaining same interface
 */
export const eyeTrackingService = {
  /**
   * Obtiene la configuración de seguimiento ocular por su ID
   * @param id ID de la configuración
   * @returns Configuración solicitada
   */
  async getById(_id: string): Promise<EyeTrackingRecord> {
    throw new Error('getById not supported - use getByResearchId');
  },

  /**
   * Obtiene la configuración de seguimiento ocular para una investigación específica
   * @param researchId ID de la investigación
   * @returns Configuración solicitada
   */
  async getByResearchId(researchId: string): Promise<EyeTrackingFormData | null> {
    try {
      const data = await eyeTrackingApi.getByResearchId(researchId);
      return data as any; // Type conversion for backward compatibility
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error && (error as any).statusCode === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Crea una nueva configuración de seguimiento ocular
   * @param researchId ID de la investigación
   * @param data Datos de la nueva configuración
   * @returns Configuración creada
   */
  async create(researchId: string, data: EyeTrackingFormData): Promise<EyeTrackingFormData> {
    const buildData = await eyeTrackingApi.build.create({
      ...data,
      researchId
    } as any);
    return buildData as any;
  },

  /**
   * Actualiza una configuración de seguimiento ocular existente
   * @param researchId ID de la investigación
   * @param data Datos a actualizar
   * @returns Configuración actualizada
   */
  async update(researchId: string, data: Partial<EyeTrackingFormData>): Promise<EyeTrackingFormData> {
    const buildData = await eyeTrackingApi.build.update(researchId, data as any);
    return buildData as any;
  },

  /**
   * Actualiza o crea una configuración de seguimiento ocular para una investigación específica
   * @param researchId ID de la investigación
   * @param data Datos completos de la configuración
   * @returns Configuración actualizada o creada
   */
  async updateByResearchId(researchId: string, data: EyeTrackingFormData): Promise<EyeTrackingRecord> {
    const buildData = await eyeTrackingApi.build.update(researchId, data as any);
    return buildData as any;
  },

  /**
   * Elimina una configuración de seguimiento ocular
   * @param researchId ID de la investigación
   * @returns Confirmación de eliminación
   */
  async deleteByResearchId(researchId: string): Promise<void> {
    await eyeTrackingApi.build.delete(researchId);
  },

  /**
   * Obtiene la configuración de seguimiento ocular para participantes
   * @param researchId ID de la investigación
   * @returns Configuración para participantes
   */
  async getForParticipant(researchId: string): Promise<EyeTrackingRecord> {
    const data = await eyeTrackingApi.getByResearchId(researchId);
    return data as any;
  }
};

export default eyeTrackingService;