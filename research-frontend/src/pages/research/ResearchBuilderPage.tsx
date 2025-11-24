import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { researchService, type Research } from '../../services/research.service';
import { moduleTemplatesService } from '../../services/moduleTemplates.service';
import { Button } from '../../components/ui/Button';
import { Settings, Boxes, Save } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { CustomSelect } from '../../components/ui/CustomSelect';
import type { ComponentConfig } from '../../types/moduleBuilder.types';
import { useToast } from '../../contexts/ToastContext';

export const ResearchBuilderPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const [research, setResearch] = useState<Research | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [components, setComponents] = useState<ComponentConfig[]>([]);
    const [componentValues, setComponentValues] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Determine active view
    // Solo es "settings" si la ruta termina explícitamente en /settings
    const isSettings = location.pathname.endsWith('/settings');
    const moduleMatch = location.pathname.match(/\/module\/([^\/]+)/);
    const activeModuleId = moduleMatch ? moduleMatch[1] : null;

    useEffect(() => {
        const fetchResearch = async () => {
            if (!id) {
                setError('No research ID provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const response = await researchService.getById(id);
                setResearch(response.research);
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load research';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        void fetchResearch();
    }, [id]);

    /**
     * Redirige automáticamente al módulo Welcome Screen cuando se entra a /builder sin módulo específico
     * Solo redirige si estamos en la ruta base /builder (no en /settings ni /module/:id)
     */
    useEffect(() => {
        // No redirigir si:
        // - No hay research cargado o está cargando
        // - Ya hay un módulo activo en la URL
        // - Estamos explícitamente en settings
        // - La ruta no es exactamente /research/:id/builder
        const isBaseBuilderRoute = location.pathname === `/research/${id}/builder`;
        
        if (!research || loading || activeModuleId || isSettings || !isBaseBuilderRoute) return;

        let welcomeScreenModule = null;

        // Primero buscar el módulo "Welcome Screen" en cualquier stage
        for (const stage of research.stages || []) {
            const module = stage.modules?.find((m) => m.name === 'Welcome Screen');
            if (module) {
                welcomeScreenModule = module;
                break;
            }
        }

        // Si no encontramos el módulo, buscar el stage "Welcome Screen" y usar su primer módulo
        if (!welcomeScreenModule) {
            const welcomeScreenStage = research.stages?.find((stage) => stage.name === 'Welcome Screen');
            if (welcomeScreenStage && welcomeScreenStage.modules && welcomeScreenStage.modules.length > 0) {
                welcomeScreenModule = welcomeScreenStage.modules[0];
            }
        }

        // Si encontramos el módulo Welcome Screen, redirigir a él
        if (welcomeScreenModule && id) {
            navigate(`/research/${id}/builder/module/${welcomeScreenModule.id}`, { replace: true });
        }
    }, [research, loading, activeModuleId, isSettings, id, navigate, location.pathname]);

    // Calcular activeModule antes de los early returns (de forma segura)
    const activeModule = activeModuleId && research && research.stages
        ? research.stages.flatMap(s => s.modules || []).find(m => m.id === activeModuleId) || null
        : null;

    // Cargar componentes cuando cambia el módulo activo (debe estar antes de los early returns)
    useEffect(() => {
        const loadComponents = async (): Promise<void> => {
            if (!activeModule) {
                setComponents([]);
                return;
            }

            try {
                let moduleComponents: ComponentConfig[] = [];

                // 1. Si el módulo tiene config.structure.components, usarlo
                if (activeModule.config && typeof activeModule.config === 'object' && 'structure' in activeModule.config) {
                    const structure = activeModule.config.structure as { components?: ComponentConfig[] };
                    if (structure?.components && Array.isArray(structure.components) && structure.components.length > 0) {
                        moduleComponents = structure.components;
                    }
                }

                // 2. Si no tiene components en config pero tiene questions, convertir questions
                if (moduleComponents.length === 0 && activeModule.questions && activeModule.questions.length > 0) {
                    moduleComponents = activeModule.questions.map((question) => ({
                        id: question.id,
                        type: question.type as ComponentConfig['type'],
                        label: question.text,
                        ...(question.config && typeof question.config === 'object' ? question.config : {}),
                    }));
                }

                // 3. Si viene de un template y no tiene components, cargar desde el template
                if (moduleComponents.length === 0 && activeModule.is_from_template) {
                    try {
                        const templates = await moduleTemplatesService.list();
                        const template = templates.find(t => t.name === activeModule.name && t.is_active);
                        if (template && template.structure) {
                            const structure = template.structure as { components?: ComponentConfig[] };
                            if (structure?.components && Array.isArray(structure.components)) {
                                moduleComponents = structure.components;
                            }
                        }
                    } catch (err) {
                        console.error('Error loading template:', err);
                    }
                }

                setComponents(moduleComponents);
                
                // Inicializar valores de componentes desde defaultValue o config
                const initialValues: Record<string, string> = {};
                moduleComponents.forEach((comp) => {
                    const defaultValue = (comp as unknown as { defaultValue?: string }).defaultValue || '';
                    initialValues[comp.id] = defaultValue;
                });
                setComponentValues(initialValues);
            } catch (err) {
                console.error('Error loading components:', err);
                setComponents([]);
                setComponentValues({});
            }
        };

        void loadComponents();
    }, [activeModule]);

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

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8 border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            {isSettings ? (
                                <>
                                    <Settings className="h-6 w-6 text-gray-400" />
                                    Research Configuration
                                </>
                            ) : activeModule ? (
                                <>
                                    <Boxes className="h-6 w-6 text-gray-400" />
                                    {activeModule.name}
                                </>
                            ) : (
                                research.name
                            )}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            {isSettings
                                ? 'Manage general settings and information'
                                : activeModule
                                    ? activeModule.description || 'Configure this module'
                                    : 'Research Builder'}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {activeModule && (
                            <Button onClick={handleSaveModule} isLoading={isSaving} disabled={isSaving}>
                                <Save className="h-4 w-4 mr-2" />
                                Save Changes
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {isSettings && (
                <div className="space-y-6">
                    {/* Research Info Card */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">General Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Research Name</label>
                                <input
                                    type="text"
                                    value={research.name}
                                    readOnly
                                    className="w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Research Type</label>
                                <input
                                    type="text"
                                    value={research.research_type_name || ''}
                                    readOnly
                                    className="w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm p-2 border"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={research.description || ''}
                                    readOnly
                                    rows={3}
                                    className="w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm p-2 border"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeModule && (
                <div className="space-y-6">
                    {/* Module Content Editor */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Module Content</h2>

                        <div className="space-y-6">
                            {components.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                    <p className="text-gray-500">No components configured for this module.</p>
                                </div>
                            ) : (
                                components
                                    .filter(c => !c.hidden)
                                    .map((component) => {
                                        const componentValue = componentValues[component.id] || '';
                                        
                                        return (
                                            <div key={component.id} className="space-y-2">
                                                {component.type === 'input' && (
                                                    <Input
                                                        id={`module-${component.id}`}
                                                        label={component.label}
                                                        value={componentValue}
                                                        onChange={(e) => {
                                                            setComponentValues({
                                                                ...componentValues,
                                                                [component.id]: e.target.value,
                                                            });
                                                        }}
                                                        placeholder={
                                                            component.placeholder?.enabled
                                                                ? component.placeholder.text || ''
                                                                : undefined
                                                        }
                                                    />
                                                )}
                                                
                                                {component.type === 'textarea' && (
                                                    <Textarea
                                                        id={`module-${component.id}`}
                                                        label={component.label}
                                                        value={componentValue}
                                                        onChange={(e) => {
                                                            setComponentValues({
                                                                ...componentValues,
                                                                [component.id]: e.target.value,
                                                            });
                                                        }}
                                                        placeholder={
                                                            component.placeholder?.enabled
                                                                ? component.placeholder.text || ''
                                                                : undefined
                                                        }
                                                        rows={4}
                                                    />
                                                )}
                                                
                                                {component.type === 'select' && (
                                                    <CustomSelect
                                                        id={`module-${component.id}`}
                                                        label={component.label}
                                                        value={componentValue}
                                                        onChange={(value) => {
                                                            setComponentValues({
                                                                ...componentValues,
                                                                [component.id]: value,
                                                            });
                                                        }}
                                                        options={component.options || []}
                                                        placeholder="Select an option"
                                                    />
                                                )}
                                                
                                                {component.type === 'checkbox' && (
                                                    <div className="space-y-2">
                                                        <label className="block text-sm font-medium text-gray-700">
                                                            {component.label}
                                                        </label>
                                                        <div className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                id={`module-${component.id}`}
                                                                checked={componentValue === 'true'}
                                                                onChange={(e) => {
                                                                    setComponentValues({
                                                                        ...componentValues,
                                                                        [component.id]: e.target.checked ? 'true' : 'false',
                                                                    });
                                                                }}
                                                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
