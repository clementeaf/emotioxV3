import { useLocation, matchPath } from 'react-router-dom';
import { useMemo } from 'react';
import { StandardSidebar } from './StandardSidebar';
import { SidebarSkeleton } from '../ui/Skeleton';
import { ResearchBuilderSidebar } from './ResearchBuilderSidebar';
import { useResearch } from '../../hooks/useResearchQuery';

/**
 * Main navigation sidebar
 * Dynamically renders StandardSidebar or ResearchBuilderSidebar based on route
 */
export const Sidebar = () => {
    const location = useLocation();

    const researchId = useMemo((): string | null => {
        const builderMatch = location.pathname.match(/^\/research\/([^/]+)\/builder/);
        return builderMatch ? builderMatch[1] : null;
    }, [location.pathname]);

    const { isLoading: loadingResearch } = useResearch(researchId);

    // Render Research Builder Sidebar if in research builder route
    if (researchId) {
        // Show loading state while research is loading
        if (loadingResearch && matchPath('/research/:id/builder', location.pathname)) {
            return <SidebarSkeleton />;
        }

        return <ResearchBuilderSidebar researchId={researchId} />;
    }

    // Render Standard Navigation Sidebar
    return <StandardSidebar />;
};
