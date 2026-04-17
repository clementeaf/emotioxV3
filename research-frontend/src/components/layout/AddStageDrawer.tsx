import { Loader2 } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import type { StageTemplateWithModules } from '../../types/moduleBuilder.types';
import { IAT_MODULE_TYPES } from './ResearchBuilderSidebar.utils';

interface AddStageDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    showIatTypeSelector: boolean;
    setShowIatTypeSelector: (show: boolean) => void;
    loadingStages: boolean;
    availableStages: StageTemplateWithModules[];
    isAddingStage: boolean;
    onAddStage: (stageName: string, defaultModuleName?: string) => Promise<void>;
}

export const AddStageDrawer = ({
    isOpen,
    onClose,
    showIatTypeSelector,
    setShowIatTypeSelector,
    loadingStages,
    availableStages,
    isAddingStage,
    onAddStage,
}: AddStageDrawerProps) => {
    return (
        <Drawer
            isOpen={isOpen}
            onClose={() => { onClose(); setShowIatTypeSelector(false); }}
            title={showIatTypeSelector ? 'Select Implicit Association type' : 'Add Stage'}
            width="sm"
        >
            <div className="space-y-2">
                {loadingStages ? (
                    <div className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                        <p className="mt-2 text-sm text-gray-500">Loading stages...</p>
                    </div>
                ) : availableStages.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-gray-500">No stages available</p>
                        <p className="text-xs text-gray-400 mt-1">Create stages in Module Management</p>
                    </div>
                ) : showIatTypeSelector ? (
                    <div className="space-y-2">
                        <button
                            onClick={() => setShowIatTypeSelector(false)}
                            className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1"
                        >
                            ← Back to stages
                        </button>
                        {IAT_MODULE_TYPES.map((iatType) => (
                            <button
                                key={iatType.name}
                                onClick={() => void onAddStage('Implicit Association', iatType.name)}
                                disabled={isAddingStage}
                                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-accent-600 hover:bg-accent-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="font-medium text-gray-900">{iatType.name}</div>
                                <div className="text-sm text-gray-500 mt-1">{iatType.description}</div>
                            </button>
                        ))}
                    </div>
                ) : (
                    availableStages.map((stage) => (
                        <button
                            key={stage.id}
                            onClick={() => {
                                if (stage.name === 'Implicit Association') {
                                    setShowIatTypeSelector(true);
                                } else {
                                    void onAddStage(stage.name);
                                }
                            }}
                            disabled={isAddingStage}
                            className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-accent-600 hover:bg-accent-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="font-medium text-gray-900">{stage.name}</div>
                            {stage.description && (
                                <div className="text-sm text-gray-500 mt-1">{stage.description}</div>
                            )}
                            {stage.modules && stage.modules.length > 0 && (
                                <div className="text-xs text-gray-400 mt-1">
                                    {stage.modules.length} module{stage.modules.length !== 1 ? 's' : ''}
                                </div>
                            )}
                        </button>
                    ))
                )}
            </div>
        </Drawer>
    );
};
