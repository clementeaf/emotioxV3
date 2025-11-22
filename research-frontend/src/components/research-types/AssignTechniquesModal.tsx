import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { researchTechniquesService, type ResearchTechnique } from '../../services/researchTechniques.service';
import { researchTypesService, type ResearchType } from '../../services/researchTypes.service';

interface AssignTechniquesModalProps {
    isOpen: boolean;
    onClose: () => void;
    researchType: ResearchType | null;
    onSuccess: () => void;
}

export const AssignTechniquesModal = ({
    isOpen,
    onClose,
    researchType,
    onSuccess
}: AssignTechniquesModalProps) => {
    const [allTechniques, setAllTechniques] = useState<ResearchTechnique[]>([]);
    const [selectedTechniqueIds, setSelectedTechniqueIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && researchType) {
            loadData();
        }
    }, [isOpen, researchType]);

    const loadData = async () => {
        if (!researchType) return;

        try {
            setIsLoading(true);

            // Load all techniques
            const techniquesRes = await researchTechniquesService.list();
            setAllTechniques(techniquesRes.researchTechniques);

            // Load current type details to get assigned techniques
            const typeRes = await researchTypesService.getById(researchType.id);
            const assignedTechniques = typeRes.researchType.research_techniques || [];
            setSelectedTechniqueIds(assignedTechniques.map(t => t.id));
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTechniqueToggle = (techniqueId: string) => {
        setSelectedTechniqueIds(prev =>
            prev.includes(techniqueId)
                ? prev.filter(id => id !== techniqueId)
                : [...prev, techniqueId]
        );
    };

    const handleSave = async () => {
        if (!researchType) return;

        try {
            setIsSaving(true);
            await researchTypesService.update(researchType.id, {
                research_technique_ids: selectedTechniqueIds
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to assign techniques:', error);
            alert('Failed to assign techniques');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Assign Techniques to ${researchType?.name || ''}`}
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} isLoading={isSaving} disabled={isSaving || isLoading}>
                        Save Assignments
                    </Button>
                </div>
            }
        >
            {isLoading ? (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading techniques...</p>
                </div>
            ) : allTechniques.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <p>No research techniques available.</p>
                    <p className="text-sm mt-2">Create techniques first before assigning them.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm text-gray-600 mb-4">
                        Select which research techniques should be available for this research type:
                    </p>
                    {allTechniques.map((technique) => (
                        <label
                            key={technique.id}
                            className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                            <input
                                type="checkbox"
                                checked={selectedTechniqueIds.includes(technique.id)}
                                onChange={() => handleTechniqueToggle(technique.id)}
                                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                                <div className="font-medium text-gray-900">{technique.name}</div>
                                {technique.description && (
                                    <div className="text-sm text-gray-500 mt-1">
                                        <span className="font-medium">Description:</span> {technique.description}
                                    </div>
                                )}
                            </div>
                        </label>
                    ))}
                </div>
            )}
        </Modal>
    );
};
