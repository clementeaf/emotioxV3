import { useState, useCallback, memo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CreateResearchForm } from '../../components/research/CreateResearchForm';
import { CreateResearchTechniqueModal } from '../../components/research/CreateResearchTechniqueModal';
import { CreateEnterpriseModal } from '../../components/research/CreateEnterpriseModal';
import { useResearches, useDeleteResearch, useDuplicateResearch } from '../../hooks/useResearchQuery';
import { useIsViewer } from '../../hooks/useIsViewer';
import { Button } from '../../components/ui/Button';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { Drawer } from '../../components/ui/Drawer';
import { ResearchCardSkeleton } from '../../components/ui/Skeleton';
import { ArrowRight, Calendar, Clock, Folder, Plus, Trash2, FlaskConical, Building2, Copy, List, LayoutGrid, ExternalLink, User, UserPlus, Loader2, X } from 'lucide-react';
import { researchService } from '../../services/research.service';
import apiClient from '../../services/api/client';
import type { Research } from '../../services/research.service';

/**
 * Componente memoizado para tarjeta de investigación
 */
const ResearchCard = memo(({
    research,
    onResearchClick,
    onDelete,
    onDuplicate,
    onRename,
    readOnly = false,
}: {
    research: Research;
    onResearchClick: (id: string) => void;
    onDelete: (research: Research, e: React.MouseEvent) => void;
    onDuplicate: (research: Research) => void;
    onRename: (research: Research, newName: string) => void;
    readOnly?: boolean;
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(research.name);

    const formattedDate = new Date(research.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const formattedUpdatedAt = research.updated_at
        ? new Date(research.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

    const creatorName = [research.creator_first_name, research.creator_last_name].filter(Boolean).join(' ') || null;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={() => {
                                    if (editName.trim() && editName.trim() !== research.name) onRename(research, editName.trim());
                                    setIsEditing(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') { if (editName.trim() && editName.trim() !== research.name) onRename(research, editName.trim()); setIsEditing(false); }
                                    if (e.key === 'Escape') { setEditName(research.name); setIsEditing(false); }
                                }}
                                className="text-xl font-semibold text-gray-900 px-1 py-0 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1"
                                autoFocus
                            />
                        ) : (
                            <h3
                                className="text-xl font-semibold text-gray-900 cursor-text hover:text-blue-600 transition-colors"
                                onDoubleClick={() => { setEditName(research.name); setIsEditing(true); }}
                                title="Double-click to rename"
                            >
                                {research.name}
                            </h3>
                        )}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {research.status}
                        </span>
                    </div>

                    {research.description && (
                        <p className="text-gray-600 mb-4">{research.description}</p>
                    )}

                    <div className="flex items-center gap-6 text-sm text-gray-500 flex-wrap">
                        {creatorName && (
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{creatorName}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Created {formattedDate}</span>
                        </div>
                        {formattedUpdatedAt && formattedUpdatedAt !== formattedDate && (
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>Updated {formattedUpdatedAt}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Folder className="h-4 w-4" />
                            <span className="font-medium">
                                {research.research_type_name || 'Unknown Type'}
                            </span>
                        </div>
                        {research.research_technique_name && (
                            <div className="flex items-center gap-2">
                                <FlaskConical className="h-4 w-4" />
                                <span>{research.research_technique_name}</span>
                            </div>
                        )}
                        {research.enterprise_name && (
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <span>{research.enterprise_name}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="ml-4 flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onResearchClick(research.id)}
                    >
                        <span className="flex items-center gap-2">
                            Open
                            <ArrowRight className="h-4 w-4" />
                        </span>
                    </Button>
                    {!readOnly && (
                        <>
                            <Button
                                variant="ghost"
                                onClick={() => onDuplicate(research)}
                                className="text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                title="Duplicate"
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={(e) => onDelete(research, e)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});

ResearchCard.displayName = 'ResearchCard';

const ResearchTableRow = memo(({
    research,
    onOpen,
    onDelete,
    onDuplicate,
    onRename,
    readOnly = false,
}: {
    research: Research;
    onOpen: (id: string) => void;
    onDelete: (research: Research, e: React.MouseEvent) => void;
    onDuplicate: (research: Research) => void;
    onRename: (research: Research, newName: string) => void;
    readOnly?: boolean;
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(research.name);

    const statusColor = (() => {
        switch (research.status.toLowerCase()) {
            case 'active': case 'approved': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    })();

    const formattedDate = new Date(research.created_at).toLocaleDateString('en-US', {
        month: '2-digit', day: '2-digit', year: 'numeric',
    });

    const formattedUpdatedAt = research.updated_at
        ? new Date(research.updated_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
        : '—';

    const creatorName = [research.creator_first_name, research.creator_last_name].filter(Boolean).join(' ') || '—';

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3 whitespace-nowrap">
                {isEditing ? (
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => {
                            if (editName.trim() && editName.trim() !== research.name) onRename(research, editName.trim());
                            setIsEditing(false);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { if (editName.trim() && editName.trim() !== research.name) onRename(research, editName.trim()); setIsEditing(false); }
                            if (e.key === 'Escape') { setEditName(research.name); setIsEditing(false); }
                        }}
                        className="text-sm font-medium text-gray-900 w-full px-1 py-0.5 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                    />
                ) : (
                    <span
                        className="text-sm font-medium text-gray-900 cursor-text hover:text-blue-600 transition-colors"
                        onDoubleClick={() => { setEditName(research.name); setIsEditing(true); }}
                        title="Double-click to rename"
                    >
                        {research.name}
                    </span>
                )}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusColor}`}>
                    {research.status}
                </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                {research.research_type_name || '—'}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                {creatorName}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                {formattedDate}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                {formattedUpdatedAt}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                {research.research_technique_name || '—'}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-1">
                    <button onClick={() => onOpen(research.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors" title="Open">
                        <ExternalLink className="h-4 w-4" />
                    </button>
                    {!readOnly && (
                        <>
                            <button onClick={() => onDuplicate(research)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors" title="Duplicate">
                                <Copy className="h-4 w-4" />
                            </button>
                            <button onClick={(e) => onDelete(research, e)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors" title="Delete">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
});

ResearchTableRow.displayName = 'ResearchTableRow';

/**
 * Main Research page - Optimizado con React Query
 * Lists all research projects and allows creating new ones
 */
export const ResearchPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const isViewer = useIsViewer();
    const [showTechniqueModal, setShowTechniqueModal] = useState<boolean>(false);
    const [showEnterpriseModal, setShowEnterpriseModal] = useState<boolean>(false);
    const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
    const [researchToDelete, setResearchToDelete] = useState<Research | null>(null);
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
    const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
    const [researchToDuplicate, setResearchToDuplicate] = useState<Research | null>(null);
    const [duplicateName, setDuplicateName] = useState('');
    const [showInviteDrawer, setShowInviteDrawer] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteEmails, setInviteEmails] = useState<string[]>([]);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteResult, setInviteResult] = useState<{ sent: string[]; failed: Array<{ email: string; message: string }> } | null>(null);
    const [viewers, setViewers] = useState<Array<{ id: string; email: string; firstName: string | null; lastName: string | null; createdAt: string }>>([]);
    const [viewersLoading, setViewersLoading] = useState(false);

    useEffect(() => {
        if (searchParams.get('inviteViewer') !== '1') return;

        setShowInviteDrawer(true);
        setInviteResult(null);

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('inviteViewer');
        setSearchParams(nextParams, { replace: true });
    }, [searchParams, setSearchParams]);

    const loadViewers = useCallback(async () => {
        setViewersLoading(true);
        try {
            const res = await apiClient.get<{ viewers: typeof viewers }>('/users/viewers');
            setViewers(res.viewers || []);
        } catch {
            setViewers([]);
        } finally {
            setViewersLoading(false);
        }
    }, []);

    useEffect(() => {
        if (showInviteDrawer) void loadViewers();
    }, [showInviteDrawer, loadViewers]);

    // Usar React Query para datos optimizados
    const { data: researches = [], isLoading, error } = useResearches();
    const deleteResearch = useDeleteResearch();
    const duplicateResearch = useDuplicateResearch();

    // Type assertion para TypeScript
    const typedResearches = researches as Research[];

    console.log('[ResearchPage] Render state:', {
        isLoading,
        error,
        researchesCount: typedResearches.length,
        researches: typedResearches
    });

    const handleResearchClick = useCallback((researchId: string) => {
        navigate(`/research/${researchId}/builder`);
    }, [navigate]);

    const handleDeleteClick = useCallback((research: Research, e: React.MouseEvent) => {
        e.stopPropagation();
        setResearchToDelete(research);
        setDeleteModalOpen(true);
    }, []);

    const handleAddInviteEmail = useCallback(() => {
        const email = inviteEmail.trim().toLowerCase();
        if (!email || !email.includes('@') || inviteEmails.includes(email)) return;

        setInviteEmails((prev) => [...prev, email]);
        setInviteEmail('');
    }, [inviteEmail, inviteEmails]);

    const handleRemoveInviteEmail = useCallback((email: string) => {
        setInviteEmails((prev) => prev.filter((item) => item !== email));
    }, []);

    const handleInviteViewer = useCallback(async () => {
        if (inviteEmails.length === 0) return;

        setInviteLoading(true);
        setInviteResult(null);

        const sent: string[] = [];
        const failed: Array<{ email: string; message: string }> = [];

        try {
            for (const email of inviteEmails) {
                try {
                    await apiClient.post('/users/invite', { email });
                    sent.push(email);
                } catch (err: unknown) {
                    failed.push({
                        email,
                        message: err instanceof Error ? err.message : 'Failed to send invitation',
                    });
                }
            }

            setInviteResult({ sent, failed });
            if (sent.length > 0) {
                setInviteEmails(failed.map((item) => item.email));
                void loadViewers();
            }
        } finally {
            setInviteLoading(false);
        }
    }, [inviteEmails, loadViewers]);

    const handleConfirmDelete = useCallback(async () => {
        if (!researchToDelete) return;

        try {
            await deleteResearch.mutateAsync(researchToDelete.id);
            setDeleteModalOpen(false);
            setResearchToDelete(null);
        } catch (error) {
            console.error('Failed to delete research:', error);
        }
    }, [researchToDelete, deleteResearch]);

    const handleRename = useCallback(async (research: Research, newName: string) => {
        try {
            await researchService.update(research.id, { name: newName });
            queryClient.invalidateQueries({ queryKey: ['research'] });
        } catch (error) {
            console.error('Failed to rename research:', error);
        }
    }, [queryClient]);

    const handleDuplicateClick = useCallback((research: Research) => {
        setResearchToDuplicate(research);
        setDuplicateName(`${research.name} - Copy`);
        setDuplicateModalOpen(true);
    }, []);

    const handleDuplicateConfirm = useCallback(async () => {
        if (!researchToDuplicate) return;
        try {
            await duplicateResearch.mutateAsync({ id: researchToDuplicate.id, name: duplicateName });
            setDuplicateModalOpen(false);
            setResearchToDuplicate(null);
        } catch (error) {
            console.error('Failed to duplicate research:', error);
        }
    }, [researchToDuplicate, duplicateName, duplicateResearch]);

    if (showCreateForm) {
        return (
            <div className="h-full p-6">
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-800">Create Research</h1>
                            <p className="mt-1 text-sm text-gray-500">Create new research projects</p>
                        </div>
                        <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                            Back to List
                        </Button>
                    </div>
                </div>

                <CreateResearchForm onSuccess={() => {
                    setShowCreateForm(false);
                }} />

                <CreateResearchTechniqueModal
                    isOpen={showTechniqueModal}
                    onClose={() => setShowTechniqueModal(false)}
                />

                <CreateEnterpriseModal
                    isOpen={showEnterpriseModal}
                    onClose={() => setShowEnterpriseModal(false)}
                />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex h-full w-full flex-col gap-4 overflow-hidden p-4 sm:p-5 lg:p-6">
                <ResearchCardSkeleton />
                <ResearchCardSkeleton />
                <ResearchCardSkeleton />
            </div>
        );
    }

    if (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load researches';
        return (
            <div className="h-full w-full flex items-center justify-center p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl w-full">
                    <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Researches</h2>
                    <p className="text-red-600 mb-4">{errorMessage}</p>
                    <Button onClick={() => window.location.reload()} variant="outline">
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col p-4 sm:p-5 lg:p-6 overflow-hidden">
            {/* View toggle */}
            <div className="flex items-center justify-between gap-3 mb-3 flex-shrink-0">
                <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
                    <button
                        onClick={() => setViewMode('cards')}
                        className={`p-1.5 rounded transition-colors ${viewMode === 'cards' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Card view"
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Table view"
                    >
                        <List className="h-3.5 w-3.5" />
                    </button>
                </div>
                {!isViewer && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setShowInviteDrawer(true); setInviteResult(null); }}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <UserPlus className="h-4 w-4" />
                            Invite Viewer
                        </button>
                        <Button onClick={() => setShowCreateForm(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Research
                        </Button>
                    </div>
                )}
            </div>

            {/* Research List */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {typedResearches.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
                        <Folder className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Research Projects Yet</h3>
                        <p className="text-gray-500 mb-6">
                            {isViewer ? 'No research projects available to view.' : 'Create your first research project to get started'}
                        </p>
                        {!isViewer && (
                            <Button onClick={() => setShowCreateForm(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Research
                            </Button>
                        )}
                    </div>
                ) : viewMode === 'cards' ? (
                    <div className="space-y-4">
                        {typedResearches.map((research) => (
                            <ResearchCard
                                key={research.id}
                                research={research}
                                onResearchClick={handleResearchClick}
                                onDelete={handleDeleteClick}
                                onDuplicate={handleDuplicateClick}
                                onRename={handleRename}
                                readOnly={isViewer}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
                        <table className="w-full min-w-[600px]">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Researcher</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">Created</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Updated</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Technique</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {typedResearches.map((research) => (
                                    <ResearchTableRow
                                        key={research.id}
                                        research={research}
                                        onOpen={handleResearchClick}
                                        onDelete={handleDeleteClick}
                                        onDuplicate={handleDuplicateClick}
                                        onRename={handleRename}
                                        readOnly={isViewer}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <CreateResearchTechniqueModal
                isOpen={showTechniqueModal}
                onClose={() => setShowTechniqueModal(false)}
            />

            <CreateEnterpriseModal
                isOpen={showEnterpriseModal}
                onClose={() => setShowEnterpriseModal(false)}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setResearchToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Research"
                message={`Are you sure you want to delete "${researchToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                isLoading={deleteResearch.isPending}
            />

            {duplicateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Duplicate Research</h3>
                        <p className="text-sm text-gray-600 mb-4">Enter a name for the duplicated research:</p>
                        <input
                            type="text"
                            value={duplicateName}
                            onChange={(e) => setDuplicateName(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-4"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter' && duplicateName.trim()) handleDuplicateConfirm(); }}
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => { setDuplicateModalOpen(false); setResearchToDuplicate(null); }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDuplicateConfirm}
                                disabled={!duplicateName.trim() || duplicateResearch.isPending}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {duplicateResearch.isPending ? 'Duplicating...' : 'Duplicate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Drawer
                isOpen={showInviteDrawer}
                onClose={() => setShowInviteDrawer(false)}
                title="Invite Viewer"
                width="md"
                footer={(
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setShowInviteDrawer(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={handleInviteViewer}
                            disabled={inviteEmails.length === 0 || inviteLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {inviteLoading ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                            ) : (
                                <><UserPlus className="h-4 w-4" /> Send Invitations</>
                            )}
                        </button>
                    </div>
                )}
            >
                <div className="space-y-5">
                    <p className="text-sm text-gray-500">They will receive an email with a link to sign in with Google.</p>

                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email addresses</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="email"
                                placeholder="email@example.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddInviteEmail();
                                    }
                                }}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={handleAddInviteEmail}
                                disabled={!inviteEmail.trim() || !inviteEmail.includes('@')}
                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    {inviteEmails.length > 0 && (
                        <div className="space-y-2">
                            {inviteEmails.map((email) => (
                                <div key={email} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                                    <span className="text-sm text-gray-700">{email}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveInviteEmail(email)}
                                        className="text-gray-400 hover:text-red-500"
                                        aria-label={`Remove ${email}`}
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {inviteResult && (
                        <div className="space-y-2">
                            {inviteResult.sent.length > 0 && (
                                <p className="text-sm text-green-600">
                                    Sent: {inviteResult.sent.length} invitation{inviteResult.sent.length !== 1 ? 's' : ''}.
                                </p>
                            )}
                            {inviteResult.failed.length > 0 && (
                                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                                    <p className="text-sm font-medium text-red-700 mb-1">Failed</p>
                                    <div className="space-y-1">
                                        {inviteResult.failed.map((item) => (
                                            <p key={item.email} className="text-sm text-red-600">
                                                {item.email}: {item.message}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Invited viewers list */}
                    <div className="border-t border-gray-200 pt-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">
                            Invited viewers
                            {viewers.length > 0 && <span className="ml-1.5 text-xs text-gray-400">({viewers.length})</span>}
                        </h3>
                        {viewersLoading ? (
                            <div className="space-y-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="animate-pulse h-10 bg-gray-100 rounded-lg" />
                                ))}
                            </div>
                        ) : viewers.length === 0 ? (
                            <p className="text-sm text-gray-400">No viewers invited yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {viewers.map((viewer) => (
                                    <div key={viewer.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm text-gray-700 truncate">{viewer.email}</p>
                                                {(viewer.firstName || viewer.lastName) && (
                                                    <p className="text-xs text-gray-400 truncate">
                                                        {[viewer.firstName, viewer.lastName].filter(Boolean).join(' ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-400 whitespace-nowrap ml-3">
                                            {new Date(viewer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Drawer>
        </div>
    );
};
