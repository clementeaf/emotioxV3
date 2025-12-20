import { useEffect, useState } from 'react';
import { moduleTemplatesService, type ModuleTemplate } from '../../services/moduleTemplates.service';
import { Button } from '../ui/Button';

interface ModuleTemplateSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (templateId: string) => Promise<void>;
    stageType?: 'single_module' | 'module_collection'; // Reserved for future filtering
}

/**
 * Modal para seleccionar un template de módulo
 * Permite al usuario elegir entre los templates disponibles para agregar a un stage
 */
export const ModuleTemplateSelectionModal = ({
    isOpen,
    onClose,
    onSelect,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    stageType: _stageType // Reserved for future filtering by stage type
}: ModuleTemplateSelectionModalProps) => {
    const [templates, setTemplates] = useState<ModuleTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
        }
    }, [isOpen]);

    const loadTemplates = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const allTemplates = await moduleTemplatesService.list();
            // Filter only active templates
            const activeTemplates = allTemplates.filter(t => t.is_active);
            setTemplates(activeTemplates);
        } catch (err) {
            console.error('Failed to load templates:', err);
            setError(err instanceof Error ? err.message : 'Failed to load templates');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = async () => {
        if (!selectedTemplateId) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await onSelect(selectedTemplateId);
            handleClose();
        } catch (err) {
            console.error('Failed to create module from template:', err);
            setError(err instanceof Error ? err.message : 'Failed to create module');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedTemplateId(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Select Module Template
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Choose a template to add to this stage
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-gray-500">Loading templates...</div>
                        </div>
                    )}

                    {error && !isLoading && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {!isLoading && !error && templates.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No module templates available
                        </div>
                    )}

                    {!isLoading && templates.length > 0 && (
                        <div className="space-y-3">
                            {templates.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => setSelectedTemplateId(template.id)}
                                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                                        selectedTemplateId === template.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">
                                                {template.name}
                                            </h3>
                                            {template.description && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {template.description}
                                                </p>
                                            )}
                                        </div>
                                        {selectedTemplateId === template.id && (
                                            <div className="ml-3 flex-shrink-0">
                                                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                                    <svg
                                                        className="w-3 h-3 text-white"
                                                        fill="none"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path d="M5 13l4 4L19 7"></path>
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSelect}
                        disabled={!selectedTemplateId || isSubmitting}
                    >
                        {isSubmitting ? 'Adding...' : 'Add Module'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
