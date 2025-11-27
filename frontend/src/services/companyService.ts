import { companiesApi } from '@/api/domains/companies';
import type { Company } from '@/api/domains/companies';

/**
 * Servicio para manejar operaciones con empresas
 */
export class CompanyService {
  /**
   * Obtiene todas las empresas activas
   */
  async getActiveCompanies(): Promise<Company[]> {
    try {
      const response = await companiesApi.getAll();
      
      if (response.success && response.data) {
        // Filtrar solo empresas activas
        return response.data.filter((company: Company) => company.status === 'active');
      }
      
      return [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtiene una empresa por ID
   */
  async getCompanyById(id: string): Promise<Company | null> {
    try {
      const response = await companiesApi.getById(id);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Crea una nueva empresa
   */
  async createCompany(name: string, status: 'active' | 'inactive' = 'active'): Promise<Company | null> {
    try {
      const response = await companiesApi.create({ name, status });
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualiza una empresa
   */
  async updateCompany(id: string, updates: { name?: string; status?: 'active' | 'inactive' }): Promise<Company | null> {
    try {
      const response = await companiesApi.update(id, updates);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Elimina una empresa
   */
  async deleteCompany(id: string): Promise<boolean> {
    try {
      const response = await companiesApi.delete(id);
      return response.success || false;
    } catch (error) {
      return false;
    }
  }
}

// Instancia singleton
export const companyService = new CompanyService();