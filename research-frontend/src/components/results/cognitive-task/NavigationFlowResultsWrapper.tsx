import { useState, useEffect } from 'react';
import { useNavigationFlowResults } from '../../../hooks/useNavigationFlowResults';
import { NavigationTestCard } from './components/NavigationTestCard';
import { researchService, type Module } from '../../../services/research.service';
import { mediaService } from '../../../services/media.service';

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
                        const config = foundModule.config as any;
                        const components = config.structure?.components || [];
                        console.log('ResultsWrapper: Config components:', components);
                        const fileUploadComponent = components.find((c: any) => c.type === 'file-upload');

                        if (fileUploadComponent) {
                            console.log('ResultsWrapper: Found file upload component:', fileUploadComponent);
                            if (fileUploadComponent.value) {
                                try {
                                    const files = JSON.parse(fileUploadComponent.value);
                                    console.log('ResultsWrapper: Parsed files:', files);
                                    if (Array.isArray(files) && files.length > 0) {
                                        const file = files[0];
                                        // Always refresh URL if s3Key exists because stored URLs might be expired
                                        if (file.s3Key) {
                                            console.log('ResultsWrapper: s3Key found, forcing URL refresh:', file.s3Key);
                                            try {
                                                const mediaResponse = await mediaService.getMediaUrlByS3Key(file.s3Key);
                                                console.log('ResultsWrapper: Resolved fresh URL:', mediaResponse.url);
                                                file.url = mediaResponse.url;
                                                // Update the in-memory module object so the render logic finds it
                                                files[0] = file;
                                                fileUploadComponent.value = JSON.stringify(files);
                                            } catch (err) {
                                                console.warn('Failed to resolve media URL for module', moduleId, err);
                                            }
                                        } else {
                                            console.log('ResultsWrapper: No s3Key found, using existing URL if any:', file);
                                        }
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

    const isLoading = isResultsLoading || isModuleLoading;

    if (isLoading || !data) {
        return (
            <div className="p-6 border rounded-lg bg-gray-50 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-32 bg-gray-200 rounded" />
            </div>
        );
    }

    // Extract image URL and HitZones from module config components
    let imageUrl = '';
    let hitZones: Array<{ x: number; y: number; width: number; height: number }> = [];
    
    if (module?.config && typeof module.config === 'object') {
        const config = module.config as any;
        // Check if components exist in structure
        const components = config.structure?.components || [];
    
        // Find file-upload component
        const fileUploadComponent = components.find((c: any) => c.type === 'file-upload');
    
        if (fileUploadComponent?.value) {
            try {
                const files = JSON.parse(fileUploadComponent.value);
                if (Array.isArray(files) && files.length > 0) {
                    imageUrl = files[0].url;
                    // Extract hitZones from the uploaded file
                    if (files[0].hitZones && Array.isArray(files[0].hitZones)) {
                        hitZones = files[0].hitZones.map((hz: any) => ({
                            x: hz.region?.x || 0,
                            y: hz.region?.y || 0,
                            width: hz.region?.width || 0,
                            height: hz.region?.height || 0,
                        }));
                    }
                }
            } catch (e) {
                console.error('Error parsing file-upload component value:', e);
            }
        }
    
        // Fallback: check top-level config just in case (legacy)
        if (!imageUrl) {
            imageUrl = (config.image_url || config.imageUrl || '') as string;
        }
    }

    // Map responses to steps (one step per navigation flow)
    const steps = [{
        stepNumber: 1,
        title: moduleName,
        duration: `${data.averageDuration}s`,
        completionRate: Math.round(data.completionRate),
        participantCount: data.totalResponses,
        hasHeatmap: data.heatmapData.length > 0,
        heatmapData: data.heatmapData, // Pass the raw heatmap data with isCorrect info
        imageUrl: imageUrl, // Pass the background image
        hitZones: hitZones, // Pass hitZones for overlay rendering
        aois: [] // TODO: Extract AOIs from hitZones if needed
    }];

    return (
        <NavigationTestCard
            questionNumber={questionNumber}
            questionText={moduleName}
            questionType="Navigation Test"
            conditionalityDisabled={true}
            required={false}
            steps={steps}
        />
    );
};
