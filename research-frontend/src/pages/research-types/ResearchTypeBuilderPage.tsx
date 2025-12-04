import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { researchTypesService } from '../../services/researchTypes.service';
import { researchTechniquesService, type ResearchTechnique } from '../../services/researchTechniques.service';
import { useToast } from '../../hooks/useToast';


const researchTypeSchema = z.object({
    name: z.string().min(2, 'Research type name must be at least 2 characters'),
    description: z.string().optional(),
    techniqueIds: z.array(z.string()).optional(),
});

type ResearchTypeForm = z.infer<typeof researchTypeSchema>;

export const ResearchTypeBuilderPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const toast = useToast();
    const isEditing = !!id;

    const [techniques, setTechniques] = useState<ResearchTechnique[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ResearchTypeForm>({
        resolver: zodResolver(researchTypeSchema),
        defaultValues: {
            name: '',
            description: '',
            techniqueIds: [],
        },
    });

    const selectedTechniqueIds = watch('techniqueIds') || [];

    useEffect(() => {
        const loadData = async () => {
            try {
                const techniquesRes = await researchTechniquesService.list();
                setTechniques(techniquesRes.researchTechniques);
            } catch (error) {
                console.error('Failed to load data:', error);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        const loadResearchType = async (typeId: string) => {
            try {
                setIsLoading(true);
                const response = await researchTypesService.getById(typeId);
                const type = response.researchType;
                setValue('name', type.name);
                setValue('description', type.description || '');

                if (type.research_techniques) {
                    setValue('techniqueIds', type.research_techniques.map(t => t.id));
                }
                // TODO: Load modules when backend supports it
            } catch (error) {
                console.error('Failed to load research type:', error);
                toast.error('Failed to load research type');
                navigate('/research-types');
            } finally {
                setIsLoading(false);
            }
        };

        if (isEditing && id) {
            loadResearchType(id);
        }
    }, [isEditing, id, navigate, setValue, toast]);

    const handleTechniqueToggle = (techniqueId: string) => {
        const currentIds = selectedTechniqueIds;
        const newIds = currentIds.includes(techniqueId)
            ? currentIds.filter(id => id !== techniqueId)
            : [...currentIds, techniqueId];
        setValue('techniqueIds', newIds, { shouldDirty: true });
    };

    const onSubmit = async (data: ResearchTypeForm) => {
        try {
            setIsSaving(true);
            const apiData = {
                name: data.name,
                description: data.description,
                research_technique_ids: data.techniqueIds,
            };

            if (isEditing && id) {
                await researchTypesService.update(id, apiData);
            } else {
                await researchTypesService.create(apiData);
            }

            toast.success(`Research type ${isEditing ? 'updated' : 'created'} successfully`);
            navigate('/research-types');
        } catch (error) {
            console.error('Failed to save research type:', error);
            toast.error('Failed to save research type');
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
                <Button onClick={handleSubmit(onSubmit)} isLoading={isSaving} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Research Type
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto py-6">
                <div className="px-6 space-y-8">
                    {/* Basic Info */}
                    <div className="rounded-lg border border-gray-200 p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                        <Input
                            id="name"
                            label="Research Type Name"
                            {...register('name')}
                            error={errors.name?.message}
                            placeholder="e.g., User Experience Study, Market Research"
                            required
                        />
                        <Input
                            id="description"
                            label="Description"
                            {...register('description')}
                            error={errors.description?.message}
                            placeholder="Optional description of this research type"
                        />
                    </div>

                    {/* Research Techniques */}
                    <div className="rounded-lg border border-gray-200 p-6 space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Research Techniques</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Select which research techniques are available for this research type
                            </p>
                        </div>

                        {techniques.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>No research techniques available.</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate('/research-techniques/new')}
                                    className="mt-2"
                                >
                                    Create a technique first
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {techniques.map((technique) => (
                                    <label
                                        key={technique.id}
                                        className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedTechniqueIds.includes(technique.id)}
                                            onChange={() => handleTechniqueToggle(technique.id)}
                                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">{technique.name}</div>
                                            {technique.description && (
                                                <div className="text-sm text-gray-500 mt-1">
                                                    <span className="font-medium">Description:</span> {technique.description}
                                                </div>
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
