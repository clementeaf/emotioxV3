import { Link, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import {
    BrainCircuit,
    LayoutDashboard,
    Boxes,
    Wrench,
    ClipboardList,
    LogOut
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../../hooks/useToast';
import { useAuthStore } from '../../stores/auth.store';

interface NavItem {
    path: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { path: '/research', label: 'Research', icon: Boxes },
    { path: '/research-types', label: 'Research Type Builder', icon: Wrench },
    { path: '/modules', label: 'Modules', icon: Boxes },
    { path: '/research-in-progress', label: "Research's in Progress", icon: ClipboardList },
];

/**
 * Standard navigation sidebar
 * Displays logo, navigation items and logout
 */
export const StandardSidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const toast = useToast();
    const logout = useAuthStore((state) => state.logout);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            toast.error('Error al cerrar sesión');
        }
    };

    return (
        <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-full rounded-lg flex-shrink-0 overflow-hidden">
            {/* Logo */}
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex flex-col items-center justify-between gap-4">
                    <div className="flex items-center">
                        <div className="rounded-full bg-blue-500 p-2">
                            <BrainCircuit className="h-5 w-5 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto min-h-0">
                {navItems.map((item) => {
                    const Icon = item.icon;
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

            {/* Logout */}
            <div className="p-4 border-t border-gray-100 space-y-2 flex-shrink-0">
                <button
                    onClick={handleLogout}
                    className={cn(
                        'w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                >
                    <LogOut className="h-5 w-5 mr-3 text-gray-400" />
                    Logout
                </button>
            </div>
        </div>
    );
};

