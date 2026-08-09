import { useState, useCallback } from 'react';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import { CustomSelect } from '../ui/CustomSelect';

export interface AnalysisProfile {
    gender?: 'male' | 'female' | 'any';
    ageRange?: string;
    interests?: string;
    context?: 'shelf' | 'web' | 'advertisement' | 'packaging' | 'app' | 'social_media' | 'dashboard' | 'print' | 'general';
    intention?: 'utilitarian' | 'emotional' | 'browsing';
    description?: string;
}

interface AnalysisProfilePanelProps {
    profile: AnalysisProfile;
    onChange: (profile: AnalysisProfile) => void;
    /** AI-detected context type from analysis result (e.g. "mobile", "web") — used for auto-suggestion */
    detectedContext?: string;
}

const CONTEXT_OPTIONS = [
    { value: 'general', label: 'General' },
    { value: 'web', label: 'Web / E-commerce' },
    { value: 'app', label: 'App / Mobile' },
    { value: 'shelf', label: 'Shelf / Retail' },
    { value: 'packaging', label: 'Packaging' },
    { value: 'advertisement', label: 'Advertisement' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'dashboard', label: 'Dashboard / UI' },
    { value: 'print', label: 'Print / Editorial' },
];

/** Maps AI analysis context.type values to profile context values */
const DETECTED_TO_PROFILE: Record<string, string> = {
    web: 'web',
    mobile: 'app',
    poster: 'print',
    print: 'print',
    packaging: 'packaging',
    billboard: 'advertisement',
    social_media: 'social_media',
};

const INTENTION_OPTIONS = [
    { value: 'browsing', label: 'Browsing' },
    { value: 'utilitarian', label: 'Utilitarian (searching for info)' },
    { value: 'emotional', label: 'Emotional (seeking inspiration)' },
];

const GENDER_OPTIONS = [
    { value: 'any', label: 'Any' },
    { value: 'female', label: 'Female' },
    { value: 'male', label: 'Male' },
];

export const AnalysisProfilePanel = ({ profile, onChange, detectedContext }: AnalysisProfilePanelProps) => {
    const [expanded, setExpanded] = useState(false);

    const update = useCallback((field: keyof AnalysisProfile, value: string) => {
        onChange({ ...profile, [field]: value || undefined });
    }, [profile, onChange]);

    const hasProfile = profile.context || profile.gender || profile.description || profile.interests;

    // Map AI-detected context to a profile suggestion
    const suggestedContext = detectedContext ? DETECTED_TO_PROFILE[detectedContext] : undefined;
    const hasSuggestion = suggestedContext && suggestedContext !== profile.context;

    const profileSummary = (() => {
        if (!hasProfile) return '';
        if (profile.description) return profile.description;
        const parts: string[] = [];
        const genderLabel = GENDER_OPTIONS.find(o => o.value === profile.gender)?.label;
        if (profile.gender && profile.gender !== 'any') parts.push(genderLabel || profile.gender);
        if (profile.ageRange) parts.push(`${profile.ageRange} years`);
        const intentionLabel = INTENTION_OPTIONS.find(o => o.value === profile.intention)?.label;
        if (profile.intention && profile.intention !== 'browsing') parts.push(intentionLabel || profile.intention);
        if (profile.interests) parts.push(profile.interests);
        return parts.join(', ');
    })();

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <Users className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 flex-shrink-0">Analysis Profile</span>
                    {hasProfile && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded-full font-medium flex-shrink-0">
                            {profile.context || 'custom'}
                        </span>
                    )}
                    {!expanded && profileSummary && (
                        <span className="text-xs text-gray-500 truncate" title={profileSummary}>
                            {profileSummary}
                        </span>
                    )}
                </div>
                {expanded ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
            </button>

            {expanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3">
                    {/* Context */}
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Stimulus Context</label>
                        {hasSuggestion && (
                            <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                                <span className="text-xs text-amber-700">
                                    AI detected: <strong>{CONTEXT_OPTIONS.find(o => o.value === suggestedContext)?.label || suggestedContext}</strong>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => update('context', suggestedContext)}
                                    className="text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded transition-colors"
                                >
                                    Apply
                                </button>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                            {CONTEXT_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => update('context', opt.value)}
                                    className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                                        profile.context === opt.value
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Target demographics row */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Gender</label>
                            <CustomSelect
                                options={GENDER_OPTIONS}
                                value={profile.gender || 'any'}
                                onChange={(v) => update('gender', v)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Age Range</label>
                            <input
                                type="text"
                                value={profile.ageRange || ''}
                                onChange={(e) => update('ageRange', e.target.value)}
                                placeholder="e.g. 25-35"
                                className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Intention</label>
                            <CustomSelect
                                options={INTENTION_OPTIONS}
                                value={profile.intention || 'browsing'}
                                onChange={(v) => update('intention', v)}
                            />
                        </div>
                    </div>

                    {/* Interests */}
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Interests / Keywords</label>
                        <input
                            type="text"
                            value={profile.interests || ''}
                            onChange={(e) => update('interests', e.target.value)}
                            placeholder="e.g. healthy food, organic, premium"
                            className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                    </div>

                    {/* Free description */}
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Profile Description (free-form)</label>
                        <textarea
                            value={profile.description || ''}
                            onChange={(e) => update('description', e.target.value)}
                            placeholder="e.g. 30-year-old woman, metropolitan area, looking for light yogurt for diet"
                            rows={2}
                            className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                    </div>

                    {/* Info about β weight */}
                    {profile.context && profile.context !== 'general' && (() => {
                        const betas: Record<string, string> = {
                            shelf: '0.50 (high)', packaging: '0.50 (high)',
                            advertisement: '0.45', app: '0.45',
                            social_media: '0.42', print: '0.42',
                            web: '0.40', dashboard: '0.40',
                        };
                        const beta = betas[profile.context] || '0.35';
                        return (
                            <p className="text-[10px] text-gray-400">
                                Semantic weight: β={beta} for {CONTEXT_OPTIONS.find(o => o.value === profile.context)?.label || profile.context}
                            </p>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};
