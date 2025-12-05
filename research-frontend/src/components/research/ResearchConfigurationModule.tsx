import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ExternalLink, QrCode } from 'lucide-react';

interface ResearchConfigurationProps {
    config: Record<string, unknown>;
    onChange: (config: Record<string, unknown>) => void;
}

/**
 * Research Configuration Module Component
 * Renders the recruitment and configuration settings for a research
 */
export const ResearchConfigurationModule = ({ config, onChange }: ResearchConfigurationProps) => {
    const [demographicEnabled, setDemographicEnabled] = useState(true);
    const [linkConfigEnabled, setLinkConfigEnabled] = useState(true);
    const [participantLimitEnabled, setParticipantLimitEnabled] = useState(true);

    const demographics = (config.demographics || {}) as Record<string, boolean>;
    const linkConfig = (config.linkConfig || {}) as Record<string, boolean>;
    const backlinks = (config.backlinks || {}) as Record<string, string>;
    const researchUrl = (config.researchUrl || '') as string;
    const participantLimit = (config.participantLimit || 50) as number;

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
        onChange({
            ...config,
            backlinks: { ...backlinks, [key]: value }
        });
    };

    const handleResearchUrlChange = (value: string) => {
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

                    {demographicEnabled && (
                        <div className="grid grid-cols-2 gap-3 px-4">
                            {['age', 'country', 'gender', 'educationLevel', 'annualIncome', 'employmentStatus', 'dailyHoursOnline', 'technicalProficiency'].map((key) => (
                                <label key={key} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={demographics[key] || false}
                                        onChange={(e) => handleDemographicChange(key, e.target.checked)}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="capitalize">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
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

                    {linkConfigEnabled && (
                        <div className="space-y-3 px-4">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={linkConfig.allowMobile || false}
                                    onChange={(e) => handleLinkConfigChange('allowMobile', e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                <span>Allow respondents to take survey via mobile devices</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={linkConfig.trackLocation || false}
                                    onChange={(e) => handleLinkConfigChange('trackLocation', e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                <span>Track respondents location</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={linkConfig.allowMultiple || false}
                                    onChange={(e) => handleLinkConfigChange('allowMultiple', e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                <span>It can be taken multiple times within a single session</span>
                            </label>
                        </div>
                    )}
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

                    {participantLimitEnabled && (
                        <div className="px-4">
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
                                />
                                <span className="text-sm text-gray-500">
                                    You will receive 0 more responses.
                                </span>
                            </div>
                        </div>
                    )}
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

                    <div>
                        <label className="block text-sm text-gray-700 mb-2">Link for complete interviews</label>
                        <div className="flex gap-1">
                            <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                                https://
                            </span>
                            <Input
                                value={backlinks.complete || ''}
                                onChange={(e) => handleBacklinkChange('complete', e.target.value)}
                                placeholder="www.useremotion.com/"
                                className="rounded-l-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-700 mb-2">Link for disqualified interviews</label>
                        <div className="flex gap-1">
                            <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                                https://
                            </span>
                            <Input
                                value={backlinks.disqualified || ''}
                                onChange={(e) => handleBacklinkChange('disqualified', e.target.value)}
                                placeholder="www.useremotion.com/"
                                className="rounded-l-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-700 mb-2">Link for overquota interviews</label>
                        <div className="flex gap-1">
                            <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                                https://
                            </span>
                            <Input
                                value={backlinks.overquota || ''}
                                onChange={(e) => handleBacklinkChange('overquota', e.target.value)}
                                placeholder="www.useremotion.com/"
                                className="rounded-l-none"
                            />
                        </div>
                    </div>
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
                            />
                            <Button variant="ghost" size="sm" title="Copy">
                                📋
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Link Preview
                            </Button>
                            <Button variant="primary" size="sm">
                                <QrCode className="h-4 w-4 mr-2" />
                                Generate QR
                            </Button>
                        </div>
                    </div>
                </div>

                {/* C. Parameters */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">C. Research&apos;s parameters to save</h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Please specify parameters that you want to save (comma separated keys)
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {['Parameters', 'Separated', 'With', 'Comma', 'Keys'].map((param) => (
                            <span
                                key={param}
                                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                            >
                                {param}
                                <button className="ml-1 text-blue-600 hover:text-blue-800">×</button>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
