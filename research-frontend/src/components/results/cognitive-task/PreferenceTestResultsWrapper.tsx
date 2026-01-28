import { useState, useEffect } from 'react';
import { usePreferenceTestResults } from '../../../hooks/usePreferenceTestResults';
import { PreferenceTestCard } from './components/PreferenceTestCard';
import { researchService, type Module } from '../../../services/research.service';
import { mediaService } from '../../../services/media.service';

interface PreferenceTestResultsWrapperProps {
    researchId: string;
    moduleId: string;
    moduleName: string;
    questionNumber: string;
}

interface ImageData {
    id: string;
    url: string;
    s3Key?: string;
    name?: string;
}

export const PreferenceTestResultsWrapper = ({
    researchId,
    moduleId,
    moduleName,
    questionNumber
}: PreferenceTestResultsWrapperProps) => {
    const { data, isLoading: isResultsLoading } = usePreferenceTestResults(researchId, moduleId);
    const [images, setImages] = useState<ImageData[]>([]);
    const [isModuleLoading, setIsModuleLoading] = useState(true);

    useEffect(() => {
        const fetchModuleAndImages = async () => {
            try {
                // Fetch full research to get module config
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
                    // Extract images from file-upload component
                    if (foundModule.config && typeof foundModule.config === 'object') {
                        const config = foundModule.config as any;
                        const components = config.structure?.components || [];
                        const fileUploadComponent = components.find((c: any) => c.type === 'file-upload');

                        if (fileUploadComponent?.value) {
                            try {
                                const files = JSON.parse(fileUploadComponent.value);
                                if (Array.isArray(files) && files.length > 0) {
                                    // Resolve URLs for all images
                                    const resolvedImages = await Promise.all(
                                        files.map(async (file: any, index: number) => {
                                            let url = file.url;
                                            
                                            // Refresh URL if s3Key exists
                                            if (file.s3Key) {
                                                try {
                                                    const mediaResponse = await mediaService.getMediaUrlByS3Key(file.s3Key);
                                                    url = mediaResponse.url;
                                                } catch (err) {
                                                    console.warn('Failed to resolve media URL for image', file.s3Key, err);
                                                }
                                            }

                                            return {
                                                id: file.id || String(index + 1),
                                                url: url || '',
                                                s3Key: file.s3Key,
                                                name: file.name || `Image ${index + 1}`
                                            };
                                        })
                                    );
                                    setImages(resolvedImages.filter(img => img.url));
                                }
                            } catch (e) {
                                console.error('Failed to parse preference test images:', e);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch research/module details:', error);
            } finally {
                setIsModuleLoading(false);
            }
        };

        if (researchId && moduleId) {
            fetchModuleAndImages();
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

    // Map selections to steps with images
    const steps = data.selections.map((selection) => {
        const imageData = images.find(img => img.id === String(selection.imageId)) || images[selection.imageId - 1];
        
        return {
            stepNumber: selection.imageId,
            title: imageData?.name || `Image ${selection.imageId}`,
            duration: `${Math.round(data.averageViewTime / 1000)}s`,
            completionRate: Math.round(selection.percentage),
            participantCount: data.totalResponses,
            selectionCount: selection.count,
            progressColor: selection.percentage > 50 ? '#9333EA' : '#6366F1',
            imageUrl: imageData?.url
        };
    });

    return (
        <PreferenceTestCard
            questionNumber={questionNumber}
            questionText={moduleName}
            questionType="Preference Test"
            conditionalityDisabled={true}
            required={false}
            steps={steps}
        />
    );
};
