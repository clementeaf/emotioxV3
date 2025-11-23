import { Modal } from '../ui/Modal';
import { PreviewComponent } from './PreviewComponent';
import { Pencil } from 'lucide-react';
import type { ModuleTemplate } from '../../services/moduleTemplates.service';
import type { ComponentConfig } from '../../types/moduleBuilder.types';

interface ModulePreviewModalProps {
    module: ModuleTemplate | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
}

const getComponentLabel = (type: string): string => {
    switch (type) {
        case 'textarea': return 'Long Text';
        case 'input': return 'Short Text';
        case 'select': return 'Select / Dropdown';
        case 'checkbox': return 'Checkbox';
        case 'radio': return 'Radio Buttons';
        case 'file-upload': return 'File Upload';
        default: return type.replace('-', ' ');
    }
};

export const ModulePreviewModal = ({ module, isOpen, onClose, onEdit }: ModulePreviewModalProps) => {
    if (!module) return null;

    // Parse the structure to get components array
    const components = (module.structure as any)?.components as ComponentConfig[] || [];
    const visibleComponents = components.filter(c => !c.hidden);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Preview: ${module.name}`}
            size="lg"
        >
            <div className="space-y-6">
                {/* Actions */}
                <div className="flex justify-end">
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        <Pencil className="w-4 h-4" />
                        Edit Module
                    </button>
                </div>

                {/* Module Description */}
                {module.description && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">{module.description}</p>
                    </div>
                )}

                {/* Preview Info */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-600">
                        <strong>Preview Mode:</strong> This is how <strong>participants</strong> will see this module.
                        Components are fully interactive for testing.
                    </p>
                </div>

                {/* Components Preview */}
                {components.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <p className="text-gray-500">This module has no components yet.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {module.name === 'Cognitive Value (CV)' ? (
                            <>
                                {/* Question input */}
                                {components[0] && (
                                    <div className="p-4 bg-white border border-gray-200 rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                                                1
                                            </span>
                                            <span className="text-xs text-gray-500 uppercase tracking-wide">
                                                {getComponentLabel(components[0].type)}
                                            </span>
                                        </div>
                                        <PreviewComponent component={components[0]} />
                                    </div>
                                )}

                                {/* Range min + start label (horizontal) */}
                                {components[1] && components[3] && (
                                    <div className="p-4 bg-white border border-gray-200 rounded-lg">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                                                        2
                                                    </span>
                                                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                                                        {getComponentLabel(components[1].type)}
                                                    </span>
                                                </div>
                                                <PreviewComponent component={components[1]} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                                                        4
                                                    </span>
                                                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                                                        {getComponentLabel(components[3].type)}
                                                    </span>
                                                </div>
                                                <PreviewComponent component={components[3]} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Range max + end label (horizontal) */}
                                {components[2] && components[4] && (
                                    <div className="p-4 bg-white border border-gray-200 rounded-lg">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                                                        3
                                                    </span>
                                                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                                                        {getComponentLabel(components[2].type)}
                                                    </span>
                                                </div>
                                                <PreviewComponent component={components[2]} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                                                        5
                                                    </span>
                                                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                                                        {getComponentLabel(components[4].type)}
                                                    </span>
                                                </div>
                                                <PreviewComponent component={components[4]} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            visibleComponents.map((component, index) => (
                                <div
                                    key={component.id}
                                    className="p-4 bg-white border border-gray-200 rounded-lg"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                                            {index + 1}
                                        </span>
                                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                                            {getComponentLabel(component.type)}
                                        </span>
                                    </div>
                                    <PreviewComponent component={component} />
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};
