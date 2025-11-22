import { Modal } from '../common/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useEnterprise } from '../../hooks/useEnterprise';

interface CreateEnterpriseModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateEnterpriseModal = ({ isOpen, onClose }: CreateEnterpriseModalProps) => {
    const {
        formData,
        formErrors,
        isCreating,
        submitError,
        submitSuccess,
        handleFieldChange,
        handleSubmit,
    } = useEnterprise();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Enterprise"
            size="md"
            footer={
                <div className="flex gap-3 justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isCreating}
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
                        isLoading={isCreating}
                        disabled={isCreating}
                    >
                        Create Enterprise
                    </Button>
                </div>
            }
        >
            <form id="enterprise-form" onSubmit={handleSubmit} className="space-y-4">
                <Input
                    id="enterpriseName"
                    label="Enterprise Name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    error={formErrors.name}
                    placeholder="Enter enterprise name"
                    required
                />
                {submitError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{submitError}</p>
                    </div>
                )}
                {submitSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-600">Enterprise created successfully!</p>
                    </div>
                )}
            </form>
        </Modal>
    );
};
