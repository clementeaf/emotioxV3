import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigationFlowResults } from '../../../hooks/useNavigationFlowResults';
import { NavigationTestCard } from './components/NavigationTestCard';
import { useResearch } from '../../../hooks/useResearchQuery';
import type { Module } from '../../../services/research.service';
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
    /** Per-image TranSalNet predictions keyed by image ID */
    predictionHeatmaps?: Record<string, { heatmapData: Array<{ x: number; y: number; value: number }>; processedAt: string }>;
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
    filteredParticipantIds?: Set<string> | null;
}

export const NavigationFlowResultsWrapper = ({
    researchId,
    moduleId,
    moduleName,
    questionNumber,
    filteredParticipantIds
}: NavigationFlowResultsWrapperProps) => {
    const { data: rawResultsData, isLoading: isResultsLoading } = useNavigationFlowResults(researchId, moduleId);

    // Apply participant filter
    const data = rawResultsData && filteredParticipantIds
        ? (() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const filtered = rawResultsData.responses.filter((r: any) => filteredParticipantIds.has(r.participantId));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const filteredHeatmap = rawResultsData.heatmapData.filter((c: any) =>
                !c.participantId || filteredParticipantIds.has(c.participantId)
            );
            const total = filtered.length;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const completed = filtered.filter((r: any) => r.completed).length;
            return {
                ...rawResultsData,
                totalResponses: total,
                responses: filtered,
                heatmapData: filteredHeatmap,
                completionRate: total > 0 ? (completed / total) * 100 : 0,
            };
        })()
        : rawResultsData;
    // Use React Query cached research (shared across all result wrappers — single request)
    const { data: research, isLoading: isResearchLoading } = useResearch(researchId);

    // Find module within the cached research
    const module: Module | null = useMemo(() => {
        if (!research?.stages) return null;
        for (const stage of research.stages) {
            const found = stage.modules.find((m: Module) => m.id === moduleId);
            if (found) return found;
        }
        return null;
    }, [research, moduleId]);

    // Resolve media URLs for file-upload images (cached by mediaService)
    const [resolvedModule, setResolvedModule] = useState<Module | null>(null);
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
        if (!module) { setResolvedModule(null); return; }

        let cancelled = false;
        const resolveUrls = async () => {
            const config = module.config as ModuleConfigStructure | undefined;
            const components = config?.structure?.components || [];
            const fu = components.find((c: ModuleComponent) => c.type === 'file-upload');
            if (!fu?.value) { if (!cancelled) setResolvedModule(module); return; }

            try {
                const files = JSON.parse(fu.value) as Array<{ id?: string; mediaId?: string; name?: string; s3Key?: string; url?: string; hitZones?: Array<HitzoneRegion> }>;
                if (Array.isArray(files) && files.length > 0) {
                    await Promise.all(files.map(async (file, i) => {
                        if (file?.s3Key) {
                            try {
                                const mediaResponse = await mediaService.getMediaUrlByS3Key(file.s3Key);
                                files[i] = { ...file, url: mediaResponse.url };
                            } catch (err) {
                                console.warn('Failed to resolve media URL for file', file.s3Key, err);
                            }
                        }
                    }));
                    // Build a shallow copy so we don't mutate React Query cache
                    const resolved = {
                        ...module,
                        config: { ...config, structure: { ...config?.structure, components: components.map(c => c === fu ? { ...fu, value: JSON.stringify(files) } : c) } },
                    } as Module;
                    if (!cancelled) setResolvedModule(resolved);
                    return;
                }
            } catch { /* ignore */ }
            if (!cancelled) setResolvedModule(module);
        };

        resolveUrls();
        return () => { cancelled = true; };
    }, [module]);

    // Load natural image dimensions for hitzone px→% conversion
    useEffect(() => {
        if (!resolvedModule?.config || typeof resolvedModule.config !== 'object') return;
        const config = resolvedModule.config as ModuleConfigStructure;
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
    }, [resolvedModule, loadImageDims, naturalDims]);

    const isLoading = isResultsLoading || isResearchLoading || (!resolvedModule && !!module);

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

    if (resolvedModule?.config && typeof resolvedModule.config === 'object') {
        const config = resolvedModule.config as ModuleConfigStructure;
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

    // Extract per-image prediction data from module config
    const moduleConfig = resolvedModule?.config as ModuleConfigStructure | undefined;
    const predictionHeatmaps = moduleConfig?.predictionHeatmaps;

    // Build one step per image; filter heatmapData by imageId so each step shows only its clicks
    const steps = parsedFiles.map((file, index) => {
        const fileId = String(file.id);
        const heatmapForImage = data.heatmapData.filter((c: { imageId?: string }) => {
            if (parsedFiles.length === 1) return true;
            const cId = c.imageId != null ? String(c.imageId) : null;
            if (!cId) return index === 0;
            return cId === fileId;
        });

        // Look up prediction for this image
        const prediction = predictionHeatmaps?.[fileId];

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
            predictionHeatmap: prediction?.heatmapData,
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
            predictionHeatmap: undefined,
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
            researchId={researchId}
            moduleId={moduleId}
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
