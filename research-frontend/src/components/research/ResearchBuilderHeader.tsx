import { Settings, Boxes, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Research, Module } from '../../services/research.service';

interface ResearchBuilderHeaderProps {
    research: Research;
    activeModule: Module | null;
    isSettings: boolean;
    isSaving: boolean;
    onSave: () => void;
}

/**
 * Header component para Research Builder
 * Muestra el título y botones de acción según el contexto
 */
export const ResearchBuilderHeader = ({
    research,
    activeModule,
    isSettings,
    isSaving,
    onSave,
}: ResearchBuilderHeaderProps) => {
    return (
        <div className="mb-8 border-b border-gray-200 pb-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        {isSettings ? (
                            <>
                                <Settings className="h-6 w-6 text-gray-400" />
                                Research Configuration
                            </>
                        ) : activeModule ? (
                            <>
                                <Boxes className="h-6 w-6 text-gray-400" />
                                {activeModule.name}
                            </>
                        ) : (
                            research.name
                        )}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {isSettings
                            ? 'Manage general settings and information'
                            : activeModule
                                ? activeModule.description || 'Configure this module'
                                : 'Research Builder'}
                    </p>
                </div>
                <div className="flex gap-3">
                    {activeModule && (
                        <Button onClick={onSave} isLoading={isSaving} disabled={isSaving}>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

