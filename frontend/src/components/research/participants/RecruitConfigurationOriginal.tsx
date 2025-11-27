'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/utils';

import { QRCodeModal } from '../shared/QRCodeModal';

interface RecruitConfigurationProps {
  className?: string;
}

interface DemographicConfig {
  age: boolean;
  country: boolean;
  gender: boolean;
  educationLevel: boolean;
  annualIncome: boolean;
  employmentStatus: boolean;
  dailyHoursOnline: boolean;
  technicalProficiency: boolean;
}

interface LinkConfig {
  completeInterviews: string;
  disqualifiedInterviews: string;
  overquotaInterviews: string;
}

interface ResearchConfig {
  researchUrl: string;
  participantLimit: number;
}

interface Statistics {
  complete: number;
  disqualified: number;
  overquota: number;
}

export function RecruitConfiguration({ className }: RecruitConfigurationProps) {
  const [demographicEnabled, setDemographicEnabled] = useState(true);
  const [linkConfigEnabled, setLinkConfigEnabled] = useState(true);
  const [limitParticipantsEnabled, setLimitParticipantsEnabled] = useState(true);
  const [allowMobileDevices, setAllowMobileDevices] = useState(true);
  const [trackLocation, setTrackLocation] = useState(true);
  const [participantLimit, setParticipantLimit] = useState(50);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const [demographics, setDemographics] = useState<DemographicConfig>({
    age: true,
    country: true,
    gender: true,
    educationLevel: true,
    annualIncome: true,
    employmentStatus: true,
    dailyHoursOnline: true,
    technicalProficiency: true,
  });

  const [linkConfig, setLinkConfig] = useState<LinkConfig>({
    completeInterviews: '',
    disqualifiedInterviews: '',
    overquotaInterviews: '',
  });

  const [researchConfig, setResearchConfig] = useState<ResearchConfig>({
    researchUrl: '',
    participantLimit: 50,
  });

  const [statistics] = useState<Statistics>({
    complete: 57,
    disqualified: 24,
    overquota: 15,
  });

  const handleDemographicChange = (key: keyof DemographicConfig) => {
    setDemographics(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLinkChange = (key: keyof LinkConfig, value: string) => {
    setLinkConfig(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleResearchConfigChange = (key: keyof ResearchConfig, value: string | number) => {
    setResearchConfig(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleGenerateQR = () => {
    setQrModalOpen(true);
  };

  return (
    <div className={cn('max-w-3xl mx-auto', className)}>
      {/* Form Content */}
      <div className="bg-white rounded-xl border border-neutral-200/70 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-8 py-8">
          <header className="mb-6">
            <h1 className="text-lg font-semibold text-neutral-900">
              1.0 - Recruitment Configuration
            </h1>
            <p className="text-sm text-gray-600 mb-4">
              Configura los parámetros de reclutamiento para tu investigación. Estos ajustes afectan cómo se presentará tu estudio a los participantes potenciales.
            </p>
          </header>

          <div className="space-y-8">
            {/* Recruitment link section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-base font-medium mb-4">Recruitment link</h2>

                {/* Demographic questions */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-medium text-neutral-900">Demographic questions</h3>
                      <p className="text-sm text-neutral-500">Collect demographic information from participants.</p>
                    </div>
                    <Switch
                      checked={demographicEnabled}
                      onCheckedChange={setDemographicEnabled}
                    />
                  </div>

                  {demographicEnabled && (
                    <div className="space-y-3 px-4">
                      {Object.entries(demographics).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={() => handleDemographicChange(key as keyof DemographicConfig)}
                            className="rounded border-neutral-300"
                          />
                          <span className="text-sm">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Link configuration */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-medium text-neutral-900">Link configuration</h3>
                        <p className="text-sm text-neutral-500">Configure how participants can access your research.</p>
                      </div>
                      <Switch
                        checked={linkConfigEnabled}
                        onCheckedChange={setLinkConfigEnabled}
                      />
                    </div>
                    {linkConfigEnabled && (
                      <div className="space-y-3 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={allowMobileDevices}
                            onChange={() => setAllowMobileDevices(!allowMobileDevices)}
                            className="rounded border-neutral-300"
                          />
                          <span className="text-sm">Allow respondents to take survey via mobile devices</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={trackLocation}
                            onChange={() => setTrackLocation(!trackLocation)}
                            className="rounded border-neutral-300"
                          />
                          <span className="text-sm">Track respondents location</span>
                        </div>
                        <div className="text-xs text-neutral-500 pl-6">
                          It can be taken multiple times within a single session
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Limit participants */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-medium text-neutral-900">Limit number of participants</h3>
                        <p className="text-sm text-neutral-500">Set a maximum number of participants for this research.</p>
                      </div>
                      <Switch
                        checked={limitParticipantsEnabled}
                        onCheckedChange={setLimitParticipantsEnabled}
                      />
                    </div>
                    {limitParticipantsEnabled && (
                      <div className="px-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={participantLimit}
                            onChange={(e) => setParticipantLimit(Number(e.target.value))}
                            className="w-20"
                          />
                          <span className="text-sm text-neutral-600">
                            You will receive {participantLimit} responses
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Research configuration */}
              <div>
                <h2 className="text-base font-medium mb-4">Research configuration</h2>

                {/* Backlinks */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-900 mb-3">A. Backlinks</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm mb-2">Link for complete interviews</label>
                        <Input
                          value={linkConfig.completeInterviews}
                          onChange={(e) => handleLinkChange('completeInterviews', e.target.value)}
                          placeholder="https://d1m54jkfd0fdui.cloudfront.net/completed"
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                          Research Links URL: <code className="bg-neutral-100 px-1 rounded">/completed</code>
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm mb-2">Link for disqualified interviews</label>
                        <Input
                          value={linkConfig.disqualifiedInterviews}
                          onChange={(e) => handleLinkChange('disqualifiedInterviews', e.target.value)}
                          placeholder="https://d1m54jkfd0fdui.cloudfront.net/disqualified"
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                          Research Links URL: <code className="bg-neutral-100 px-1 rounded">/disqualified</code>
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm mb-2">Link for overquota interviews</label>
                        <Input
                          value={linkConfig.overquotaInterviews}
                          onChange={(e) => handleLinkChange('overquotaInterviews', e.target.value)}
                          placeholder="https://d1m54jkfd0fdui.cloudfront.net/exceeded"
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                          Research Links URL: <code className="bg-neutral-100 px-1 rounded">/exceeded</code>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Research link */}
                  <div>
                    <h3 className="text-sm font-medium text-neutral-900 mb-3">B. Research&apos;s link to share</h3>
                    <div className="space-y-2">
                      <p className="text-sm text-neutral-600">
                        Third-party invitation system should substitute [your respondent id here]
                      </p>
                      <div>
                        <label className="block text-sm mb-2">Research URL</label>
                        <div className="flex gap-2">
                          <Input
                            value={researchConfig.researchUrl}
                            onChange={(e) => handleResearchConfigChange('researchUrl', e.target.value)}
                            placeholder="https://"
                          />
                          <Button variant="outline">Link Preview</Button>
                        </div>
                        <div className="mt-2">
                          <Button onClick={handleGenerateQR}>Generate QR</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Modal */}
            <QRCodeModal
              open={qrModalOpen}
              onOpenChange={setQrModalOpen}
              researchUrl={researchConfig.researchUrl}
            />

            {/* Current statistics */}
            <div className="mt-8">
              <h2 className="text-base font-medium mb-4">Statistics</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <span className="block text-sm mb-1">Complete</span>
                  <span className="text-xl font-semibold">{statistics.complete}</span>
                </div>
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <span className="block text-sm mb-1">Disqualified</span>
                  <span className="text-xl font-semibold">{statistics.disqualified}</span>
                </div>
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <span className="block text-sm mb-1">Overquota</span>
                  <span className="text-xl font-semibold">{statistics.overquota}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between px-8 py-4 bg-neutral-50 border-t border-neutral-100">
          <p className="text-sm text-neutral-500">Changes are saved automatically</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Preview
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Save and Continue
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
