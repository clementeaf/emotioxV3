import { useState, useEffect } from 'react';
import { FileText, Plus, Pencil, Trash2, Link } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { AssignTechniquesModal } from '../../components/research-types/AssignTechniquesModal';
import { researchTypesService, type ResearchType } from '../../services/researchTypes.service';
import { researchTechniquesService, type ResearchTechnique } from '../../services/researchTechniques.service';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { SearchInput } from '../../components/ui/SearchInput';

export const ResearchTypesPage = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [searchQuery, setSearchQuery] = useState('');

    // Research Types state
    const [researchTypes, setResearchTypes] = useState<ResearchType[]>([]);
    const [isLoadingTypes, setIsLoadingTypes] = useState(true);
    const [typesError, setTypesError] = useState<string | null>(null);

    // Research Techniques state
    const [researchTechniques, setResearchTechniques] = useState<ResearchTechnique[]>([]);
    const [isLoadingTechniques, setIsLoadingTechniques] = useState(true);
    const [techniquesError, setTechniquesError] = useState<string | null>(null);

    // Delete modals state
    const [deleteTypeModalOpen, setDeleteTypeModalOpen] = useState(false);
    const [typeToDelete, setTypeToDelete] = useState<ResearchType | null>(null);
    const [isDeletingType, setIsDeletingType] = useState(false);

    const [deleteTechniqueModalOpen, setDeleteTechniqueModalOpen] = useState(false);
    const [techniqueToDelete, setTechniqueToDelete] = useState<ResearchTechnique | null>(null);
    const [isDeletingTechnique, setIsDeletingTechnique] = useState(false);

    // Assign techniques modal state
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [typeToAssign, setTypeToAssign] = useState<ResearchType | null>(null);

    useEffect(() => {
        loadResearchTypes();
        loadResearchTechniques();
    }, []);

    const loadResearchTypes = async () => {
        try {
            setIsLoadingTypes(true);
            const response = await researchTypesService.list();
            setResearchTypes(response.researchTypes);
        } catch (err) {
            setTypesError('Failed to load research types');
            console.error(err);
        } finally {
            setIsLoadingTypes(false);
        }
    };

    const loadResearchTechniques = async () => {
        try {
            setIsLoadingTechniques(true);
            const response = await researchTechniquesService.list();
            setResearchTechniques(response.researchTechniques);
        } catch (err) {
            setTechniquesError('Failed to load research techniques');
            console.error(err);
        } finally {
            setIsLoadingTechniques(false);
        }
    };

    const handleDeleteTypeClick = (type: ResearchType) => {
        setTypeToDelete(type);
        setDeleteTypeModalOpen(true);
    };

    const handleConfirmDeleteType = async () => {
        if (!typeToDelete) return;

        try {
            setIsDeletingType(true);
            await researchTypesService.delete(typeToDelete.id);
            await loadResearchTypes();
            setDeleteTypeModalOpen(false);
            setTypeToDelete(null);
            toast.success('Research type deleted successfully!');
        } catch (error) {
            console.error('Failed to delete research type:', error);
            toast.error('Failed to delete research type');
        } finally {
            setIsDeletingType(false);
        }
    };

    const handleDeleteTechniqueClick = (technique: ResearchTechnique) => {
        setTechniqueToDelete(technique);
        setDeleteTechniqueModalOpen(true);
    };

    const handleConfirmDeleteTechnique = async () => {
        if (!techniqueToDelete) return;

        try {
            setIsDeletingTechnique(true);
            await researchTechniquesService.delete(techniqueToDelete.id);
            await loadResearchTechniques();
            setDeleteTechniqueModalOpen(false);
            setTechniqueToDelete(null);
            toast.success('Research technique deleted successfully!');
        } catch (error) {
            console.error('Failed to delete research technique:', error);
            toast.error('Failed to delete research technique');
        } finally {
            setIsDeletingTechnique(false);
        }
    };

    const handleAssignTechniquesClick = (type: ResearchType) => {
        setTypeToAssign(type);
        setAssignModalOpen(true);
    };

    const handleAssignSuccess = async () => {
        await loadResearchTypes();
    };

    const filteredTypes = researchTypes.filter(type =>
        type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredTechniques = researchTechniques.filter(tech =>
        tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tech.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col p-6 gap-6">
            <div className="flex-none flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Research Types & Techniques</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage different types of research and their configurations
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => navigate('/research-types/new')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Type
                    </Button>
                    <Button onClick={() => navigate('/research-techniques/new')} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Technique
                    </Button>
                </div>
            </div>

            <div className="flex-none w-full max-w-md">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search types and techniques..."
                />
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Research Types Column */}
                <div className="flex flex-col h-full min-h-0 bg-gray-50/50 rounded-xl border border-gray-100 overflow-hidden">
                    <div className="flex-none p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
                        <h2 className="text-lg font-semibold text-gray-900">Research Types</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {isLoadingTypes ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-4 text-gray-500">Loading...</p>
                            </div>
                        ) : typesError ? (
                            <div className="text-center py-12 text-red-600">
                                {typesError}
                            </div>
                        ) : filteredTypes.length === 0 ? (
                            <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                                    <FileText className="h-6 w-6 text-blue-600" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-gray-900">No research types found</h3>
                                <p className="mt-2 text-gray-500">
                                    {searchQuery ? 'Try adjusting your search.' : 'Create your first research type.'}
                                </p>
                                {!searchQuery && (
                                    <div className="mt-6">
                                        <Button onClick={() => navigate('/research-types/new')}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create Type
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            filteredTypes.map((type) => (
                                <div
                                    key={type.id}
                                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow relative group"
                                >
                                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => navigate(`/research-types/${type.id}`)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTypeClick(type)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-start gap-3 pr-16">
                                        <div className="flex-shrink-0">
                                            <div className="inline-flex p-2 bg-blue-50 rounded-lg">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-semibold text-gray-900 truncate">
                                                {type.name}
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Updated {new Date(type.updated_at || type.created_at).toLocaleDateString()}
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <button
                                                    onClick={() => handleAssignTechniquesClick(type)}
                                                    className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-md hover:bg-blue-100 transition-colors font-medium"
                                                >
                                                    <Link className="h-3 w-3" />
                                                    Techniques
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Research Techniques Column */}
                <div className="flex flex-col h-full min-h-0 bg-gray-50/50 rounded-xl border border-gray-100 overflow-hidden">
                    <div className="flex-none p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
                        <h2 className="text-lg font-semibold text-gray-900">Research Techniques</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {isLoadingTechniques ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-4 text-gray-500">Loading...</p>
                            </div>
                        ) : techniquesError ? (
                            <div className="text-center py-12 text-red-600">
                                {techniquesError}
                            </div>
                        ) : filteredTechniques.length === 0 ? (
                            <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                                    <FileText className="h-6 w-6 text-blue-600" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-gray-900">No techniques found</h3>
                                <p className="mt-2 text-gray-500">
                                    {searchQuery ? 'Try adjusting your search.' : 'Create your first research technique.'}
                                </p>
                                {!searchQuery && (
                                    <div className="mt-6">
                                        <Button onClick={() => navigate('/research-techniques/new')}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create Technique
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            filteredTechniques.map((technique) => (
                                <div
                                    key={technique.id}
                                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow relative group"
                                >
                                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => navigate(`/research-techniques/${technique.id}`)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTechniqueClick(technique)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-start gap-3 pr-16">
                                        <div className="flex-shrink-0">
                                            <div className="inline-flex p-2 bg-green-50 rounded-lg">
                                                <FileText className="h-5 w-5 text-green-600" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-semibold text-gray-900">
                                                {technique.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                                <span className="font-medium">Description:</span> {technique.description}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Updated {new Date(technique.updated_at || technique.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Type Modal */}
            <ConfirmationModal
                isOpen={deleteTypeModalOpen}
                onClose={() => setDeleteTypeModalOpen(false)}
                onConfirm={handleConfirmDeleteType}
                title="Delete Research Type"
                message={`Are you sure you want to delete "${typeToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
                isLoading={isDeletingType}
            />

            {/* Delete Technique Modal */}
            <ConfirmationModal
                isOpen={deleteTechniqueModalOpen}
                onClose={() => setDeleteTechniqueModalOpen(false)}
                onConfirm={handleConfirmDeleteTechnique}
                title="Delete Research Technique"
                message={`Are you sure you want to delete "${techniqueToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
                isLoading={isDeletingTechnique}
            />

            {/* Assign Techniques Modal */}
            <AssignTechniquesModal
                isOpen={assignModalOpen}
                onClose={() => setAssignModalOpen(false)}
                researchType={typeToAssign}
                onSuccess={handleAssignSuccess}
            />
        </div>
    );
};
