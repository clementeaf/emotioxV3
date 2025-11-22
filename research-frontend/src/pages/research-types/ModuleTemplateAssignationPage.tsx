import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { researchTypesService } from '../../services/researchTypes.service';
import { moduleTemplatesService, type ModuleTemplate } from '../../services/moduleTemplates.service';

export const ModuleTemplateAssignationPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [researchTypeName, setResearchTypeName] = useState('');
    const [moduleTemplates, setModuleTemplates] = useState<ModuleTemplate[]>([]);
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (id) {
            loadData(id);
        }
    }, [id]);

    const loadData = async (typeId: string) => {
        try {
            setIsLoading(true);

            // Load research type details
            const typeRes = await researchTypesService.getById(typeId);
            setResearchTypeName(typeRes.researchType.name);

            // Load all module templates
            const modulesRes = await moduleTemplatesService.list();
            setModuleTemplates(modulesRes);

            // TODO: Load currently assigned modules when backend supports it
            // For now, selectedModules starts empty
        } catch (error) {
            console.error('Failed to load data:', error);
            alert('Failed to load data');
            navigate('/research-types');
        } finally {
            setIsLoading(false);
        }
    };

    const handleModuleToggle = (moduleId: string) => {
        setSelectedModules(prev =>
            prev.includes(moduleId)
                ? prev.filter(id => id !== moduleId)
                : [...prev, moduleId]
        );
    };

    const handleSave = async () => {
        if (!id) return;

        try {
            setIsSaving(true);
            // TODO: Call backend endpoint to update module assignments
            // await researchTypesService.updateModules(id, selectedModules);
            console.log('Saving modules:', selectedModules);
            alert('Module assignment functionality will be implemented when backend endpoint is ready');
            navigate('/research-types');
        } catch (error) {
            console.error('Failed to save module assignments:', error);
            alert('Failed to save module assignments');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-6 text-center">Loading...</div>;
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/research-types')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            Assign Module Templates
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {researchTypeName}
                        </p>
                    </div>
                </div>
                <Button onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Assignments
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto py-6">
                <div className="px-6 space-y-8">
                    <div className="rounded-lg border border-gray-200 p-6 space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Module Templates</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Select which module templates should be included in this research type
                            </p>
                        </div>

                        {moduleTemplates.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>No module templates available.</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate('/modules/new')}
                                    className="mt-2"
                                >
                                    Create a module template first
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {moduleTemplates.map((module) => (
                                    <label
                                        key={module.id}
                                        className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedModules.includes(module.id)}
                                            onChange={() => handleModuleToggle(module.id)}
                                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">{module.name}</div>
                                            {module.description && (
                                                <div className="text-sm text-gray-500 mt-1">{module.description}</div>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
