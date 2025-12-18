import { useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useResearch } from '../../hooks/useResearchQuery';
import type { Research, Stage, Module } from '../../services/research.service';
import { useWelcomeScreenRedirect } from '../../hooks/useWelcomeScreenRedirect';
import { useModuleComponents } from '../../hooks/useModuleComponents';
import { ResearchBuilderHeader } from '../../components/research/ResearchBuilderHeader';
import { ResearchSettingsView } from '../../components/research/ResearchSettingsView';
import { ModuleContentEditor } from '../../components/research/ModuleContentEditor';
import { SmartVOCModuleCard, type SmartVOCModuleCardRef } from '../../components/research/SmartVOCModuleCard';
import { CognitiveTaskModuleCard, type CognitiveTaskModuleCardRef } from '../../components/research/CognitiveTaskModuleCard';
import { ResearchConfigurationModule } from '../../components/research/ResearchConfigurationModule';
import { useToast } from '../../hooks/useToast';
import { modulesService } from '../../services/modules.service';
import { withModuleHidden, withModuleRequired } from '../../utils/moduleRequired';

export const ResearchBuilderPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();

    const { data: research, isLoading: loading, error } = useResearch(id || null);
    
    // Type assertion para TypeScript
    const typedResearch = research as Research | null;    
    const isSettings = location.pathname.endsWith('/settings');
    const moduleMatch = location.pathname.match(/\/module\/([^/]+)/);
    const activeModuleId = moduleMatch ? moduleMatch[1] : null;
    
    const activeModule = activeModuleId && typedResearch && typedResearch.stages
        ? typedResearch.stages.flatMap((s: Stage) => s.modules || []).find((m: Module) => m.id === activeModuleId) || null
        : null;
    
    const smartVOCStage = useMemo((): Stage | null => {
        if (!typedResearch?.stages) return null;
        
        let stage = typedResearch.stages.find((s: Stage) => 
            s.name.toLowerCase().includes('smart voc') || 
            s.name.toLowerCase() === 'smart voc'
        );
        
        if (!stage && activeModule && typedResearch.stages) {
            stage = typedResearch.stages.find((s: Stage) => 
                s.modules?.some((m: Module) => m.id === activeModule.id) &&
                (s.name.toLowerCase().includes('smart voc') || s.name.toLowerCase() === 'smart voc')
            );
        }
        
        return stage || null;
    }, [typedResearch, activeModule]);
    
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
    
    // Cognitive Tasks stage logic (same structure as Smart VOC)
    const cognitiveTasksStage = useMemo((): Stage | null => {
        if (!typedResearch?.stages) return null;
        
        let stage = typedResearch.stages.find((s: Stage) => 
            s.name.toLowerCase().includes('cognitive task') || 
            s.name.toLowerCase() === 'cognitive tasks'
        );
        
        if (!stage && activeModule && typedResearch.stages) {
            stage = typedResearch.stages.find((s: Stage) => 
                s.modules?.some((m: Module) => m.id === activeModule.id) &&
                (s.name.toLowerCase().includes('cognitive task') || s.name.toLowerCase() === 'cognitive tasks')
            );
        }
        
        return stage || null;
    }, [typedResearch, activeModule]);
    
    const cognitiveTaskModules = useMemo((): Module[] => {
        if (!cognitiveTasksStage || !cognitiveTasksStage.modules) return [];
        return [...cognitiveTasksStage.modules].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }, [cognitiveTasksStage]);
    
    const isCognitiveTasksStage = cognitiveTasksStage !== null && (
        !activeModuleId || 
        cognitiveTaskModules.some(m => m.id === activeModuleId)
    );
    
    // Check if current module is Research Configuration
    const isResearchConfigModule = activeModule?.name === 'Research Configuration';
    
    const { components, componentValues, setComponentValues } = useModuleComponents(activeModule);
    
    // Refs for SmartVOC module cards to access their component values
    const smartVOCModuleRefs = useRef<Map<string, SmartVOCModuleCardRef>>(new Map());
    
    // Refs for Cognitive Task module cards to access their component values
    const cognitiveTaskModuleRefs = useRef<Map<string, CognitiveTaskModuleCardRef>>(new Map());
    
    useWelcomeScreenRedirect(typedResearch, loading, activeModuleId, isSettings, id);
    
    const [isSaving, setIsSaving] = useState(false);

    /**
     * Safely extracts a string from an unknown value.
     * @param value - Unknown value
     * @returns String if value is a string, otherwise undefined
     */
    const toOptionalString = (value: unknown): string | undefined => {
        return typeof value === 'string' ? value : undefined;
    };

    /**
     * Sanitizes the serialized value of a file-upload component by removing ephemeral presigned URL fields.
     * This prevents persisting time-limited S3 URLs into module configuration.
     * @param serialized - Serialized component value (usually JSON)
     * @returns Sanitized serialized value
     */
    const sanitizeFileUploadSerializedValue = (serialized: string | undefined): string | undefined => {
        if (!serialized) {
            return serialized;
        }

        const isRecord = (value: unknown): value is Record<string, unknown> =>
            typeof value === 'object' && value !== null;

        const stripUrlFields = (value: unknown): unknown => {
            if (Array.isArray(value)) {
                return value.map(stripUrlFields);
            }
            if (!isRecord(value)) {
                return value;
            }

            const { url: _url, urlExpiresAt: _urlExpiresAt, ...rest } = value;
            return rest;
        };

        try {
            const parsed = JSON.parse(serialized) as unknown;
            const sanitized = stripUrlFields(parsed);
            return JSON.stringify(sanitized);
        } catch {
            return serialized;
        }
    };

    const handleSaveModule = async (): Promise<void> => {
        if (!id) return;

        try {
            setIsSaving(true);
            
            if (isSmartVOCStage && smartVOCModules.length > 0) {
                // Save all Smart VOC modules with their current component values
                const updatePromises = smartVOCModules.map(module => {
                    const moduleRef = smartVOCModuleRefs.current.get(module.id);
                    if (!moduleRef) {
                        console.warn(`No ref found for module ${module.id}`);
                        // Fallback: use existing config if ref not available
                        return modulesService.update(module.id, {
                            config: module.config,
                            order: module.order_index
                        });
                    }
                    
                    // Get current component values from the ref
                    const currentComponentValues = moduleRef.getComponentValues();
                    const currentComponents = moduleRef.getComponents();
                    const required = moduleRef.getRequired();
                    const hidden = moduleRef.getHidden();
                    
                    console.log(`Saving ${module.name}:`, {
                        componentValues: currentComponentValues,
                        components: currentComponents
                    });
                    
                    // Update components with new values
                    const updatedComponents = currentComponents.map(comp => ({
                        ...comp,
                        value: comp.type === 'file-upload'
                            ? sanitizeFileUploadSerializedValue(currentComponentValues[comp.id] || comp.value)
                            : (currentComponentValues[comp.id] || comp.value)
                    }));
                    
                    console.log(`Updated components:`, updatedComponents);
                    
                    // Preserve the correct backend structure
                    const configWithStructure = {
                        ...module.config,
                        structure: {
                            ...(module.config.structure || {}),
                            components: updatedComponents
                        }
                    };

                    const config = withModuleHidden(withModuleRequired(configWithStructure, required), hidden);
                    
                    return modulesService.update(module.id, {
                        config,
                        order: module.order_index
                    });
                });
                await Promise.all(updatePromises);
                toast.success(`Saved ${smartVOCModules.length} Smart VOC module(s) successfully`);
            } else if (isCognitiveTasksStage && cognitiveTaskModules.length > 0) {
                // Save all Cognitive Task modules with their current component values (same structure as Smart VOC)
                const updatePromises = cognitiveTaskModules.map(module => {
                    const moduleRef = cognitiveTaskModuleRefs.current.get(module.id);
                    if (!moduleRef) {
                        console.warn(`No ref found for module ${module.id}`);
                        return modulesService.update(module.id, {
                            config: module.config,
                            order: module.order_index
                        });
                    }
                    
                    const currentComponentValues = moduleRef.getComponentValues();
                    const currentComponents = moduleRef.getComponents();
                    const required = moduleRef.getRequired();
                    const hidden = moduleRef.getHidden();
                    
                    console.log(`Saving ${module.name}:`, {
                        componentValues: currentComponentValues,
                        components: currentComponents
                    });
                    
                    const updatedComponents = currentComponents.map(comp => ({
                        ...comp,
                        value: currentComponentValues[comp.id] || comp.value
                    }));
                    
                    console.log(`Updated components:`, updatedComponents);
                    
                    const configWithStructure = {
                        ...module.config,
                        structure: {
                            ...(module.config.structure || {}),
                            components: updatedComponents
                        }
                    };

                    const config = withModuleHidden(withModuleRequired(configWithStructure, required), hidden);
                    
                    return modulesService.update(module.id, {
                        config,
                        order: module.order_index
                    });
                });
                await Promise.all(updatePromises);
                toast.success(`Saved ${cognitiveTaskModules.length} Cognitive Task module(s) successfully`);
            } else if (activeModule) {
                // Special handling for Research Configuration module
                if (isResearchConfigModule) {
                    // Transform componentValues into structured config
                    const structuredConfig = transformResearchConfigComponentValues(componentValues);
                    
                    // Preserve the correct backend structure: { structure: { components: [...] } }
                    const config = {
                        ...activeModule.config,
                        ...structuredConfig
                    };

                    await modulesService.update(activeModule.id, {
                        config,
                        order: activeModule.order_index
                    });
                    toast.success('Research Configuration saved successfully');
                } else {
                    // Update components with new values while preserving structure
                    const updatedComponents = components.map(comp => ({
                        ...comp,
                        // Update default value or value from componentValues
                        ...(comp.settings?.readonly 
                          ? {
                              settings: {
                                  ...comp.settings,
                                  defaultValue: comp.type === 'file-upload'
                                      ? (sanitizeFileUploadSerializedValue(
                                            toOptionalString(componentValues[comp.id]) ?? toOptionalString(comp.settings.defaultValue)
                                        ) ?? toOptionalString(comp.settings.defaultValue))
                                      : (toOptionalString(componentValues[comp.id]) ?? toOptionalString(comp.settings.defaultValue)),
                              },
                          }
                          : {
                              value: comp.type === 'file-upload'
                                  ? sanitizeFileUploadSerializedValue(toOptionalString(componentValues[comp.id]))
                                  : toOptionalString(componentValues[comp.id]),
                          }
                        )
                    }));

                    // Preserve the correct backend structure: { structure: { components: [...] } }
                    const config = {
                        ...activeModule.config,
                        structure: {
                          ...(activeModule.config.structure || {}),
                          components: updatedComponents
                        }
                    };

                    await modulesService.update(activeModule.id, {
                        config,
                        order: activeModule.order_index
                    });
                    toast.success('Module saved successfully');
                }
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save module';
            toast.error(errorMessage);
            console.error('Save module error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleComponentValueChange = useCallback((componentId: string, value: string): void => {
        setComponentValues((prev) => ({
            ...prev,
            [componentId]: value,
        }));
    }, [setComponentValues]);

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
    if (error || !typedResearch) {
        const errorMessage = error instanceof Error ? error.message : error ? String(error) : 'Research not found';
        return (
            <div className="max-w-2xl mx-auto mt-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Research</h2>
                    <p className="text-red-600 mb-4">{errorMessage}</p>
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
                research={typedResearch}
                activeModule={isSmartVOCStage || isCognitiveTasksStage ? null : activeModule}
                isSettings={isSettings}
                isSaving={isSaving}
                onSave={handleSaveModule}
                isSmartVOCStage={isSmartVOCStage}
                smartVOCStageName={smartVOCStage?.name}
                isCognitiveTasksStage={isCognitiveTasksStage}
                cognitiveTasksStageName={cognitiveTasksStage?.name}
            />

            {/* Content Area */}
            {isSettings && <ResearchSettingsView research={typedResearch} />}

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
                            ref={(ref) => {
                                if (ref) {
                                    smartVOCModuleRefs.current.set(module.id, ref);
                                } else {
                                    smartVOCModuleRefs.current.delete(module.id);
                                }
                            }}
                            module={module}
                            researchId={id!}
                            onSave={handleSaveModule}
                            isActive={activeModuleId === module.id}
                        />
                    ))}
                </div>
            )}

            {/* Cognitive Tasks Stage: Show all modules in the same view (same structure as Smart VOC) */}
            {isCognitiveTasksStage && cognitiveTaskModules.length > 0 && (
                <div className="space-y-6 h-full max-h-[720px] overflow-y-auto">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Cognitive Tasks - All Tasks</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Configure all Cognitive Task modules in this unified view
                        </p>
                    </div>
                    {cognitiveTaskModules.map((module) => (
                        <CognitiveTaskModuleCard
                            key={module.id}
                            ref={(ref) => {
                                if (ref) {
                                    cognitiveTaskModuleRefs.current.set(module.id, ref);
                                } else {
                                    cognitiveTaskModuleRefs.current.delete(module.id);
                                }
                            }}
                            module={module}
                            researchId={id!}
                            onSave={handleSaveModule}
                            isActive={activeModuleId === module.id}
                        />
                    ))}
                </div>
            )}

            {/* Regular module view: Show single module */}
            {!isSmartVOCStage && !isCognitiveTasksStage && !isResearchConfigModule && activeModule && (
                <div className="space-y-6">
                    <div className="rounded-lg shadow-sm border border-gray-100 p-6">
                        <ModuleContentEditor
                            components={components}
                            componentValues={componentValues}
                            onValueChange={handleComponentValueChange}
                            researchId={id}
                        />
                    </div>
                </div>
            )}

            {/* Research Configuration module: Show custom component */}
            {!isSmartVOCStage && !isCognitiveTasksStage && isResearchConfigModule && activeModule && (
                <div className="space-y-6">
                    <div className="rounded-lg shadow-sm border border-gray-100 p-6">
                        <ResearchConfigurationModule
                            config={componentValues}
                            onChange={(newConfig) => {
                                Object.keys(newConfig).forEach(key => {
                                    handleComponentValueChange(key, String(newConfig[key]));
                                });
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper function to transform componentValues into structured config for Research Configuration
const transformResearchConfigComponentValues = (values: Record<string, string>): Record<string, unknown> => {
    // Initialize structured config
    const config: Record<string, unknown> = {
      demographics: {},
      linkConfig: {},
      backlinks: {},
      participantLimit: 50
    };

    // Process each component value
    Object.entries(values).forEach(([key, value]) => {
      // Handle demographics
      if (['age', 'country', 'gender', 'educationLevel', 'annualIncome', 'employmentStatus', 'dailyHoursOnline', 'technicalProficiency'].includes(key)) {
        (config.demographics as Record<string, boolean>)[key] = value === 'true';
      }
      // Handle link configuration
      else if (['allowMobile', 'trackLocation', 'allowMultiple'].includes(key)) {
        (config.linkConfig as Record<string, boolean>)[key] = value === 'true';
      }
      // Handle backlinks
      else if (['complete', 'disqualified', 'overquota'].includes(key)) {
        (config.backlinks as Record<string, string>)[key] = value;
      }
      // Handle research URL
      else if (key === 'researchUrl') {
        config.researchUrl = value;
      }
      // Handle participant limit
      else if (key === 'participantLimit') {
        config.participantLimit = parseInt(value) || 50;
      }
    });

    return config;
  };
