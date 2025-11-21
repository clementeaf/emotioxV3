import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/**
 * Layout principal del dashboard
 * Incluye Sidebar, TopBar y área de contenido principal
 */
export const DashboardLayout = () => {
    return (
        <div className="bg-slate-100 flex p-4 gap-4 h-screen w-screen">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex flex-col gap-4 w-full">
                {/* Top Bar */}
                <TopBar />

                {/* Main Content */}
                <main className="rounded-lg bg-white w-full h-full">
                        <Outlet />
                </main>
            </div>
        </div>
    );
};
