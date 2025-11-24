import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useResearch } from '../../hooks/useResearch';
import { useWelcomeScreenRedirect } from '../../hooks/useWelcomeScreenRedirect';
import { useModuleComponents } from '../../hooks/useModuleComponents';
import { ResearchBuilderHeader } from '../../components/research/ResearchBuilderHeader';
import { ResearchSettingsView } from '../../components/research/ResearchSettingsView';
import { ModuleContentEditor } from '../../components/research/ModuleContentEditor';
import { useToast } from '../../contexts/ToastContext';

export const ResearchBuilderPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    
    // Load research data
    const { research, loading, error } = useResearch(id);
    
    // Determine active view
    const isSettings = location.pathname.endsWith('/settings');
    const moduleMatch = location.pathname.match(/\/module\/([^\/]+)/);
    const activeModuleId = moduleMatch ? moduleMatch[1] : null;
    
    // Get active module
    const activeModule = activeModuleId && research && research.stages
        ? research.stages.flatMap(s => s.modules || []).find(m => m.id === activeModuleId) || null
        : null;
    
    // Load module components
    const { components, componentValues, setComponentValues } = useModuleComponents(activeModule);
    
    // Handle welcome screen redirect
    useWelcomeScreenRedirect(research, loading, activeModuleId, isSettings, id);
    
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveModule = async (): Promise<void> => {
        if (!activeModule || !id) return;

        try {
            setIsSaving(true);
            // TODO: Implementar guardado del módulo con los componentes actualizados
            // Por ahora solo mostramos un toast
            toast.success('Module saved successfully');
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
                activeModule={activeModule}
                isSettings={isSettings}
                isSaving={isSaving}
                onSave={handleSaveModule}
            />

            {/* Content Area */}
            {isSettings && <ResearchSettingsView research={research} />}

            {activeModule && (
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
