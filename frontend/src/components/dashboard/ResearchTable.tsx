'use client';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/Dialog';
import { useResearchList, useDeleteResearch } from '@/api/domains/research';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useState } from 'react';
import { ErrorBoundary } from '../common/ErrorBoundary';
import type { ResearchAPIResponse } from '@/shared/types/research.types';

// Tipo local para la tabla que incluye las propiedades necesarias
type ResearchTableItem = ResearchAPIResponse;

interface ResearchTableProps {
  className?: string;
}

// Componente Skeleton para las filas de la tabla
function TableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-neutral-200">
        <thead className="border-b border-neutral-200">
          <tr key="header-row">
            <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Nombre</th>
            <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Estado</th>
            <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Técnica</th>
            <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-neutral-600">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-neutral-200">
          {/* Skeleton rows */}
          {Array.from({ length: 5 }).map((_, index) => (
            <tr key={`skeleton-row-${index}`} className="hover:bg-neutral-50">
              <td className="px-6 py-4">
                <div className="h-4 bg-neutral-200 rounded animate-pulse w-3/4"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-6 bg-neutral-200 rounded-full animate-pulse w-20"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-4 bg-neutral-200 rounded animate-pulse w-24"></div>
              </td>
              <td className="px-6 py-4">
                <div className="flex space-x-2">
                  <div className="h-8 bg-neutral-200 rounded-md animate-pulse w-12"></div>
                  <div className="h-8 w-8 bg-neutral-200 rounded-md animate-pulse"></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResearchTableContent() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ResearchTableItem | null>(null);

  // Usar el hook centralizado para obtener research data
  const { data: researchData = [], isLoading, error, refetch } = useResearchList();
  const deleteResearchMutation = useDeleteResearch();

  const research = researchData as ResearchTableItem[];

  const handleRefresh = () => {
    refetch();
  };


  const handleDeleteResearch = (e: React.MouseEvent, item: ResearchTableItem) => {
    e.stopPropagation();
    setProjectToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDeleteResearch = async () => {
    if (!projectToDelete?.id) {
      toast.error('No se puede eliminar una investigación sin ID válido');
      setShowDeleteModal(false);
      setProjectToDelete(null);
      return;
    }

    try {
      // ✅ Usar el hook centralizado que ya maneja optimistic updates
      await deleteResearchMutation.mutateAsync(projectToDelete.id);

      // El toast ya se muestra en el hook
      setShowDeleteModal(false);
      setProjectToDelete(null);
      // ✅ NO llamar refetch - TanStack Query lo maneja automáticamente
    } catch (error: unknown) {
      // El error ya se maneja en el hook
      console.error('Delete error:', error);
    }
  };

  const cancelDeleteResearch = () => {
    setShowDeleteModal(false);
    setProjectToDelete(null);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string, classes: string }> = {
      'draft': { text: 'Borrador', classes: 'bg-blue-100 text-blue-800' },
      'in-progress': { text: 'En progreso', classes: 'bg-green-100 text-green-800' },
      'completed': { text: 'Completado', classes: 'bg-purple-100 text-purple-800' },
      'archived': { text: 'Archivado', classes: 'bg-gray-100 text-gray-800' }
    };

    const statusInfo = statusMap[status.toLowerCase()] || { text: status, classes: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.classes}`}>
        {statusInfo.text}
      </span>
    );
  };

  return (
    <div className="overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Proyectos de Investigación</h2>
          <p className="text-sm text-gray-500 mt-1">
            Última actualización: {new Date().toLocaleString()}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Actualizar"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {error && (
        <Alert variant="destructive" className="m-6">
          <div className="flex items-start space-x-3">
            {/* Icono de error */}
            <svg
              className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>

            <div className="flex-1">
              <div className="text-red-800">
                <div className="mb-3">
                  <div className="font-medium mb-1">
                    No se pudieron cargar las investigaciones
                  </div>
                  <div className="text-sm">
                    Por favor, intenta de nuevo. Si el problema persiste, contacta al soporte técnico.
                  </div>
                </div>

                {/* Detalles técnicos solo en desarrollo */}
                {process.env.NODE_ENV !== 'production' && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer hover:text-red-700">
                      Ver detalles técnicos
                    </summary>
                    <pre className="mt-1 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200 overflow-auto">
                      {error?.message || 'Error desconocido'}
                    </pre>
                  </details>
                )}

                {/* Botón de reintentar */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="mt-3 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reintentar
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      )}

      <div className="min-w-full">
        {isLoading ? (
          <TableSkeleton />
        ) : research.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-neutral-500">No hay investigaciones disponibles.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr key="header-row">
                  <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nombre</th>
                  <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Estado</th>
                  <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Técnica</th>
                  <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {research.map((item: ResearchTableItem, index: number) => (
                  <tr key={`research-item-${item.id || index}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs truncate">
                      {item.name}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {item.technique || 'No especificada'}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <div className="flex space-x-2">
                        <Link
                          href={item.technique === 'eye-tracking' || item.technique === 'aim-framework'
                            ? `/dashboard?research=${item.id}&section=welcome-screen`
                            : `/dashboard?research=${item.id}`
                          }
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                        >
                          Ver
                        </Link>
                        <button
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
                          onClick={(e) => handleDeleteResearch(e, item)}
                          title="Eliminar investigación"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {
        showDeleteModal && projectToDelete && (
          <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>¿Eliminar investigación?</DialogTitle>
                <DialogDescription>
                  ¿Estás seguro de que deseas eliminar la investigación "{projectToDelete?.name}"? Esta acción no se puede deshacer.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end space-x-4 mt-6">
                <DialogClose asChild>
                  <Button variant="outline" onClick={cancelDeleteResearch}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button variant="destructive" onClick={confirmDeleteResearch}>
                  Eliminar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      }
    </div >
  );
}

export function ResearchTable({ className }: ResearchTableProps) {
  return (
    <ErrorBoundary>
      <div className={className}>
        <ResearchTableContent />
      </div>
    </ErrorBoundary>
  );
}
