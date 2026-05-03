import { useState, useCallback } from 'react';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';

export interface AnalysisProfile {
    gender?: 'male' | 'female' | 'any';
    ageRange?: string;
    interests?: string;
    context?: 'shelf' | 'web' | 'advertisement' | 'packaging' | 'general';
    intention?: 'utilitarian' | 'emotional' | 'browsing';
    description?: string;
}

interface AnalysisProfilePanelProps {
    profile: AnalysisProfile;
    onChange: (profile: AnalysisProfile) => void;
}

const CONTEXT_OPTIONS = [
    { value: 'general', label: 'General' },
    { value: 'shelf', label: 'Shelf / Retail Display' },
    { value: 'packaging', label: 'Product Packaging' },
    { value: 'web', label: 'Web / E-commerce' },
    { value: 'advertisement', label: 'Advertisement' },
];

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

export const AnalysisProfilePanel = ({ profile, onChange }: AnalysisProfilePanelProps) => {
    const [expanded, setExpanded] = useState(false);

    const update = useCallback((field: keyof AnalysisProfile, value: string) => {
        onChange({ ...profile, [field]: value || undefined });
    }, [profile, onChange]);

    const hasProfile = profile.context || profile.gender || profile.description || profile.interests;

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-700">Analysis Profile</span>
                    {hasProfile && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded-full font-medium">
                            {profile.context || 'custom'}
                        </span>
                    )}
                </div>
                {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>

            {expanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3">
                    {/* Context */}
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Stimulus Context</label>
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
                            <select
                                value={profile.gender || 'any'}
                                onChange={(e) => update('gender', e.target.value)}
                                className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                                {GENDER_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
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
                            <select
                                value={profile.intention || 'browsing'}
                                onChange={(e) => update('intention', e.target.value)}
                                className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                                {INTENTION_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
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
                            placeholder="e.g. Mujer de 30 años, Lima metropolitana, buscando yogurt light para dieta"
                            rows={2}
                            className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                    </div>

                    {/* Info about β weight */}
                    {profile.context && profile.context !== 'general' && (
                        <p className="text-[10px] text-gray-400">
                            Semantic weight adjusted: {profile.context === 'shelf' || profile.context === 'packaging' ? 'β=0.50 (high)' : profile.context === 'advertisement' ? 'β=0.45' : 'β=0.40'} — higher semantic influence for {profile.context} context
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
