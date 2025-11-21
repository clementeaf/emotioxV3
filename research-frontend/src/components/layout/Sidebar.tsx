import { Link, useLocation } from 'react-router-dom';
import { 
    BrainCircuit, 
    LayoutDashboard,
    Settings,
    ChevronDown,
    FileText
} from 'lucide-react';
import { cn } from '../ui/Button';

interface NavItem {
    path: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { path: '/research', label: 'Research', icon: FileText },
];

/**
 * Sidebar de navegación principal
 * Muestra el logo, items de navegación y ajustes
 */
export const Sidebar = () => {
    const location = useLocation();

    return (
        <div className="w-38 bg-white border-r border-gray-100 flex flex-col h-screen rounded-lg">
            {/* Logo y dropdown */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="rounded-full bg-blue-500 p-2">
                            <BrainCircuit className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path || 
                                   (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

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
                    Ajustes
                </Link>
            </div>
        </div>
    );
};

