import { useState, useEffect, useCallback } from 'react';
import { useNavigationFlowResults } from '../../../hooks/useNavigationFlowResults';
import { NavigationTestCard } from './components/NavigationTestCard';
import { researchService, type Module } from '../../../services/research.service';
import { mediaService } from '../../../services/media.service';
import { triggerCsvDownload } from '../../../utils/csvDownload';

interface ModuleComponent {
    id?: string;
    type: string;
    value?: string;
    [key: string]: unknown;
}

interface ModuleConfigStructure {
    structure?: {
        components?: ModuleComponent[];
    };
    image_url?: string;
    imageUrl?: string;
}

interface HitzoneRegion {
    region?: { x: number; y: number; width: number; height: number };
}

interface ParsedFile {
    id: string;
    name?: string;
    s3Key?: string;
    url?: string;
    hitZones?: Array<{ x: number; y: number; width: number; height: number }>;
}

interface NavigationFlowResultsWrapperProps {
    researchId: string;
    moduleId: string;
    moduleName: string;
    questionNumber: string;
}

export const NavigationFlowResultsWrapper = ({
    researchId,
    moduleId,
    moduleName,
    questionNumber
}: NavigationFlowResultsWrapperProps) => {
    const { data, isLoading: isResultsLoading } = useNavigationFlowResults(researchId, moduleId);
    const [module, setModule] = useState<Module | null>(null);
    const [isModuleLoading, setIsModuleLoading] = useState(true);
    // Natural dimensions per image (keyed by file id) for hitzone px→% conversion
    const [naturalDims, setNaturalDims] = useState<Record<string, { width: number; height: number }>>({});

    const loadImageDims = useCallback((fileId: string, url: string) => {
        const img = new Image();
        img.onload = () => {
            setNaturalDims(prev => ({ ...prev, [fileId]: { width: img.naturalWidth, height: img.naturalHeight } }));
        };
        img.src = url;
    }, []);

    useEffect(() => {
        const fetchModuleFromResearch = async () => {
            try {
                // Since standalone module endpoint fails (404), fetch the full research
                const response = await researchService.getById(researchId);
                const research = response.research;

                // Find the module within stages
                let foundModule: Module | undefined;
                if (research.stages) {
                    for (const stage of research.stages) {
                        foundModule = stage.modules.find(m => m.id === moduleId);
                        if (foundModule) break;
                    }
                }

                if (foundModule) {
                    console.log('ResultsWrapper: Found module:', foundModule.id);
                    // Check for file-upload component and resolve URL if needed (URL is stripped on save)
                    if (foundModule.config && typeof foundModule.config === 'object') {
                        const config = foundModule.config as ModuleConfigStructure;
                        const components = config.structure?.components || [];
                        console.log('ResultsWrapper: Config components:', components);
                        const fileUploadComponent = components.find((c: ModuleComponent) => c.type === 'file-upload');

                        if (fileUploadComponent) {
                            console.log('ResultsWrapper: Found file upload component:', fileUploadComponent);
                        if (fileUploadComponent.value) {
                            try {
                                const files = JSON.parse(fileUploadComponent.value) as Array<{ id?: string; mediaId?: string; name?: string; s3Key?: string; url?: string; hitZones?: Array<HitzoneRegion> }>;
                                console.log('ResultsWrapper: Parsed files:', files);
                                if (Array.isArray(files) && files.length > 0) {
                                    for (let i = 0; i < files.length; i++) {
                                        const file = files[i];
                                        if (file?.s3Key) {
                                            try {
                                                const mediaResponse = await mediaService.getMediaUrlByS3Key(file.s3Key);
                                                file.url = mediaResponse.url;
                                                files[i] = file;
                                            } catch (err) {
                                                console.warn('Failed to resolve media URL for file', file.s3Key, err);
                                            }
                                        }
                                    }
                                    fileUploadComponent.value = JSON.stringify(files);
                                }
                            } catch (e) {
                                console.error('ResultsWrapper: JSON parse error', e);
                            }
                        } else {
                                console.log('ResultsWrapper: File component has no value');
                            }
                        } else {
                            console.log('ResultsWrapper: No file-upload component found');
                        }
                    }
                    setModule(foundModule);
                } else {
                    console.warn(`Module ${moduleId} not found in research ${researchId}`);
                }
            } catch (error) {
                console.error('Failed to fetch research/module details:', error);
            } finally {
                setIsModuleLoading(false);
            }
        };

        if (researchId && moduleId) {
            fetchModuleFromResearch();
        }
    }, [researchId, moduleId]);

    // Load natural image dimensions for hitzone px→% conversion
    useEffect(() => {
        if (!module?.config || typeof module.config !== 'object') return;
        const config = module.config as ModuleConfigStructure;
        const components = config.structure?.components || [];
        const fu = components.find((c: ModuleComponent) => c.type === 'file-upload');
        if (!fu?.value) return;
        try {
            const files = JSON.parse(fu.value) as Array<{ id?: string; mediaId?: string; url?: string }>;
            files.forEach(f => {
                const fid = f.id ?? f.mediaId ?? '';
                if (f.url && fid && !naturalDims[fid]) loadImageDims(fid, f.url);
            });
        } catch { /* ignore */ }
    }, [module, loadImageDims, naturalDims]);

    const isLoading = isResultsLoading || isModuleLoading;

    if (isLoading || !data) {
        return (
            <div className="p-6 border rounded-lg bg-gray-50 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-32 bg-gray-200 rounded" />
            </div>
        );
    }

    // Extract all images and hitZones from file-upload component (one step per image)
    const parsedFiles: ParsedFile[] = [];

    if (module?.config && typeof module.config === 'object') {
        const config = module.config as ModuleConfigStructure;
        const components = config.structure?.components || [];
        const fileUploadComponent = components.find((c: ModuleComponent) => c.type === 'file-upload');

        if (fileUploadComponent?.value) {
            try {
                const files = JSON.parse(fileUploadComponent.value) as Array<{ id?: string; mediaId?: string; name?: string; url?: string; hitZones?: Array<HitzoneRegion> }>;
                if (Array.isArray(files) && files.length > 0) {
                    for (const f of files) {
                        const id = f.id ?? f.mediaId ?? '';
                        parsedFiles.push({
                            id,
                            name: f.name,
                            url: f.url,
                            hitZones: (f.hitZones ?? []).map((hz: HitzoneRegion) => ({
                                x: hz.region?.x ?? 0,
                                y: hz.region?.y ?? 0,
                                width: hz.region?.width ?? 0,
                                height: hz.region?.height ?? 0,
                            })),
                        });
                    }
                }
            } catch (e) {
                console.error('Error parsing file-upload component value:', e);
            }
        }

        if (parsedFiles.length === 0) {
            const imageUrl = (config.image_url || config.imageUrl) as string | undefined;
            if (imageUrl) {
                parsedFiles.push({ id: '1', url: imageUrl, hitZones: [] });
            }
        }
    }

    // Build one step per image; filter heatmapData by imageId so each step shows only its clicks
    const steps = parsedFiles.map((file, index) => {
        const fileId = String(file.id);
        const heatmapForImage = data.heatmapData.filter((c: { imageId?: string }) => {
            if (parsedFiles.length === 1) return true;
            const cId = c.imageId != null ? String(c.imageId) : null;
            if (!cId) return index === 0;
            return cId === fileId;
        });
        return {
            stepNumber: index + 1,
            title: file.name ? `${index + 1}. ${file.name}` : `${moduleName} — Step ${index + 1}`,
            duration: `${data.averageDuration}s`,
            completionRate: Math.round(data.completionRate),
            participantCount: data.totalResponses,
            hasHeatmap: heatmapForImage.length > 0,
            heatmapData: heatmapForImage,
            imageUrl: file.url ?? '',
            // Convert hitZones from natural image pixels to percent (0-100)
            hitZones: (file.hitZones ?? []).map(hz => {
                const dims = naturalDims[file.id];
                if (!dims || dims.width === 0 || dims.height === 0) return hz;
                return {
                    x: (hz.x / dims.width) * 100,
                    y: (hz.y / dims.height) * 100,
                    width: (hz.width / dims.width) * 100,
                    height: (hz.height / dims.height) * 100,
                };
            }),
            responses: data.responses,
            aois: [],
        };
    });

    if (steps.length === 0) {
        steps.push({
            stepNumber: 1,
            title: moduleName,
            duration: `${data.averageDuration}s`,
            completionRate: Math.round(data.completionRate),
            participantCount: data.totalResponses,
            hasHeatmap: data.heatmapData.length > 0,
            heatmapData: data.heatmapData,
            imageUrl: '',
            hitZones: [],
            responses: data.responses,
            aois: [],
        });
    }

    const onDownloadCSV = (): void => {
        const header = ['participant_id', 'completed', 'total_clicks', 'correct_clicks', 'total_duration_ms', 'click_sequence'];
        const rows = (data.responses ?? []).map((r: { participantId?: string; completed?: boolean; completedFlow?: boolean; totalClicks?: number; correctClicks?: number; totalDuration?: number; clickSequence?: unknown }) => {
            const completed = r.completed ?? r.completedFlow;
            return [
                String(r.participantId ?? '').replace(/"/g, '""'),
                completed === true ? '1' : '0',
                String(r.totalClicks ?? 0),
                String(r.correctClicks ?? 0),
                String(r.totalDuration ?? 0),
                JSON.stringify(r.clickSequence ?? []).replace(/"/g, '""'),
            ].map((v) => `"${v}"`).join(',');
        });
        const csv = [header.join(','), ...rows].join('\n');
        const slug = questionNumber.replace(/\./g, '-');
        triggerCsvDownload(csv, `navigation-flow-${slug}-${researchId}.csv`);
    };

    return (
        <NavigationTestCard
            questionNumber={questionNumber}
            questionText={moduleName}
            questionType="Navigation Test"
            conditionalityDisabled={true}
            required={false}
            steps={steps}
            onDownloadCSV={onDownloadCSV}
        />
    );
};
