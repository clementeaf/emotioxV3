import { type ReactNode } from 'react';
import AgeConfigModal from './AgeConfigModal';
import CountryConfigModal from './CountryConfigModal';
import GenderConfigModal from './GenderConfigModal';
import EducationConfigModal from './EducationConfigModal';
import EmploymentStatusConfigModal from './EmploymentStatusConfigModal';
import HouseholdIncomeConfigModal from './HouseholdIncomeConfigModal';
import DailyHoursOnlineConfigModal from './DailyHoursOnlineConfigModal';
import TechnicalProficiencyConfigModal from './TechnicalProficiencyConfigModal';
import { ScreenerQuestionDrawer } from './ScreenerQuestionDrawer';
import {
    asDemoConfig,
    mapBackendQuotasToModal,
    getModalOptions,
    getModalDisqualified,
    isQuotasEnabledCheck,
    type BackendQuota,
    type DemographicsConfig,
} from './researchConfigurationHelpers';

interface DemographicModalsProps {
    activeConfigModal: string | null;
    setActiveConfigModal: (key: string | null) => void;
    demographics: DemographicsConfig;
    quotasEnabledState: Record<string, boolean>;
    handleSaveDemographicConfig: (newConfig: Record<string, unknown>) => void;
    handleQuotasSave: (demographicKey: string, quotas: object[]) => void;
    handleQuotasToggle: (demographicKey: string, enabled: boolean) => void;
    renderLabelEditor: (demographicKey: string, defaultLabel: string) => ReactNode;
}

export const DemographicModals = ({
    activeConfigModal,
    setActiveConfigModal,
    demographics,
    quotasEnabledState,
    handleSaveDemographicConfig,
    handleQuotasSave,
    handleQuotasToggle,
    renderLabelEditor,
}: DemographicModalsProps) => {
    const isQuotasEnabled = (key: string): boolean => {
        return isQuotasEnabledCheck(demographics, quotasEnabledState, key);
    };

    return (
        <>
            {activeConfigModal === 'age' && (
                <AgeConfigModal
                    isOpen={true}
                    onClose={() => setActiveConfigModal(null)}
                    onSave={(validAges, disqualifyingAges, orderedAll, quotasPayload) => {
                        handleSaveDemographicConfig({
                            validAges,
                            disqualifyingAges,
                            orderedAll,
                            quotas: quotasPayload
                        });
                    }}
                    onQuotasToggle={(enabled) => handleQuotasToggle('age', enabled)}
                    initialValidAges={asDemoConfig(demographics.age).validAges ?? (() => {
                        // Reconstruct from backend format: validValues minus disqualification values
                        const disqValues = new Set((asDemoConfig(demographics.age).disqualifications || []).map((d: BackendQuota) => d.value));
                        return (asDemoConfig(demographics.age).validValues || []).filter((v: string) => !disqValues.has(v));
                    })()}
                    initialDisqualifyingAges={asDemoConfig(demographics.age).disqualifyingAges ?? (asDemoConfig(demographics.age).disqualifications || []).map((d: BackendQuota) => d.value)}
                    initialOrder={asDemoConfig(demographics.age).validValues}
                    initialQuotas={mapBackendQuotasToModal(asDemoConfig(demographics.age).quotas, 'ageRange') as never}
                    quotasEnabled={isQuotasEnabled('age')}
                />
            )}

            {activeConfigModal === 'country' && (
                <CountryConfigModal
                    isOpen={true}
                    onClose={() => setActiveConfigModal(null)}
                    onSave={(validCountries, disqualifyingCountries, priorityCountries, granularity, cities) => {
                        handleSaveDemographicConfig({
                            validCountries,
                            disqualifyingCountries,
                            priorityCountries,
                            granularity,
                            cities
                        });
                    }}
                    onQuotasSave={(quotas) => handleQuotasSave('country', quotas)}
                    onQuotasToggle={(enabled) => handleQuotasToggle('country', enabled)}
                    onCityQuotasSave={(quotas) => handleQuotasSave('city', quotas)}
                    onCityQuotasToggle={(enabled) => handleQuotasToggle('city', enabled)}
                    initialValidCountries={asDemoConfig(demographics.country).validCountries as string[] ?? (() => {
                        const disqValues = new Set((asDemoConfig(demographics.country).disqualifications || []).map((d: BackendQuota) => d.value));
                        return (asDemoConfig(demographics.country).validValues || []).filter((v: string) => !disqValues.has(v));
                    })()}
                    initialDisqualifyingCountries={asDemoConfig(demographics.country).disqualifyingCountries as string[] ?? (asDemoConfig(demographics.country).disqualifications || []).map((d: BackendQuota) => d.value)}
                    initialPriorityCountries={asDemoConfig(demographics.country).priorityCountries as string[] || asDemoConfig(demographics.country).priorityValues as string[] || []}
                    initialGranularity={(asDemoConfig(demographics.country).granularity as string || 'countryOnly') as import('../../utils/demographicsMapper').LocationGranularity}
                    initialQuotas={mapBackendQuotasToModal(asDemoConfig(demographics.country).quotas, 'country') as never}
                    quotasEnabled={isQuotasEnabled('country')}
                    initialCities={(() => {
                        const rawCities: Array<string | { name: string; country?: string }> = asDemoConfig(demographics.country).cities as Array<string | { name: string; country?: string }> || [];
                        const cityDisqValues = new Set(
                            (asDemoConfig(demographics.city).disqualifications || []).map((d: BackendQuota) => d.value)
                        );
                        return rawCities.map((c) => {
                            const name = typeof c === 'string' ? c : c.name;
                            const country = typeof c === 'string' ? undefined : c.country;
                            return {
                                name,
                                isDisqualifying: cityDisqValues.has(name),
                                ...(country ? { country } : {})
                            };
                        });
                    })()}
                    initialCityQuotas={mapBackendQuotasToModal(asDemoConfig(demographics.city).quotas, 'city') as never}
                    cityQuotasEnabled={isQuotasEnabled('city')}
                />
            )}

            {activeConfigModal === 'gender' && (
                <GenderConfigModal
                    isOpen={true}
                    onClose={() => setActiveConfigModal(null)}
                    onSave={(options, disqualified) => {
                        handleSaveDemographicConfig({
                            options,
                            disqualified
                        });
                    }}
                    onQuotasSave={(quotas) => handleQuotasSave('gender', quotas)}
                    onQuotasToggle={(enabled) => handleQuotasToggle('gender', enabled)}
                    currentOptions={getModalOptions(demographics, 'gender') as never}
                    currentDisqualified={getModalDisqualified(demographics, 'gender')}
                    initialQuotas={mapBackendQuotasToModal(asDemoConfig(demographics.gender).quotas, 'gender') as never}
                    quotasEnabled={isQuotasEnabled('gender')}
                    headerContent={renderLabelEditor('gender', 'Gender')}
                />
            )}

            {activeConfigModal === 'educationLevel' && (
                <EducationConfigModal
                    isOpen={true}
                    onClose={() => setActiveConfigModal(null)}
                    onSave={(options, disqualified) => {
                        handleSaveDemographicConfig({
                            options,
                            disqualified
                        });
                    }}
                    onQuotasSave={(quotas) => handleQuotasSave('educationLevel', quotas)}
                    onQuotasToggle={(enabled) => handleQuotasToggle('educationLevel', enabled)}
                    currentOptions={getModalOptions(demographics, 'educationLevel') as never}
                    currentDisqualified={getModalDisqualified(demographics, 'educationLevel')}
                    initialQuotas={mapBackendQuotasToModal(asDemoConfig(demographics.educationLevel).quotas, 'educationLevel') as never}
                    quotasEnabled={isQuotasEnabled('educationLevel')}
                    headerContent={renderLabelEditor('educationLevel', 'Education Level')}
                />
            )}

            {activeConfigModal === 'employmentStatus' && (
                <EmploymentStatusConfigModal
                    isOpen={true}
                    onClose={() => setActiveConfigModal(null)}
                    onSave={(options, disqualified) => {
                        handleSaveDemographicConfig({
                            options,
                            disqualified
                        });
                    }}
                    onQuotasSave={(quotas) => handleQuotasSave('employmentStatus', quotas)}
                    onQuotasToggle={(enabled) => handleQuotasToggle('employmentStatus', enabled)}
                    currentOptions={getModalOptions(demographics, 'employmentStatus') as never}
                    currentDisqualified={getModalDisqualified(demographics, 'employmentStatus')}
                    initialQuotas={mapBackendQuotasToModal(asDemoConfig(demographics.employmentStatus).quotas, 'employmentStatus') as never}
                    quotasEnabled={isQuotasEnabled('employmentStatus')}
                    headerContent={renderLabelEditor('employmentStatus', 'Employment Status')}
                />
            )}

            {activeConfigModal === 'annualIncome' && (
                <HouseholdIncomeConfigModal
                    isOpen={true}
                    onClose={() => setActiveConfigModal(null)}
                    onSave={(options, disqualified) => {
                        handleSaveDemographicConfig({
                            options,
                            disqualified
                        });
                    }}
                    onQuotasSave={(quotas) => handleQuotasSave('annualIncome', quotas)}
                    onQuotasToggle={(enabled) => handleQuotasToggle('annualIncome', enabled)}
                    currentOptions={getModalOptions(demographics, 'annualIncome') as never}
                    currentDisqualified={getModalDisqualified(demographics, 'annualIncome')}
                    initialQuotas={mapBackendQuotasToModal(asDemoConfig(demographics.annualIncome).quotas, 'incomeLevel') as never}
                    quotasEnabled={isQuotasEnabled('annualIncome')}
                    headerContent={renderLabelEditor('annualIncome', 'Household Income')}
                />
            )}

            {activeConfigModal === 'dailyHoursOnline' && (
                <DailyHoursOnlineConfigModal
                    isOpen={true}
                    onClose={() => setActiveConfigModal(null)}
                    onSave={(options, disqualified) => {
                        handleSaveDemographicConfig({
                            options,
                            disqualified
                        });
                    }}
                    onQuotasSave={(quotas) => handleQuotasSave('dailyHoursOnline', quotas)}
                    onQuotasToggle={(enabled) => handleQuotasToggle('dailyHoursOnline', enabled)}
                    currentOptions={getModalOptions(demographics, 'dailyHoursOnline') as never}
                    currentDisqualified={getModalDisqualified(demographics, 'dailyHoursOnline')}
                    initialQuotas={mapBackendQuotasToModal(asDemoConfig(demographics.dailyHoursOnline).quotas, 'hoursRange') as never}
                    quotasEnabled={isQuotasEnabled('dailyHoursOnline')}
                    headerContent={renderLabelEditor('dailyHoursOnline', 'Daily Hours Online')}
                />
            )}

            {activeConfigModal === 'technicalProficiency' && (
                <TechnicalProficiencyConfigModal
                    isOpen={true}
                    onClose={() => setActiveConfigModal(null)}
                    onSave={(options, disqualified) => {
                        handleSaveDemographicConfig({
                            options,
                            disqualified
                        });
                    }}
                    onQuotasSave={(quotas) => handleQuotasSave('technicalProficiency', quotas)}
                    onQuotasToggle={(enabled) => handleQuotasToggle('technicalProficiency', enabled)}
                    currentOptions={getModalOptions(demographics, 'technicalProficiency') as never}
                    currentDisqualified={getModalDisqualified(demographics, 'technicalProficiency')}
                    initialQuotas={mapBackendQuotasToModal(asDemoConfig(demographics.technicalProficiency).quotas, 'proficiencyLevel') as never}
                    quotasEnabled={isQuotasEnabled('technicalProficiency')}
                    headerContent={renderLabelEditor('technicalProficiency', 'Technical Proficiency')}
                />
            )}

            {/* Custom Screening Question Drawers */}
            {activeConfigModal?.startsWith('customQuestion_') && (
                <ScreenerQuestionDrawer
                    isOpen={true}
                    onClose={() => setActiveConfigModal(null)}
                    questionLabel={asDemoConfig(demographics[activeConfigModal]).questionLabel || ''}
                    onSave={(questionLabel, options, disqualified) => {
                        handleSaveDemographicConfig({
                            questionLabel,
                            options,
                            disqualified,
                        });
                        setActiveConfigModal(null);
                    }}
                    currentOptions={getModalOptions(demographics, activeConfigModal) as never}
                    currentDisqualified={getModalDisqualified(demographics, activeConfigModal)}
                />
            )}
        </>
    );
};
