import { Modal } from '../common/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { useResearchTechnique } from '../../hooks/useResearchTechnique';

interface CreateResearchTechniqueModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateResearchTechniqueModal = ({ isOpen, onClose }: CreateResearchTechniqueModalProps) => {
    const {
        formData,
        formErrors,
        isCreating,
        submitError,
        submitSuccess,
        handleFieldChange,
        handleSubmit,
    } = useResearchTechnique();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Research Technique"
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
                            const form = document.getElementById('technique-form') as HTMLFormElement;
                            if (form) {
                                form.requestSubmit();
                            }
                        }}
                        isLoading={isCreating}
                        disabled={isCreating}
                    >
                        Create Technique
                    </Button>
                </div>
            }
        >
            <form id="technique-form" onSubmit={handleSubmit} className="space-y-4">
                <Input
                    id="techniqueName"
                    label="Research Technique Name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    error={formErrors.name}
                    placeholder="Enter research technique name"
                    required
                />
                <Textarea
                    id="techniqueDescription"
                    label="Research Technique Description"
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    error={formErrors.description}
                    placeholder="Enter research technique description"
                    rows={5}
                    required
                />
                {submitError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{submitError}</p>
                    </div>
                )}
                {submitSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-600">Research technique created successfully!</p>
                    </div>
                )}
            </form>
        </Modal>
    );
};
