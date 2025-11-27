'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { researchInProgressApi } from '@/api/domains/research-in-progress';
import { getPublicTestsUrl } from '@/api/config';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  Search,
  Trash2
} from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { ParticipantDetailsModal } from './ParticipantDetailsModal';

interface Participant {
  id: string;
  name: string;
  email: string;
  status: string;
  progress: number;
  duration: string;
  lastActivity: string;
}

interface ResearchConfiguration {
  allowMobileDevices: boolean;
  trackLocation: boolean;
}

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

export function ParticipantsTable({
  participants,
  onViewDetails,
  researchId,
  onParticipantDeleted,
  isLoading = false,
  researchConfig
}: ParticipantsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [participantDetails, setParticipantDetails] = useState<any>(null);

  const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<string>>(new Set());
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || participant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const handleSelectAll = (checked: boolean) => {
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

  const handleSelectParticipant = (participantId: string, checked: boolean) => {
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

  const handleParticipantClick = async (participant: Participant) => {
    setSelectedParticipant(participant);
    setIsModalOpen(true);

    try {
      const response = await researchInProgressApi.getParticipantDetails(researchId, participant.id);

      // Fix: Check for success OR status 200
      if (response.success || response.status === 200) {
        setParticipantDetails(response.data);
      }
    } catch (error) {
      console.error('Error fetching participant details:', error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedParticipant(null);
    setParticipantDetails(null);
  };

  const handleDeleteClick = (participant: Participant) => {
    setParticipantToDelete(participant);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteParticipant = async () => {
    if (!participantToDelete) return;

    setIsDeleting(true);

    try {
      const response = await researchInProgressApi.deleteParticipant(researchId, participantToDelete.id);

      if (response.success) {
        onParticipantDeleted?.(participantToDelete.id);
        setIsDeleteModalOpen(false);
        setParticipantToDelete(null);
      } else {
        alert('Error al eliminar participante');
      }
    } catch (error) {
      alert('Error al eliminar participante');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedParticipantIds.size === 0) return;
    setIsDeleteModalOpen(true);
    setParticipantToDelete(null);
  };

  const handleDeleteSelectedParticipants = async () => {
    if (selectedParticipantIds.size === 0) return;

    setIsDeleting(true);

    try {
      const participantIdsArray = Array.from(selectedParticipantIds);
      const deletePromises = participantIdsArray.map(id =>
        researchInProgressApi.deleteParticipant(researchId, id)
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
        alert(`Se eliminaron ${successful} participante(s). ${failed} fallaron.`);
      }
    } catch (error) {
      alert('Error al eliminar participantes');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setParticipantToDelete(null);
    if (selectedParticipantIds.size > 0) {
      setSelectedParticipantIds(new Set());
    }
  };

  const generatePublicTestsUrl = (participantId: string) => {
    const url = getPublicTestsUrl(researchId, participantId);
    return url;
  };

  const copyParticipantUrl = async (participantId: string) => {
    try {
      const url = generatePublicTestsUrl(participantId);
      await navigator.clipboard.writeText(url);
    } catch (err) {
    }
  };

  const openParticipantTest = (participantId: string) => {
    const url = generatePublicTestsUrl(participantId);
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
          <div className="flex gap-4 mb-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar participantes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="En proceso">En proceso</option>
              <option value="Por iniciar">Por iniciar</option>
              <option value="Completado">Completado</option>
            </select>
            {selectedParticipantIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar seleccionados ({selectedParticipantIds.size})
              </Button>
            )}
          </div>

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
                              onClick={() => handleParticipantClick(participant)}
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

      {selectedParticipant && (
        <ParticipantDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          participant={participantDetails || selectedParticipant}
          researchConfig={researchConfig}
        />
      )}

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
                    variant="destructive"
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
                    variant="destructive"
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
