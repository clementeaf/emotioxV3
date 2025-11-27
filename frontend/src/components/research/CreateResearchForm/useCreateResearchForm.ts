import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useCreateResearch, useResearchList } from '@/api/domains/research';
import { useResearchStore, researchHelpers } from '@/stores/useResearchStore';
import { getTechniqueStages } from '@/config/techniques-registry';
import { ResearchBasicData, ResearchType } from '../../../../../shared/interfaces/research.model';
import { CreateResearchRequest } from '@/api/domains/research/research.types';

interface Step {
  id: number;
  title: string;
  description: string;
}

interface FormState {
  basic: ResearchBasicData;
  currentStep: number;
  errors: Record<string, string>;
}

const steps: Step[] = [
  { id: 1, title: 'Name', description: 'Research name and client' },
  { id: 2, title: 'Type', description: 'Research type selection' },
  { id: 3, title: 'Technique', description: 'Configuration setup' }
];

const initialFormState: FormState = {
  basic: {
    name: '',
    companyId: ''
  },
  currentStep: 1,
  errors: {}
};

export default function useCreateResearchForm(onResearchCreated?: (researchId: string, researchName: string) => void) {
  const router = useRouter();
  const { currentDraft, updateDraft, clearDraft, optimisticAdd, reconcileByClientId, rollback } = useResearchStore();

  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [showSummary, setShowSummary] = useState(false);
  const [countdown] = useState(3);

  const createResearchMutation = useCreateResearch();
  const isSubmitting = createResearchMutation.isPending;

  // Get existing research to validate duplicate names
  const { data: existingResearch = [] } = useResearchList();

  // Debounce timer for real-time validation
  const [validationTimer, setValidationTimer] = useState<NodeJS.Timeout | null>(null);

  // Real-time validation for research name
  useEffect(() => {
    // Clear existing timer
    if (validationTimer) {
      clearTimeout(validationTimer);
    }

    // Only validate if there's a name and it's at least 3 characters
    if (formData.basic.name && formData.basic.name.length >= 3) {
      const timer = setTimeout(() => {
        // Check for duplicate names
        const isDuplicate = existingResearch.some(
          research => research.name.toLowerCase().trim() === formData.basic.name.toLowerCase().trim()
        );

        if (isDuplicate) {
          setFormData(prev => ({
            ...prev,
            errors: {
              ...prev.errors,
              name: 'A research with this name already exists'
            }
          }));
        } else {
          // Clear the name error if it exists
          setFormData(prev => {
            const newErrors = { ...prev.errors };
            delete newErrors.name;
            return {
              ...prev,
              errors: newErrors
            };
          });
        }
      }, 1000); // 1 second debounce

      setValidationTimer(timer);
    } else if (formData.basic.name && formData.basic.name.length > 0 && formData.basic.name.length < 3) {
      // Show error for names too short
      const timer = setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          errors: {
            ...prev.errors,
            name: 'Name must be at least 3 characters'
          }
        }));
      }, 1000);
      setValidationTimer(timer);
    }

    // Cleanup
    return () => {
      if (validationTimer) {
        clearTimeout(validationTimer);
      }
    };
  }, [formData.basic.name, existingResearch]);

  // Restaurar borrador si existe
  useEffect(() => {
    if (currentDraft && currentDraft.data && currentDraft.data.basic) {
      setFormData((prev) => ({
        ...prev,
        basic: {
          ...prev.basic,
          name: prev.basic.name || currentDraft.data.basic?.name || '',
          companyId: prev.basic.companyId || currentDraft.data.basic?.description || '',
          type: prev.basic.type || (currentDraft.data.basic?.type as ResearchType) || undefined,
          technique: prev.basic.technique || (currentDraft.data.configuration?.technique || '')
        },
        currentStep: currentDraft.step === 'basic' ? 1 :
          currentDraft.step === 'configuration' ? 2 : 3,
        errors: {}
      }));
    }
  }, [currentDraft]);

  // Validación por paso
  const validateStep = (step: number): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.basic.name || formData.basic.name.length < 3) {
          newErrors.name = 'Name must be at least 3 characters';
        } else {
          // Check for duplicate names (case insensitive)
          const isDuplicate = existingResearch.some(
            research => research.name.toLowerCase().trim() === formData.basic.name.toLowerCase().trim()
          );
          if (isDuplicate) {
            newErrors.name = 'A research with this name already exists';
          }
        }
        if (!formData.basic.companyId) {
          newErrors.companyId = 'Company is required';
        }
        break;

      case 2:
        if (!formData.basic.type) {
          newErrors.type = 'Research type is required';
        }
        break;

      case 3:
        if (!formData.basic.technique) {
          newErrors.technique = 'Technique is required';
        }
        break;
    }

    return newErrors;
  };

  // Actualizar datos del formulario
  const updateFormData = (field: string, value: string) => {
    const currentFormData = { ...formData };
    currentFormData.basic = {
      ...currentFormData.basic,
      [field]: value
    };

    // Clear error for this field when user starts typing
    if (currentFormData.errors[field]) {
      currentFormData.errors = {
        ...currentFormData.errors,
        [field]: ''
      };
    }

    setFormData(currentFormData);

    // Actualizar borrador
    setTimeout(() => {
      updateDraft(
        {
          basic: {
            title: currentFormData.basic.name,
            description: currentFormData.basic.companyId,
            type: currentFormData.basic.type
          },
          configuration: {
            technique: currentFormData.basic.technique
          }
        },
        currentFormData.currentStep === 1 ? 'basic' :
          currentFormData.currentStep === 2 ? 'configuration' : 'review'
      );
    }, 0);
  };

  // Navegación
  const goToNextStep = () => {
    const errors = validateStep(formData.currentStep);

    if (Object.keys(errors).length > 0) {
      setFormData(prev => ({ ...prev, errors }));

      // Focus en el primer campo con error
      setTimeout(() => {
        if (errors.name) {
          const nameInput = document.getElementById('name');
          nameInput?.focus();
        } else if (errors.companyId) {
          const companySelect = document.getElementById('companyId');
          companySelect?.focus();
        }
      }, 0);

      return;
    }

    setFormData(prev => ({
      ...prev,
      currentStep: prev.currentStep + 1,
      errors: {}
    }));
  };

  const goToPreviousStep = () => {
    setFormData(prev => ({
      ...prev,
      currentStep: prev.currentStep - 1,
      errors: {}
    }));
  };

  // Toggles
  const toggleResearchType = (type: ResearchType) => {
    updateFormData('type', type);
  };

  const toggleTechnique = (technique: string) => {
    updateFormData('technique', technique);
  };

  const submitForm = async () => {
    console.log('🚀 CREATE FORM SUBMIT STARTED');

    const finalErrors = validateStep(formData.currentStep);

    if (Object.keys(finalErrors).length > 0) {
      console.log('🚀 VALIDATION ERRORS:', finalErrors);
      setFormData(prev => ({ ...prev, errors: finalErrors }));
      return;
    }

    if (isSubmitting) return;

    const clientId = researchHelpers.newClientId();
    console.log('🚀 GENERATED CLIENT ID:', clientId);
    const createData: CreateResearchRequest = {
      name: formData.basic.name,
      companyId: formData.basic.companyId,
      type: formData.basic.type || ResearchType.BEHAVIOURAL,
      technique: formData.basic.technique || '',
      description: formData.basic.description || ''
    };

    console.log('🚀 ADDING OPTIMISTIC RESEARCH:', createData);
    optimisticAdd({
      clientId,
      name: createData.name,
      description: createData.description,
      companyId: createData.companyId,
      type: createData.type,
      technique: createData.technique,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    try {
      console.log('🚀 SENDING CREATE REQUEST TO BACKEND');
      const result = await createResearchMutation.mutateAsync(createData);
      console.log('🚀 BACKEND CREATE SUCCESS:', result);

      const resultData = result as { data?: any; id?: string; name?: string; message?: string; [key: string]: any };

      console.log('🚀 RECONCILING OPTIMISTIC DATA WITH REAL ID');
      reconcileByClientId(clientId, {
        id: resultData.data?.id || resultData.id,
        name: resultData.data?.name || resultData.name,
        description: resultData.data?.description || resultData.description,
        companyId: resultData.data?.companyId || resultData.companyId,
        type: resultData.data?.type || resultData.type,
        technique: resultData.data?.technique || resultData.technique,
        status: resultData.data?.status || resultData.status || 'draft',
        createdAt: resultData.data?.createdAt || resultData.createdAt,
        updatedAt: resultData.data?.updatedAt || resultData.updatedAt,
      });

      toast.success(resultData.message || 'Investigación creada correctamente');
      clearDraft();

      const techniqueStages = getTechniqueStages(resultData.data?.technique || resultData.technique || '');
      const firstSection = techniqueStages[0] || 'welcome-screen';
      const researchId = resultData.data?.id || resultData.id;

      if ((resultData.data?.technique || resultData.technique) === 'aim-framework') {
        router.push(`/dashboard?research=${researchId}&aim=true&section=${firstSection}`);
      } else {
        router.push(`/dashboard?research=${researchId}&section=${firstSection}`);
      }

      if (onResearchCreated) {
        onResearchCreated(researchId, resultData.data?.name || resultData.name);
      }

    } catch (error: unknown) {
      console.log('🚀 CREATE FAILED - ROLLING BACK:', error);
      rollback();
      const errorMessage = error instanceof Error ? error.message : 'Error al crear la investigación';
      toast.error(errorMessage);
    }
  };

  // Verificaciones de estado
  const canGoNext = () => {
    const errors = validateStep(formData.currentStep);
    return Object.keys(errors).length === 0;
  };

  return {
    // Estado
    formData,
    steps,
    isSubmitting,
    showSummary,
    countdown,
    
    // Acciones
    updateFormData,
    goToNextStep,
    goToPreviousStep,
    toggleResearchType,
    toggleTechnique,
    submitForm,
    
    // Validaciones
    canGoNext
  };
}