import { useState, useEffect } from 'react';
import { Company } from '../../../shared/interfaces/company.interface';
import { companyService } from '@/services/companyService';

interface UseCompaniesResult {
  companies: Company[];
  loading: boolean;
  error: string | null;
  refreshCompanies: () => Promise<void>;
}

/**
 * Hook para manejar el estado y carga de empresas
 */
export const useCompanies = (autoLoad: boolean = true): UseCompaniesResult => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Token is now handled automatically by axios interceptors
      
      const fetchedCompanies = await companyService.getActiveCompanies();
      setCompanies(fetchedCompanies);
      
      // Si no hay empresas en la base de datos, usar fallback
      if (fetchedCompanies.length === 0) {
        const fallbackCompanies: Company[] = [
          { id: 'enterprise1', name: 'Enterprise 1', status: 'active', createdAt: '', updatedAt: '' },
          { id: 'enterprise2', name: 'Enterprise 2', status: 'active', createdAt: '', updatedAt: '' },
          { id: 'enterprise3', name: 'Enterprise 3', status: 'active', createdAt: '', updatedAt: '' }
        ];
        setCompanies(fallbackCompanies);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading companies');
      
      // En caso de error, usar empresas de fallback
      const fallbackCompanies: Company[] = [
        { id: 'enterprise1', name: 'Enterprise 1', status: 'active', createdAt: '', updatedAt: '' },
        { id: 'enterprise2', name: 'Enterprise 2', status: 'active', createdAt: '', updatedAt: '' },
        { id: 'enterprise3', name: 'Enterprise 3', status: 'active', createdAt: '', updatedAt: '' }
      ];
      setCompanies(fallbackCompanies);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad) {
      fetchCompanies();
    }
  }, [autoLoad]);

  return {
    companies,
    loading,
    error,
    refreshCompanies: fetchCompanies
  };
};