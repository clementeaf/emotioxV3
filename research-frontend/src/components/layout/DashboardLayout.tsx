import { Outlet, Link, useNavigate } from 'react-router-dom';
import { BrainCircuit, LogOut, User, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../ui/Button';

export const DashboardLayout = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-100">
            <nav className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <div className="rounded-full bg-blue-50 p-2">
                                    <BrainCircuit className="h-6 w-6 text-blue-500" />
                                </div>
                                <span className="ml-2 text-xl font-semibold text-gray-800">Emotiox V3</span>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <Link
                                    to="/dashboard"
                                    className="border-transparent text-gray-600 hover:text-gray-800 hover:border-blue-400 border-b-2 inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors"
                                >
                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                    Dashboard
                                </Link>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <div className="flex-shrink-0 flex items-center gap-2">
                                <Link to="/profile">
                                    <Button variant="ghost" size="sm" className="text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                                        <User className="mr-2 h-4 w-4" />
                                        {user?.first_name} {user?.last_name}
                                    </Button>
                                </Link>
                                <Button variant="outline" size="sm" onClick={handleLogout} className="border-gray-200 hover:border-gray-300">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sign out
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="py-10">
                <main>
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
