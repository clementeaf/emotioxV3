import { Link, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
    BrainCircuit,
    LayoutDashboard,
    Boxes,
    Wrench,
    LogOut,
    ChevronLeft,
    ChevronRight
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
    
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        return saved ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
    }, [isCollapsed]);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            toast.error('Error al cerrar sesión');
        }
    };

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div className={cn(
            "bg-white border-r border-gray-100 flex flex-col h-full rounded-lg flex-shrink-0 overflow-hidden transition-all duration-300",
            isCollapsed ? "w-16" : "w-64"
        )}>
            {/* Logo */}
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-center">
                    <div className="rounded-full bg-blue-500 p-2">
                        <BrainCircuit className="h-5 w-5 text-white" />
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
                                'flex items-center rounded-lg text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                                isCollapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'
                            )}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <Icon className={cn(
                                'h-5 w-5',
                                isActive ? 'text-blue-600' : 'text-gray-400',
                                !isCollapsed && 'mr-3'
                            )} />
                            {!isCollapsed && item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-gray-100 space-y-2 flex-shrink-0">
                <button
                    onClick={handleLogout}
                    className={cn(
                        'w-full flex items-center rounded-lg text-sm font-medium transition-colors',
                        'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        isCollapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'
                    )}
                    title={isCollapsed ? "Logout" : undefined}
                >
                    <LogOut className={cn(
                        'h-5 w-5 text-gray-400',
                        !isCollapsed && 'mr-3'
                    )} />
                    {!isCollapsed && "Logout"}
                </button>
                
                {/* Toggle Button */}
                <button
                    onClick={toggleCollapse}
                    className={cn(
                        "w-full flex items-center rounded-lg text-sm font-medium transition-colors",
                        "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        "px-2 py-2.5 justify-center"
                    )}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    ) : (
                        <ChevronLeft className="h-5 w-5 text-gray-400" />
                    )}
                </button>
            </div>
        </div>
    );
};

