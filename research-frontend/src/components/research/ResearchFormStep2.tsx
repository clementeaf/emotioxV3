import { CustomSelect } from '../ui/CustomSelect';
import { type ResearchTechnique } from '../../services/researchTechniques.service';
import type { ModuleTemplateRef } from '../../services/researchTypes.service';

interface ResearchFormStep2Props {
    researchTypeId: string;
    researchTechniqueId: string;
    researchTypeError?: string;
    researchTechniqueError?: string;
    researchTypes: Array<{ id: string; name: string; default_modules?: ModuleTemplateRef[] }>;
    availableTechniques: ResearchTechnique[];
    loadingResearchTypes: boolean;
    loadingTechniques: boolean;
    useDefaultModules: boolean;
    onResearchTypeChange: (value: string) => void;
    onResearchTechniqueChange: (value: string) => void;
    onToggleDefaultModules: (value: boolean) => void;
}

export const ResearchFormStep2 = ({
    researchTypeId,
    researchTechniqueId,
    researchTypeError,
    researchTechniqueError,
    researchTypes,
    availableTechniques,
    loadingResearchTypes,
    loadingTechniques,
    useDefaultModules,
    onResearchTypeChange,
    onResearchTechniqueChange,
    onToggleDefaultModules,
}: ResearchFormStep2Props) => {
    const selectedResearchType = researchTypes.find(rt => rt.id === researchTypeId);
    // Safely check if default_modules exists and is an array with length
    const hasDefaultModules = Array.isArray(selectedResearchType?.default_modules) && 
                          selectedResearchType.default_modules.length > 0;

    return (
        <div className="space-y-6">
            <CustomSelect
                id="researchTypeId"
                label="Research Type"
                value={researchTypeId}
                onChange={onResearchTypeChange}
                error={researchTypeError}
                placeholder={loadingResearchTypes ? 'Loading...' : 'Select Research Type'}
                options={researchTypes.map((rt) => ({
                    value: rt.id,
                    label: rt.name,
                }))}
                disabled={loadingResearchTypes}
                required
            />

            {availableTechniques.length === 0 && researchTypeId && !loadingTechniques ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                        <strong>Warning:</strong> This Research Type has no techniques associated.
                        Please contact an administrator to add techniques to this Research Type.
                    </p>
                </div>
            ) : (
                <CustomSelect
                    id="researchTechniqueId"
                    label="Research Technique"
                    value={researchTechniqueId}
                    onChange={onResearchTechniqueChange}
                    error={researchTechniqueError}
                    placeholder={
                        loadingTechniques
                            ? 'Loading...'
                            : !researchTypeId
                                ? 'Select Research Type first'
                                : 'Select Research Technique'
                    }
                    options={availableTechniques.map((technique) => ({
                        value: technique.id,
                        label: technique.name,
                    }))}
                    disabled={loadingTechniques || !researchTypeId || availableTechniques.length === 0}
                    required
                />
            )}

            {hasDefaultModules && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <label className="flex items-start gap-2 cursor-pointer flex-shrink-0 mt-0.5">
                            <input
                                type="checkbox"
                                checked={useDefaultModules}
                                onChange={(e) => onToggleDefaultModules(e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                            />
                            <span className="text-sm font-medium text-blue-900">
                                Include default modules
                            </span>
                        </label>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-blue-700 mb-1.5">
                                Includes: Welcome screen, Research Configuration, {
                                    Array.isArray(selectedResearchType?.default_modules)
                                        ? selectedResearchType.default_modules
                                            .map((m: { name?: string }) => m?.name || 'Unknown')
                                            .filter((name: string) => name !== 'Unknown')
                                            .join(', ')
                                        : 'None'
                                }, Thank you screen
                            </p>
                            <p className="text-xs text-blue-600">
                                Uncheck to start with an empty configuration.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
