'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { memo, useMemo, useCallback } from 'react';

import { withSearchParams } from '@/components/common/SearchParamsWrapper';
import { useResearchList, useResearchById } from '@/api/domains/research';
import { ResearchSidebarProps } from '@/shared/interfaces/research.interface';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { BASE_SECTIONS, getBuildStages, getResultsStages, DEFAULT_SECTION } from '@/config/research-stages.config';
import { SidebarBase } from './SidebarBase';


function ResearchSidebarContent({ researchId, className }: ResearchSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const currentSection = searchParams?.get('section') || DEFAULT_SECTION;

  const { data: specificResearchData, isLoading: isLoadingSpecific } = useResearchById(researchId || '');
  const { data: researches = [] } = useResearchList();

  const researchData = specificResearchData || researches.find((r: any) => r.id === researchId);


  const UserInfo = memo(() => {
    if (!user) {
      return (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-lg font-bold text-blue-600">U</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-neutral-900 truncate">Usuario</p>
            <p className="text-xs text-neutral-500 truncate">Sin email</p>
          </div>
        </div>
      );
    }
    const userName = user.name || 'Usuario';
    const userEmail = user.email || 'Sin email';
    const userInitial = userName.charAt(0).toUpperCase();
    return (
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-lg font-bold text-blue-600">{userInitial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-neutral-900 truncate">{userName}</p>
          <p className="text-xs text-neutral-500 truncate">{userEmail}</p>
        </div>
      </div>
    );
  });
  UserInfo.displayName = 'UserInfo';

  const LogoutButton = memo(() => {
    const handleLogout = useCallback(async () => {
      try {
        await logout();
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }, [logout]);

    return (
      <div className="flex items-center gap-3 px-2">
        <button
          onClick={handleLogout}
          className="flex-1 flex items-center justify-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300"
          title="Cerrar sesión"
        >
          <span className="font-medium">Cerrar sesión</span>
        </button>
      </div>
    );
  });
  LogoutButton.displayName = 'LogoutButton';

  const researchName = researchData?.name || (researchId ? `Research ${researchId.slice(-8)}` : 'Research');
  const researchTechnique = researchData
    ? (researchData as { technique?: string; basic?: { technique?: string } }).technique ||
    (researchData as { technique?: string; basic?: { technique?: string } }).basic?.technique
    : null;

  const sections = useMemo(() => {
    const dynamicSections = [...BASE_SECTIONS];
    const buildSectionIndex = dynamicSections.findIndex(s => s.id === 'build');
    const resultsSectionIndex = dynamicSections.findIndex(s => s.id === 'results');

    // Handle BUILD section
    if (buildSectionIndex !== -1 && researchTechnique) {
      const buildStages = getBuildStages(researchTechnique);
      dynamicSections[buildSectionIndex] = {
        ...dynamicSections[buildSectionIndex],
        stages: buildStages
      };
    } else if (buildSectionIndex !== -1) {
      dynamicSections[buildSectionIndex] = {
        ...dynamicSections[buildSectionIndex],
        stages: getBuildStages('')
      };
    }

    // Handle RESULTS section
    if (resultsSectionIndex !== -1 && researchTechnique) {
      const resultsStages = getResultsStages(researchTechnique);
      dynamicSections[resultsSectionIndex] = {
        ...dynamicSections[resultsSectionIndex],
        stages: resultsStages
      };
    } else if (resultsSectionIndex !== -1) {
      dynamicSections[resultsSectionIndex] = {
        ...dynamicSections[resultsSectionIndex],
        stages: getResultsStages('')
      };
    }

    return dynamicSections;
  }, [researchTechnique, researchData]);
  const isLoadingName = isLoadingSpecific && !researchData;
  const error = null;

  const handleBackToDashboard = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const TopBlock = (
    <div className='py-2'>
      <div>
        <button
          onClick={handleBackToDashboard}
          className="flex items-center gap-1.5 py-1.5 text-xs text-neutral-700 font-medium transition-colors hover:text-neutral-900 mt-3"
          aria-label="Volver al dashboard"
        >
          <span>←</span>
          <span>Volver al dashboard</span>
        </button>
      </div>
      <div className="space-y-1.5 py-2">
        <h2 className="text-base font-bold text-neutral-900 truncate" title={typeof researchName === 'string' ? researchName : ''}>
          {isLoadingName ? (
            <div className="animate-pulse bg-gray-200 rounded h-5 w-28"></div>
          ) : (
            researchName
          )}
        </h2>
        {researchTechnique && !isLoadingName && (
          <p className="text-[13px] leading-4 text-neutral-500 truncate" title={researchTechnique}>
            {researchTechnique}
          </p>
        )}
        {isLoadingName && (
          <div className="animate-pulse bg-gray-200 rounded h-3.5 w-20"></div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );

  const MenuBlock = useMemo(() => (
    <nav className="space-y-4 pl-2">
      {sections.map((section) => (
        <div key={section.id} className="space-y-1">
          <div>
            <h3 className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-2">
              {section.title}
            </h3>
          </div>
          {section.stages?.map((stage) => (
            <Link
              key={stage.id}
              href={`/dashboard?research=${researchId}&aim=true&section=${stage.id}`}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 text-[13px] rounded-md transition-colors duration-200',
                currentSection === stage.id
                  ? 'bg-blue-100 text-blue-700 font-medium border border-blue-200'
                  : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50'
              )}
            >
              <span className="flex-1 leading-5">{stage.title}</span>
            </Link>
          ))}
        </div>
      ))}

    </nav>
  ), [sections, researchId, currentSection]);

  return (
    <SidebarBase
      userInfo={<UserInfo />}
      topBlock={TopBlock}
      footer={<LogoutButton />}
      className={className}
    >
      {MenuBlock}
    </SidebarBase>
  );
}

const ResearchSidebarContentWithSuspense = withSearchParams(ResearchSidebarContent);

export function ResearchSidebar({ researchId, activeStage }: ResearchSidebarProps) {
  return <ResearchSidebarContentWithSuspense researchId={researchId} activeStage={activeStage} />;
}
