import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/**
 * Layout principal del dashboard
 * Incluye Sidebar, TopBar y área de contenido principal
 */
export const DashboardLayout = () => {
    return (
        <div className="h-full bg-slate-100 flex p-4 gap-4">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden gap-4">
                {/* Top Bar */}
                <TopBar />

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto rounded-lg bg-white">
                    <div className="h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
