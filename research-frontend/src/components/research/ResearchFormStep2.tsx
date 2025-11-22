import { CustomSelect } from '../ui/CustomSelect';
import { type ResearchTechnique } from '../../services/researchTechniques.service';

interface ResearchFormStep2Props {
    researchTypeId: string;
    researchTechniqueId: string;
    researchTypeError?: string;
    researchTechniqueError?: string;
    researchTypes: Array<{ id: string; name: string }>;
    availableTechniques: ResearchTechnique[];
    loadingResearchTypes: boolean;
    loadingTechniques: boolean;
    onResearchTypeChange: (value: string) => void;
    onResearchTechniqueChange: (value: string) => void;
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
    onResearchTypeChange,
    onResearchTechniqueChange,
}: ResearchFormStep2Props) => {
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
        </div>
    );
};
