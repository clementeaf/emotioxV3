import { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useResearch } from '../../hooks/useResearch';
import { useWelcomeScreenRedirect } from '../../hooks/useWelcomeScreenRedirect';
import { useModuleComponents } from '../../hooks/useModuleComponents';
import { ResearchBuilderHeader } from '../../components/research/ResearchBuilderHeader';
import { ResearchSettingsView } from '../../components/research/ResearchSettingsView';
import { ModuleContentEditor } from '../../components/research/ModuleContentEditor';
import { SmartVOCModuleCard } from '../../components/research/SmartVOCModuleCard';
import { useToast } from '../../contexts/ToastContext';
import { modulesService } from '../../services/modules.service';
import type { Stage, Module } from '../../services/research.service';

export const ResearchBuilderPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();

    const { research, loading, error } = useResearch(id);    
    const isSettings = location.pathname.endsWith('/settings');
    const moduleMatch = location.pathname.match(/\/module\/([^/]+)/);
    const activeModuleId = moduleMatch ? moduleMatch[1] : null;
    
    const activeModule = activeModuleId && research && research.stages
        ? research.stages.flatMap(s => s.modules || []).find(m => m.id === activeModuleId) || null
        : null;
    
    const smartVOCStage = useMemo((): Stage | null => {
        if (!research?.stages) return null;
        
        let stage = research.stages.find(s => 
            s.name.toLowerCase().includes('smart voc') || 
            s.name.toLowerCase() === 'smart voc'
        );
        
        if (!stage && activeModule && research.stages) {
            stage = research.stages.find(s => 
                s.modules?.some(m => m.id === activeModule.id) &&
                (s.name.toLowerCase().includes('smart voc') || s.name.toLowerCase() === 'smart voc')
            );
        }
        
        return stage || null;
    }, [research, activeModule]);
    
    const smartVOCModules = useMemo((): Module[] => {
        if (!smartVOCStage || !smartVOCStage.modules) return [];
        // Mantener el mismo orden que viene del backend (igual que en el sidebar)
        // El sidebar muestra los módulos en el orden que vienen de stage.modules
        return [...smartVOCStage.modules].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }, [smartVOCStage]);
    
    const isSmartVOCStage = smartVOCStage !== null && (
        !activeModuleId || 
        smartVOCModules.some(m => m.id === activeModuleId)
    );
    
    const { components, componentValues, setComponentValues } = useModuleComponents(activeModule);
    
    useWelcomeScreenRedirect(research, loading, activeModuleId, isSettings, id);
    
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveModule = async (): Promise<void> => {
        if (!id) return;

        try {
            setIsSaving(true);
            
            if (isSmartVOCStage && smartVOCModules.length > 0) {
                // Save all Smart VOC modules
                const updatePromises = smartVOCModules.map(module => 
                    modulesService.update(module.id, {
                        config: module.config,
                        order: module.order_index
                    })
                );
                await Promise.all(updatePromises);
                toast.success(`Saved ${smartVOCModules.length} Smart VOC module(s) successfully`);
            } else if (activeModule) {
                // Save single module with updated components
                await modulesService.update(activeModule.id, {
                    config: {
                        ...activeModule.config,
                        components: componentValues
                    },
                    order: activeModule.order_index
                });
                toast.success('Module saved successfully');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save module';
            toast.error(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    const handleComponentValueChange = (componentId: string, value: string): void => {
        setComponentValues((prev) => ({
            ...prev,
            [componentId]: value,
        }));
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                    <p className="mt-4 text-gray-600">Loading research...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !research) {
        return (
            <div className="max-w-2xl mx-auto mt-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Research</h2>
                    <p className="text-red-600 mb-4">{error || 'Research not found'}</p>
                    <Button onClick={() => navigate('/research')} variant="outline">
                        Back to Research List
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ResearchBuilderHeader
                research={research}
                activeModule={isSmartVOCStage ? null : activeModule}
                isSettings={isSettings}
                isSaving={isSaving}
                onSave={handleSaveModule}
                isSmartVOCStage={isSmartVOCStage}
                smartVOCStageName={smartVOCStage?.name}
            />

            {/* Content Area */}
            {isSettings && <ResearchSettingsView research={research} />}

            {/* Smart VOC Stage: Show all modules in the same view */}
            {isSmartVOCStage && smartVOCModules.length > 0 && (
                <div className="space-y-6 h-full max-h-[720px] overflow-y-auto">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Smart VOC - All Questions</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Configure all Smart VOC questions in this unified view
                        </p>
                    </div>
                    {smartVOCModules.map((module) => (
                        <SmartVOCModuleCard
                            key={module.id}
                            module={module}
                            researchId={id!}
                            onSave={handleSaveModule}
                            isActive={activeModuleId === module.id}
                        />
                    ))}
                </div>
            )}

            {/* Regular module view: Show single module */}
            {!isSmartVOCStage && activeModule && (
                <div className="space-y-6">
                    <div className="rounded-lg shadow-sm border border-gray-100 p-6">
                        <ModuleContentEditor
                            components={components}
                            componentValues={componentValues}
                            onValueChange={handleComponentValueChange}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
