import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { QRCodeModal } from '../ui/QRCodeModal';
import { ExternalLink, QrCode, Copy, Settings } from 'lucide-react';
import { useUrlValidation } from '../../hooks/useUrlValidation';
import { mapModalConfigToBackend } from '../../utils/demographicsMapper';
import AgeConfigModal from './AgeConfigModal';
import CountryConfigModal from './CountryConfigModal';
import GenderConfigModal from './GenderConfigModal';
import EducationConfigModal from './EducationConfigModal';
import EmploymentStatusConfigModal from './EmploymentStatusConfigModal';
import HouseholdIncomeConfigModal from './HouseholdIncomeConfigModal';
import DailyHoursOnlineConfigModal from './DailyHoursOnlineConfigModal';
import TechnicalProficiencyConfigModal from './TechnicalProficiencyConfigModal';
import { useToast } from '../../hooks/useToast';

interface BackendQuota {
    id: string;
    value: string;
    limit: number;
    enabled: boolean;
    enforcementMode?: string;
}

/** Maps demographic key → quota field name used in modal-format quotas */
const DEMOGRAPHIC_QUOTA_FIELD: Record<string, string> = {
    age: 'ageRange',
    country: 'country',
    gender: 'gender',
    educationLevel: 'educationLevel',
    employmentStatus: 'employmentStatus',
    annualIncome: 'incomeLevel',
    dailyHoursOnline: 'hoursRange',
    technicalProficiency: 'proficiencyLevel',
};


interface BacklinkInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
}

const BacklinkInput = ({ label, value, onChange, error }: BacklinkInputProps) => (
    <div>
        <label className="block text-sm text-gray-700 mb-2">{label}</label>
        <div className="flex gap-1">
            <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                https://
            </span>
            <Input
                value={(value || '').replace(/^https?:\/\//, '')}
                onChange={(e) => onChange(e.target.value)}
                placeholder="www.useremotion.com/"
                className="rounded-l-none"
                error={error}
            />
        </div>
    </div>
);

interface ResearchConfigurationProps {
    config: Record<string, unknown>;
    onChange: (config: Record<string, unknown>) => void;
}

/**
 * Research Configuration Module Component
 * Renders the recruitment and configuration settings for a research
 */
export const ResearchConfigurationModule = ({ config, onChange }: ResearchConfigurationProps) => {
    const { id: researchId } = useParams<{ id: string }>();
    const [demographicEnabled, setDemographicEnabled] = useState(true);
    const [linkConfigEnabled, setLinkConfigEnabled] = useState(true);
    const savedParticipantLimit = config.participantLimit as { enabled: boolean; value: number } | number | undefined;
    const [participantLimitEnabled, setParticipantLimitEnabled] = useState(() => {
        if (typeof savedParticipantLimit === 'object' && savedParticipantLimit !== null) {
            return savedParticipantLimit.enabled;
        }
        // Legacy: if it's a plain number, assume enabled
        return typeof savedParticipantLimit === 'number';
    });
    const [showQRModal, setShowQRModal] = useState(false);
    const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});

    const { validateUrl } = useUrlValidation();
    const toast = useToast();
    const backlinkValidationTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // Demographics config is genuinely dynamic — each key (age, gender, etc.) has a different shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const demographics = (config.demographics || {}) as Record<string, any>;
    const linkConfig = (config.linkConfig || {}) as Record<string, boolean>;
    const backlinks = useMemo(() => (config.backlinks || {}) as Record<string, string>, [config.backlinks]);
    const participantLimit = typeof savedParticipantLimit === 'object' && savedParticipantLimit !== null
        ? savedParticipantLimit.value
        : (typeof savedParticipantLimit === 'number' ? savedParticipantLimit : 50);
    const [activeConfigModal, setActiveConfigModal] = useState<string | null>(null);
    const [quotasEnabledState, setQuotasEnabledState] = useState<Record<string, boolean>>({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendingQuotasRef = useRef<{ key: string; quotas: any[] } | null>(null);
    const [runtimeParticipantBaseUrl, setRuntimeParticipantBaseUrl] = useState<string | null>(null);
    const [runtimeConfigLoaded, setRuntimeConfigLoaded] = useState(false);

    /**
     * Loads participant base URL from /runtime-config.json when deployed (CloudFront).
     */
    useEffect(() => {
        const host = window.location.hostname;
        const isLocal = host === 'localhost' || host === '127.0.0.1';
        if (isLocal) {
            setRuntimeParticipantBaseUrl(null);
            setRuntimeConfigLoaded(true);
            return;
        }

        const isRuntimeConfigWithParticipant = (value: unknown): value is { participantBaseUrl: string } => {
            if (typeof value !== 'object' || value === null) return false;
            const record = value as Record<string, unknown>;
            return typeof record.participantBaseUrl === 'string' && record.participantBaseUrl.trim().length > 0;
        };

        let cancelled = false;
        void (async (): Promise<void> => {
            try {
                const configPath = `${import.meta.env.BASE_URL}runtime-config.json`;
                const response = await fetch(configPath, { cache: 'no-store' });
                if (!response.ok) {
                    console.warn('[ResearchConfigurationModule] Failed to fetch runtime-config.json:', response.status, response.statusText);
                    setRuntimeConfigLoaded(true);
                    return;
                }
                const data = (await response.json()) as unknown;
                if (!cancelled && isRuntimeConfigWithParticipant(data)) {
                    const participantUrl = data.participantBaseUrl.replace(/\/+$/, '');
                    // Ensure URL has protocol
                    const normalizedUrl = participantUrl.startsWith('http://') || participantUrl.startsWith('https://')
                        ? participantUrl
                        : `https://${participantUrl}`;
                    setRuntimeParticipantBaseUrl(normalizedUrl);
                    setRuntimeConfigLoaded(true);
                    console.log('[ResearchConfigurationModule] Loaded participantBaseUrl from runtime-config.json:', normalizedUrl);
                } else if (!cancelled) {
                    console.warn('[ResearchConfigurationModule] runtime-config.json does not contain valid participantBaseUrl');
                    setRuntimeConfigLoaded(true);
                }
            } catch (error) {
                console.warn('[ResearchConfigurationModule] Error loading runtime-config.json, falling back to env config:', error);
                setRuntimeConfigLoaded(true);
                // Fallback handled in participantShareUrl useMemo
            }
        })();

        return (): void => {
            cancelled = true;
        };
    }, []);

    /**
     * Memoized participant share URL that updates when dependencies change.
     * Inlined to satisfy exhaustive-deps — all reactive values are in the dep array.
     */
    const participantShareUrl = useMemo(() => {
        // Resolve participant base URL (inlined from resolveParticipantBaseUrl)
        const host = window.location.hostname;
        const isLocal = host === 'localhost' || host === '127.0.0.1';
        let baseUrl = '';

        if (isLocal) {
            baseUrl = 'http://localhost:12600';
        } else if (runtimeConfigLoaded && runtimeParticipantBaseUrl && runtimeParticipantBaseUrl.trim().length > 0) {
            const url = runtimeParticipantBaseUrl.trim();
            baseUrl = (url.startsWith('http://') || url.startsWith('https://')) ? url : `https://${url}`;
        } else {
            const envUrl = import.meta.env.VITE_PARTICIPANT_FRONTEND_URL;
            if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
                const url = envUrl.trim();
                baseUrl = (url.startsWith('http://') || url.startsWith('https://')) ? url : `https://${url}`;
            } else if (host === 'emotio.cx' || host.includes('emotio.cx')) {
                baseUrl = 'https://emotio.cx/participant';
            } else if (host === 'research.emotiox.org' || host.includes('emotiox.org')) {
                baseUrl = 'https://participant.emotiox.org';
            }
        }

        if (!baseUrl || !researchId) return '';

        try {
            const base = new URL(baseUrl);
            if (base.protocol !== 'https:' && base.hostname !== 'localhost' && !base.hostname.includes('127.0.0.1')) {
                base.protocol = 'https:';
            }
        } catch {
            return '';
        }

        return `${baseUrl}/research/${researchId}`;
    }, [runtimeParticipantBaseUrl, runtimeConfigLoaded, researchId]);

    /**
     * Opens the participant-facing URL in preview mode in a new tab.
     * @returns void
     */
    const handleLinkPreview = (): void => {
        const url = participantShareUrl ? `${participantShareUrl}?preview=true` : '';
        if (!url || url.trim().length === 0) {
            toast.error('No se pudo generar la URL. Verifica que el dominio del participante esté configurado correctamente.');
            console.error('[ResearchConfigurationModule] Cannot open preview: URL is empty or invalid');
            return;
        }
        
        try {
            // Validate URL before opening
            new URL(url);
            const opened = window.open(url, '_blank', 'noopener,noreferrer');
            if (!opened) {
                toast.error('No se pudo abrir la ventana. Verifica que los pop-ups no estén bloqueados.');
                console.error('[ResearchConfigurationModule] window.open was blocked by browser');
            }
        } catch (error) {
            toast.error('La URL generada no es válida. Verifica la configuración.');
            console.error('[ResearchConfigurationModule] Invalid URL generated:', url, error);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDemographicChange = (key: string, value: any) => {
        onChange({
            ...config,
            demographics: { ...demographics, [key]: value }
        });
    };

    // Helper to get safe boolean enabled state
    const isDemographicEnabled = (key: string): boolean => {
        const val = demographics[key];
        if (typeof val === 'boolean') return val;
        if (typeof val === 'object' && val !== null) return val.enabled === true;
        return false;
    };

    const handleSaveDemographicConfig = (newConfig: Record<string, unknown>) => {
        if (!activeConfigModal) return;

        // Transform modal data to backend format (without quotas — quotas are handled separately)
        const backendConfig = mapModalConfigToBackend(activeConfigModal, newConfig);

        // Preserve existing quotas already in backend format
        const currentDemographic = demographics[activeConfigModal] || {};
        if (currentDemographic.quotas) {
            backendConfig.quotas = currentDemographic.quotas;
        }

        onChange({
            ...config,
            demographics: {
                ...demographics,
                [activeConfigModal]: backendConfig
            }
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleQuotasSave = (_demographicKey: string, quotas: any[]) => {
        // Store pending quotas — they'll be flushed when the modal closes
        // to avoid a race condition with handleSaveDemographicConfig
        pendingQuotasRef.current = { key: _demographicKey, quotas };
    };

    // Flush pending quotas after the modal closes (activeConfigModal becomes null)
    // At this point React has already processed the onChange from handleSaveDemographicConfig,
    // so demographics contains the updated config and we can safely merge quotas.
    useEffect(() => {
        if (activeConfigModal !== null || !pendingQuotasRef.current) return;

        const { key, quotas } = pendingQuotasRef.current;
        pendingQuotasRef.current = null;

        // Convert modal-format quotas to backend format using field mapping
        const fieldName = DEMOGRAPHIC_QUOTA_FIELD[key] || key;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const backendQuotas = quotas.map((q: any) => ({
            id: q.id,
            value: (q[fieldName] as string) || '',
            limit: q.quota,
            enabled: q.isActive,
            enforcementMode: q.enforcementMode || 'immediate'
        }));

        const current = demographics[key] || {};
        onChange({
            ...config,
            demographics: {
                ...demographics,
                [key]: { ...current, quotas: backendQuotas }
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeConfigModal]);

    const handleQuotasToggle = (demographicKey: string, enabled: boolean) => {
        setQuotasEnabledState(prev => ({ ...prev, [demographicKey]: enabled }));
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapBackendQuotasToModal = (quotas: BackendQuota[] | undefined, fieldName: string): any[] => {
        if (!quotas || !Array.isArray(quotas)) return [];
        return quotas.map((q: BackendQuota) => ({
            id: q.id,
            [fieldName]: q.value,
            quota: q.limit,
            quotaType: 'absolute' as const,
            isActive: q.enabled,
            enforcementMode: q.enforcementMode || 'immediate'
        }));
    };

    const isQuotasEnabled = (key: string): boolean => {
        return quotasEnabledState[key] ?? ((demographics[key]?.quotas?.length ?? 0) > 0);
    };

    const DEMOGRAPHIC_KEYS = ['age', 'country', 'gender', 'educationLevel', 'annualIncome', 'employmentStatus', 'dailyHoursOnline', 'technicalProficiency'];

    const handleLinkConfigChange = (key: string, value: boolean) => {
        onChange({
            ...config,
            linkConfig: { ...linkConfig, [key]: value }
        });
    };

    const handleBacklinkChange = useCallback((key: string, value: string) => {
        let normalizedValue = value.trim();
        if (normalizedValue && !normalizedValue.startsWith('http://') && !normalizedValue.startsWith('https://')) {
            normalizedValue = `https://${normalizedValue}`;
        }

        // Debounce URL validation (300ms) — update value immediately
        const timerKey = `backlink-${key}`;
        if (backlinkValidationTimers.current[timerKey]) {
            clearTimeout(backlinkValidationTimers.current[timerKey]);
        }
        backlinkValidationTimers.current[timerKey] = setTimeout(() => {
            if (normalizedValue) {
                const { isValid, error } = validateUrl(normalizedValue);
                setUrlErrors(prev => ({
                    ...prev,
                    [timerKey]: isValid ? '' : (error || 'Invalid URL'),
                }));
            } else {
                setUrlErrors(prev => ({ ...prev, [timerKey]: '' }));
            }
        }, 300);

        onChange({
            ...config,
            backlinks: { ...backlinks, [key]: normalizedValue }
        });
    }, [config, backlinks, validateUrl, onChange]);

    const handleParticipantLimitEnabledChange = (enabled: boolean) => {
        setParticipantLimitEnabled(enabled);
        onChange({
            ...config,
            participantLimit: { enabled, value: participantLimit }
        });
    };

    const handleParticipantLimitChange = (rawValue: string) => {
        const parsed = Number.parseInt(rawValue);
        if (Number.isNaN(parsed) || parsed < 1) {
            toast.warning('El límite debe ser un número mayor a 0');
            return;
        }
        onChange({
            ...config,
            participantLimit: { enabled: participantLimitEnabled, value: parsed }
        });
    };



    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Panel - Recruitment Link */}
            <div className="space-y-6">

                {/* Demographic Questions */}
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

                    <div className="space-y-4 px-4">
                        <div className="space-y-3">
                            {DEMOGRAPHIC_KEYS.map((key) => {
                                const isEnabled = isDemographicEnabled(key);
                                const DEMOGRAPHIC_LABELS: Record<string, string> = {
                                    country: 'Country & Geography',
                                    age: 'Age Range',
                                };
                                const demographicLabel = DEMOGRAPHIC_LABELS[key] ?? key.replaceAll(/([A-Z])/g, ' $1').trim();

                                const handleRowClick = (): void => {
                                    if (!demographicEnabled) {
                                        return;
                                    }
                                    
                                    if (!isEnabled) {
                                        handleDemographicChange(key, { enabled: true, validValues: [], disqualifications: [] });
                                    }
                                    
                                    setActiveConfigModal(key);
                                };

                                const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
                                    e.stopPropagation();
                                    if (e.target.checked) {
                                        handleDemographicChange(key, { enabled: true, validValues: [], disqualifications: [] });
                                    } else {
                                        handleDemographicChange(key, false);
                                    }
                                };

                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={handleRowClick}
                                        disabled={!demographicEnabled}
                                        className={`flex w-full items-center justify-between p-3 border rounded-md transition-colors text-left ${demographicEnabled ? 'cursor-pointer hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}
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
                                            <span
                                                className={`capitalize ${demographicEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                            >
                                                {demographicLabel}
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
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Link Configuration */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-900">Link configuration</h3>
                        <input
                            type="checkbox"
                            checked={linkConfigEnabled}
                            onChange={(e) => setLinkConfigEnabled(e.target.checked)}
                            className="rounded border-gray-300"
                            aria-label="Enable link configuration"
                        />
                    </div>

                    <div className="space-y-3 px-4">
                        <label className={`flex items-center gap-2 text-sm ${!linkConfigEnabled ? 'opacity-50' : ''}`}>
                            <input
                                type="checkbox"
                                checked={linkConfig.allowMobile || false}
                                onChange={(e) => handleLinkConfigChange('allowMobile', e.target.checked)}
                                disabled={!linkConfigEnabled}
                                className="rounded border-gray-300"
                                aria-label="Allow mobile devices"
                            />
                            <span>Allow respondents to take survey via mobile devices</span>
                        </label>
                        <label className={`flex items-center gap-2 text-sm ${!linkConfigEnabled ? 'opacity-50' : ''}`}>
                            <input
                                type="checkbox"
                                checked={linkConfig.trackLocation || false}
                                onChange={(e) => handleLinkConfigChange('trackLocation', e.target.checked)}
                                disabled={!linkConfigEnabled}
                                className="rounded border-gray-300"
                                aria-label="Track respondent location"
                            />
                            <span>Track respondents location</span>
                        </label>
                        <label className={`flex items-center gap-2 text-sm ${!linkConfigEnabled ? 'opacity-50' : ''}`}>
                            <input
                                type="checkbox"
                                checked={linkConfig.allowMultiple || false}
                                onChange={(e) => handleLinkConfigChange('allowMultiple', e.target.checked)}
                                disabled={!linkConfigEnabled}
                                className="rounded border-gray-300"
                                aria-label="Allow multiple responses per session"
                            />
                            <span>It can be taken multiple times within a single session</span>
                        </label>
                    </div>
                </div>

                {/* Participant Limit */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-900">Limit number of participants</h3>
                        <input
                            type="checkbox"
                            checked={participantLimitEnabled}
                            onChange={(e) => handleParticipantLimitEnabledChange(e.target.checked)}
                            className="rounded border-gray-300"
                            aria-label="Enable participant limit"
                        />
                    </div>

                    <div className={`px-4 ${!participantLimitEnabled ? 'opacity-50' : ''}`}>
                        <p className="text-sm text-gray-600 mb-2">
                            Stop accepting responses after this number of participants.
                        </p>
                        <Input
                            type="number"
                            value={participantLimit}
                            onChange={(e) => handleParticipantLimitChange(e.target.value)}
                            className="w-24"
                            min={1}
                            disabled={!participantLimitEnabled}
                        />
                    </div>
                </div>
            </div>

            {/* Right Panel - Research Configuration */}
            <div className="space-y-6">
                {/* A. Backlinks */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">A. Backlinks</h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Please use @id parameters to transmit respondents ID&apos;s into your system
                        </p>
                    </div>

                    <BacklinkInput
                        label="Link for complete interviews"
                        value={backlinks.complete}
                        onChange={(value) => handleBacklinkChange('complete', value)}
                        error={urlErrors['backlink-complete']}
                    />

                    <BacklinkInput
                        label="Link for disqualified interviews"
                        value={backlinks.disqualified}
                        onChange={(value) => handleBacklinkChange('disqualified', value)}
                        error={urlErrors['backlink-disqualified']}
                    />

                    <BacklinkInput
                        label="Link for overquota interviews"
                        value={backlinks.overquota}
                        onChange={(value) => handleBacklinkChange('overquota', value)}
                        error={urlErrors['backlink-overquota']}
                    />
                </div>

                {/* B. Research Link */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">B. Research&apos;s link to share</h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Share this URL with participants. Third-party systems can append participant ID as a query parameter.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-700 mb-2">Research URL</label>
                        <div className="flex gap-1 mb-2">
                            <Input
                                value={participantShareUrl}
                                readOnly
                                className="bg-gray-50 cursor-default"
                            />
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                title="Copy" 
                                onClick={async () => {
                                    const url = participantShareUrl;
                                    if (!url) {
                                        toast.error('No se pudo generar la URL.');
                                        return;
                                    }
                                    try {
                                        await navigator.clipboard.writeText(url);
                                        toast.success('URL copiada al portapapeles');
                                    } catch {
                                        toast.error('Error al copiar la URL');
                                    }
                                }}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleLinkPreview}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Link Preview
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                    const url = participantShareUrl;
                                    if (!url || url.trim().length === 0) {
                                        toast.error('No se pudo generar la URL. Verifica que el dominio del participante esté configurado correctamente.');
                                        return;
                                    }
                                    setShowQRModal(true);
                                }}
                            >
                                <QrCode className="h-4 w-4 mr-2" />
                                Generate QR
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* QR Code Modal */}
            <QRCodeModal
                isOpen={showQRModal}
                onClose={() => setShowQRModal(false)}
                url={participantShareUrl}
                title="Research link QR Code"
                description="This is your Public QR Code"
                downloadFileName="research-qr-code.png"
            />

            {/* Specific Config Modals */}
            {activeConfigModal === 'age' && (
                <AgeConfigModal
                    isOpen={true}
                    onClose={() => setActiveConfigModal(null)}
                    onSave={(validAges, disqualifyingAges) => {
                        handleSaveDemographicConfig({
                            validAges,
                            disqualifyingAges
                        });
                    }}
                    onQuotasSave={(quotas) => handleQuotasSave('age', quotas)}
                    onQuotasToggle={(enabled) => handleQuotasToggle('age', enabled)}
                    initialValidAges={demographics.age?.validAges || []}
                    initialDisqualifyingAges={demographics.age?.disqualifyingAges || []}
                    initialQuotas={mapBackendQuotasToModal(demographics.age?.quotas, 'ageRange')}
                    quotasEnabled={isQuotasEnabled('age')}
                />
            )}

            {activeConfigModal === 'country' && (
                <CountryConfigModal
                    isOpen={true}
                    onClose={() => setActiveConfigModal(null)}
                    onSave={(validCountries, disqualifyingCountries, priorityCountries, granularity) => {
                        handleSaveDemographicConfig({
                            validCountries,
                            disqualifyingCountries,
                            priorityCountries,
                            granularity
                        });
                    }}
                    onQuotasSave={(quotas) => handleQuotasSave('country', quotas)}
                    onQuotasToggle={(enabled) => handleQuotasToggle('country', enabled)}
                    initialValidCountries={demographics.country?.validCountries || []}
                    initialDisqualifyingCountries={demographics.country?.disqualifyingCountries || []}
                    initialPriorityCountries={demographics.country?.priorityCountries || []}
                    initialGranularity={demographics.country?.granularity || 'countryOnly'}
                    initialQuotas={mapBackendQuotasToModal(demographics.country?.quotas, 'country')}
                    quotasEnabled={isQuotasEnabled('country')}
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
                    currentOptions={demographics.gender?.options}
                    currentDisqualified={demographics.gender?.disqualified}
                    initialQuotas={mapBackendQuotasToModal(demographics.gender?.quotas, 'gender')}
                    quotasEnabled={isQuotasEnabled('gender')}
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
                    currentOptions={demographics.educationLevel?.options}
                    currentDisqualified={demographics.educationLevel?.disqualified}
                    initialQuotas={mapBackendQuotasToModal(demographics.educationLevel?.quotas, 'educationLevel')}
                    quotasEnabled={isQuotasEnabled('educationLevel')}
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
                    currentOptions={demographics.employmentStatus?.options}
                    currentDisqualified={demographics.employmentStatus?.disqualified}
                    initialQuotas={mapBackendQuotasToModal(demographics.employmentStatus?.quotas, 'employmentStatus')}
                    quotasEnabled={isQuotasEnabled('employmentStatus')}
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
                    currentOptions={demographics.annualIncome?.options}
                    currentDisqualified={demographics.annualIncome?.disqualified}
                    initialQuotas={mapBackendQuotasToModal(demographics.annualIncome?.quotas, 'incomeLevel')}
                    quotasEnabled={isQuotasEnabled('annualIncome')}
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
                    currentOptions={demographics.dailyHoursOnline?.options}
                    currentDisqualified={demographics.dailyHoursOnline?.disqualified}
                    initialQuotas={mapBackendQuotasToModal(demographics.dailyHoursOnline?.quotas, 'hoursRange')}
                    quotasEnabled={isQuotasEnabled('dailyHoursOnline')}
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
                    currentOptions={demographics.technicalProficiency?.options}
                    currentDisqualified={demographics.technicalProficiency?.disqualified}
                    initialQuotas={mapBackendQuotasToModal(demographics.technicalProficiency?.quotas, 'proficiencyLevel')}
                    quotasEnabled={isQuotasEnabled('technicalProficiency')}
                />
            )}
        </div>
    );
};
