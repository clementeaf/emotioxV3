import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { QRCodeModal } from '../ui/QRCodeModal';
import { ExternalLink, QrCode, Copy } from 'lucide-react';
import { useUrlValidation } from '../../hooks/useUrlValidation';
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

    const { validateUrl, extractParameters } = useUrlValidation();
    const toast = useToast();


    const demographics = (config.demographics || {}) as Record<string, boolean>;
    const linkConfig = (config.linkConfig || {}) as Record<string, boolean>;
    const backlinks = (config.backlinks || {}) as Record<string, string>;
    const researchUrl = (config.researchUrl || '') as string;
    const participantLimit = (config.participantLimit || 50) as number;
    const [runtimeParticipantBaseUrl, setRuntimeParticipantBaseUrl] = useState<string | null>(null);

    // Extract URL parameters dynamically
    const urlParameters = useMemo(() => extractParameters(researchUrl), [researchUrl, extractParameters]);

    /**
     * Loads participant base URL from /runtime-config.json when deployed (CloudFront).
     */
    useEffect(() => {
        const host = window.location.hostname;
        const isLocal = host === 'localhost' || host === '127.0.0.1';
        if (isLocal) {
            setRuntimeParticipantBaseUrl(null);
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
                const response = await fetch('/runtime-config.json', { cache: 'no-store' });
                if (!response.ok) return;
                const data = (await response.json()) as unknown;
                if (!cancelled && isRuntimeConfigWithParticipant(data)) {
                    setRuntimeParticipantBaseUrl(data.participantBaseUrl.replace(/\/+$/, ''));
                }
            } catch {
                // ignore - we can fall back to env config
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
        if (runtimeParticipantBaseUrl && runtimeParticipantBaseUrl.trim().length > 0) {
            return runtimeParticipantBaseUrl;
        }
        const envUrl = import.meta.env.VITE_PARTICIPANT_FRONTEND_URL;
        return typeof envUrl === 'string' ? envUrl : '';
    };

    /**
     * Extracts a safe pathname/search/hash from a user-provided URL-like value.
     * Accepts full URLs, host+path, or just path/query fragments.
     * @param value - User-provided URL-like string (may omit protocol)
     * @returns Parsed URL parts
     */
    const parseUrlParts = (value: string): { pathname: string; search: string; hash: string } => {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            return { pathname: '/', search: '', hash: '' };
        }

        const normalizeForParsing = (input: string): string => {
            if (input.startsWith('http://') || input.startsWith('https://')) {
                return input;
            }
            // If it looks like it starts with a path, use a placeholder base.
            if (input.startsWith('/')) {
                return `https://placeholder.local${input}`;
            }
            // Try as host+path first.
            return `https://${input}`;
        };

        try {
            const u = new URL(normalizeForParsing(trimmed));
            return { pathname: u.pathname || '/', search: u.search || '', hash: u.hash || '' };
        } catch {
            // Fallback: treat as a path fragment (e.g., "sysgd-jye746?respondent={your_id}")
            const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
            const u = new URL(`https://placeholder.local${normalizedPath}`);
            return { pathname: u.pathname || '/', search: u.search || '', hash: u.hash || '' };
        }
    };

    /**
     * Builds the participant-facing URL used for Preview/QR.
     * If a custom Research URL is provided, it is used (with the participant base).
     * Otherwise, falls back to /research/:id (legacy).
     * @returns Full URL to open in participant app
     */
    const buildParticipantShareUrl = (): string => {
        const baseUrl = resolveParticipantBaseUrl();
        if (!baseUrl || baseUrl.trim().length === 0) {
            return '';
        }
        const base = new URL(baseUrl);

        if (researchUrl && researchUrl.trim().length > 0) {
            const parts = parseUrlParts(researchUrl);
            return `${base.origin}${parts.pathname}${parts.search}${parts.hash}`;
        }

        if (!researchId) return '';
        return `${base.origin}/research/${researchId}`;
    };

    /**
     * Opens the participant-facing URL in a new tab.
     * @returns void
     */
    const handleLinkPreview = (): void => {
        const url = buildParticipantShareUrl();
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    /**
     * Copies the Research URL to clipboard with https:// prefix.
     * @returns void
     */
    const handleCopyResearchUrl = async (): Promise<void> => {
        const value = researchUrl.trim();
        if (value.length === 0) return;
        const fullUrl = value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`;
        try {
            await navigator.clipboard.writeText(fullUrl);
            toast.success('Research URL copied to clipboard');
        } catch {
            // Best-effort fallback
            try {
                const textarea = document.createElement('textarea');
                textarea.value = fullUrl;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                toast.success('Research URL copied to clipboard');
            } catch {
                toast.error('Failed to copy URL to clipboard');
            }
        }
    };

    const handleDemographicChange = (key: string, value: boolean) => {
        onChange({
            ...config,
            demographics: { ...demographics, [key]: value }
        });
    };

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

    const handleResearchUrlChange = (value: string) => {
        // Validate URL if value is not empty
        if (value.trim()) {
            const { isValid, error } = validateUrl(value);
            setUrlErrors(prev => ({
                ...prev,
                research: isValid ? '' : (error || 'Invalid URL'),
            }));
        } else {
            setUrlErrors(prev => ({
                ...prev,
                research: '',
            }));
        }

        onChange({
            ...config,
            researchUrl: value
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
                <h2 className="text-base font-semibold text-gray-900">Recruitment link</h2>

                {/* Demographic Questions */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <h3 className="text-sm font-medium text-gray-900">Demographic questions</h3>
                            <p className="text-xs text-gray-500 mt-1">Please select</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={demographicEnabled}
                            onChange={(e) => setDemographicEnabled(e.target.checked)}
                            className="rounded border-gray-300"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 px-4">
                        {['age', 'country', 'gender', 'educationLevel', 'annualIncome', 'employmentStatus', 'dailyHoursOnline', 'technicalProficiency'].map((key) => (
                            <label key={key} className={`flex items-center gap-2 text-sm ${!demographicEnabled ? 'opacity-50' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={demographics[key] || false}
                                    onChange={(e) => handleDemographicChange(key, e.target.checked)}
                                    disabled={!demographicEnabled}
                                    className="rounded border-gray-300"
                                />
                                <span className="capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Link Configuration */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <h3 className="text-sm font-medium text-gray-900">Link configuration</h3>
                            <p className="text-xs text-gray-500 mt-1">Please select</p>
                        </div>
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
                        <div>
                            <h3 className="text-sm font-medium text-gray-900">Limit number of participants</h3>
                            <p className="text-xs text-gray-500 mt-1">Please select</p>
                        </div>
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
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                value={participantLimit}
                                onChange={(e) => handleParticipantLimitChange(parseInt(e.target.value) || 50)}
                                className="w-24"
                                min={1}
                                disabled={!participantLimitEnabled}
                            />
                            <span className="text-sm text-gray-500">
                                You will receive 0 more responses.
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Research Configuration */}
            <div className="space-y-6">
                <h2 className="text-base font-semibold text-gray-900">Research configuration</h2>

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
                            Third-party invitation system should substitute your respondent id here parameter with individual respondent ID.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-700 mb-2">Research URL</label>
                        <div className="flex gap-1 mb-2">
                            <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                                https://
                            </span>
                            <Input
                                value={researchUrl}
                                onChange={(e) => handleResearchUrlChange(e.target.value)}
                                placeholder="www.useremotion.com/sysgd-jye746?respondent={your_id}"
                                className="rounded-l-none"
                                error={urlErrors.research}
                            />
                            <Button variant="ghost" size="sm" title="Copy" onClick={handleCopyResearchUrl}>
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
                                onClick={() => setShowQRModal(true)}
                            >
                                <QrCode className="h-4 w-4 mr-2" />
                                Generate QR
                            </Button>
                        </div>
                    </div>
                </div>

                {/* C. Parameters */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">C. Research&apos;s parameters detected</h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Parameters detected in your research URL (use {'{parameter_name}'} in the URL above)
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {urlParameters.length > 0 ? (
                            urlParameters.map((param) => (
                                <span
                                    key={param}
                                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                                >
                                    {param}
                                </span>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500">
                                No parameters detected. Use {'{parameter_name}'} in your URL to add dynamic parameters.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* QR Code Modal */}
            <QRCodeModal
                isOpen={showQRModal}
                onClose={() => setShowQRModal(false)}
                url={buildParticipantShareUrl()}
                title="Research link QR Code"
                description="This is your Public QR Code"
                downloadFileName="research-qr-code.png"
            />
        </div>
    );
};
