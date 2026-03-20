import { useEffect, useState } from 'react';
import { moduleTemplatesService, type ModuleTemplate } from '../../services/moduleTemplates.service';
import { Button } from '../ui/Button';

interface ModuleTemplateSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (templateId: string) => Promise<void>;
    stageType?: 'single_module' | 'module_collection';
    stageName?: string;
}

const SMART_VOC_NAMES = new Set([
    'Net Promoter Score (NPS)',
    'Customer Effort Score (CES)',
    'Customer Satisfaction Score (CSAT)',
    'Cognitive Value (CV)',
    'Net Emotional Value (NEV)',
    'Voice of Costumer (VOC)',
]);

const SYSTEM_NAMES = new Set([
    'Welcome Screen',
    'Thank You Screen',
    'Research Configuration',
]);

const COGNITIVE_TASK_SUBTITLES: Record<string, string> = {
    'Short Text': 'Open field',
    'Long Text': 'Open field',
    'Single Choice': 'Fast selection',
    'Multiple Choice': 'Slow selection',
    'Linear Scale': 'Fast selection',
    'Ranking': 'Slow selection',
    'Navigation Flow': 'Objective-Oriented Task',
    'Preference Test': 'Objective-Oriented Task',
};

/**
 * Drawer lateral para seleccionar un template de módulo.
 * Filtra templates según el stageType:
 * - single_module (SmartVOC): solo NPS, CSAT, CES, CV, NEV, VOC
 * - module_collection (Cognitive Tasks): solo Short/Long Text, Single/Multiple Choice, etc.
 */
export const ModuleTemplateSelectionModal = ({
    isOpen,
    onClose,
    onSelect,
    stageName,
}: ModuleTemplateSelectionModalProps) => {
    const [templates, setTemplates] = useState<ModuleTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

    const isSmartVOC = (stageName || '').toLowerCase().includes('smart') || (stageName || '').toLowerCase().includes('voc');

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
            const filtered = allTemplates.filter(t => {
                if (!t.is_active || SYSTEM_NAMES.has(t.name)) return false;
                if (isSmartVOC) return SMART_VOC_NAMES.has(t.name);
                return !SMART_VOC_NAMES.has(t.name);
            });
            setTemplates(filtered);
        } catch (err) {
            console.error('Failed to load templates:', err);
            setError(err instanceof Error ? err.message : 'Failed to load templates');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectAndAdd = async (templateId: string) => {
        setIsSubmitting(templateId);
        setError(null);
        try {
            await onSelect(templateId);
            handleClose();
        } catch (err) {
            console.error('Failed to create module from template:', err);
            setError(err instanceof Error ? err.message : 'Failed to create module');
        } finally {
            setIsSubmitting(null);
        }
    };

    const handleClose = () => {
        setError(null);
        setIsSubmitting(null);
        onClose();
    };

    const title = isSmartVOC ? 'Add a metric' : 'Add a question';
    const subtitle = isSmartVOC
        ? 'Select a SmartVOC metric to add'
        : 'Select a type to add to this section';

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-40 bg-black transition-opacity duration-300 ${
                    isOpen ? 'opacity-30 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={handleClose}
            />

            {/* Drawer */}
            <div
                className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {isLoading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-sm text-gray-500">Loading templates...</div>
                        </div>
                    )}

                    {error && !isLoading && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {!isLoading && !error && templates.length === 0 && (
                        <div className="text-center py-12 text-sm text-gray-500">
                            No templates available
                        </div>
                    )}

                    {!isLoading && templates.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            {templates.map((template) => {
                                const sub = COGNITIVE_TASK_SUBTITLES[template.name] || template.description;
                                const adding = isSubmitting === template.id;
                                return (
                                    <button
                                        key={template.id}
                                        onClick={() => handleSelectAndAdd(template.id)}
                                        disabled={isSubmitting !== null}
                                        className={`text-left p-4 rounded-xl border bg-gray-50 hover:bg-white hover:border-indigo-300 hover:shadow-sm transition-all ${
                                            adding ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'
                                        } ${isSubmitting !== null && !adding ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <h3 className="font-medium text-gray-900 text-sm">
                                            {adding ? 'Adding...' : template.name}
                                        </h3>
                                        {sub && (
                                            <p className="text-xs text-gray-500 mt-1">{sub}</p>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSubmitting !== null}
                        className="w-full"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </>
    );
};
