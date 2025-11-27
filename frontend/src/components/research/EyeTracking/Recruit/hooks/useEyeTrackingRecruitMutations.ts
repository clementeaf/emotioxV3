import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { eyeTrackingApi, eyeTrackingKeys } from '@/api/domains/eye-tracking';
import { transformFormDataToAPI } from '../utils/formHelpers';
import { EyeTrackingRecruitFormData } from '../types/formData.types';

export function useEyeTrackingRecruitMutations(
  researchId: string,
  onError: (error: { visible: boolean; title: string; message: string }) => void
) {
  const queryClient = useQueryClient();
  const actualResearchId = researchId === 'current' ? '1234' : researchId;

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: EyeTrackingRecruitFormData) => {
      const apiData = transformFormDataToAPI(data);

      // Check if config exists
      const existingConfig = await eyeTrackingApi.recruit.getConfigByResearch(actualResearchId);

      if (existingConfig) {
        return eyeTrackingApi.recruit.updateConfig(actualResearchId, apiData as any);
      } else {
        return eyeTrackingApi.recruit.createConfig(actualResearchId, apiData as any);
      }
    },
    onSuccess: () => {
      toast.success('Configuración guardada exitosamente');
      queryClient.invalidateQueries({ queryKey: eyeTrackingKeys.recruit(actualResearchId) });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Error desconocido';
      onError({
        visible: true,
        title: 'Error al guardar',
        message: errorMessage
      });
    }
  });

  // Generate link mutation
  const generateLinkMutation = useMutation({
    mutationFn: async (configId: string) => {
      const result = await eyeTrackingApi.recruit.generateLink(configId);
      return result;
    },
    onSuccess: () => {
      toast.success('Enlace generado exitosamente');
      queryClient.invalidateQueries({ queryKey: eyeTrackingKeys.recruit(actualResearchId) });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Error al generar enlace';
      onError({
        visible: true,
        title: 'Error',
        message: errorMessage
      });
    }
  });

  // Delete configuration mutation
  const deleteConfigMutation = useMutation({
    mutationFn: async (configId: string) => {
      await eyeTrackingApi.recruit.deleteConfig(actualResearchId);
      return configId;
    },
    onSuccess: () => {
      toast.success('Configuración eliminada');
      queryClient.invalidateQueries({ queryKey: eyeTrackingKeys.recruit(actualResearchId) });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Error al eliminar';
      onError({
        visible: true,
        title: 'Error',
        message: errorMessage
      });
    }
  });

  return {
    saveConfigMutation: {
      mutate: saveConfigMutation.mutate,
      isPending: saveConfigMutation.isPending
    },
    generateLinkMutation: {
      mutate: generateLinkMutation.mutate,
      isPending: generateLinkMutation.isPending
    },
    deleteConfigMutation: {
      mutate: deleteConfigMutation.mutate,
      isPending: deleteConfigMutation.isPending
    },
    isLoading: saveConfigMutation.isPending || generateLinkMutation.isPending || deleteConfigMutation.isPending,
  };
}