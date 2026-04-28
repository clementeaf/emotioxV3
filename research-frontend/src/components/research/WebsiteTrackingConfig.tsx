/**
 * Website Tracking Configuration View
 * Builder view for Website Tracking research type.
 * Shows tracking config, embed snippet, and domain setup.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Globe, MousePointerClick, ArrowDownUp, Move, Shield, RefreshCw, Camera, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import * as trackingService from '../../services/tracking.service';
import type { TrackingConfig } from '../../services/tracking.service';
import { researchKeys } from '../../hooks/useResearchQuery';
import { CopyButton } from '../ui/CopyButton';
import type { Research } from '../../services/research.service';
import { mediaService } from '../../services/media.service';

interface WebsiteTrackingConfigProps {
    research: Research;
}

export const WebsiteTrackingConfig = ({ research }: WebsiteTrackingConfigProps) => {
    const queryClient = useQueryClient();
    const [snippet, setSnippet] = useState<string>('');
    const [saving, setSaving] = useState(false);

    const settings = (research.settings || {}) as Record<string, unknown>;
    const existingConfig = (settings.trackingConfig || {}) as Partial<TrackingConfig>;
    const [config, setConfig] = useState<TrackingConfig>({
        captureClicks: existingConfig.captureClicks !== false,
        captureScroll: existingConfig.captureScroll === true,
        captureMousemove: existingConfig.captureMousemove === true,
        consentRequired: existingConfig.consentRequired !== false,
        flushIntervalMs: existingConfig.flushIntervalMs || 2000,
        maxEventsPerFlush: existingConfig.maxEventsPerFlush || 50,
        allowedDomains: existingConfig.allowedDomains || [],
        consentText: existingConfig.consentText || 'This site uses interaction tracking for UX research.',
        consentAcceptLabel: existingConfig.consentAcceptLabel || 'Accept',
        consentDeclineLabel: existingConfig.consentDeclineLabel || 'Decline',
        consentPosition: existingConfig.consentPosition || 'bottom',
    });
    const [domainInput, setDomainInput] = useState('');

    // Load embed snippet
    useEffect(() => {
        trackingService.getEmbedSnippet(research.id)
            .then(setSnippet)
            .catch(() => setSnippet('<!-- Error loading snippet -->'));
    }, [research.id]);

    const handleToggle = useCallback((key: keyof TrackingConfig) => {
        setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const handleAddDomain = useCallback(() => {
        const domain = domainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
        if (domain && !config.allowedDomains.includes(domain)) {
            setConfig((prev) => ({
                ...prev,
                allowedDomains: [...prev.allowedDomains, domain],
            }));
            setDomainInput('');
        }
    }, [domainInput, config.allowedDomains]);

    const handleRemoveDomain = useCallback((domain: string) => {
        setConfig((prev) => ({
            ...prev,
            allowedDomains: prev.allowedDomains.filter((d) => d !== domain),
        }));
    }, []);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            await trackingService.updateConfig(research.id, config);
            queryClient.invalidateQueries({ queryKey: researchKeys.detail(research.id) });
        } catch (err) {
            console.error('Failed to save tracking config:', err);
        } finally {
            setSaving(false);
        }
    }, [research.id, config, queryClient]);

    const [verifying, setVerifying] = useState(false);
    const [verifyResult, setVerifyResult] = useState<'success' | 'no_sessions' | 'script_error' | null>(null);
    const [verifyCountdown, setVerifyCountdown] = useState(0);
    const verifyAbortRef = useRef(false);

    const handleVerify = useCallback(async () => {
        setVerifying(true);
        setVerifyResult(null);
        verifyAbortRef.current = false;

        const TIMEOUT_S = 60;
        const POLL_INTERVAL_MS = 3000;
        setVerifyCountdown(TIMEOUT_S);

        // Countdown timer
        const countdownTimer = setInterval(() => {
            setVerifyCountdown((prev) => {
                if (prev <= 1) { clearInterval(countdownTimer); return 0; }
                return prev - 1;
            });
        }, 1000);

        try {
            const startTime = Date.now();
            while (Date.now() - startTime < TIMEOUT_S * 1000) {
                if (verifyAbortRef.current) break;
                const result = await trackingService.verifyInstallation(research.id, TIMEOUT_S + 30);
                if (result.hasData) {
                    setVerifyResult('success');
                    clearInterval(countdownTimer);
                    setVerifying(false);
                    return;
                }
                await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
            }
            // Timeout — no sessions arrived
            setVerifyResult('no_sessions');
        } catch {
            setVerifyResult('script_error');
        } finally {
            clearInterval(countdownTimer);
            setVerifying(false);
            setVerifyCountdown(0);
        }
    }, [research.id]);

    const isActive = research.status === 'active';

    const hasSnippet = !!snippet;
    const hasVerified = verifyResult === 'success';

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Setup checklist */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-base font-semibold text-slate-900 mb-3">Setup Checklist</h3>
                <div className="space-y-2">
                    <ChecklistItem done={isActive} label="Activate research" description={isActive ? 'Research is active' : 'Activate to start collecting data'} />
                    <ChecklistItem done={hasSnippet} label="Copy tracking snippet" description="Paste it in your website's <head>" />
                    <ChecklistItem done={hasVerified} label="Verify installation" description={hasVerified ? 'Sessions detected' : 'Click "Verify Installation" after adding the snippet'} />
                    <ChecklistItem done={false} label="View results" description="Check click heatmaps in the Results tab" />
                </div>
            </div>

            {/* Status banner */}
            {!isActive && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                    Activate this research to start collecting tracking data. The script will not record interactions while the research is in draft.
                </div>
            )}

            {/* Embed Snippet */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-base font-semibold text-slate-900 mb-1">Tracking Script</h3>
                <p className="text-sm text-slate-500 mb-4">
                    Copy this snippet and paste it in the <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">&lt;head&gt;</code> of your website.
                </p>

                <div className="relative">
                    <pre className="bg-slate-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto font-mono leading-relaxed">
                        {snippet || 'Loading snippet...'}
                    </pre>
                    {snippet && (
                        <CopyButton
                            text={snippet}
                            className="absolute top-3 right-3 p-2 bg-slate-700 hover:bg-slate-600 text-slate-300"
                        />
                    )}
                </div>

                {/* Verify installation */}
                <div className="mt-3 flex items-center gap-3">
                    <button
                        onClick={handleVerify}
                        disabled={verifying}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                    >
                        {verifying ? `Listening for data... ${verifyCountdown}s` : 'Verify Installation'}
                    </button>
                    {verifying && (
                        <span className="text-xs text-slate-500">
                            Visit your website to send the first session
                        </span>
                    )}
                    {verifyResult === 'success' && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                            Sessions detected — tracking is working
                        </span>
                    )}
                    {verifyResult === 'no_sessions' && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            No sessions detected after 60s — verify the snippet is in your site&apos;s &lt;head&gt; and {isActive ? 'try again' : 'activate the research first'}
                        </span>
                    )}
                    {verifyResult === 'script_error' && (
                        <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                            Connection error — check that the API is accessible
                        </span>
                    )}
                </div>

                {/* Screenshot prompt after successful verification */}
                {verifyResult === 'success' && (
                    <ScreenshotPrompt researchId={research.id} queryClient={queryClient} />
                )}
            </div>

            {/* Allowed Domains */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-1">
                    <Globe className="h-4 w-4 text-slate-600" />
                    <h3 className="text-base font-semibold text-slate-900">Allowed Domains</h3>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                    Restrict tracking to specific domains. Leave empty to allow any domain.
                </p>

                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                        placeholder="example.com"
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <button
                        onClick={handleAddDomain}
                        disabled={!domainInput.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        Add
                    </button>
                </div>

                {config.allowedDomains.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {config.allowedDomains.map((domain) => (
                            <span
                                key={domain}
                                className="inline-flex items-center gap-1.5 px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded-full"
                            >
                                {domain}
                                <button
                                    onClick={() => handleRemoveDomain(domain)}
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    &times;
                                </button>
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-400">No domain restrictions — tracking will work on any website.</p>
                )}
            </div>

            {/* Capture Settings */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-base font-semibold text-slate-900 mb-4">Capture Settings</h3>

                <div className="space-y-3">
                    <ToggleRow
                        icon={<MousePointerClick className="h-4 w-4" />}
                        label="Clicks"
                        description="Track click positions and target elements"
                        enabled={config.captureClicks}
                        onToggle={() => handleToggle('captureClicks')}
                    />
                    <ToggleRow
                        icon={<ArrowDownUp className="h-4 w-4" />}
                        label="Scroll Depth"
                        description="Track how far users scroll on each page"
                        enabled={config.captureScroll}
                        onToggle={() => handleToggle('captureScroll')}
                    />
                    <ToggleRow
                        icon={<Move className="h-4 w-4" />}
                        label="Mouse Movement"
                        description="Track cursor movement patterns (generates more data)"
                        enabled={config.captureMousemove}
                        onToggle={() => handleToggle('captureMousemove')}
                    />
                    <ToggleRow
                        icon={<Shield className="h-4 w-4" />}
                        label="Consent Banner"
                        description="Show a consent banner before tracking starts"
                        enabled={config.consentRequired}
                        onToggle={() => handleToggle('consentRequired')}
                    />

                    {/* Consent banner customization */}
                    {config.consentRequired && (
                        <div className="ml-7 pl-4 border-l-2 border-gray-100 space-y-3 pt-1">
                            <div>
                                <label className="text-xs font-medium text-slate-600">Banner text</label>
                                <input
                                    type="text"
                                    value={config.consentText}
                                    onChange={(e) => setConfig((prev) => ({ ...prev, consentText: e.target.value }))}
                                    className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-xs font-medium text-slate-600">Accept label</label>
                                    <input
                                        type="text"
                                        value={config.consentAcceptLabel}
                                        onChange={(e) => setConfig((prev) => ({ ...prev, consentAcceptLabel: e.target.value }))}
                                        className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-medium text-slate-600">Decline label</label>
                                    <input
                                        type="text"
                                        value={config.consentDeclineLabel}
                                        onChange={(e) => setConfig((prev) => ({ ...prev, consentDeclineLabel: e.target.value }))}
                                        className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600">Position</label>
                                <div className="mt-1 flex gap-2">
                                    {(['bottom', 'top'] as const).map((pos) => (
                                        <button
                                            key={pos}
                                            onClick={() => setConfig((prev) => ({ ...prev, consentPosition: pos }))}
                                            className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                                                config.consentPosition === pos
                                                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                                                    : 'bg-white border-gray-200 text-slate-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {pos === 'bottom' ? 'Bottom' : 'Top'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Save */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {saving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : null}
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </div>
    );
};

// ─── Checklist Item Component ────────────────────────────────────────

const ChecklistItem = ({ done, label, description }: { done: boolean; label: string; description: string }) => (
    <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            done ? 'bg-green-500 border-green-500' : 'border-gray-300'
        }`}>
            {done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        </div>
        <div>
            <p className={`text-sm font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{label}</p>
            <p className="text-xs text-slate-500">{description}</p>
        </div>
    </div>
);

// ─── Screenshot Prompt Component ─────────────────────────────────────

import type { QueryClient } from '@tanstack/react-query';

const ScreenshotPrompt = ({ researchId, queryClient }: { researchId: string; queryClient: QueryClient }) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [done, setDone] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const { s3Key } = await mediaService.uploadFile(researchId, file);
            // Get first tracked page to associate screenshot
            const pages = await trackingService.getTrackedPages(researchId);
            if (pages.length > 0) {
                await trackingService.savePageScreenshot(researchId, pages[0].pageUrl, s3Key);
            }
            queryClient.invalidateQueries({ queryKey: ['tracking', researchId] });
            setDone(true);
        } catch (err) {
            console.error('Screenshot upload failed:', err);
        } finally {
            setUploading(false);
        }
    };

    if (done) {
        return (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                Screenshot uploaded — view it in the Results tab.
            </div>
        );
    }

    return (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
                <Camera className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Upload a page screenshot</span>
            </div>
            <p className="text-xs text-blue-600 mb-2">
                Take a full-page screenshot of your website and upload it to enable click heatmap visualization.
            </p>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} />
            <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-50"
            >
                <Upload className="h-3.5 w-3.5" />
                {uploading ? 'Uploading...' : 'Upload Screenshot'}
            </button>
        </div>
    );
};

// ─── Toggle Row Component ────────────────────────────────────────────

const ToggleRow = ({
    icon,
    label,
    description,
    enabled,
    onToggle,
}: {
    icon: React.ReactNode;
    label: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
}) => (
    <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
            <span className="text-slate-500">{icon}</span>
            <div>
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-500">{description}</p>
            </div>
        </div>
        <button
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    </div>
);
