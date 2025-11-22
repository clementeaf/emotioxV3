import { useState, type FormEvent } from 'react';
import { researchTechniquesService } from '../services/researchTechniques.service';

interface CreateResearchTechniqueFormData {
    name: string;
    description: string;
}

interface ResearchTechniqueFormErrors {
    name?: string;
    description?: string;
}

export const useResearchTechnique = () => {
    const [showModal, setShowModal] = useState<boolean>(false);
    const [formData, setFormData] = useState<CreateResearchTechniqueFormData>({
        name: '',
        description: '',
    });
    const [formErrors, setFormErrors] = useState<ResearchTechniqueFormErrors>({});
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [submitError, setSubmitError] = useState<string>('');
    const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

    const validateForm = (): boolean => {
        const newErrors: ResearchTechniqueFormErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Research Technique Name is required';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Research Technique Description is required';
        }

        setFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFieldChange = (field: keyof CreateResearchTechniqueFormData, value: string): void => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (formErrors[field]) {
            setFormErrors((prev) => ({ ...prev, [field]: undefined }));
        }
        setSubmitError('');
        setSubmitSuccess(false);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setSubmitError('');
        setSubmitSuccess(false);

        if (!validateForm()) {
            return;
        }

        setIsCreating(true);

        try {
            await researchTechniquesService.create({
                name: formData.name.trim(),
                description: formData.description.trim(),
            });

            setSubmitSuccess(true);
            setFormData({
                name: '',
                description: '',
            });

            setTimeout(() => {
                setShowModal(false);
                setSubmitSuccess(false);
            }, 1500);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create research technique';
            setSubmitError(errorMessage);
        } finally {
            setIsCreating(false);
        }
    };

    const handleCloseModal = (): void => {
        setShowModal(false);
        setFormData({
            name: '',
            description: '',
        });
        setFormErrors({});
        setSubmitError('');
        setSubmitSuccess(false);
    };

    return {
        showModal,
        formData,
        formErrors,
        isCreating,
        submitError,
        submitSuccess,
        setShowModal,
        handleFieldChange,
        handleSubmit,
        handleCloseModal,
    };
};
