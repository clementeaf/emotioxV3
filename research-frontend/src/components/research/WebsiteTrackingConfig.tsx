/**
 * Website Tracking Configuration View
 * Builder view for Website Tracking research type.
 * Shows tracking config, embed snippet, and domain setup.
 */

import { useState, useEffect, useCallback } from 'react';
import { Globe, MousePointerClick, ArrowDownUp, Move, Shield, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import * as trackingService from '../../services/tracking.service';
import type { TrackingConfig } from '../../services/tracking.service';
import { researchKeys } from '../../hooks/useResearchQuery';
import { CopyButton } from '../ui/CopyButton';
import type { Research } from '../../services/research.service';

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

    const handleVerify = useCallback(async () => {
        setVerifying(true);
        setVerifyResult(null);
        try {
            // First check if the script.js endpoint is reachable
            const scriptUrl = `${import.meta.env.VITE_API_URL || 'https://emotio.cx/api'}/public/tracking/${research.id}/script.js`;
            const scriptRes = await fetch(scriptUrl, { method: 'HEAD' });
            if (!scriptRes.ok) {
                setVerifyResult('script_error');
                return;
            }

            // Then check for sessions
            const overview = await trackingService.getOverview(research.id);
            setVerifyResult(overview.totalSessions > 0 ? 'success' : 'no_sessions');
        } catch {
            setVerifyResult('script_error');
        } finally {
            setVerifying(false);
        }
    }, [research.id]);

    const isActive = research.status === 'active';

    return (
        <div className="space-y-6 max-w-3xl">
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
                {isActive && (
                    <div className="mt-3 flex items-center gap-3">
                        <button
                            onClick={handleVerify}
                            disabled={verifying}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                        >
                            {verifying ? 'Checking...' : 'Verify Installation'}
                        </button>
                        {verifyResult === 'success' && (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                Script is active — sessions detected
                            </span>
                        )}
                        {verifyResult === 'no_sessions' && (
                            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                Script endpoint is reachable but no sessions yet — visit the website to generate the first session
                            </span>
                        )}
                        {verifyResult === 'script_error' && (
                            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                Could not reach the tracking script — check that the research is active and the API is accessible
                            </span>
                        )}
                    </div>
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
