import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { QRCodeModal } from '../ui/QRCodeModal';
import { ExternalLink, QrCode, Copy, Settings, Upload, X, Plus, Trash2 } from 'lucide-react';
import { PanelParticipantsSection } from './PanelParticipantsSection';
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
import CustomScreeningQuestionConfigModal from './CustomScreeningQuestionConfigModal';
import { useToast } from '../../hooks/useToast';
import { mediaService } from '../../services/media.service';

interface BackendQuota {
    id: string;
    value: string;
    limit: number;
    enabled: boolean;
    enforcementMode?: string;
    quotaType?: string;
}

/** Maps demographic key → quota field name used in modal-format quotas */
const DEMOGRAPHIC_QUOTA_FIELD: Record<string, string> = {
    age: 'ageRange',
    country: 'country',
    city: 'city',
    gender: 'gender',
    educationLevel: 'educationLevel',
    employmentStatus: 'employmentStatus',
    annualIncome: 'incomeLevel',
    dailyHoursOnline: 'hoursRange',
    technicalProficiency: 'proficiencyLevel',
};

/**
 * Default validValues for option-based demographics when first enabled.
 * Ensures participants always see a selector instead of a free-text input.
 */
const DEFAULT_VALID_VALUES_BY_DEMOGRAPHIC: Record<string, string[]> = {
    gender: ['Masculino', 'Femenino', 'Prefiero no especificar'],
    educationLevel: ['Básica', 'Media', 'Universitaria', 'Maestría', 'Doctorado'],
    employmentStatus: ['Dependiente', 'Independiente', 'Cesante', 'Jubilado'],
    annualIncome: ['Menos de 20.000€', '20.000€ - 40.000€', '40.000€ - 60.000€', '60.000€ - 80.000€', 'Más de 80.000€'],
    dailyHoursOnline: ['0-2 horas', '2-4 horas', '4-6 horas', '6-8 horas', 'Más de 8 horas'],
    technicalProficiency: ['Básico', 'Intermedio', 'Profesional', 'Experto'],
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

type ParticipationMode = 'kiosk' | 'panel';

interface ResearchConfigurationProps {
    config: Record<string, unknown>;
    researchStatus?: string;
    researchName?: string;
    onChange: (config: Record<string, unknown>) => void;
}

/**
 * Research Configuration Module Component
 * Renders the recruitment and configuration settings for a research
 */
export const ResearchConfigurationModule = ({ config, researchStatus, researchName, onChange }: ResearchConfigurationProps) => {
    const { id: researchId } = useParams<{ id: string }>();
    const [participationMode, setParticipationMode] = useState<ParticipationMode>(
        () => (config.participationMode as ParticipationMode) || 'panel'
    );
    const isResearchActive = researchStatus === 'active';
    const isKiosk = participationMode === 'kiosk';
    const [demographicEnabled, setDemographicEnabled] = useState(true);
    const [linkConfigEnabled, setLinkConfigEnabled] = useState(true);
    const savedParticipantLimit = config.participantLimit as { enabled: boolean; value: number } | number | undefined;
    const participantLimitEnabled = (() => {
        if (typeof savedParticipantLimit === 'object' && savedParticipantLimit !== null) {
            return savedParticipantLimit.enabled;
        }
        return typeof savedParticipantLimit === 'number';
    })();
    const [showQRModal, setShowQRModal] = useState(false);
    const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});

    const { validateUrl } = useUrlValidation();
    const toast = useToast();
    const backlinkValidationTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const studyLogo = config.studyLogo as { enabled: boolean; s3Key?: string } | undefined;
    const studyLogoEnabled = studyLogo?.enabled ?? true; // default: show EmotioCX logo

    // Demographics config is genuinely dynamic — each key (age, gender, etc.) has a different shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const demographics = useMemo(() => (config.demographics || {}) as Record<string, any>, [config.demographics]);
    const linkConfig = (config.linkConfig || {}) as Record<string, boolean>;
    const backlinks = useMemo(() => (config.backlinks || {}) as Record<string, string>, [config.backlinks]);
    const participantLimit = typeof savedParticipantLimit === 'object' && savedParticipantLimit !== null
        ? savedParticipantLimit.value
        : (typeof savedParticipantLimit === 'number' ? savedParticipantLimit : 50);
    const [activeConfigModal, setActiveConfigModal] = useState<string | null>(null);
    const [quotasEnabledState, setQuotasEnabledState] = useState<Record<string, boolean>>({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendingQuotasRef = useRef<{ key: string; quotas: any[] } | null>(null);
    const pendingLabelRef = useRef<{ key: string; label: string } | null>(null);
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

        const backendConfig = mapModalConfigToBackend(activeConfigModal, newConfig);

        // Preserve questionLabel (custom label override for any demographic)
        if (typeof newConfig.questionLabel === 'string') {
            backendConfig.questionLabel = newConfig.questionLabel;
        } else if (pendingLabelRef.current?.key === activeConfigModal && pendingLabelRef.current.label) {
            backendConfig.questionLabel = pendingLabelRef.current.label;
        }

        // Only preserve old quotas when this save payload did not include quota data (legacy modals
        // that still rely on onQuotasSave + flush). If newConfig.quotas is present (including []),
        // the mapper already reflects the intended state — do not overwrite with stale data.
        const currentDemographic = demographics[activeConfigModal] || {};
        const newHasQuotasKey = Object.prototype.hasOwnProperty.call(newConfig, 'quotas');
        if (
            !newHasQuotasKey &&
            Array.isArray(currentDemographic.quotas) &&
            currentDemographic.quotas.length > 0
        ) {
            backendConfig.quotas = currentDemographic.quotas;
        }

        const newDemographics = {
            ...demographics,
            [activeConfigModal]: backendConfig
        };

        // When saving country config, also manage demographics.city entry
        if (activeConfigModal === 'country') {
            const cityEntries = (newConfig.cities as Array<{ name: string; isDisqualifying: boolean; country?: string }>) || [];
            const gran = (newConfig.granularity as string) || 'countryOnly';
            if (gran === 'countryCity' && cityEntries.length > 0) {
                const allCityNames = cityEntries.map(c => c.name);
                const disqualifyingCities = cityEntries.filter(c => c.isDisqualifying);
                newDemographics.city = {
                    ...(demographics.city || {}),
                    enabled: true,
                    validValues: allCityNames,
                    disqualifications: disqualifyingCities.length > 0
                        ? disqualifyingCities.map(c => ({
                            id: `city-disq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                            value: c.name,
                            enabled: true
                        }))
                        : undefined
                };
                // Persist city entries with country association for round-trip
                backendConfig.cities = cityEntries.map(c => ({
                    name: c.name,
                    ...(c.country ? { country: c.country } : {})
                }));
            } else if (newDemographics.city) {
                newDemographics.city = { enabled: false, validValues: [] };
                backendConfig.cities = undefined;
            }
        }

        onChange({
            ...config,
            demographics: newDemographics
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleQuotasSave = (_demographicKey: string, quotas: any[]) => {
        // Store pending quotas — they'll be flushed when the modal closes
        // to avoid a race condition with handleSaveDemographicConfig
        pendingQuotasRef.current = { key: _demographicKey, quotas };
    };

    // Keep fresh refs for the quota-flush effect so it never reads stale closures
    const configRef = useRef(config);
    const demographicsRef = useRef(demographics);
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        configRef.current = config;
        demographicsRef.current = demographics;
        onChangeRef.current = onChange;
    });

    // Flush pending quotas after the modal closes (activeConfigModal becomes null)
    // At this point React has already processed the onChange from handleSaveDemographicConfig,
    // so demographics contains the updated config and we can safely merge quotas.
    useEffect(() => {
        if (activeConfigModal !== null || !pendingQuotasRef.current) return;

        const { key, quotas } = pendingQuotasRef.current;
        pendingQuotasRef.current = null;

        // Convert modal-format quotas to backend format using field mapping
        const fieldName = DEMOGRAPHIC_QUOTA_FIELD[key] || (key.startsWith('customQuestion_') ? 'optionValue' : key);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const backendQuotas = quotas.map((q: any) => ({
            id: q.id,
            value: (q[fieldName] as string) || '',
            limit: q.quota,
            enabled: q.isActive,
            enforcementMode: 'immediate',
            quotaType: 'percentage'
        }));

        const currentDemographics = demographicsRef.current;
        const current = currentDemographics[key] || {};
        onChangeRef.current({
            ...configRef.current,
            demographics: {
                ...currentDemographics,
                [key]: { ...current, quotas: backendQuotas }
            }
        });
    }, [activeConfigModal]);

    // Flush pending label after modal closes — merges the edited label into demographics config.
    useEffect(() => {
        if (activeConfigModal !== null || !pendingLabelRef.current) return;

        const { key, label } = pendingLabelRef.current;
        pendingLabelRef.current = null;

        const currentDemographics = demographicsRef.current;
        const current = currentDemographics[key] || {};
        // Only persist if the label is non-empty (empty = use default)
        const updatedLabel = label.trim() || undefined;
        if (updatedLabel !== current.questionLabel) {
            onChangeRef.current({
                ...configRef.current,
                demographics: {
                    ...currentDemographics,
                    [key]: { ...current, questionLabel: updatedLabel }
                }
            });
        }
    }, [activeConfigModal]);

    /** Returns the editable label input JSX for a demographic modal */
    const renderLabelEditor = (demographicKey: string, defaultLabel: string) => {
        return (
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question label</label>
                <input
                    type="text"
                    defaultValue={demographics[demographicKey]?.questionLabel || ''}
                    onChange={(e) => {
                        pendingLabelRef.current = { key: demographicKey, label: e.target.value };
                    }}
                    placeholder={defaultLabel}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                    Customize the label shown to participants. Leave empty to use the default.
                </p>
            </div>
        );
    };

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
            quotaType: 'percentage' as const,
            isActive: q.enabled,
            enforcementMode: 'immediate' as const
        }));
    };

    const isQuotasEnabled = (key: string): boolean => {
        return quotasEnabledState[key] ?? ((demographics[key]?.quotas?.length ?? 0) > 0);
    };

    /** Reconstruct modal options from backend format when modal-format fields are missing */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getModalOptions = (key: string): any[] => {
        const cfg = demographics[key];
        if (!cfg || typeof cfg !== 'object') return [];
        if (cfg.options && Array.isArray(cfg.options) && cfg.options.length > 0) return cfg.options;
        // Reconstruct from validValues
        if (cfg.validValues && Array.isArray(cfg.validValues)) {
            return cfg.validValues.map((v: string, i: number) => ({ id: `opt-${i}`, name: v }));
        }
        return [];
    };

    /** Reconstruct disqualified IDs from backend format when modal-format field is missing */
    const getModalDisqualified = (key: string): string[] => {
        const cfg = demographics[key];
        if (!cfg || typeof cfg !== 'object') return [];
        if (cfg.disqualified && Array.isArray(cfg.disqualified)) return cfg.disqualified;
        // Reconstruct from disqualifications array
        if (cfg.disqualifications && Array.isArray(cfg.disqualifications)) {
            const opts = getModalOptions(key);
            return cfg.disqualifications.map((d: BackendQuota) => {
                const match = opts.find((o: { name: string; id: string }) => o.name === d.value);
                return match?.id || d.value;
            });
        }
        return [];
    };

    const DEMOGRAPHIC_KEYS = ['age', 'country', 'gender', 'educationLevel', 'annualIncome', 'employmentStatus', 'dailyHoursOnline', 'technicalProficiency'];

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

    // Resolve logo preview URL from s3Key
    useEffect(() => {
        if (!studyLogo?.s3Key) { setLogoPreviewUrl(null); return; }
        let cancelled = false;
        mediaService.getMediaUrlByS3Key(studyLogo.s3Key).then(res => {
            if (!cancelled) setLogoPreviewUrl(res.url);
        }).catch(() => { if (!cancelled) setLogoPreviewUrl(null); });
        return () => { cancelled = true; };
    }, [studyLogo?.s3Key]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !researchId) return;
        if (!file.type.startsWith('image/')) { toast.error('Only image files are allowed'); return; }
        if (file.size > 2 * 1024 * 1024) { toast.error('Max file size is 2 MB'); return; }
        setLogoUploading(true);
        try {
            const { upload_url, s3_key } = await mediaService.generateUploadUrl({
                research_id: researchId, file_name: file.name, content_type: file.type,
            });
            await fetch(upload_url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
            await mediaService.saveMetadata({ research_id: researchId, s3_key, metadata: { purpose: 'study-logo' } });
            onChange({ ...config, studyLogo: { enabled: true, s3Key: s3_key } });
            toast.success('Logo uploaded');
        } catch { toast.error('Failed to upload logo'); }
        finally { setLogoUploading(false); if (logoInputRef.current) logoInputRef.current.value = ''; }
    };

    const handleLogoRemove = () => {
        onChange({ ...config, studyLogo: { enabled: studyLogoEnabled, s3Key: undefined } });
        setLogoPreviewUrl(null);
    };

    const handleLogoToggle = (enabled: boolean) => {
        onChange({ ...config, studyLogo: { ...studyLogo, enabled } });
    };

    const handleParticipantLimitEnabledChange = (enabled: boolean) => {
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

    const handleParticipationModeChange = (mode: ParticipationMode) => {
        if (isResearchActive) return;
        setParticipationMode(mode);
        onChange({ ...config, participationMode: mode });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Panel - Recruitment Link */}
            <div className="space-y-6">

                {/* Participation Mode Selector */}
                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Participation mode</h3>
                        {isResearchActive && (
                            <p className="text-xs text-amber-600 mb-3">
                                Mode cannot be changed while research is active.
                            </p>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleParticipationModeChange('kiosk')}
                                disabled={isResearchActive}
                                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                                    isKiosk
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                } ${isResearchActive ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <span className="block text-sm font-medium text-gray-900">Kiosk</span>
                                <span className="block text-xs text-gray-500 mt-1">
                                    Shared device, anonymous participants, auto-reset
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleParticipationModeChange('panel')}
                                disabled={isResearchActive}
                                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                                    !isKiosk
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                } ${isResearchActive ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <span className="block text-sm font-medium text-gray-900">Panel</span>
                                <span className="block text-xs text-gray-500 mt-1">
                                    Individual links, identified participants, demographics
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Demographic Questions — hidden in kiosk mode */}
                {!isKiosk && (
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
                                const customLabel = demographics[key]?.questionLabel;

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
                )}

                {/* Custom Screening Questions — hidden in kiosk mode */}
                {!isKiosk && demographicEnabled && (
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
                                const qCfg = demographics[key] || {};
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
                )}

                {/* Study Logo */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-900">Study logo</h3>
                        <input
                            type="checkbox"
                            checked={studyLogoEnabled}
                            onChange={(e) => handleLogoToggle(e.target.checked)}
                            className="rounded border-gray-300"
                            aria-label="Show logo in survey"
                        />
                    </div>
                    {studyLogoEnabled && (
                        <div className="px-4 space-y-3">
                            <p className="text-xs text-gray-500">
                                Upload your client&apos;s logo to display in the survey. If no logo is uploaded, the EmotioCX logo will be shown.
                            </p>
                            {logoPreviewUrl || studyLogo?.s3Key ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-32 h-12 border rounded-md flex items-center justify-center bg-white overflow-hidden">
                                        <img
                                            src={logoPreviewUrl || ''}
                                            alt="Study logo"
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={handleLogoRemove} title="Remove logo">
                                        <X className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            ) : (
                                <div>
                                    <input
                                        ref={logoInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleLogoUpload}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => logoInputRef.current?.click()}
                                        disabled={logoUploading}
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        {logoUploading ? 'Uploading...' : 'Upload logo'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
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

                    {!isKiosk && (
                    <>
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
                    </>
                    )}
                </div>

                {/* B. Research Link */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">B. Research&apos;s link to share</h3>
                        <p className="text-xs text-gray-500 mb-4">
                            {isKiosk
                                ? 'Share this URL or QR code on the shared device. Participant IDs are generated automatically.'
                                : 'Share this URL with participants. Third-party systems can append participant ID as a query parameter.'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-700 mb-2">Research URL</label>
                        <div className="flex gap-1 mb-2">
                            <Input
                                value={isKiosk ? participantShareUrl : `${participantShareUrl}?ECX=@id`}
                                readOnly
                                className="bg-gray-50 cursor-default"
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                title="Copy"
                                onClick={async () => {
                                    const url = isKiosk ? participantShareUrl : `${participantShareUrl}?ECX=@id`;
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
                        {!isKiosk && (
                            <p className="text-xs text-gray-400 mb-3">
                                <code className="bg-gray-100 px-1 rounded">@id</code> será reemplazado por el sistema externo con el ID real del participante.
                            </p>
                        )}
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

            {/* Panel Participants — import, links, tracking (only in panel mode) */}
            {!isKiosk && researchId && participantShareUrl && (
                <PanelParticipantsSection
                    researchId={researchId}
                    participantShareUrl={participantShareUrl}
                    researchName={researchName || 'Research Study'}
                />
            )}

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
                    onSave={(validAges, disqualifyingAges, orderedAll, quotasPayload) => {
                        handleSaveDemographicConfig({
                            validAges,
                            disqualifyingAges,
                            orderedAll,
                            quotas: quotasPayload
                        });
                    }}
                    onQuotasToggle={(enabled) => handleQuotasToggle('age', enabled)}
                    initialValidAges={demographics.age?.validAges ?? (() => {
                        // Reconstruct from backend format: validValues minus disqualification values
                        const disqValues = new Set((demographics.age?.disqualifications || []).map((d: BackendQuota) => d.value));
                        return (demographics.age?.validValues || []).filter((v: string) => !disqValues.has(v));
                    })()}
                    initialDisqualifyingAges={demographics.age?.disqualifyingAges ?? (demographics.age?.disqualifications || []).map((d: BackendQuota) => d.value)}
                    initialOrder={demographics.age?.validValues}
                    initialQuotas={mapBackendQuotasToModal(demographics.age?.quotas, 'ageRange')}
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
                    initialValidCountries={demographics.country?.validCountries ?? (() => {
                        const disqValues = new Set((demographics.country?.disqualifications || []).map((d: BackendQuota) => d.value));
                        return (demographics.country?.validValues || []).filter((v: string) => !disqValues.has(v));
                    })()}
                    initialDisqualifyingCountries={demographics.country?.disqualifyingCountries ?? (demographics.country?.disqualifications || []).map((d: BackendQuota) => d.value)}
                    initialPriorityCountries={demographics.country?.priorityCountries || demographics.country?.priorityValues || []}
                    initialGranularity={demographics.country?.granularity || 'countryOnly'}
                    initialQuotas={mapBackendQuotasToModal(demographics.country?.quotas, 'country')}
                    quotasEnabled={isQuotasEnabled('country')}
                    initialCities={(() => {
                        const rawCities: Array<string | { name: string; country?: string }> = demographics.country?.cities || [];
                        const cityDisqValues = new Set(
                            (demographics.city?.disqualifications || []).map((d: BackendQuota) => d.value)
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
                    initialCityQuotas={mapBackendQuotasToModal(demographics.city?.quotas, 'city')}
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
                    currentOptions={getModalOptions('gender')}
                    currentDisqualified={getModalDisqualified('gender')}
                    initialQuotas={mapBackendQuotasToModal(demographics.gender?.quotas, 'gender')}
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
                    currentOptions={getModalOptions('educationLevel')}
                    currentDisqualified={getModalDisqualified('educationLevel')}
                    initialQuotas={mapBackendQuotasToModal(demographics.educationLevel?.quotas, 'educationLevel')}
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
                    currentOptions={getModalOptions('employmentStatus')}
                    currentDisqualified={getModalDisqualified('employmentStatus')}
                    initialQuotas={mapBackendQuotasToModal(demographics.employmentStatus?.quotas, 'employmentStatus')}
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
                    currentOptions={getModalOptions('annualIncome')}
                    currentDisqualified={getModalDisqualified('annualIncome')}
                    initialQuotas={mapBackendQuotasToModal(demographics.annualIncome?.quotas, 'incomeLevel')}
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
                    currentOptions={getModalOptions('dailyHoursOnline')}
                    currentDisqualified={getModalDisqualified('dailyHoursOnline')}
                    initialQuotas={mapBackendQuotasToModal(demographics.dailyHoursOnline?.quotas, 'hoursRange')}
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
                    currentOptions={getModalOptions('technicalProficiency')}
                    currentDisqualified={getModalDisqualified('technicalProficiency')}
                    initialQuotas={mapBackendQuotasToModal(demographics.technicalProficiency?.quotas, 'proficiencyLevel')}
                    quotasEnabled={isQuotasEnabled('technicalProficiency')}
                    headerContent={renderLabelEditor('technicalProficiency', 'Technical Proficiency')}
                />
            )}

            {/* Custom Screening Question Modals */}
            {activeConfigModal?.startsWith('customQuestion_') && (
                <CustomScreeningQuestionConfigModal
                    isOpen={true}
                    onClose={() => setActiveConfigModal(null)}
                    questionLabel={demographics[activeConfigModal]?.questionLabel || ''}
                    onSave={(questionLabel, options, disqualified) => {
                        handleSaveDemographicConfig({
                            options,
                            disqualified,
                            questionLabel
                        });
                    }}
                    onQuotasSave={(quotas) => handleQuotasSave(activeConfigModal, quotas)}
                    onQuotasToggle={(enabled) => handleQuotasToggle(activeConfigModal, enabled)}
                    currentOptions={getModalOptions(activeConfigModal)}
                    currentDisqualified={getModalDisqualified(activeConfigModal)}
                    initialQuotas={mapBackendQuotasToModal(demographics[activeConfigModal]?.quotas, 'optionValue')}
                    quotasEnabled={isQuotasEnabled(activeConfigModal)}
                />
            )}
        </div>
    );
};
