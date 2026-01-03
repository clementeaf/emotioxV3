import { useState, useEffect } from 'react';
import { researchTypesService } from '../services/researchTypes.service';
import { type ResearchTechnique } from '../services/researchTechniques.service';
import { useCreateResearch } from './useResearchQuery';

interface CreateResearchFormData {
    name: string;
    enterpriseId: string;
    enterpriseName: string;
    researchTypeId: string;
    researchTechniqueId: string;
    useDefaultModules: boolean;
}

interface ResearchFormErrors {
    name?: string;
    enterpriseId?: string;
    enterpriseName?: string;
    researchTypeId?: string;
    researchTechniqueId?: string;
}

export const useResearchForm = () => {
    const [formData, setFormData] = useState<CreateResearchFormData>({
        name: '',
        enterpriseId: '',
        enterpriseName: '',
        researchTypeId: '',
        researchTechniqueId: '',
        useDefaultModules: true,
    });
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [researchTypes, setResearchTypes] = useState<Array<{ id: string; name: string; default_modules?: any[] }>>([]);
    const [loadingResearchTypes, setLoadingResearchTypes] = useState<boolean>(false);
    const [availableTechniques, setAvailableTechniques] = useState<ResearchTechnique[]>([]);
    const [loadingTechniquesForType, setLoadingTechniquesForType] = useState<boolean>(false);
    const [formErrors, setFormErrors] = useState<ResearchFormErrors>({});
    const [submitError, setSubmitError] = useState<string>('');
    const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
    
    // Usar el hook de React Query para crear research (con invalidación automática)
    const createResearchMutation = useCreateResearch();

    useEffect(() => {
        void loadResearchTypes();
    }, []);

    const loadResearchTypes = async (): Promise<void> => {
        setLoadingResearchTypes(true);
        try {
            const response = await researchTypesService.list();
            setResearchTypes(response.researchTypes.map((rt) => ({ id: rt.id, name: rt.name, default_modules: rt.default_modules })));
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load research types';
            setSubmitError(errorMessage);
        } finally {
            setLoadingResearchTypes(false);
        }
    };

    const loadTechniquesForType = async (researchTypeId: string): Promise<void> => {
        setLoadingTechniquesForType(true);
        setFormData((prev) => ({ ...prev, researchTechniqueId: '' }));
        try {
            const techniques = await researchTypesService.getTechniquesByType(researchTypeId);
            setAvailableTechniques(techniques);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load research techniques';
            setSubmitError(errorMessage);
            setAvailableTechniques([]);
        } finally {
            setLoadingTechniquesForType(false);
        }
    };

    const validateStep1 = (): boolean => {
        const newErrors: ResearchFormErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Research Name is required';
        }

        if (!formData.enterpriseId && !formData.enterpriseName.trim()) {
            newErrors.enterpriseId = 'Enterprise is required';
        }

        setFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = (): boolean => {
        const newErrors: ResearchFormErrors = {};

        if (!formData.researchTypeId) {
            newErrors.researchTypeId = 'Research Type is required';
        }

        if (!formData.researchTechniqueId) {
            newErrors.researchTechniqueId = 'Research Technique is required';
        }

        setFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFieldChange = (field: keyof CreateResearchFormData, value: string | boolean): void => {
        console.log('[useResearchForm] Field changed:', { field, value });
        setFormData((prev) => {
            const newData = { ...prev, [field]: value };
            console.log('[useResearchForm] Updated formData:', newData);
            return newData;
        });
        if (formErrors[field as keyof ResearchFormErrors]) {
            setFormErrors((prev) => ({ ...prev, [field]: undefined }));
        }
        setSubmitError('');
        setSubmitSuccess(false);
    };

    const handleNextStep = (): void => {
        if (currentStep === 0) {
            if (validateStep1()) {
                setCurrentStep(1);
            }
        }
    };

    const handlePreviousStep = (): void => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async (enterpriseId?: string): Promise<string | null> => {
        setSubmitError('');
        setSubmitSuccess(false);

        console.log('[useResearchForm] handleSubmit called', {
            currentStep,
            enterpriseId,
            formData,
        });

        if (currentStep === 0) {
            handleNextStep();
            return null;
        }

        console.log('[useResearchForm] Validating step 2...');
        if (!validateStep2()) {
            console.error('[useResearchForm] Step 2 validation failed', formErrors);
            return null;
        }

        console.log('[useResearchForm] Validation passed, creating research...');

        try {
            // Extract default modules if enabled
            const selectedType = researchTypes.find(rt => rt.id === formData.researchTypeId);
            const createData: any = {
                name: formData.name.trim(),
                enterprise_id: enterpriseId || formData.enterpriseId || undefined,
                research_type_id: formData.researchTypeId,
                research_technique_id: formData.researchTechniqueId,
            };

            if (formData.useDefaultModules && selectedType?.default_modules) {
                const moduleNames = selectedType.default_modules.map((m: any) => m.name);
                if (moduleNames.length > 0) {
                    createData.use_default_modules = moduleNames;
                }
            }

            console.log('[useResearchForm] Sending create request with data:', createData);
            // Usar la mutación de React Query que invalida automáticamente las queries
            const response = await createResearchMutation.mutateAsync(createData);
            console.log('[useResearchForm] Research created successfully:', response);
            setSubmitSuccess(true);
            return response.research.id;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create research';
            console.error('[useResearchForm] Error creating research:', error);
            setSubmitError(errorMessage);
            return null;
        }
    };

    const resetForm = (): void => {
        setFormData({
            name: '',
            enterpriseId: '',
            enterpriseName: '',
            researchTypeId: '',
            researchTechniqueId: '',
            useDefaultModules: true,
        });
        setFormErrors({});
        setSubmitError('');
        setSubmitSuccess(false);
        setCurrentStep(0);
    };

    return {
        formData,
        currentStep,
        researchTypes,
        loadingResearchTypes,
        availableTechniques,
        loadingTechniquesForType,
        formErrors,
        isCreating: createResearchMutation.isPending,
        submitError,
        submitSuccess,
        setFormData,
        setCurrentStep,
        handleFieldChange,
        handleNextStep,
        handlePreviousStep,
        handleSubmit,
        resetForm,
        loadTechniquesForType,
    };
};
