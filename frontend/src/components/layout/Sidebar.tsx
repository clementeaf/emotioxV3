'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { navigateToPublicTests } from '@/api/dynamic-endpoints';
import { Button } from '@/components/ui/Button';
import { useGlobalResearchData } from '@/hooks/useGlobalResearchData';
import { useResearchList, useDeleteResearch } from '@/api/domains/research';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import type { ResearchAPIResponse } from '@/shared/types/research.types';

import { SidebarBase } from './SidebarBase';

interface SidebarProps {
  className?: string;
}


const mainNavItems = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { id: 'new-research', label: 'Nueva Investigación', href: '/dashboard/research/new' },
  { id: 'research-config', label: 'Configuración Investigación', href: '/dashboard/researchTypeConfig' },
  { id: 'companies', label: 'Gestión de Empresas', href: '/dashboard/companies' },
  { id: 'settings', label: 'Configuraciones', href: '/dashboard/settings' },
];

// Añadir la interfaz para el modal de confirmación
interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  researchName: string;
}

// Componente de Modal de Confirmación de Eliminación
function DeleteConfirmationModal({ isOpen, onClose, onConfirm, researchName }: DeleteConfirmationModalProps) {
  if (!isOpen) { return null; }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Cabecera con fondo de color */}
        <div className="bg-red-50 border-b border-red-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-semibold text-neutral-900">
              Terminar investigación
            </h2>
          </div>
        </div>

        {/* Contenido */}
        <div className="px-6 py-5">
          <p className="text-neutral-700 mb-6 leading-relaxed">
            ¿Estás seguro de que deseas terminar la investigación <span className="font-semibold">&quot;{researchName}&quot;</span>? Esta acción no se puede deshacer.
          </p>

          {/* Botones principales */}
          <div className="space-y-3">
            <Button
              onClick={onConfirm}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Sí, terminar investigación</span>
            </Button>

            <Button
              onClick={onClose}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 py-2.5"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Cancelar</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ className }: SidebarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const [recentResearch, setRecentResearch] = useState<Array<{ id: string, name: string, technique: string }>>([]);
  const [isLoadingResearch, setIsLoadingResearch] = useState<boolean>(true);
  const [showNoResearchMessage, setShowNoResearchMessage] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [researchToDelete, setResearchToDelete] = useState<{ id: string, name: string } | null>(null);
  const [currentResearchName, setCurrentResearchName] = useState<string>('');
  const researchId = searchParams ? searchParams.get('research') : '';

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setResearchToDelete(null);
  };

  const confirmDeleteResearch = async () => {
    if (!researchToDelete || !researchToDelete.id) {
      closeDeleteModal();
      return;
    }
    try {
      await deleteResearchMutation.mutateAsync(researchToDelete.id);

      if (window.location.search.includes(`research=${researchToDelete.id}`)) {
        router.replace('/dashboard');
      }
    } catch (error) {
      // Error handling silencioso
    } finally {
      setShowDeleteModal(false);
      setResearchToDelete(null);
    }
  };

  const { data: allResearch = [], isLoading: isLoadingResearchData } = useResearchList();
  const deleteResearchMutation = useDeleteResearch();

  useEffect(() => {
    if (allResearch.length > 0) {
      const sortedResearch = allResearch
        .sort((a: ResearchAPIResponse, b: ResearchAPIResponse) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((item: ResearchAPIResponse) => ({
          id: item.id,
          name: item.name || 'Sin nombre',
          technique: item.technique || 'Unknown',
          createdAt: new Date(item.createdAt)
        }));


      setRecentResearch(sortedResearch);
      setShowNoResearchMessage(false);
    } else {
      setShowNoResearchMessage(true);
    }
    // Actualizar el estado de carga
    setIsLoadingResearch(isLoadingResearchData);
  }, [allResearch, isLoadingResearchData]);

  const { researchData: currentResearchData } = useGlobalResearchData(researchId || '');

  useEffect(() => {
    if (currentResearchData?.name) {
      setCurrentResearchName(currentResearchData.name);
    } else {
      setCurrentResearchName('');
    }
  }, [currentResearchData]);

  function UserInfo() {
    if (!user) {
      return (
        <div className="flex items-center gap-3 p-3">
          <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center">
            <span className="text-lg font-medium text-neutral-600">U</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-md font-medium text-neutral-900 truncate">Usuario</p>
            <p className="text-md text-neutral-500 truncate">Cargando...</p>
          </div>
        </div>
      );
    }
    const userName = user.name || 'Usuario';
    const userEmail = user.email || 'Sin email';
    const userInitial = userName.charAt(0).toUpperCase();
    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-300 flex items-center justify-center">
          <span className="text-lg font-medium text-blue-900">{userInitial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-md font-medium text-neutral-900 truncate">{userName}</p>
          <p className="text-md text-neutral-500 truncate">{userEmail}</p>
        </div>
      </div>
    );
  }

  // Footer (logout)
  function LogoutButton() {
    const handleLogout = async () => {
      try {
        await logout();
      } catch (error) {
        // The logout hook handles cleanup even on error, but as fallback:
        console.error('Logout error:', error);
      }
    };
    return (
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-2 px-4 py-2 text-[15px] text-red-600 hover:bg-red-200 rounded-lg transition-colors border border-red-200 hover:border-red-300"
        title="Cerrar sesión"
      >
        <span className="font-[400]">Cerrar sesión</span>
      </button>
    );
  }

  // Navegación principal
  function MainNavigation() {
    return (
      <nav className="space-y-1">
        {mainNavItems.map((item) => {
          // Normalize pathname by removing trailing slash
          const normalizedPathname = pathname.endsWith('/') && pathname !== '/'
            ? pathname.slice(0, -1)
            : pathname;

          // Check if current path matches this nav item
          let isActive = false;

          if (item.href === '/dashboard') {
            // Dashboard is active when pathname is exactly /dashboard
            isActive = normalizedPathname === '/dashboard';
          } else {
            // For other items, check if pathname matches exactly or starts with the href
            isActive = normalizedPathname === item.href || normalizedPathname.startsWith(item.href + '/');
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2 text-[15px] rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-100 text-blue-700 font-semibold border border-blue-200'
                  : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 font-medium'
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  // Sección de investigación actual (si estamos en modo investigación)
  function CurrentResearchSection() {
    if (!researchId || !currentResearchName) return null;

    // Función para navegar a public-tests
    const handleOpenPublicTests = () => {
      if (researchId) {
        navigateToPublicTests(researchId);
      }
    };

    return (
      <div className="border-t border-neutral-200 pt-4 mt-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-neutral-900 mb-2">Investigación Actual</h3>
          <p className="text-sm text-neutral-700 truncate" title={currentResearchName}>
            {currentResearchName}
          </p>
        </div>

        <div className="space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            ← Volver al dashboard
          </Link>

          {researchId && (
            <button
              onClick={handleOpenPublicTests}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir test público
            </button>
          )}
        </div>
      </div>
    );
  }

  // Sección de investigaciones recientes
  function RecentResearchSection() {
    // Mostrar siempre, pero resaltar la investigación actual si existe

    return (
      <div className="border-t border-neutral-200 pt-4 mt-4">
        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Investigaciones Recientes</h3>

        {isLoadingResearch ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-neutral-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : showNoResearchMessage ? (
          <p className="text-sm text-neutral-500 italic">No hay investigaciones recientes</p>
        ) : (
          <div className="space-y-2">
            {recentResearch.map((item) => (
              <div key={item.id} className="group">
                <Link
                  href={`/dashboard?research=${item.id}&section=welcome-screen`}
                  className="block p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate" title={item.name}>
                        {item.name}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">{item.technique}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setResearchToDelete({ id: item.id, name: item.name });
                        setShowDeleteModal(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      title="Eliminar investigación"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <SidebarBase className={className} userInfo={<UserInfo />}>
        <div className="flex flex-col h-full">
          {/* Navegación principal */}
          <div className="flex-1 p-4">
            <MainNavigation />
            {/* Sección de investigación actual o recientes */}
            <CurrentResearchSection />
            <RecentResearchSection />
          </div>
          {/* Footer con logout */}
          <div className="p-4 border-t border-neutral-200">
            <LogoutButton />
          </div>
        </div>
      </SidebarBase>

      {/* Modal de confirmación de eliminación */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteResearch}
        researchName={researchToDelete?.name || ''}
      />
    </>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={<div className="w-64 bg-white border-r border-neutral-200 animate-pulse" />}>
      <SidebarContent {...props} />
    </Suspense>
  );
}
