import { type FormEvent, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stepper } from '../ui/Stepper';
import { Button } from '../ui/Button';
import { ResearchFormStep1 } from './ResearchFormStep1';
import { ResearchFormStep2 } from './ResearchFormStep2';
import { useResearchForm } from '../../hooks/useResearchForm';
import { useEnterprise } from '../../hooks/useEnterprise';
import { type AutocompleteOption } from '../ui/Autocomplete';
import { Drawer } from '../ui/Drawer';
import { FileUpload } from '../ui/FileUpload';
import { Trash2 } from 'lucide-react';
import { mediaService } from '../../services/media.service';
import { researchService } from '../../services/research.service';

interface CreateResearchFormProps {
    onSuccess?: (researchId: string) => void;
}

export const CreateResearchForm = ({ onSuccess }: CreateResearchFormProps = {}) => {
    const navigate = useNavigate();
    const [isStimulusDrawerOpen, setIsStimulusDrawerOpen] = useState(false);
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

    const selectedType = researchTypes.find((rt) => rt.id === formData.researchTypeId);
    const isAttentionPrediction = selectedType?.name === 'Attention Prediction' || 
                                selectedType?.name === "Attention's Prediction";

    // Open drawer when Attention Prediction is selected and no file is present
    useEffect(() => {
        if (isAttentionPrediction && (formData.stimulusFiles || []).length === 0 && !isStimulusDrawerOpen) {
            setIsStimulusDrawerOpen(true);
        }
    }, [formData.researchTypeId, isAttentionPrediction, (formData.stimulusFiles || []).length]);

    // Disable default modules for Attention Prediction (no stages needed)
    useEffect(() => {
        if (isAttentionPrediction && formData.useDefaultModules) {
            handleFieldChange('useDefaultModules', false);
        }
    }, [isAttentionPrediction, formData.useDefaultModules]);

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
            // Handle multiple stimulus files upload if present
            const filesToUpload = formData.stimulusFiles || [];
            if (isAttentionPrediction && filesToUpload.length > 0) {
                try {
                    console.log(`[CreateResearchForm] Uploading ${filesToUpload.length} stimulus files for research:`, researchId);
                    
                    const uploadPromises = filesToUpload.map(async (file) => {
                        const contentType = file.type || 'application/octet-stream';

                        // 1. Generate upload URL
                        const { upload_url, s3_key } = await mediaService.generateUploadUrl({
                            research_id: researchId,
                            file_name: file.name,
                            content_type: contentType,
                        });

                        // 2. Upload file via fetch (same as FileUploadAdvanced)
                        const uploadResponse = await fetch(upload_url, {
                            method: 'PUT',
                            body: file,
                            headers: { 'Content-Type': contentType },
                        });
                        if (!uploadResponse.ok) {
                            throw new Error(`Upload failed: ${uploadResponse.status}`);
                        }

                        // 3. Save metadata
                        const { media } = await mediaService.saveMetadata({
                            research_id: researchId,
                            s3_key,
                            metadata: {
                                fileName: file.name,
                                fileType: file.type,
                                fileSize: file.size,
                            },
                        });

                        // 4. Get final URL
                        const mediaUrl = await mediaService.getMediaUrl(media.id);

                        return {
                            url: mediaUrl.url,
                            mediaId: media.id,
                            name: file.name,
                        };
                    });

                    const uploadedStimuli = await Promise.all(uploadPromises);

                    // 5. Update research settings with the array of stimuli
                    await researchService.update(researchId, {
                        settings: {
                            stimuli: uploadedStimuli,
                            // Maintain compatibility with single stimulusUrl if needed by using the first one
                            stimulusUrl: uploadedStimuli[0]?.url,
                            stimulusMediaId: uploadedStimuli[0]?.mediaId,
                        }
                    });

                    console.log('[CreateResearchForm] All stimulus files uploaded and research updated successfully');
                } catch (error) {
                    console.error('[CreateResearchForm] Failed to upload one or more stimulus files:', error);
                }
            }

            console.log('[CreateResearchForm] Research created successfully, navigating...');
            // Reset form
            resetForm();

            // Handle navigation
            let targetPath = `/research/${researchId}/builder`;
            
            // For Attention Prediction, if we have uploaded stimuli, try to go to the first one
            if (isAttentionPrediction && (formData.stimulusFiles || []).length > 0) {
                try {
                    // We need to fetch the updated research to get the mediaId of the first stimulus
                    const updatedResearch = await researchService.getById(researchId);
                    const researchData = updatedResearch.research;
                    const firstStimulus = (researchData.settings as { stimuli?: Array<{ mediaId: string }> } | undefined)?.stimuli?.[0];
                    if (firstStimulus?.mediaId) {
                        targetPath = `/research/${researchId}/builder/stimulus/${firstStimulus.mediaId}`;
                    }
                } catch (err) {
                    console.error('Failed to get updated research for navigation:', err);
                }
            }

            if (onSuccess) {
                onSuccess(researchId);
                // If the parent didn't navigate, we navigate to the target path
                // But usually parent will navigate. Let's make sure the parent knows it might want to go elsewhere
                navigate(targetPath);
            } else {
                navigate(targetPath);
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
                                        stimulusFiles={formData.stimulusFiles}
                                        onResearchTypeChange={(value) => {
                                            handleFieldChange('researchTypeId', value);
                                            void loadTechniquesForType(value);
                                        }}
                                        onResearchTechniqueChange={(value) => {
                                            handleFieldChange('researchTechniqueId', value);
                                        }}
                                        useDefaultModules={formData.useDefaultModules}
                                        onToggleDefaultModules={(value) => handleFieldChange('useDefaultModules', value)}
                                        onOpenStimulusDrawer={() => setIsStimulusDrawerOpen(true)}
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
                                            <Button 
                                                type="submit" 
                                                isLoading={isCreating} 
                                                disabled={isCreating || (isAttentionPrediction && (formData.stimulusFiles || []).length === 0)}
                                            >
                                                {isAttentionPrediction && (formData.stimulusFiles || []).length === 0 ? 'Upload Images to Create' : 'Create Research'}
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

            <Drawer
                isOpen={isStimulusDrawerOpen}
                onClose={() => setIsStimulusDrawerOpen(false)}
                title="Attention Prediction Stimuli"
                width="md"
            >
                <div className="space-y-6">
                    <div>
                        <p className="text-sm text-gray-600 mb-4">
                            Attention Prediction requires one or more image stimuli. 
                            Please upload the images that will be analyzed.
                        </p>
                        <FileUpload
                            id="stimuli-upload"
                            label="Add Stimulus Images"
                            multiple={true}
                            onFilesSelect={(files) => {
                                if (files && files.length > 0) {
                                    handleFieldChange('stimulusFiles', [...formData.stimulusFiles, ...files]);
                                }
                            }}
                            acceptedFormats="image/*"
                            maxSizeMB={10}
                        />
                    </div>
                    
                    {formData.stimulusFiles.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">Selected Images ({formData.stimulusFiles.length})</h4>
                            <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
                                {formData.stimulusFiles.map((file, index) => (
                                    <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-10 w-10 flex-shrink-0 bg-blue-50 rounded border border-blue-100 flex items-center justify-center">
                                                <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.587-1.587a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newFiles = formData.stimulusFiles.filter((_, i) => i !== index);
                                                handleFieldChange('stimulusFiles', newFiles);
                                            }}
                                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button variant="outline" onClick={() => setIsStimulusDrawerOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="primary" 
                            disabled={(formData.stimulusFiles || []).length === 0 || isCreating}
                            isLoading={isCreating}
                            onClick={(e) => {
                                // Trigger the main form submission from the drawer
                                void handleFormSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                            }}
                        >
                            Create Research
                        </Button>
                    </div>
                </div>
            </Drawer>
        </div>
    );
};
