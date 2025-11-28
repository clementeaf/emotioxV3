import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2, GripVertical } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { ComponentConfigPanel } from '../../components/modules/ComponentConfigPanel';
import { LivePreviewPanel } from '../../components/modules/LivePreviewPanel';
import { moduleTemplatesService } from '../../services/moduleTemplates.service';
import type { ComponentConfig } from '../../types/moduleBuilder.types';
import { useToast } from '../../contexts/ToastContext';

const moduleTemplateSchema = z.object({
    name: z.string().min(2, 'Module name must be at least 2 characters'),
    description: z.string().optional(),
});

type ModuleTemplateForm = z.infer<typeof moduleTemplateSchema>;

const getComponentLabel = (type: string): string => {
    switch (type) {
        case 'textarea': return 'Long Text';
        case 'input': return 'Short Text';
        case 'select': return 'Select / Dropdown';
        case 'checkbox': return 'Checkbox';
        case 'radio': return 'Radio Buttons';
        case 'file-upload': return 'File Upload';
        case 'choices': return 'Choices';
        default: return type.replace('-', ' ');
    }
};

export const ModuleBuilderPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const toast = useToast();
    const isEditing = !!id;

    const [components, setComponents] = useState<ComponentConfig[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(true);

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ModuleTemplateForm>({
        resolver: zodResolver(moduleTemplateSchema),
        defaultValues: {
            name: '',
            description: '',
        },
    });

    useEffect(() => {
        const loadTemplate = async (templateId: string) => {
            try {
                setIsLoading(true);
                const template = await moduleTemplatesService.getById(templateId);
                setValue('name', template.name);
                setValue('description', template.description || '');
                // Parse the structure to get components array
                const structure = template.structure as { components?: ComponentConfig[] };
                setComponents(structure?.components || []);
            } catch (error) {
                console.error('Failed to load template:', error);
                toast.error('Failed to load module template');
                navigate('/modules');
            } finally {
                setIsLoading(false);
            }
        };

        if (isEditing && id) {
            void loadTemplate(id);
        }
    }, [isEditing, id, navigate, setValue, toast]);

    const handleAddComponent = () => {
        const newComponent: ComponentConfig = {
            id: crypto.randomUUID(),
            type: 'input',
            label: 'New Question',
        };
        setComponents([...components, newComponent]);
    };

    const handleUpdateComponent = (id: string, updates: Partial<ComponentConfig>) => {
        // If changing type to 'choices', replace the component with 3 input components
        if (updates.type === 'choices') {
            const componentIndex = components.findIndex(c => c.id === id);
            if (componentIndex !== -1) {
                const baseOrder = components[componentIndex].order ?? componentIndex + 1;
                const newComponents: ComponentConfig[] = [
                    {
                        id: crypto.randomUUID(),
                        type: 'input',
                        label: '',
                        placeholder: {
                            enabled: true,
                            text: 'Escribe la opción 1...'
                        },
                        order: baseOrder,
                        settings: {
                            groupLabel: 'CHOICES',
                            isChoice: true
                        }
                    },
                    {
                        id: crypto.randomUUID(),
                        type: 'input',
                        label: '',
                        placeholder: {
                            enabled: true,
                            text: 'Escribe la opción 2...'
                        },
                        order: baseOrder + 1,
                        settings: {
                            groupLabel: 'CHOICES',
                            isChoice: true
                        }
                    },
                    {
                        id: crypto.randomUUID(),
                        type: 'input',
                        label: '',
                        placeholder: {
                            enabled: true,
                            text: 'Escribe la opción 3...'
                        },
                        order: baseOrder + 2,
                        settings: {
                            groupLabel: 'CHOICES',
                            isChoice: true
                        }
                    }
                ];

                // Replace the current component with the 3 new input components
                const updatedComponents = [...components];
                updatedComponents.splice(componentIndex, 1, ...newComponents);
                setComponents(updatedComponents);
                return;
            }
        }

        setComponents(components.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const handleDeleteComponent = (id: string) => {
        setComponents(components.filter(c => c.id !== id));
    };

    const onSubmit = async (data: ModuleTemplateForm) => {
        try {
            setIsSaving(true);
            const apiData = {
                name: data.name,
                description: data.description,
                structure: { components } as unknown as Record<string, unknown>,
            };

            if (isEditing && id) {
                await moduleTemplatesService.update(id, apiData);
            } else {
                await moduleTemplatesService.create(apiData);
            }

            toast.success(`Module template ${isEditing ? 'updated' : 'created'} successfully`);
            navigate('/modules');
        } catch (error) {
            console.error('Failed to save module template:', error);
            toast.error('Failed to save module template');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-6 text-center">Loading...</div>;
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/modules')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            {isEditing ? 'Edit Module' : 'Create New Module'}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                    >
                        {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </Button>
                    <Button onClick={handleSubmit(onSubmit)} isLoading={isSaving} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Module
                    </Button>
                </div>
            </div>

            {/* Split View Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Editor Panel (Left) */}
                <div className={`${showPreview ? 'w-3/5' : 'w-full'} overflow-y-auto transition-all duration-300`}>
                    <div className="p-6">
                        <div className="max-w-4xl mx-auto space-y-8">
                            {/* Basic Info */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                                <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                                <Input
                                    id="name"
                                    label="Module Name"
                                    {...register('name')}
                                    error={errors.name?.message}
                                    placeholder="e.g., Demographics, Satisfaction Survey"
                                    required
                                />
                                <Textarea
                                    id="description"
                                    label="Description"
                                    {...register('description')}
                                    error={errors.description?.message}
                                    placeholder="Describe the purpose of this module..."
                                />
                            </div>

                            {/* Components Builder */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-900">Components</h2>
                                    <Button onClick={handleAddComponent} variant="outline" size="sm">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Component
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {components.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                            <p className="text-gray-500">No components added yet.</p>
                                            <Button onClick={handleAddComponent} variant="ghost" className="mt-2">
                                                Add your first component
                                            </Button>
                                        </div>
                                    ) : (
                                        components
                                            .filter(c => !c.hidden)
                                            .map((component) => (
                                                <div key={component.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                                    <div className="flex items-start gap-4">
                                                        <div className="mt-2 cursor-move text-gray-400">
                                                            <GripVertical className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1 space-y-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <Input
                                                                    id={`label-${component.id}`}
                                                                    label="Label / Question"
                                                                    value={component.label}
                                                                    onChange={(e) => handleUpdateComponent(component.id, { label: e.target.value })}
                                                                />
                                                                {(!component.editableFields || component.editableFields.includes('type')) ? (
                                                                    <CustomSelect
                                                                        id={`type-${component.id}`}
                                                                        label="Component Type"
                                                                        value={component.type}
                                                                        onChange={(value) => handleUpdateComponent(component.id, { type: value as ComponentConfig['type'] })}
                                                                        options={[
                                                                            { value: 'input', label: 'Short Text' },
                                                                            { value: 'textarea', label: 'Long Text' },
                                                                            { value: 'select', label: 'Select / Dropdown' },
                                                                            { value: 'file-upload', label: 'File Upload' },
                                                                            { value: 'choices', label: 'Choices' },
                                                                        ]}
                                                                        placeholder="Select Type"
                                                                    />
                                                                ) : (
                                                                    <div className="space-y-1">
                                                                        <label className="block text-sm font-medium text-gray-700">
                                                                            Component Type
                                                                        </label>
                                                                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-500">
                                                                            {getComponentLabel(component.type)}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Type-specific configuration panel */}
                                                            <ComponentConfigPanel
                                                                component={component}
                                                                onUpdate={(updates) => handleUpdateComponent(component.id, updates)}
                                                            />
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteComponent(component.id)}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Panel (Right) */}
            {showPreview && (
                <div className="w-2/5 border-l bg-white overflow-hidden">
                    <LivePreviewPanel
                        moduleName={watch('name')}
                        moduleDescription={watch('description')}
                        components={components}
                    />
                </div>
            )}
        </div>
    );
};
