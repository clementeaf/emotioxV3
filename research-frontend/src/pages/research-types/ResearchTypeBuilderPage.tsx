import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { CustomSelect } from '../../components/common/CustomSelect';
import { researchTypesService } from '../../services/researchTypes.service';
import { researchTechniquesService, type ResearchTechnique } from '../../services/researchTechniques.service';
import { moduleTemplatesService, type ModuleTemplate } from '../../services/moduleTemplates.service';

export const ResearchTypeBuilderPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [researchTechniqueId, setResearchTechniqueId] = useState('');
    const [selectedModules, setSelectedModules] = useState<string[]>([]);

    const [techniques, setTechniques] = useState<ResearchTechnique[]>([]);
    const [moduleTemplates, setModuleTemplates] = useState<ModuleTemplate[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (isEditing && id) {
            loadResearchType(id);
        }
    }, [isEditing, id]);

    const loadData = async () => {
        try {
            const [techniquesRes, modulesRes] = await Promise.all([
                researchTechniquesService.list(),
                moduleTemplatesService.list()
            ]);
            setTechniques(techniquesRes.researchTechniques);
            setModuleTemplates(modulesRes);
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    };

    const loadResearchType = async (typeId: string) => {
        try {
            setIsLoading(true);
            const response = await researchTypesService.getById(typeId);
            const type = response.researchType;
            setName(type.name);
            setDescription(type.description || '');
            // TODO: Load research technique and modules when backend supports it
        } catch (error) {
            console.error('Failed to load research type:', error);
            alert('Failed to load research type');
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
        if (!name.trim()) {
            alert('Research type name is required');
            return;
        }

        try {
            setIsSaving(true);
            const data = {
                name,
                description,
                research_technique_id: researchTechniqueId || undefined,
            };

            if (isEditing && id) {
                await researchTypesService.update(id, data);
                // TODO: Update modules when backend supports it
            } else {
                await researchTypesService.create(data);
                // TODO: Assign modules when backend supports it
            }
            navigate('/research-types');
        } catch (error) {
            console.error('Failed to save research type:', error);
            alert('Failed to save research type');
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
                            {isEditing ? 'Edit Research Type' : 'Create Research Type'}
                        </h1>
                    </div>
                </div>
                <Button onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Research Type
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Basic Info */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                        <Input
                            id="name"
                            label="Research Type Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., User Experience Study, Market Research"
                            required
                        />
                        <Textarea
                            id="description"
                            label="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the purpose of this research type..."
                        />
                        <CustomSelect
                            id="technique"
                            label="Research Technique"
                            value={researchTechniqueId}
                            onChange={setResearchTechniqueId}
                            options={techniques.map(t => ({
                                value: t.id,
                                label: t.name
                            }))}
                            placeholder="Select a research technique"
                        />
                    </div>

                    {/* Module Assignment */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
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
