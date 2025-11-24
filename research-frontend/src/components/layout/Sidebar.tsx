import { Link, useLocation, matchPath } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
    BrainCircuit,
    LayoutDashboard,
    Settings,
    FileText,
    Boxes,
    Wrench,
    ClipboardList,
    ArrowLeft,
    Loader2
} from 'lucide-react';
import { cn } from '../ui/Button';
import { researchService, type Research } from '../../services/research.service';

interface NavItem {
    path: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { path: '/research', label: 'Research', icon: FileText },
    { path: '/research-types', label: 'Research Type Builder', icon: Wrench },
    { path: '/modules', label: 'Modules', icon: Boxes },
    { path: '/research-in-progress', label: "Research's in Progress", icon: ClipboardList },
];

/**
 * Main navigation sidebar
 * Displays logo, navigation items and settings
 * Dynamically changes content when in Research Builder
 */
export const Sidebar = () => {
    const location = useLocation();
    const [activeResearch, setActiveResearch] = useState<Research | null>(null);
    const [loadingResearch, setLoadingResearch] = useState(false);

    useEffect(() => {
        const match = matchPath('/research/:id/builder', location.pathname);

        const fetchResearch = async (id: string) => {
            try {
                setLoadingResearch(true);
                const response = await researchService.getById(id);
                setActiveResearch(response.research);
            } catch (error) {
                console.error('Failed to fetch research for sidebar', error);
                setActiveResearch(null);
            } finally {
                setLoadingResearch(false);
            }
        };

        if (match && match.params.id) {
            // Only fetch if we don't have it or it's a different ID
            if (!activeResearch || activeResearch.id !== match.params.id) {
                void fetchResearch(match.params.id);
            }
        } else {
            // Reset if we leave the builder
            if (activeResearch) {
                setActiveResearch(null);
            }
        }
    }, [location.pathname]);

    // Render Research Context Sidebar
    if (activeResearch) {
        return (
            <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-full rounded-lg transition-all duration-300">
                {/* Header with Back Button */}
                <div className="p-4 border-b border-gray-100">
                    <Link
                        to="/research-in-progress"
                        className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to List
                    </Link>

                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>

                    <h2 className="font-bold text-gray-900 truncate text-lg" title={activeResearch.name}>
                        {activeResearch.name}
                    </h2>
                </div>

                {/* Research Details */}
                <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                            Research Type
                        </label>
                        <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">
                            {activeResearch.research_type_name || 'Unknown Type'}
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                            Technique
                        </label>
                        <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">
                            {activeResearch.research_technique_name || 'Unknown Technique'}
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                            Status
                        </label>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {activeResearch.status}
                        </span>
                    </div>

                    {/* Stages Section */}
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                            Stages
                        </label>
                        {activeResearch.modules && activeResearch.modules.length > 0 ? (
                            <div className="space-y-1">
                                {activeResearch.modules.map((module) => (
                                    <div
                                        key={module.id}
                                        className="flex items-center px-2 py-1.5 text-sm text-gray-600 rounded hover:bg-gray-50 transition-colors cursor-default"
                                    >
                                        <Boxes className="h-4 w-4 mr-2 text-gray-400" />
                                        <span className="truncate" title={module.name}>{module.name}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic px-2">No stages defined</p>
                        )}
                    </div>
                </div>

                {/* Settings Link at bottom */}
                <div className="p-4 border-t border-gray-100">
                    <Link
                        to="/settings"
                        className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                        <Settings className="h-5 w-5 mr-3 text-gray-400" />
                        Settings
                    </Link>
                </div>
            </div>
        );
    }

    // Render Loading State (optional, keeps sidebar present but loading)
    if (loadingResearch && matchPath('/research/:id/builder', location.pathname)) {
        return (
            <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-full rounded-lg items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    // Render Standard Navigation Sidebar
    return (
        <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-full rounded-lg">
            {/* Logo y dropdown */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex flex-col items-center justify-between gap-4">
                    <div className="flex items-center">
                        <div className="rounded-full bg-blue-500 p-2">
                            <BrainCircuit className="h-5 w-5 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    // Exact match or starts with path followed by a slash
                    const isActive = location.pathname === item.path ||
                        (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            )}
                        >
                            <Icon className={cn('h-5 w-5 mr-3', isActive ? 'text-blue-600' : 'text-gray-400')} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Settings */}
            <div className="p-4 border-t border-gray-100">
                <Link
                    to="/settings"
                    className={cn(
                        'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        location.pathname === '/settings'
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                >
                    <Settings className={cn('h-5 w-5 mr-3', location.pathname === '/settings' ? 'text-blue-600' : 'text-gray-400')} />
                    Settings
                </Link>
            </div>
        </div>
    );
};
