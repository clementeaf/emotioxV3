import { Modal } from '../ui/Modal';
import { PreviewComponent } from './PreviewComponent';
import type { ModuleTemplate } from '../../services/moduleTemplates.service';
import type { ComponentConfig } from '../../types/moduleBuilder.types';

interface ModulePreviewModalProps {
    module: ModuleTemplate | null;
    isOpen: boolean;
    onClose: () => void;
}

export const ModulePreviewModal = ({ module, isOpen, onClose }: ModulePreviewModalProps) => {
    if (!module) return null;

    // Parse the structure to get components array
    const structure = module.structure as { components?: ComponentConfig[] };
    const components = structure?.components || [];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Preview: ${module.name}`}
            size="lg"
        >
            <div className="space-y-6">
                {/* Module Description */}
                {module.description && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">{module.description}</p>
                    </div>
                )}

                {/* Preview Info */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-600">
                        <strong>Preview Mode:</strong> This is how researchers will see this module.
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
                                                {components[0].type.replace('-', ' ')}
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
                                                        {components[1].type.replace('-', ' ')}
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
                                                        {components[3].type.replace('-', ' ')}
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
                                                        {components[2].type.replace('-', ' ')}
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
                                                        {components[4].type.replace('-', ' ')}
                                                    </span>
                                                </div>
                                                <PreviewComponent component={components[4]} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            components.map((component, index) => (
                                <div
                                    key={component.id}
                                    className="p-4 bg-white border border-gray-200 rounded-lg"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                                            {index + 1}
                                        </span>
                                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                                            {component.type.replace('-', ' ')}
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
