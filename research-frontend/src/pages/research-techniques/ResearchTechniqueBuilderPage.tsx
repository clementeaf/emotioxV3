import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { researchTechniquesService } from '../../services/researchTechniques.service';

export const ResearchTechniqueBuilderPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isEditing && id) {
            loadTechnique(id);
        }
    }, [isEditing, id]);

    const loadTechnique = async (techniqueId: string) => {
        try {
            setIsLoading(true);
            const response = await researchTechniquesService.getById(techniqueId);
            const technique = response.researchTechnique;
            setName(technique.name);
            setDescription(technique.description || '');
        } catch (error) {
            console.error('Failed to load research technique:', error);
            alert('Failed to load research technique');
            navigate('/research-techniques');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            alert('Technique name is required');
            return;
        }
        if (!description.trim()) {
            alert('Description is required');
            return;
        }

        try {
            setIsSaving(true);
            const data = {
                name,
                description,
            };

            if (isEditing && id) {
                await researchTechniquesService.update(id, data);
            } else {
                await researchTechniquesService.create(data);
            }
            navigate('/research-techniques');
        } catch (error) {
            console.error('Failed to save research technique:', error);
            alert('Failed to save research technique');
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
                    <Button variant="ghost" size="sm" onClick={() => navigate('/research-techniques')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            {isEditing ? 'Edit Research Technique' : 'Create Research Technique'}
                        </h1>
                    </div>
                </div>
                <Button onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Technique
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-8">
                    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Technique Information</h2>
                        <Input
                            id="name"
                            label="Technique Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Eye Tracking, Facial Coding"
                            required
                        />
                        <Textarea
                            id="description"
                            label="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the research technique..."
                            required
                            rows={6}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
