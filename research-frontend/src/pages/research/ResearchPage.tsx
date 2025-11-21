import { useState, useEffect, type FormEvent } from 'react';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { CustomSelect } from '../../components/common/CustomSelect';
import { Autocomplete, type AutocompleteOption } from '../../components/common/Autocomplete';
import { Modal } from '../../components/common/Modal';
import { Stepper } from '../../components/common/Stepper';
import { researchTypesService } from '../../services/researchTypes.service';
import { researchTechniquesService, type ResearchTechnique } from '../../services/researchTechniques.service';
import { researchService } from '../../services/research.service';
import { enterprisesService, type Enterprise } from '../../services/enterprises.service';

interface CreateResearchTypeFormData {
    name: string;
    researchTechniqueId: string;
}

interface CreateResearchTechniqueFormData {
    name: string;
    description: string;
}

interface FormErrors {
    name?: string;
    researchTechniqueId?: string;
}

interface ResearchTechniqueFormErrors {
    name?: string;
    description?: string;
}

interface CreateResearchFormData {
    name: string;
    enterpriseId: string;
    enterpriseName: string;
    researchTypeId: string;
    researchTechniqueId: string;
}

interface CreateEnterpriseFormData {
    name: string;
}

interface ResearchFormErrors {
    name?: string;
    enterpriseId?: string;
    enterpriseName?: string;
    researchTypeId?: string;
    researchTechniqueId?: string;
}

interface EnterpriseFormErrors {
    name?: string;
}

/**
 * Main Research page
 * Contains two tabs: create research type and create research
 */
export const ResearchPage = () => {
    const [activeTab, setActiveTab] = useState<'type' | 'research'>('type');
    const [formData, setFormData] = useState<CreateResearchTypeFormData>({
        name: '',
        researchTechniqueId: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [submitError, setSubmitError] = useState<string>('');
    const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

    const [researchTechniques, setResearchTechniques] = useState<ResearchTechnique[]>([]);
    const [loadingTechniques, setLoadingTechniques] = useState<boolean>(false);
    const [showCreateTechnique, setShowCreateTechnique] = useState<boolean>(false);
    const [techniqueFormData, setTechniqueFormData] = useState<CreateResearchTechniqueFormData>({
        name: '',
        description: '',
    });
    const [techniqueFormErrors, setTechniqueFormErrors] = useState<ResearchTechniqueFormErrors>({});
    const [isCreatingTechnique, setIsCreatingTechnique] = useState<boolean>(false);
    const [techniqueSubmitError, setTechniqueSubmitError] = useState<string>('');
    const [techniqueSubmitSuccess, setTechniqueSubmitSuccess] = useState<boolean>(false);

    const [researchFormData, setResearchFormData] = useState<CreateResearchFormData>({
        name: '',
        enterpriseId: '',
        enterpriseName: '',
        researchTypeId: '',
        researchTechniqueId: '',
    });
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [researchTypes, setResearchTypes] = useState<Array<{ id: string; name: string }>>([]);
    const [loadingResearchTypes, setLoadingResearchTypes] = useState<boolean>(false);
    const [availableTechniques, setAvailableTechniques] = useState<ResearchTechnique[]>([]);
    const [loadingTechniquesForType, setLoadingTechniquesForType] = useState<boolean>(false);
    const [researchFormErrors, setResearchFormErrors] = useState<ResearchFormErrors>({});
    const [isCreatingResearch, setIsCreatingResearch] = useState<boolean>(false);
    const [researchSubmitError, setResearchSubmitError] = useState<string>('');
    const [researchSubmitSuccess, setResearchSubmitSuccess] = useState<boolean>(false);

    const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
    const [loadingEnterprises, setLoadingEnterprises] = useState<boolean>(false);
    const [showCreateEnterprise, setShowCreateEnterprise] = useState<boolean>(false);
    const [enterpriseFormData, setEnterpriseFormData] = useState<CreateEnterpriseFormData>({
        name: '',
    });
    const [enterpriseFormErrors, setEnterpriseFormErrors] = useState<EnterpriseFormErrors>({});
    const [isCreatingEnterprise, setIsCreatingEnterprise] = useState<boolean>(false);
    const [enterpriseSubmitError, setEnterpriseSubmitError] = useState<string>('');
    const [enterpriseSubmitSuccess, setEnterpriseSubmitSuccess] = useState<boolean>(false);

    /**
     * Loads research techniques from the API
     */
    const loadResearchTechniques = async (): Promise<void> => {
        setLoadingTechniques(true);
        try {
            const response = await researchTechniquesService.list();
            setResearchTechniques(response.researchTechniques);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load research techniques';
            setSubmitError(errorMessage);
        } finally {
            setLoadingTechniques(false);
        }
    };

    /**
     * Loads enterprises from the API
     */
    const loadEnterprises = async (): Promise<void> => {
        setLoadingEnterprises(true);
        try {
            const response = await enterprisesService.list();
            setEnterprises(response.enterprises);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load enterprises';
            setResearchSubmitError(errorMessage);
        } finally {
            setLoadingEnterprises(false);
        }
    };

    /**
     * Loads research types from the API
     */
    const loadResearchTypes = async (): Promise<void> => {
        setLoadingResearchTypes(true);
        try {
            const response = await researchTypesService.list();
            setResearchTypes(response.researchTypes.map((rt) => ({ id: rt.id, name: rt.name })));
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load research types';
            setResearchSubmitError(errorMessage);
        } finally {
            setLoadingResearchTypes(false);
        }
    };

    /**
     * Loads research techniques for a specific research type
     * @param researchTypeId - ID of the research type
     */
    const loadTechniquesForType = async (researchTypeId: string): Promise<void> => {
        setLoadingTechniquesForType(true);
        setResearchFormData((prev) => ({ ...prev, researchTechniqueId: '' }));
        try {
            const response = await researchTypesService.getTechniquesByType(researchTypeId);
            setAvailableTechniques(response.researchTechniques);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load research techniques';
            setResearchSubmitError(errorMessage);
            setAvailableTechniques([]);
        } finally {
            setLoadingTechniquesForType(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'type') {
            void loadResearchTechniques();
        } else if (activeTab === 'research') {
            void loadEnterprises();
            void loadResearchTypes();
        }
    }, [activeTab]);

    /**
     * Validates the form data
     * @returns true if valid, false otherwise
     */
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Research Type Name is required';
        }

        if (!formData.researchTechniqueId) {
            newErrors.researchTechniqueId = 'Research Technique is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Validates the research technique form data
     * @returns true if valid, false otherwise
     */
    const validateTechniqueForm = (): boolean => {
        const newErrors: ResearchTechniqueFormErrors = {};

        if (!techniqueFormData.name.trim()) {
            newErrors.name = 'Research Technique Name is required';
        }

        if (!techniqueFormData.description.trim()) {
            newErrors.description = 'Research Technique Description is required';
        }

        setTechniqueFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Handles form field changes
     * @param field - Field name to update
     * @param value - New value for the field
     */
    const handleFieldChange = (field: keyof CreateResearchTypeFormData, value: string): void => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
        setSubmitError('');
        setSubmitSuccess(false);
    };

    /**
     * Handles research technique form field changes
     * @param field - Field name to update
     * @param value - New value for the field
     */
    const handleTechniqueFieldChange = (field: keyof CreateResearchTechniqueFormData, value: string): void => {
        setTechniqueFormData((prev) => ({ ...prev, [field]: value }));
        if (techniqueFormErrors[field]) {
            setTechniqueFormErrors((prev) => ({ ...prev, [field]: undefined }));
        }
        setTechniqueSubmitError('');
        setTechniqueSubmitSuccess(false);
    };

    /**
     * Handles form submission
     * @param e - Form event
     */
    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setSubmitError('');
        setSubmitSuccess(false);

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            await researchTypesService.create({
                name: formData.name.trim(),
                research_technique_id: formData.researchTechniqueId,
            });

            setSubmitSuccess(true);
            setFormData({
                name: '',
                researchTechniqueId: '',
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create research type';
            setSubmitError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Handles research technique form submission
     * @param e - Form event
     */
    const handleTechniqueSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setTechniqueSubmitError('');
        setTechniqueSubmitSuccess(false);

        if (!validateTechniqueForm()) {
            return;
        }

        setIsCreatingTechnique(true);

        try {
            await researchTechniquesService.create({
                name: techniqueFormData.name.trim(),
                description: techniqueFormData.description.trim(),
            });

            setTechniqueSubmitSuccess(true);
            setTechniqueFormData({
                name: '',
                description: '',
            });

            setTimeout(async () => {
                setShowCreateTechnique(false);
                setTechniqueSubmitSuccess(false);
                await loadResearchTechniques();
            }, 1500);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create research technique';
            setTechniqueSubmitError(errorMessage);
        } finally {
            setIsCreatingTechnique(false);
        }
    };

    /**
     * Handles modal close
     */
    const handleCloseModal = (): void => {
        setShowCreateTechnique(false);
        setTechniqueFormData({
            name: '',
            description: '',
        });
        setTechniqueFormErrors({});
        setTechniqueSubmitError('');
        setTechniqueSubmitSuccess(false);
    };

    /**
     * Validates the research form data for step 1
     * @returns true if valid, false otherwise
     */
    const validateResearchFormStep1 = (): boolean => {
        const newErrors: ResearchFormErrors = {};

        if (!researchFormData.name.trim()) {
            newErrors.name = 'Research Name is required';
        }

        if (!researchFormData.enterpriseId && !researchFormData.enterpriseName.trim()) {
            newErrors.enterpriseId = 'Enterprise is required';
        }

        setResearchFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Validates the research form data for step 2
     * @returns true if valid, false otherwise
     */
    const validateResearchFormStep2 = (): boolean => {
        const newErrors: ResearchFormErrors = {};

        if (!researchFormData.researchTypeId) {
            newErrors.researchTypeId = 'Research Type is required';
        }

        if (!researchFormData.researchTechniqueId) {
            newErrors.researchTechniqueId = 'Research Technique is required';
        }

        setResearchFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Handles research form field changes
     * @param field - Field name to update
     * @param value - New value for the field
     */
    const handleResearchFieldChange = (field: keyof CreateResearchFormData, value: string): void => {
        setResearchFormData((prev) => ({ ...prev, [field]: value }));
        if (researchFormErrors[field]) {
            setResearchFormErrors((prev) => ({ ...prev, [field]: undefined }));
        }
        setResearchSubmitError('');
        setResearchSubmitSuccess(false);
    };

    /**
     * Handles enterprise selection from autocomplete
     * @param option - Selected enterprise option
     */
    const handleEnterpriseSelect = (option: AutocompleteOption): void => {
        setResearchFormData((prev) => ({
            ...prev,
            enterpriseId: option.value,
            enterpriseName: option.label,
        }));
        if (researchFormErrors.enterpriseId) {
            setResearchFormErrors((prev) => ({ ...prev, enterpriseId: undefined }));
        }
    };

    /**
     * Handles creating a new enterprise from autocomplete
     * @param enterpriseName - Name of the new enterprise
     */
    const handleCreateEnterpriseFromAutocomplete = async (enterpriseName: string): Promise<void> => {
        try {
            setIsCreatingResearch(true);
            const response = await enterprisesService.create({
                name: enterpriseName,
            });
            setResearchFormData((prev) => ({
                ...prev,
                enterpriseId: response.enterprise.id,
                enterpriseName: response.enterprise.name,
            }));
            await loadEnterprises();
            if (researchFormErrors.enterpriseId) {
                setResearchFormErrors((prev) => ({ ...prev, enterpriseId: undefined }));
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create enterprise';
            setResearchFormErrors((prev) => ({ ...prev, enterpriseId: errorMessage }));
        } finally {
            setIsCreatingResearch(false);
        }
    };

    /**
     * Handles moving to the next step
     */
    const handleNextStep = (): void => {
        if (currentStep === 0) {
            if (validateResearchFormStep1()) {
                setCurrentStep(1);
            }
        }
    };

    /**
     * Handles moving to the previous step
     */
    const handlePreviousStep = (): void => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    /**
     * Handles research form submission
     * @param e - Form event
     */
    const handleResearchSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setResearchSubmitError('');
        setResearchSubmitSuccess(false);

        if (currentStep === 0) {
            handleNextStep();
            return;
        }

        if (!validateResearchFormStep2()) {
            return;
        }

        setIsCreatingResearch(true);

        try {
            let enterpriseId = researchFormData.enterpriseId;

            if (!enterpriseId && researchFormData.enterpriseName.trim()) {
                const response = await enterprisesService.create({
                    name: researchFormData.enterpriseName.trim(),
                });
                enterpriseId = response.enterprise.id;
                await loadEnterprises();
            }

            await researchService.create({
                name: researchFormData.name.trim(),
                enterprise_id: enterpriseId || undefined,
                research_type_id: researchFormData.researchTypeId,
                research_technique_id: researchFormData.researchTechniqueId,
            });

            setResearchSubmitSuccess(true);
            setResearchFormData({
                name: '',
                enterpriseId: '',
                enterpriseName: '',
                researchTypeId: '',
                researchTechniqueId: '',
            });
            setCurrentStep(0);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create research';
            setResearchSubmitError(errorMessage);
        } finally {
            setIsCreatingResearch(false);
        }
    };

    /**
     * Validates the enterprise form data
     * @returns true if valid, false otherwise
     */
    const validateEnterpriseForm = (): boolean => {
        const newErrors: EnterpriseFormErrors = {};

        if (!enterpriseFormData.name.trim()) {
            newErrors.name = 'Enterprise Name is required';
        }

        setEnterpriseFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Handles enterprise form field changes
     * @param field - Field name to update
     * @param value - New value for the field
     */
    const handleEnterpriseFieldChange = (field: keyof CreateEnterpriseFormData, value: string): void => {
        setEnterpriseFormData((prev) => ({ ...prev, [field]: value }));
        if (enterpriseFormErrors[field]) {
            setEnterpriseFormErrors((prev) => ({ ...prev, [field]: undefined }));
        }
        setEnterpriseSubmitError('');
        setEnterpriseSubmitSuccess(false);
    };

    /**
     * Handles enterprise form submission
     * @param e - Form event
     */
    const handleEnterpriseSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setEnterpriseSubmitError('');
        setEnterpriseSubmitSuccess(false);

        if (!validateEnterpriseForm()) {
            return;
        }

        setIsCreatingEnterprise(true);

        try {
            await enterprisesService.create({
                name: enterpriseFormData.name.trim(),
            });

            setEnterpriseSubmitSuccess(true);
            setEnterpriseFormData({
                name: '',
            });

            setTimeout(async () => {
                setShowCreateEnterprise(false);
                setEnterpriseSubmitSuccess(false);
                await loadEnterprises();
            }, 1500);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create enterprise';
            setEnterpriseSubmitError(errorMessage);
        } finally {
            setIsCreatingEnterprise(false);
        }
    };

    /**
     * Handles enterprise modal close
     */
    const handleCloseEnterpriseModal = (): void => {
        setShowCreateEnterprise(false);
        setEnterpriseFormData({
            name: '',
        });
        setEnterpriseFormErrors({});
        setEnterpriseSubmitError('');
        setEnterpriseSubmitSuccess(false);
    };

    return (
        <div className="h-full p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-800">Research</h1>
                <p className="mt-1 text-sm text-gray-500">Manage research types and create new researches</p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => setActiveTab('type')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'type'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Create Research Type
                        </button>
                        <button
                            onClick={() => setActiveTab('research')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'research'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Create Research
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'type' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800 mb-6">Create Research Type</h2>
                                <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                                    <Input
                                        id="name"
                                        label="Research Type Name"
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleFieldChange('name', e.target.value)}
                                        error={errors.name}
                                        placeholder="Enter research type name"
                                        required
                                    />

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Research Technique
                                            </label>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowCreateTechnique(true)}
                                            >
                                                + Create New
                                            </Button>
                                        </div>
                                        <CustomSelect
                                            id="researchTechniqueId"
                                            value={formData.researchTechniqueId}
                                            onChange={(value) => handleFieldChange('researchTechniqueId', value)}
                                            error={errors.researchTechniqueId}
                                            placeholder={loadingTechniques ? 'Loading...' : 'Select a research technique'}
                                            options={researchTechniques.map((tech) => ({
                                                value: tech.id,
                                                label: tech.name,
                                            }))}
                                            disabled={loadingTechniques}
                                            required
                                        />
                                        {formData.researchTechniqueId && (
                                            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                                <p className="text-sm font-medium text-gray-700 mb-1">Research Technique Description:</p>
                                                <p className="text-sm text-gray-600">
                                                    {researchTechniques.find((tech) => tech.id === formData.researchTechniqueId)?.description || 'No description available'}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {submitError && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <p className="text-sm text-red-600">{submitError}</p>
                                        </div>
                                    )}

                                    {submitSuccess && (
                                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <p className="text-sm text-green-600">Research type created successfully!</p>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <Button type="submit" isLoading={isLoading} disabled={isLoading}>
                                            Create Research Type
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setFormData({
                                                    name: '',
                                                    researchTechniqueId: '',
                                                });
                                                setErrors({});
                                                setSubmitError('');
                                                setSubmitSuccess(false);
                                            }}
                                            disabled={isLoading}
                                        >
                                            Reset
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {activeTab === 'research' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800 mb-6">Create Research</h2>
                                <Stepper
                                    currentStep={currentStep}
                                    totalSteps={2}
                                    steps={[
                                        { label: 'Basic Information', description: 'Name and Enterprise' },
                                        { label: 'Research Configuration', description: 'Type and Technique' },
                                    ]}
                                    onStepChange={setCurrentStep}
                                >
                                    <form onSubmit={handleResearchSubmit} className="space-y-6 max-w-2xl">
                                        {currentStep === 0 && (
                                            <div className="space-y-6">
                                                <Input
                                                    id="researchName"
                                                    label="Research Name"
                                                    type="text"
                                                    value={researchFormData.name}
                                                    onChange={(e) => handleResearchFieldChange('name', e.target.value)}
                                                    error={researchFormErrors.name}
                                                    placeholder="Enter research name"
                                                    required
                                                />

                                                <div className="space-y-2">
                                                    <Autocomplete
                                                        id="enterpriseId"
                                                        label="Enterprise"
                                                        value={researchFormData.enterpriseName}
                                                        onChange={(value) => {
                                                            setResearchFormData((prev) => ({
                                                                ...prev,
                                                                enterpriseName: value,
                                                                enterpriseId: '',
                                                            }));
                                                        }}
                                                        onSelect={handleEnterpriseSelect}
                                                        onCreateNew={handleCreateEnterpriseFromAutocomplete}
                                                        error={researchFormErrors.enterpriseId}
                                                        placeholder={loadingEnterprises ? 'Loading...' : 'Select or create Enterprise'}
                                                        options={enterprises.map((enterprise) => ({
                                                            value: enterprise.id,
                                                            label: enterprise.name,
                                                        }))}
                                                        disabled={loadingEnterprises}
                                                        required
                                                        createNewLabel="Create new enterprise"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {currentStep === 1 && (
                                            <div className="space-y-6">
                                                <CustomSelect
                                                    id="researchTypeId"
                                                    label="Research Type"
                                                    value={researchFormData.researchTypeId}
                                                    onChange={(value) => {
                                                        handleResearchFieldChange('researchTypeId', value);
                                                        void loadTechniquesForType(value);
                                                    }}
                                                    error={researchFormErrors.researchTypeId}
                                                    placeholder={loadingResearchTypes ? 'Loading...' : 'Select Research Type'}
                                                    options={researchTypes.map((rt) => ({
                                                        value: rt.id,
                                                        label: rt.name,
                                                    }))}
                                                    disabled={loadingResearchTypes}
                                                    required
                                                />

                                                {availableTechniques.length === 0 && researchFormData.researchTypeId && !loadingTechniquesForType ? (
                                                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                        <p className="text-sm text-yellow-800">
                                                            <strong>Warning:</strong> This Research Type has no techniques associated.
                                                            Please contact an administrator to add techniques to this Research Type.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <CustomSelect
                                                        id="researchTechniqueId"
                                                        label="Research Technique"
                                                        value={researchFormData.researchTechniqueId}
                                                        onChange={(value) => {
                                                            handleResearchFieldChange('researchTechniqueId', value);
                                                        }}
                                                        error={researchFormErrors.researchTechniqueId}
                                                        placeholder={
                                                            loadingTechniquesForType
                                                                ? 'Loading...'
                                                                : !researchFormData.researchTypeId
                                                                    ? 'Select Research Type first'
                                                                    : 'Select Research Technique'
                                                        }
                                                        options={availableTechniques.map((technique) => ({
                                                            value: technique.id,
                                                            label: technique.name,
                                                        }))}
                                                        disabled={loadingTechniquesForType || !researchFormData.researchTypeId || availableTechniques.length === 0}
                                                        required
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {researchSubmitError && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-sm text-red-600">{researchSubmitError}</p>
                                            </div>
                                        )}

                                        {researchSubmitSuccess && (
                                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <p className="text-sm text-green-600">Research created successfully!</p>
                                            </div>
                                        )}

                                        <div className="flex gap-3 justify-between">
                                            <div>
                                                {currentStep > 0 && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={handlePreviousStep}
                                                        disabled={isCreatingResearch}
                                                    >
                                                        Previous
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="flex gap-3">
                                                {currentStep === 0 ? (
                                                    <Button type="submit" disabled={isCreatingResearch}>
                                                        Next
                                                    </Button>
                                                ) : (
                                                    <Button type="submit" isLoading={isCreatingResearch} disabled={isCreatingResearch}>
                                                        Create Research
                                                    </Button>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setResearchFormData({
                                                            name: '',
                                                            enterpriseId: '',
                                                            enterpriseName: '',
                                                            researchTypeId: '',
                                                            researchTechniqueId: '',
                                                        });
                                                        setResearchFormErrors({});
                                                        setResearchSubmitError('');
                                                        setResearchSubmitSuccess(false);
                                                        setCurrentStep(0);
                                                    }}
                                                    disabled={isCreatingResearch}
                                                >
                                                    Reset
                                                </Button>
                                            </div>
                                        </div>
                                    </form>
                                </Stepper>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={showCreateTechnique}
                onClose={handleCloseModal}
                title="Create New Research Technique"
                size="md"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCloseModal}
                            disabled={isCreatingTechnique}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                const form = document.getElementById('technique-form') as HTMLFormElement;
                                if (form) {
                                    form.requestSubmit();
                                }
                            }}
                            isLoading={isCreatingTechnique}
                            disabled={isCreatingTechnique}
                        >
                            Create Technique
                        </Button>
                    </div>
                }
            >
                <form id="technique-form" onSubmit={handleTechniqueSubmit} className="space-y-4">
                    <Input
                        id="techniqueName"
                        label="Research Technique Name"
                        type="text"
                        value={techniqueFormData.name}
                        onChange={(e) => handleTechniqueFieldChange('name', e.target.value)}
                        error={techniqueFormErrors.name}
                        placeholder="Enter research technique name"
                        required
                    />
                    <Textarea
                        id="techniqueDescription"
                        label="Research Technique Description"
                        value={techniqueFormData.description}
                        onChange={(e) => handleTechniqueFieldChange('description', e.target.value)}
                        error={techniqueFormErrors.description}
                        placeholder="Enter research technique description"
                        rows={5}
                        required
                    />
                    {techniqueSubmitError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{techniqueSubmitError}</p>
                        </div>
                    )}
                    {techniqueSubmitSuccess && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-600">Research technique created successfully!</p>
                        </div>
                    )}
                </form>
            </Modal>

            <Modal
                isOpen={showCreateEnterprise}
                onClose={handleCloseEnterpriseModal}
                title="Create New Enterprise"
                size="md"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCloseEnterpriseModal}
                            disabled={isCreatingEnterprise}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                const form = document.getElementById('enterprise-form') as HTMLFormElement;
                                if (form) {
                                    form.requestSubmit();
                                }
                            }}
                            isLoading={isCreatingEnterprise}
                            disabled={isCreatingEnterprise}
                        >
                            Create Enterprise
                        </Button>
                    </div>
                }
            >
                <form id="enterprise-form" onSubmit={handleEnterpriseSubmit} className="space-y-4">
                    <Input
                        id="enterpriseName"
                        label="Enterprise Name"
                        type="text"
                        value={enterpriseFormData.name}
                        onChange={(e) => handleEnterpriseFieldChange('name', e.target.value)}
                        error={enterpriseFormErrors.name}
                        placeholder="Enter enterprise name"
                        required
                    />
                    {enterpriseSubmitError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{enterpriseSubmitError}</p>
                        </div>
                    )}
                    {enterpriseSubmitSuccess && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-600">Enterprise created successfully!</p>
                        </div>
                    )}
                </form>
            </Modal>
        </div>
    );
};

