import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/api/config/axios';

export interface EducationalContent {
  id: string;
  contentType: 'smart_voc' | 'cognitive_task';
  title: string;
  generalDescription: string;
  typeExplanation: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UseEducationalContentReturn {
  smartVocContent: EducationalContent | null;
  cognitiveTaskContent: EducationalContent | null;
  loading: boolean;
  error: string | null;
  refreshContent: () => Promise<void>;
}

/**
 * Hook para gestionar el contenido educativo desde la API
 */
export const useEducationalContent = (): UseEducationalContentReturn => {
  const { token } = useAuth();
  const [smartVocContent, setSmartVocContent] = useState<EducationalContent | null>(null);
  const [cognitiveTaskContent, setCognitiveTaskContent] = useState<EducationalContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEducationalContent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        setError('No se pudo obtener el token de autenticación');
        return;
      }

      const response = await apiClient.get<{ data: EducationalContent[] }>('/educational-content');
      const contents = response.data.data;

      const smartVoc = contents.find((c) => c.contentType === 'smart_voc');
      const cognitive = contents.find((c) => c.contentType === 'cognitive_task');

      setSmartVocContent(smartVoc || null);
      setCognitiveTaskContent(cognitive || null);
    } catch (err) {
      console.error('Error loading educational content:', err);
      setError('Error al cargar el contenido educativo');
    } finally {
      setLoading(false);
    }
  };

  const refreshContent = async () => {
    await loadEducationalContent();
  };

  useEffect(() => {
    loadEducationalContent();
  }, []);

  return {
    smartVocContent,
    cognitiveTaskContent,
    loading,
    error,
    refreshContent,
  };
};