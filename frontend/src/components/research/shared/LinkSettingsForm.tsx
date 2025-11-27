'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/utils';

import { QRCodeModal } from './QRCodeModal';

interface LinkSettingsFormProps {
  className?: string;
}

export function LinkSettingsForm({ className }: LinkSettingsFormProps) {
  const [secureAccessEnabled, setSecureAccessEnabled] = useState(true);
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [deviceRestrictionEnabled, setDeviceRestrictionEnabled] = useState(true);
  const [allowMobileDevices, setAllowMobileDevices] = useState(true);
  const [allowTablets, setAllowTablets] = useState(true);
  const [allowDesktops, setAllowDesktops] = useState(true);
  const [trackLocation, setTrackLocation] = useState(true);
  const [allowMultipleSubmissions, setAllowMultipleSubmissions] = useState(false);
  const [expirationEnabled, setExpirationEnabled] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  
  const [linkConfig, setLinkConfig] = useState({
    researchUrl: 'https://emotiox.app/research/XYZ123',
    qrEnabled: true
  });

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
              2.2 - Link Settings
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Configure how participants can access your research and set restrictions.
            </p>
          </header>

          <div className="space-y-8">
            {/* Research link */}
            <div>
              <h2 className="text-base font-medium mb-4">Research Link</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="research-url" className="block text-sm font-medium text-neutral-700 mb-1">
                    Research URL
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="research-url"
                      value={linkConfig.researchUrl}
                      onChange={(e) => setLinkConfig({...linkConfig, researchUrl: e.target.value})}
                      className="flex-1"
                    />
                    <Button variant="outline">Copy</Button>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <p className="text-xs text-neutral-500">
                      This is the URL that participants will use to access your research.
                    </p>
                    <Button 
                      onClick={handleGenerateQR}
                      className="bg-black text-white hover:bg-neutral-800"
                    >
                      Generate QR
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-neutral-700">QR Code</h3>
                      <p className="text-xs text-neutral-500 mt-1">
                        Generate a QR code that redirects to your research.
                      </p>
                    </div>
                    <Switch 
                      checked={linkConfig.qrEnabled}
                      onCheckedChange={(checked: boolean) => setLinkConfig({...linkConfig, qrEnabled: checked})}
                    />
                  </div>
                  
                  {linkConfig.qrEnabled && (
                    <div className="mt-4 flex justify-center">
                      <div className="bg-neutral-100 w-32 h-32 flex items-center justify-center rounded-lg">
                        <div className="text-neutral-400 text-xs text-center">
                          QR Code Preview
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Access Restrictions */}
            <div>
              <h2 className="text-base font-medium mb-4">Access Restrictions</h2>
              
              <div className="space-y-6">
                {/* Secure Access */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-medium text-neutral-900">Secure Access</h3>
                      <p className="text-sm text-neutral-500">Add additional security to your research link.</p>
                    </div>
                    <Switch 
                      checked={secureAccessEnabled}
                      onCheckedChange={setSecureAccessEnabled}
                    />
                  </div>
                  
                  {secureAccessEnabled && (
                    <div className="space-y-3 px-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="password-protection"
                          checked={passwordProtected}
                          onChange={() => setPasswordProtected(!passwordProtected)}
                          className="rounded border-neutral-300"
                        />
                        <label htmlFor="password-protection" className="text-sm">
                          Password protect this research
                        </label>
                      </div>
                      
                      {passwordProtected && (
                        <div className="ml-6 mt-2">
                          <label htmlFor="password" className="block text-sm text-neutral-700 mb-1">
                            Password
                          </label>
                          <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="max-w-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Device Restrictions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-medium text-neutral-900">Device Restrictions</h3>
                      <p className="text-sm text-neutral-500">Control which devices can access your research.</p>
                    </div>
                    <Switch 
                      checked={deviceRestrictionEnabled}
                      onCheckedChange={setDeviceRestrictionEnabled}
                    />
                  </div>
                  
                  {deviceRestrictionEnabled && (
                    <div className="space-y-3 px-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="allow-mobile"
                          checked={allowMobileDevices}
                          onChange={() => setAllowMobileDevices(!allowMobileDevices)}
                          className="rounded border-neutral-300"
                        />
                        <label htmlFor="allow-mobile" className="text-sm">
                          Allow mobile phones
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="allow-tablets"
                          checked={allowTablets}
                          onChange={() => setAllowTablets(!allowTablets)}
                          className="rounded border-neutral-300"
                        />
                        <label htmlFor="allow-tablets" className="text-sm">
                          Allow tablets
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="allow-desktops"
                          checked={allowDesktops}
                          onChange={() => setAllowDesktops(!allowDesktops)}
                          className="rounded border-neutral-300"
                        />
                        <label htmlFor="allow-desktops" className="text-sm">
                          Allow desktop computers
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="track-location"
                          checked={trackLocation}
                          onChange={() => setTrackLocation(!trackLocation)}
                          className="rounded border-neutral-300"
                        />
                        <label htmlFor="track-location" className="text-sm">
                          Track respondent location
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expiration Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-medium text-neutral-900">Link Expiration</h3>
                      <p className="text-sm text-neutral-500">Set an expiration date for this research link.</p>
                    </div>
                    <Switch 
                      checked={expirationEnabled}
                      onCheckedChange={setExpirationEnabled}
                    />
                  </div>
                  
                  {expirationEnabled && (
                    <div className="px-4 space-y-2">
                      <label htmlFor="expiration-date" className="block text-sm text-neutral-700 mb-1">
                        Expiration Date
                      </label>
                      <Input
                        id="expiration-date"
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        className="max-w-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Submission Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-medium text-neutral-900">Multiple Submissions</h3>
                      <p className="text-sm text-neutral-500">Allow participants to complete the research multiple times.</p>
                    </div>
                    <Switch 
                      checked={allowMultipleSubmissions}
                      onCheckedChange={setAllowMultipleSubmissions}
                    />
                  </div>
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
              Preview Link
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

      {/* QR Code Modal */}
      <QRCodeModal 
        open={qrModalOpen} 
        onOpenChange={setQrModalOpen} 
        researchUrl={linkConfig.researchUrl} 
      />
    </div>
  );
} 