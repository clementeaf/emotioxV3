import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2, GripVertical } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { ComponentConfigPanel } from '../../components/modules/ComponentConfigPanel';
import { LivePreviewPanel } from '../../components/modules/LivePreviewPanel';
import { moduleTemplatesService } from '../../services/moduleTemplates.service';
import type { ComponentConfig, FileUploadConfig } from '../../types/moduleBuilder.types';
import { useToast } from '../../hooks/useToast';

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

/**
 * Componente sortable para cada componente del módulo
 */
interface SortableItemProps {
    component: ComponentConfig;
    onUpdate: (id: string, updates: Partial<ComponentConfig>) => void;
    onDelete: (id: string) => void;
    validationErrors: string[];
    onValidationErrorClear: () => void;
}

const SortableItem = ({ component, onUpdate, onDelete, validationErrors, onValidationErrorClear }: SortableItemProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: component.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm overflow-hidden min-w-0 ${isDragging ? 'ring-2 ring-blue-500' : ''}`}
        >
            <div className="flex items-start gap-4 min-w-0">
                <div
                    {...attributes}
                    {...listeners}
                    className="mt-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                    title="Drag to reorder"
                >
                    <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-4 min-w-0 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                        <div className="min-w-0 overflow-hidden">
                            <Input
                                id={`label-${component.id}`}
                                label="Label / Question"
                                value={component.label}
                                onChange={(e) => {
                                    onUpdate(component.id, { label: e.target.value });
                                    onValidationErrorClear();
                                }}
                                placeholder={component.type === 'choices' ? 'Ask something' : undefined}
                                error={
                                    validationErrors.length > 0 && 
                                    (!component.label || component.label.trim().length === 0)
                                        ? 'Label is required'
                                        : undefined
                                }
                                required
                            />
                        </div>
                        <div className="min-w-0 overflow-hidden">
                            {(!component.editableFields || component.editableFields.includes('type')) ? (
                                <CustomSelect
                                    id={`type-${component.id}`}
                                    label="Component Type"
                                    value={component.type}
                                    onChange={(value) => onUpdate(component.id, { type: value as ComponentConfig['type'] })}
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
                                <div className="space-y-1 min-w-0 overflow-hidden">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Component Type
                                    </label>
                                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-500 min-w-0 overflow-hidden">
                                        {getComponentLabel(component.type)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Type-specific configuration panel */}
                    <div className="min-w-0 overflow-hidden">
                        <ComponentConfigPanel
                            component={component}
                            onUpdate={(updates) => onUpdate(component.id, updates)}
                        />
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(component.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
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
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Configurar sensores para drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

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
                // Handle both string and object formats
                let structure: { components?: ComponentConfig[] };
                if (typeof template.structure === 'string') {
                    try {
                        structure = JSON.parse(template.structure) as { components?: ComponentConfig[] };
                    } catch (parseError) {
                        console.error('Failed to parse structure:', parseError);
                        structure = {};
                    }
                } else {
                    structure = template.structure as { components?: ComponentConfig[] };
                }
                // Ensure components have proper structure, especially for fileUpload config
                const loadedComponents = (structure?.components || []).map((comp: Partial<ComponentConfig>): ComponentConfig => {
                    // Clean component to match ComponentConfig interface
                    const cleaned: ComponentConfig = {
                        id: comp.id ?? '',
                        type: comp.type ?? 'input',
                        label: comp.label ?? '',
                        placeholder: comp.placeholder,
                        selectRange: comp.selectRange,
                        choicesConfig: comp.choicesConfig,
                        options: comp.options,
                        editableFields: comp.editableFields,
                        hidden: comp.hidden,
                        settings: comp.settings,
                        order: comp.order,
                        validation: comp.validation,
                    };

                    // Ensure fileUpload config is properly structured
                    if (comp.type === 'file-upload' && comp.fileUpload) {
                        // Normalize fileUpload config, preserving boolean values explicitly
                        const fileUploadData = comp.fileUpload as Partial<FileUploadConfig>;
                        cleaned.fileUpload = {
                            maxSizeMB: fileUploadData.maxSizeMB ?? 5,
                            acceptedFormats: fileUploadData.acceptedFormats || ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
                            // Explicitly convert to boolean - handle both true/false and string "true"/"false"
                            allowHitZones: fileUploadData.allowHitZones === true || (typeof fileUploadData.allowHitZones === 'string' && fileUploadData.allowHitZones === 'true'),
                            allowParticipantSelection: fileUploadData.allowParticipantSelection === true || (typeof fileUploadData.allowParticipantSelection === 'string' && fileUploadData.allowParticipantSelection === 'true'),
                        };
                    }
                    return cleaned;
                });
                setComponents(loadedComponents);
            } catch (error: unknown) {
                console.error('Failed to load template:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to load module template';
                toast.error(errorMessage);
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
        // Limpiar errores de validación cuando se agrega un componente
        if (validationErrors.length > 0) {
            setValidationErrors([]);
        }
    };

    const handleUpdateComponent = (id: string, updates: Partial<ComponentConfig>) => {
        // If changing type to 'choices', initialize choicesConfig
        if (updates.type === 'choices') {
            const component = components.find(c => c.id === id);
            if (component && component.type !== 'choices') {
                updates.choicesConfig = {
                    choiceType: 'single',
                    required: false,
                    choices: [
                        { id: crypto.randomUUID(), label: 'Option 1', eligibility: 'Qualify' },
                        { id: crypto.randomUUID(), label: 'Option 2', eligibility: 'Disqualify' },
                        { id: crypto.randomUUID(), label: 'Option 3', eligibility: 'Disqualify' },
                    ],
                };
            }
        }

        setComponents(components.map(c => c.id === id ? { ...c, ...updates } : c));
        // Limpiar errores de validación cuando se actualiza un componente
        if (validationErrors.length > 0) {
            setValidationErrors([]);
        }
    };

    const handleDeleteComponent = (id: string) => {
        setComponents(components.filter(c => c.id !== id));
        // Limpiar errores de validación cuando se elimina un componente
        if (validationErrors.length > 0) {
            setValidationErrors([]);
        }
    };

    /**
     * Maneja el evento de finalización del drag and drop
     * @param event - Evento de drag end
     */
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setComponents((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                // Actualizar el orden de los componentes
                const reordered = arrayMove(items, oldIndex, newIndex);
                
                // Actualizar el campo order de cada componente
                return reordered.map((component, index) => ({
                    ...component,
                    order: index + 1,
                }));
            });
        }
    };

    /**
     * Valida los componentes antes de guardar
     * @returns Array de mensajes de error, vacío si no hay errores
     */
    const validateComponents = (): string[] => {
        const errors: string[] = [];
        const visibleComponents = components.filter(c => !c.hidden);

        // Validar que haya al menos un componente
        if (visibleComponents.length === 0) {
            errors.push('The module must have at least one component');
            return errors;
        }

        // Validar que todos los componentes tengan label válido (excepto los que son parte de un grupo choices antiguo)
        const componentsWithoutLabel = visibleComponents.filter(
            c => {
                const isChoice = (c.settings as { groupLabel?: string; isChoice?: boolean })?.isChoice;
                // No validar labels de componentes choices antiguos aquí
                if (isChoice) return false;
                // Validar label para componentes choices nuevos
                if (c.type === 'choices') {
                    return !c.label || c.label.trim().length === 0;
                }
                return !c.label || c.label.trim().length === 0;
            }
        );

        if (componentsWithoutLabel.length > 0) {
            errors.push(`Please add a label to all components. ${componentsWithoutLabel.length} component${componentsWithoutLabel.length > 1 ? 's' : ''} ${componentsWithoutLabel.length > 1 ? 'are' : 'is'} missing a label.`);
        }

        // Validar componentes de tipo 'choices' nuevos
        const choicesComponents = visibleComponents.filter(c => c.type === 'choices');
        choicesComponents.forEach(component => {
            const choicesConfig = component.choicesConfig;
            if (!choicesConfig || !choicesConfig.choices || choicesConfig.choices.length === 0) {
                errors.push(`Choices component "${component.label || component.id}" must have at least one choice option`);
            } else {
                const invalidChoices = choicesConfig.choices.filter(
                    c => !c.label || c.label.trim().length === 0
                );
                if (invalidChoices.length > 0) {
                    errors.push(`Choices component "${component.label || component.id}" has ${invalidChoices.length} choice${invalidChoices.length > 1 ? 's' : ''} without label`);
                }
            }
        });

        // Validar componentes de tipo 'choices' antiguos (agrupados por groupLabel) - mantener compatibilidad
        const choiceGroups = new Map<string, ComponentConfig[]>();
        visibleComponents.forEach(component => {
            const groupLabel = (component.settings as { groupLabel?: string; isChoice?: boolean })?.groupLabel;
            const isChoice = (component.settings as { groupLabel?: string; isChoice?: boolean })?.isChoice;
            
            if (groupLabel && isChoice && component.type !== 'choices') {
                if (!choiceGroups.has(groupLabel)) {
                    choiceGroups.set(groupLabel, []);
                }
                choiceGroups.get(groupLabel)!.push(component);
            }
        });

        // Validar que cada grupo de choices antiguo tenga exactamente 3 componentes con labels válidos
        choiceGroups.forEach((choiceComponents, groupLabel) => {
            if (choiceComponents.length !== 3) {
                errors.push(`Choices group "${groupLabel}" must have exactly 3 components, but found ${choiceComponents.length}`);
            } else {
                const invalidChoices = choiceComponents.filter(
                    c => !c.label || c.label.trim().length === 0
                );
                if (invalidChoices.length > 0) {
                    errors.push(`Choices group "${groupLabel}" has ${invalidChoices.length} component${invalidChoices.length > 1 ? 's' : ''} without label`);
                }
            }
        });

        return errors;
    };

    const onSubmit = async (data: ModuleTemplateForm) => {
        // Validar componentes antes de guardar
        const componentErrors = validateComponents();
        if (componentErrors.length > 0) {
            setValidationErrors(componentErrors);
            toast.error('Please fix the validation errors before saving');
            return;
        }

        setValidationErrors([]);
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
        } catch (error: unknown) {
            console.error('Failed to save module template:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to save module template';
            toast.error(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-6 text-center">Loading...</div>;
    }

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
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
            <div className="flex-1 flex overflow-hidden min-w-0">
                {/* Editor Panel (Left) */}
                <div className={`${showPreview ? 'w-3/5' : 'w-full'} overflow-y-auto overflow-x-hidden transition-all duration-300 min-w-0`}>
                    <div className="p-6 min-w-0">
                        <div className="space-y-8 min-w-0 max-w-full">
                            {/* Basic Info */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 min-w-0 overflow-hidden">
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
                            <div className="space-y-4 min-w-0 overflow-hidden">
                                <div className="flex items-center justify-between min-w-0">
                                    <h2 className="text-lg font-semibold text-gray-900">Components</h2>
                                    <Button onClick={handleAddComponent} variant="outline" size="sm" className="flex-shrink-0">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Component
                                    </Button>
                                </div>

                                {/* Validation Errors */}
                                {validationErrors.length > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 w-full min-w-0 overflow-hidden">
                                        <h3 className="text-sm font-semibold text-red-800 mb-2">
                                            Validation Errors:
                                        </h3>
                                        <ul className="list-disc list-inside space-y-1">
                                            {validationErrors.map((error, index) => (
                                                <li key={index} className="text-sm text-red-700">
                                                    {error}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="space-y-4 min-w-0 overflow-hidden">
                                    {components.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                            <p className="text-gray-500">No components added yet.</p>
                                            <Button onClick={handleAddComponent} variant="ghost" className="mt-2">
                                                Add your first component
                                            </Button>
                                        </div>
                                    ) : (
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <SortableContext
                                                items={components.filter(c => !c.hidden).map(c => c.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                <div className="space-y-4 min-w-0 overflow-hidden">
                                                    {components
                                                        .filter(c => !c.hidden)
                                                        .map((component) => (
                                                            <SortableItem
                                                                key={component.id}
                                                                component={component}
                                                                onUpdate={handleUpdateComponent}
                                                                onDelete={handleDeleteComponent}
                                                                validationErrors={validationErrors}
                                                                onValidationErrorClear={() => {
                                                                    if (validationErrors.length > 0) {
                                                                        setValidationErrors([]);
                                                                    }
                                                                }}
                                                            />
                                                        ))}
                                                </div>
                                            </SortableContext>
                                        </DndContext>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Panel (Right) */}
                {showPreview && (
                    <div className="w-2/5 h-full border-l flex flex-col">
                        <LivePreviewPanel
                            moduleName={watch('name')}
                            moduleDescription={watch('description')}
                            components={components}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
