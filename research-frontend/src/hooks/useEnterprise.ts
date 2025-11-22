import { useState, useEffect, type FormEvent } from 'react';
import { enterprisesService, type Enterprise } from '../services/enterprises.service';

interface CreateEnterpriseFormData {
    name: string;
}

interface EnterpriseFormErrors {
    name?: string;
}

export const useEnterprise = () => {
    const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
    const [loadingEnterprises, setLoadingEnterprises] = useState<boolean>(false);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [formData, setFormData] = useState<CreateEnterpriseFormData>({
        name: '',
    });
    const [formErrors, setFormErrors] = useState<EnterpriseFormErrors>({});
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [submitError, setSubmitError] = useState<string>('');
    const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

    useEffect(() => {
        void loadEnterprises();
    }, []);

    const loadEnterprises = async (): Promise<void> => {
        setLoadingEnterprises(true);
        try {
            const response = await enterprisesService.list();
            setEnterprises(response.enterprises);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load enterprises';
            console.error(errorMessage);
        } finally {
            setLoadingEnterprises(false);
        }
    };

    const validateForm = (): boolean => {
        const newErrors: EnterpriseFormErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Enterprise Name is required';
        }

        setFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFieldChange = (field: keyof CreateEnterpriseFormData, value: string): void => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (formErrors[field]) {
            setFormErrors((prev) => ({ ...prev, [field]: undefined }));
        }
        setSubmitError('');
        setSubmitSuccess(false);
    };

    const createEnterprise = async (name: string): Promise<string | null> => {
        try {
            const response = await enterprisesService.create({ name: name.trim() });
            await loadEnterprises();
            return response.enterprise.id;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create enterprise';
            throw new Error(errorMessage);
        }
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
            await createEnterprise(formData.name);
            setSubmitSuccess(true);
            setFormData({ name: '' });

            setTimeout(async () => {
                setShowModal(false);
                setSubmitSuccess(false);
            }, 1500);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create enterprise';
            setSubmitError(errorMessage);
        } finally {
            setIsCreating(false);
        }
    };

    const handleCloseModal = (): void => {
        setShowModal(false);
        setFormData({ name: '' });
        setFormErrors({});
        setSubmitError('');
        setSubmitSuccess(false);
    };

    return {
        enterprises,
        loadingEnterprises,
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
        createEnterprise,
        loadEnterprises,
    };
};
