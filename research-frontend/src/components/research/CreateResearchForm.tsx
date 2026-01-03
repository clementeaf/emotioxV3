import { type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stepper } from '../ui/Stepper';
import { Button } from '../ui/Button';
import { ResearchFormStep1 } from './ResearchFormStep1';
import { ResearchFormStep2 } from './ResearchFormStep2';
import { useResearchForm } from '../../hooks/useResearchForm';
import { useEnterprise } from '../../hooks/useEnterprise';
import { type AutocompleteOption } from '../ui/Autocomplete';

interface CreateResearchFormProps {
    onSuccess?: () => void;
}

export const CreateResearchForm = ({ onSuccess }: CreateResearchFormProps = {}) => {
    const navigate = useNavigate();
    const {
        formData,
        currentStep,
        researchTypes,
        loadingResearchTypes,
        availableTechniques,
        loadingTechniquesForType,
        formErrors,
        isCreating,
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
    } = useResearchForm();

    const { enterprises, loadingEnterprises, createEnterprise } = useEnterprise();

    const handleEnterpriseSelect = (option: AutocompleteOption): void => {
        setFormData((prev) => ({
            ...prev,
            enterpriseId: option.value,
            enterpriseName: option.label,
        }));
    };

    const handleCreateEnterpriseFromAutocomplete = async (enterpriseName: string): Promise<void> => {
        try {
            const enterpriseId = await createEnterprise(enterpriseName);
            if (enterpriseId) {
                setFormData((prev) => ({
                    ...prev,
                    enterpriseId,
                    enterpriseName,
                }));
            }
        } catch (error: unknown) {
            console.error('Failed to create enterprise:', error);
        }
    };

    const handleFormSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        console.log('[CreateResearchForm] Form submitted', {
            currentStep,
            formData,
            formErrors,
        });

        if (currentStep === 0) {
            console.log('[CreateResearchForm] Step 0: Validating and moving to next step');
            handleNextStep();
            return;
        }

        console.log('[CreateResearchForm] Step 1: Processing submission');

        // If enterprise doesn't exist, try to find it by name or create it
        let enterpriseId = formData.enterpriseId;
        if (!enterpriseId && formData.enterpriseName.trim()) {
            try {
                console.log('[CreateResearchForm] Enterprise ID not found, checking existing enterprises or creating new one');
                // First, check if an enterprise with this name already exists
                const existingEnterprise = enterprises.find(
                    (e) => e.name.toLowerCase() === formData.enterpriseName.trim().toLowerCase()
                );

                if (existingEnterprise) {
                    // Use the existing enterprise
                    enterpriseId = existingEnterprise.id;
                    console.log('[CreateResearchForm] Found existing enterprise:', enterpriseId);
                } else {
                    // Create a new enterprise
                    console.log('[CreateResearchForm] Creating new enterprise:', formData.enterpriseName.trim());
                    const newEnterpriseId = await createEnterprise(formData.enterpriseName.trim());
                    if (newEnterpriseId) {
                        enterpriseId = newEnterpriseId;
                        console.log('[CreateResearchForm] Created new enterprise:', enterpriseId);
                    }
                }
            } catch (error: unknown) {
                console.error('[CreateResearchForm] Failed to create enterprise:', error);
                return;
            }
        }

        console.log('[CreateResearchForm] Calling handleSubmit with enterpriseId:', enterpriseId);
        const researchId = await handleSubmit(enterpriseId);
        console.log('[CreateResearchForm] handleSubmit returned:', researchId);

        if (researchId) {
            console.log('[CreateResearchForm] Research created successfully, navigating...');
            // Reset form
            resetForm();

            // If onSuccess callback is provided, call it instead of navigating
            if (onSuccess) {
                onSuccess();
            } else {
                // Default behavior: navigate to builder page
                navigate(`/research/${researchId}/builder`);
            }
        } else {
            console.error('[CreateResearchForm] Failed to create research, check errors above');
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-6">
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
                            <form onSubmit={handleFormSubmit} className="space-y-6 max-w-2xl">
                                {currentStep === 0 && (
                                    <ResearchFormStep1
                                        name={formData.name}
                                        enterpriseName={formData.enterpriseName}
                                        enterpriseId={formData.enterpriseId}
                                        nameError={formErrors.name}
                                        enterpriseError={formErrors.enterpriseId}
                                        enterprises={enterprises}
                                        loadingEnterprises={loadingEnterprises}
                                        onNameChange={(value) => handleFieldChange('name', value)}
                                        onEnterpriseChange={(value) => {
                                            setFormData((prev) => ({
                                                ...prev,
                                                enterpriseName: value,
                                                enterpriseId: '',
                                            }));
                                        }}
                                        onEnterpriseSelect={handleEnterpriseSelect}
                                        onCreateEnterprise={handleCreateEnterpriseFromAutocomplete}
                                    />
                                )}

                                {currentStep === 1 && (
                                    <ResearchFormStep2
                                        researchTypeId={formData.researchTypeId}
                                        researchTechniqueId={formData.researchTechniqueId}
                                        researchTypeError={formErrors.researchTypeId}
                                        researchTechniqueError={formErrors.researchTechniqueId}
                                        researchTypes={researchTypes}
                                        availableTechniques={availableTechniques}
                                        loadingResearchTypes={loadingResearchTypes}
                                        loadingTechniques={loadingTechniquesForType}
                                        onResearchTypeChange={(value) => {
                                            handleFieldChange('researchTypeId', value);
                                            void loadTechniquesForType(value);
                                        }}
                                        onResearchTechniqueChange={(value) => {
                                            handleFieldChange('researchTechniqueId', value);
                                        }}
                                        useDefaultModules={formData.useDefaultModules}
                                        onToggleDefaultModules={(value) => handleFieldChange('useDefaultModules', value)}
                                    />
                                )}

                                {submitError && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-sm text-red-600">{submitError}</p>
                                    </div>
                                )}

                                {submitSuccess && (
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
                                                disabled={isCreating}
                                            >
                                                Previous
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        {currentStep === 0 ? (
                                            <Button type="submit" disabled={isCreating}>
                                                Next
                                            </Button>
                                        ) : (
                                            <Button type="submit" isLoading={isCreating} disabled={isCreating}>
                                                Create Research
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={resetForm}
                                            disabled={isCreating}
                                        >
                                            Reset
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </Stepper>
                    </div>
                </div>
            </div>
        </div>
    );
};
