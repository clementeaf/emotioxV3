import { useState, useMemo, useRef, useEffect } from 'react';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { researchInProgressService, type Participant, type ResearchConfiguration } from '../../../services/researchInProgress.service';
import { getReviewUrl } from '../../../utils/publicTestsUrl';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    Clock,
    Copy,
    ExternalLink,
    Eye,
    Trash2
} from 'lucide-react';
import { useToast } from '../../../hooks/useToast';

interface ParticipantsTableProps {
    participants: Participant[];
    onViewDetails: (participantId: string) => void;
    researchId: string;
    onParticipantDeleted?: (participantId: string) => void;
    isLoading?: boolean;
    researchConfig?: ResearchConfiguration | null;
}

const statusConfig = {
    'En proceso': {
        label: 'En proceso',
        color: 'bg-blue-100 text-blue-800',
        icon: Clock
    },
    'Por iniciar': {
        label: 'Por iniciar',
        color: 'bg-gray-100 text-gray-800',
        icon: AlertCircle
    },
    'Completado': {
        label: 'Completado',
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle
    }
};

/**
 * Tabla de participantes con funcionalidades de búsqueda, filtrado y acciones
 * @param participants - Lista de participantes
 * @param onViewDetails - Callback para ver detalles de un participante
 * @param researchId - ID de la investigación
 * @param onParticipantDeleted - Callback cuando se elimina un participante
 * @param isLoading - Estado de carga
 * @param researchConfig - Configuración de la investigación
 */
export function ParticipantsTable({
    participants,
    onViewDetails,
    researchId,
    onParticipantDeleted,
    isLoading = false,
    // researchConfig - unused but kept for interface compatibility
}: ParticipantsTableProps) {
    const toast = useToast();
    // Removed unused state variables
    // const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
    // const [isModalOpen, setIsModalOpen] = useState(false);
    // const [participantDetails, setParticipantDetails] = useState<unknown>(null);

    const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<string>>(new Set());
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

    const filteredParticipants = participants;

    const allFilteredSelected = useMemo(() => {
        return filteredParticipants.length > 0 &&
            filteredParticipants.every(p => selectedParticipantIds.has(p.id));
    }, [filteredParticipants, selectedParticipantIds]);

    const someFilteredSelected = useMemo(() => {
        return filteredParticipants.some(p => selectedParticipantIds.has(p.id));
    }, [filteredParticipants, selectedParticipantIds]);

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            selectAllCheckboxRef.current.indeterminate = someFilteredSelected && !allFilteredSelected;
        }
    }, [someFilteredSelected, allFilteredSelected]);

    const handleSelectAll = (checked: boolean): void => {
        if (checked) {
            const newSelected = new Set(selectedParticipantIds);
            filteredParticipants.forEach(p => newSelected.add(p.id));
            setSelectedParticipantIds(newSelected);
        } else {
            const newSelected = new Set(selectedParticipantIds);
            filteredParticipants.forEach(p => newSelected.delete(p.id));
            setSelectedParticipantIds(newSelected);
        }
    };

    const handleSelectParticipant = (participantId: string, checked: boolean): void => {
        const newSelected = new Set(selectedParticipantIds);
        if (checked) {
            newSelected.add(participantId);
        } else {
            newSelected.delete(participantId);
        }
        setSelectedParticipantIds(newSelected);
    };

    const getStatusConfig = (status: string) => {
        return statusConfig[status as keyof typeof statusConfig] || statusConfig['Por iniciar'];
    };

    // Removed unused function
    // const handleParticipantClick = async (participant: Participant): Promise<void> => {
    //     setSelectedParticipant(participant);
    //     setIsModalOpen(true);
    //
    //     try {
    //         const response = await researchInProgressService.getParticipantDetails(researchId, participant.id);
    //
    //         if (response.success || response.status === 200) {
    //             setParticipantDetails(response.data);
    //         }
    //     } catch (error) {
    //         console.error('Error fetching participant details:', error);
    //         toast.error('Error al cargar los detalles del participante');
    //     }
    // };

    // Removed unused function
    // const handleCloseModal = (): void => {
    //     setIsModalOpen(false);
    //     setSelectedParticipant(null);
    //     setParticipantDetails(null);
    // };

    const handleDeleteClick = (participant: Participant): void => {
        setParticipantToDelete(participant);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteParticipant = async (): Promise<void> => {
        if (!participantToDelete) return;

        setIsDeleting(true);

        try {
            const response = await researchInProgressService.deleteParticipant(researchId, participantToDelete.id);

            if (response.success) {
                onParticipantDeleted?.(participantToDelete.id);
                setIsDeleteModalOpen(false);
                setParticipantToDelete(null);
                toast.success('Participante eliminado correctamente');
            } else {
                toast.error('Error al eliminar participante');
            }
        } catch {
            toast.error('Error al eliminar participante');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteSelected = (): void => {
        if (selectedParticipantIds.size === 0) return;
        setIsDeleteModalOpen(true);
        setParticipantToDelete(null);
    };

    const handleDeleteSelectedParticipants = async (): Promise<void> => {
        if (selectedParticipantIds.size === 0) return;

        setIsDeleting(true);

        try {
            const participantIdsArray = Array.from(selectedParticipantIds);
            const deletePromises = participantIdsArray.map(id =>
                researchInProgressService.deleteParticipant(researchId, id)
            );

            const results = await Promise.allSettled(deletePromises);
            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.length - successful;

            if (successful > 0) {
                participantIdsArray.forEach(id => onParticipantDeleted?.(id));
            }

            setIsDeleteModalOpen(false);
            setSelectedParticipantIds(new Set());

            if (failed > 0) {
                toast.error(`Se eliminaron ${successful} participante(s). ${failed} fallaron.`);
            } else {
                toast.success(`Se eliminaron ${successful} participante(s) correctamente`);
            }
        } catch {
            toast.error('Error al eliminar participantes');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCloseDeleteModal = (): void => {
        setIsDeleteModalOpen(false);
        setParticipantToDelete(null);
        if (selectedParticipantIds.size > 0) {
            setSelectedParticipantIds(new Set());
        }
    };

    const copyParticipantUrl = async (participantId: string): Promise<void> => {
        try {
            const url = getReviewUrl(researchId, participantId);
            await navigator.clipboard.writeText(url);
            toast.success('URL copiada al portapapeles');
        } catch {
            toast.error('Error al copiar URL');
        }
    };

    const openParticipantTest = (participantId: string): void => {
        const url = getReviewUrl(researchId, participantId);
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const SkeletonRow = () => (
        <tr className="border-b">
            <td className="py-3 px-4">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-4"></div>
                </div>
            </td>
            <td className="py-3 px-4">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-48"></div>
                </div>
            </td>
            <td className="py-3 px-4">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
            </td>
            <td className="py-3 px-4">
                <div className="animate-pulse flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-8"></div>
                </div>
            </td>
            <td className="py-3 px-4">
                <div className="animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
            </td>
            <td className="py-3 px-4">
                <div className="animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
            </td>
            <td className="py-3 px-4">
                <div className="animate-pulse flex items-center gap-2">
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </div>
            </td>
            <td className="py-3 px-4">
                <div className="animate-pulse flex items-center gap-2">
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </div>
            </td>
        </tr>
    );

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Participantes ({participants.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {selectedParticipantIds.size > 0 && (
                        <div className="flex items-center mb-4">
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={handleDeleteSelected}
                                className="flex items-center gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Eliminar seleccionados ({selectedParticipantIds.size})
                            </Button>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4 font-medium w-12">
                                        <input
                                            type="checkbox"
                                            ref={selectAllCheckboxRef}
                                            checked={allFilteredSelected}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="text-left py-3 px-4 font-medium">Participante</th>
                                    <th className="text-left py-3 px-4 font-medium">Estado</th>
                                    <th className="text-left py-3 px-4 font-medium">Progreso</th>
                                    <th className="text-left py-3 px-4 font-medium">Duración</th>
                                    <th className="text-left py-3 px-4 font-medium">Última actividad</th>
                                    <th className="text-left py-3 px-4 font-medium">Acceso directo</th>
                                    <th className="text-left py-3 px-4 font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, index) => (
                                        <SkeletonRow key={index} />
                                    ))
                                ) : (
                                    filteredParticipants.map((participant) => {
                                        const status = getStatusConfig(participant.status);
                                        const StatusIcon = status.icon;

                                        return (
                                            <tr key={participant.id} className="border-b hover:bg-gray-50">
                                                <td className="py-3 px-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedParticipantIds.has(participant.id)}
                                                        onChange={(e) => handleSelectParticipant(participant.id, e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div>
                                                        <div className="font-medium">{participant.name}</div>
                                                        <div className="text-sm text-gray-500">{participant.email}</div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge className={status.color}>
                                                        <StatusIcon className="h-3 w-3 mr-1" />
                                                        {status.label}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className="bg-blue-600 h-2 rounded-full"
                                                                style={{ width: `${participant.progress}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm text-gray-600">{participant.progress}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-gray-600">{participant.duration}</td>
                                                <td className="py-3 px-4 text-gray-600">{participant.lastActivity}</td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => copyParticipantUrl(participant.id)}
                                                            className="flex items-center gap-1"
                                                            title="Copiar URL del participante"
                                                        >
                                                            <Copy className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => openParticipantTest(participant.id)}
                                                            className="flex items-center gap-1"
                                                            title="Abrir test del participante"
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => onViewDetails(participant.id)}
                                                            title="Ver detalles"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteClick(participant)}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            title="Eliminar participante"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="h-6 w-6 text-red-500" />
                            <h3 className="text-lg font-semibold text-gray-900">
                                {participantToDelete ? 'Eliminar participante' : 'Eliminar participantes seleccionados'}
                            </h3>
                        </div>

                        {participantToDelete ? (
                            <>
                                <p className="text-gray-600 mb-6">
                                    ¿Estás seguro de que quieres eliminar a <strong>{participantToDelete.name}</strong> ({participantToDelete.email})?
                                </p>
                                <p className="text-sm text-red-600 mb-6">
                                    ⚠️ Esta acción no se puede deshacer. Se eliminarán todos los datos del participante.
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <Button
                                        variant="outline"
                                        onClick={handleCloseDeleteModal}
                                        disabled={isDeleting}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        variant="danger"
                                        onClick={handleDeleteParticipant}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? 'Eliminando...' : 'Eliminar'}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-gray-600 mb-6">
                                    ¿Estás seguro de que quieres eliminar <strong>{selectedParticipantIds.size}</strong> participante(s) seleccionado(s)?
                                </p>
                                <p className="text-sm text-red-600 mb-6">
                                    ⚠️ Esta acción no se puede deshacer. Se eliminarán todos los datos de los participantes seleccionados.
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <Button
                                        variant="outline"
                                        onClick={handleCloseDeleteModal}
                                        disabled={isDeleting}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        variant="danger"
                                        onClick={handleDeleteSelectedParticipants}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? 'Eliminando...' : `Eliminar ${selectedParticipantIds.size}`}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}