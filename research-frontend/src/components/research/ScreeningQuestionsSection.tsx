import { useMemo } from 'react';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import {
    asDemoConfig,
    type DemographicsConfig,
    type DemographicConfigValue,
} from './researchConfigurationHelpers';

interface ScreeningQuestionsSectionProps {
    demographics: DemographicsConfig;
    config: Record<string, unknown>;
    onChange: (config: Record<string, unknown>) => void;
    handleDemographicChange: (key: string, value: DemographicConfigValue) => void;
    setActiveConfigModal: (key: string | null) => void;
}

export const ScreeningQuestionsSection = ({
    demographics,
    config,
    onChange,
    handleDemographicChange,
    setActiveConfigModal,
}: ScreeningQuestionsSectionProps) => {
    /** Keys of custom screening questions stored in demographics config */
    const customQuestionKeys = useMemo(() => {
        return Object.keys(demographics).filter(k => k.startsWith('customQuestion_'));
    }, [demographics]);

    const handleAddCustomQuestion = () => {
        const id = `customQuestion_${Date.now()}`;
        handleDemographicChange(id, {
            enabled: true,
            questionLabel: '',
            validValues: [],
            disqualifications: [],
            options: [],
            disqualified: []
        });
        setActiveConfigModal(id);
    };

    const handleDeleteCustomQuestion = (key: string) => {
        const newDemographics = { ...demographics };
        delete newDemographics[key];
        onChange({ ...config, demographics: newDemographics });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                    <h3 className="text-sm font-medium text-gray-900">Screening questions</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Custom single-choice questions that can disqualify participants</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomQuestion}
                    className="flex items-center gap-1"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add question
                </Button>
            </div>

            {customQuestionKeys.length > 0 && (
                <div className="space-y-2 px-4">
                    {customQuestionKeys.map((key) => {
                        const qCfg = asDemoConfig(demographics[key]);
                        const qLabel = qCfg.questionLabel || 'Untitled question';
                        const optCount = (qCfg.validValues || []).length;

                        return (
                            <div
                                key={key}
                                role="button"
                                tabIndex={0}
                                onClick={() => setActiveConfigModal(key)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveConfigModal(key); }}
                                className="flex w-full items-center justify-between p-3 border rounded-md transition-colors cursor-pointer hover:bg-gray-50"
                            >
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium text-gray-900 truncate block">{qLabel}</span>
                                    <span className="text-xs text-gray-500">{optCount} option{optCount !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveConfigModal(key);
                                        }}
                                        className="h-8 w-8 p-0"
                                        title="Configure"
                                    >
                                        <Settings className="h-4 w-4 text-gray-500" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteCustomQuestion(key);
                                        }}
                                        className="h-8 w-8 p-0"
                                        title="Delete question"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
