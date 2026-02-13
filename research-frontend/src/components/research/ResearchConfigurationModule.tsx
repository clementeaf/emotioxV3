import { useEffect, useState, useMemo } from 'react';
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
                value={value || ''}
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
    const [participantLimitEnabled, setParticipantLimitEnabled] = useState(true);
    const [showQRModal, setShowQRModal] = useState(false);
    const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});

    const { validateUrl } = useUrlValidation();
    const toast = useToast();


    const demographics = (config.demographics || {}) as Record<string, any>;
    const linkConfig = (config.linkConfig || {}) as Record<string, boolean>;
    const backlinks = (config.backlinks || {}) as Record<string, string>;
    const participantLimit = (config.participantLimit || 50) as number;
    const [activeConfigModal, setActiveConfigModal] = useState<string | null>(null);
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
                // Fallback handled in resolveParticipantBaseUrl
            }
        })();

        return (): void => {
            cancelled = true;
        };
    }, []);

    /**
     * Resolves the participant-frontend base URL for the current environment.
     * - Localhost: uses participant dev server
     * - Deployed: uses runtime-config.json participantBaseUrl (CloudFront), or VITE_PARTICIPANT_FRONTEND_URL if provided
     * @returns Participant app base URL (origin)
     */
    const resolveParticipantBaseUrl = (): string => {
        const host = window.location.hostname;
        const isLocal = host === 'localhost' || host === '127.0.0.1';
        if (isLocal) {
            return 'http://localhost:12600';
        }
        
        // Priority 1: Use runtimeParticipantBaseUrl from runtime-config.json
        if (runtimeConfigLoaded && runtimeParticipantBaseUrl && runtimeParticipantBaseUrl.trim().length > 0) {
            // Ensure it uses https in production
            const url = runtimeParticipantBaseUrl.trim();
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
            }
            // If no protocol, assume https for production
            return `https://${url}`;
        }
        
        // Priority 2: Use environment variable
        const envUrl = import.meta.env.VITE_PARTICIPANT_FRONTEND_URL;
        if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
            const url = envUrl.trim();
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
            }
            // If no protocol, assume https for production
            return `https://${url}`;
        }
        
        // Priority 3: Fallback for emotio.cx (production domain)
        if (host === 'emotio.cx' || host.includes('emotio.cx')) {
            return 'https://emotio.cx/participant';
        }
        
        // Priority 4: Fallback to participant.emotiox.org if on research.emotiox.org
        if (host === 'research.emotiox.org' || host.includes('emotiox.org')) {
            return 'https://participant.emotiox.org';
        }
        
        // Last resort: return empty string (will be handled by buildParticipantShareUrl)
        return '';
    };

    /**
     * Builds the participant-facing URL for Preview/QR.
     * Auto-generates URL based on environment: localhost or production.
     * @returns Full URL to participant app with research ID
     */
    const buildParticipantShareUrl = (): string => {
        const baseUrl = resolveParticipantBaseUrl();
        if (!baseUrl || baseUrl.trim().length === 0) {
            console.warn('[ResearchConfigurationModule] No participant base URL available for QR generation');
            return '';
        }
        
        let base: URL;
        try {
            base = new URL(baseUrl);
        } catch (error) {
            console.error('[ResearchConfigurationModule] Invalid participant base URL:', baseUrl, error);
            return '';
        }

        // Ensure https in production
        if (base.protocol !== 'https:' && base.hostname !== 'localhost' && !base.hostname.includes('127.0.0.1')) {
            base.protocol = 'https:';
        }

        if (!researchId) {
            console.warn('[ResearchConfigurationModule] No researchId available for URL generation');
            return '';
        }
        
        // Use the full baseUrl (including path like /participant) instead of just origin
        return `${baseUrl}/research/${researchId}?preview=true`;
    };

    /**
     * Memoized participant share URL that updates when dependencies change
     */
    const participantShareUrl = useMemo(() => buildParticipantShareUrl(), [runtimeParticipantBaseUrl, runtimeConfigLoaded, researchId]);

    /**
     * Opens the participant-facing URL in a new tab.
     * @returns void
     */
    const handleLinkPreview = (): void => {
        const url = participantShareUrl;
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

        // Transform modal data to backend format
        const backendConfig = mapModalConfigToBackend(activeConfigModal, newConfig);

        onChange({
            ...config,
            demographics: {
                ...demographics,
                [activeConfigModal]: backendConfig
            }
        });
    };

    const DEMOGRAPHIC_KEYS = ['age', 'country', 'gender', 'educationLevel', 'annualIncome', 'employmentStatus', 'dailyHoursOnline', 'technicalProficiency'];

    const handleLinkConfigChange = (key: string, value: boolean) => {
        onChange({
            ...config,
            linkConfig: { ...linkConfig, [key]: value }
        });
    };

    const handleBacklinkChange = (key: string, value: string) => {
        // Validate URL if value is not empty
        if (value.trim()) {
            const { isValid, error } = validateUrl(value);
            setUrlErrors(prev => ({
                ...prev,
                [`backlink-${key}`]: isValid ? '' : (error || 'Invalid URL'),
            }));
        } else {
            setUrlErrors(prev => ({
                ...prev,
                [`backlink-${key}`]: '',
            }));
        }

        onChange({
            ...config,
            backlinks: { ...backlinks, [key]: value }
        });
    };

    const handleParticipantLimitChange = (value: number) => {
        onChange({
            ...config,
            participantLimit: value
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
                        />
                    </div>

                    <div className="space-y-4 px-4">
                        <div className="space-y-3">
                            {DEMOGRAPHIC_KEYS.map((key) => {
                                const isEnabled = isDemographicEnabled(key);
                                // variable removed: unused


                                const handleLabelClick = (e: React.MouseEvent<HTMLSpanElement>): void => {
                                    e.stopPropagation();
                                    
                                    if (!demographicEnabled) {
                                        return;
                                    }
                                    
                                    if (!isEnabled) {
                                        handleDemographicChange(key, { enabled: true, validValues: [], disqualifications: [] });
                                    }
                                    
                                    setActiveConfigModal(key);
                                };

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
                                    <div 
                                        key={key} 
                                        onClick={handleRowClick}
                                        className={`flex items-center justify-between p-3 border rounded-md transition-colors ${demographicEnabled ? 'cursor-pointer hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}
                                    >
                                        <label className={`flex items-center gap-2 text-sm ${demographicEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                                            <input
                                                type="checkbox"
                                                checked={isEnabled}
                                                onChange={handleCheckboxChange}
                                                disabled={!demographicEnabled}
                                                className="rounded border-gray-300"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <span 
                                                className={`capitalize ${demographicEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                                onClick={handleLabelClick}
                                            >
                                                {key === 'country' ? 'Country & Geography' :
                                                    key === 'age' ? 'Age Range' :
                                                        key.replace(/([A-Z])/g, ' $1').trim()}
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

                {/* Link Configuration */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-900">Link configuration</h3>
                        <input
                            type="checkbox"
                            checked={linkConfigEnabled}
                            onChange={(e) => setLinkConfigEnabled(e.target.checked)}
                            className="rounded border-gray-300"
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
                            onChange={(e) => setParticipantLimitEnabled(e.target.checked)}
                            className="rounded border-gray-300"
                        />
                    </div>

                    <div className={`px-4 ${!participantLimitEnabled ? 'opacity-50' : ''}`}>
                        <p className="text-sm text-gray-600 mb-2">
                            Stop accepting responses after this number of participants.
                        </p>
                        <Input
                            type="number"
                            value={participantLimit}
                            onChange={(e) => handleParticipantLimitChange(parseInt(e.target.value) || 50)}
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
                    initialValidAges={demographics.age?.validAges || []}
                    initialDisqualifyingAges={demographics.age?.disqualifyingAges || []}
                />
            )}

            {activeConfigModal === 'country' && (
                <CountryConfigModal
                    isOpen={true}
                    onClose={() => setActiveConfigModal(null)}
                    onSave={(validCountries, disqualifyingCountries, priorityCountries) => {
                        handleSaveDemographicConfig({
                            validCountries,
                            disqualifyingCountries,
                            priorityCountries
                        });
                    }}
                    initialValidCountries={demographics.country?.validCountries || []}
                    initialDisqualifyingCountries={demographics.country?.disqualifyingCountries || []}
                    initialPriorityCountries={demographics.country?.priorityCountries || []}
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
                    currentOptions={demographics.gender?.options}
                    currentDisqualified={demographics.gender?.disqualified}
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
                    currentOptions={demographics.educationLevel?.options}
                    currentDisqualified={demographics.educationLevel?.disqualified}
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
                    currentOptions={demographics.employmentStatus?.options}
                    currentDisqualified={demographics.employmentStatus?.disqualified}
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
                    currentOptions={demographics.annualIncome?.options}
                    currentDisqualified={demographics.annualIncome?.disqualified}
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
                    currentOptions={demographics.dailyHoursOnline?.options}
                    currentDisqualified={demographics.dailyHoursOnline?.disqualified}
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
                    currentOptions={demographics.technicalProficiency?.options}
                    currentDisqualified={demographics.technicalProficiency?.disqualified}
                />
            )}
        </div>
    );
};
