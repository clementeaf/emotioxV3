import { useEffect, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { mediaService } from '../../services/media.service';

interface StudyLogoSectionProps {
    config: Record<string, unknown>;
    researchId: string | undefined;
    onChange: (config: Record<string, unknown>) => void;
}

export const StudyLogoSection = ({ config, researchId, onChange }: StudyLogoSectionProps) => {
    const toast = useToast();
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const studyLogo = config.studyLogo as { enabled: boolean; s3Key?: string } | undefined;
    const studyLogoEnabled = studyLogo?.enabled ?? true; // default: show EmotioCX logo

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

    return (
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
    );
};
