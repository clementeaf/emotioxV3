import { useLocation, matchPath } from 'react-router-dom';
import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { StandardSidebar } from './StandardSidebar';
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
            return (
                <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-full rounded-lg items-center justify-center">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                </div>
            );
        }

        return <ResearchBuilderSidebar researchId={researchId} />;
    }

    // Render Standard Navigation Sidebar
    return <StandardSidebar />;
};
