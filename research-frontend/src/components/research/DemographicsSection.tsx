import { Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import {
    DEMOGRAPHIC_KEYS,
    DEFAULT_VALID_VALUES_BY_DEMOGRAPHIC,
    asDemoConfig,
    type DemographicsConfig,
    type DemographicConfigValue,
} from './researchConfigurationHelpers';

interface DemographicsSectionProps {
    demographics: DemographicsConfig;
    demographicEnabled: boolean;
    setDemographicEnabled: (enabled: boolean) => void;
    handleDemographicChange: (key: string, value: DemographicConfigValue) => void;
    isDemographicEnabled: (key: string) => boolean;
    setActiveConfigModal: (key: string | null) => void;
}

export const DemographicsSection = ({
    demographics,
    demographicEnabled,
    setDemographicEnabled,
    handleDemographicChange,
    isDemographicEnabled,
    setActiveConfigModal,
}: DemographicsSectionProps) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900">Demographic questions</h3>
                <input
                    type="checkbox"
                    checked={demographicEnabled}
                    onChange={(e) => setDemographicEnabled(e.target.checked)}
                    className="rounded border-gray-300"
                    aria-label="Enable demographic questions"
                />
            </div>

            <div className="space-y-3 px-4">
                <div className="space-y-2">
                    {DEMOGRAPHIC_KEYS.map((key) => {
                        const isEnabled = isDemographicEnabled(key);
                        const DEMOGRAPHIC_LABELS: Record<string, string> = {
                            country: 'Country & Geography',
                            age: 'Age Range',
                        };
                        const demographicLabel = DEMOGRAPHIC_LABELS[key] ?? key.replaceAll(/([A-Z])/g, ' $1').trim();
                        const customLabel = asDemoConfig(demographics[key]).questionLabel;

                        const defaultValidValues = DEFAULT_VALID_VALUES_BY_DEMOGRAPHIC[key] ?? [];

                        const handleRowClick = (): void => {
                            if (!demographicEnabled) {
                                return;
                            }
                            if (!isEnabled) {
                                const existing = demographics[key];
                                if (typeof existing === 'object' && existing !== null && existing.validValues) {
                                    handleDemographicChange(key, { ...existing, enabled: true });
                                } else {
                                    handleDemographicChange(key, { enabled: true, validValues: defaultValidValues, disqualifications: [] });
                                }
                            }
                            setActiveConfigModal(key);
                        };

                        const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
                            e.stopPropagation();
                            if (e.target.checked) {
                                // Restore existing config if available, otherwise use defaults
                                const existing = demographics[key];
                                if (typeof existing === 'object' && existing !== null && existing.validValues) {
                                    handleDemographicChange(key, { ...existing, enabled: true });
                                } else {
                                    handleDemographicChange(key, { enabled: true, validValues: defaultValidValues, disqualifications: [] });
                                }
                            } else {
                                // Preserve config but mark as disabled so re-enabling restores it
                    const currentConfig = demographics[key];
                    if (typeof currentConfig === 'object' && currentConfig !== null) {
                        handleDemographicChange(key, { ...currentConfig, enabled: false });
                    } else {
                        handleDemographicChange(key, { enabled: false });
                    }
                    // When disabling country, also disable the associated city demographic
                    if (key === 'country') {
                        const cityConfig = demographics.city;
                        if (typeof cityConfig === 'object' && cityConfig !== null) {
                            handleDemographicChange('city', { ...cityConfig, enabled: false });
                        } else if (cityConfig) {
                            handleDemographicChange('city', { enabled: false });
                        }
                    }
                            }
                        };

                        return (
                            <div
                                key={key}
                                role="button"
                                tabIndex={0}
                                onClick={handleRowClick}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRowClick(); }}
                                className={`flex w-full items-center justify-between py-2 px-3 border rounded-md transition-colors text-left ${demographicEnabled ? 'cursor-pointer hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}
                            >
                                <label className={`flex items-center gap-2 text-sm ${demographicEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                                    <input
                                        type="checkbox"
                                        checked={isEnabled}
                                        onChange={handleCheckboxChange}
                                        disabled={!demographicEnabled}
                                        className="rounded border-gray-300"
                                        onClick={(e) => e.stopPropagation()}
                                        aria-label={`Enable ${demographicLabel}`}
                                    />
                                    <span className={`${demographicEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                                        <span className="capitalize">{demographicLabel}</span>
                                        {customLabel && (
                                            <span className="text-xs text-gray-500 ml-1.5">({customLabel})</span>
                                        )}
                                    </span>
                                </label>

                                {isEnabled && demographicEnabled && (
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
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
