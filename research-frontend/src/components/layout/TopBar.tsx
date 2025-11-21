import { useState } from 'react';
import { 
    Search, 
    Plus, 
    CreditCard, 
    Download, 
    Bell, 
    Settings as SettingsIcon,
    Grid3x3,
    List
} from 'lucide-react';
import { Button, cn } from '../ui/Button';
import { useAuthStore } from '../../stores/auth.store';

/**
 * Barra superior con búsqueda, acciones y perfil
 */
export const TopBar = () => {
    const { user } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const getUserInitials = (): string => {
        if (!user) return 'U';
        const first = user.first_name?.[0] || '';
        const second = user.last_name?.[0] || '';
        return `${first}${second}`.toUpperCase() || 'U';
    };

    return (
        <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 rounded-lg">
            {/* Left Section */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer transition-colors">
                        <span className="text-sm font-medium text-gray-700">Atención Test</span>
                        <span className="text-xs">🦉</span>
                    </div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            'p-1.5 rounded transition-colors',
                            viewMode === 'grid' 
                                ? 'bg-blue-50 text-blue-600' 
                                : 'text-gray-400 hover:text-gray-600'
                        )}
                    >
                        <Grid3x3 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            'p-1.5 rounded transition-colors',
                            viewMode === 'list' 
                                ? 'bg-blue-50 text-blue-600' 
                                : 'text-gray-400 hover:text-gray-600'
                        )}
                    >
                        <List className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Center Section - Search */}
            <div className="flex-1 max-w-md mx-8">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar contacto"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
                    />
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
                <Button variant="primary" size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Upgrade Plan
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Add Card
                </Button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <Download className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full"></span>
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <SettingsIcon className="h-5 w-5" />
                </button>
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium cursor-pointer hover:bg-blue-600 transition-colors">
                    {getUserInitials()}
                </div>
            </div>
        </div>
    );
};

