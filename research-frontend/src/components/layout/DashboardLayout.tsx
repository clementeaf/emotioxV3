import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

/**
 * Main dashboard layout
 * Includes Sidebar and main content area
 */
export const DashboardLayout = () => {
    return (
        <div className="bg-slate-100 flex p-4 gap-4 h-screen w-screen">
            {/* Sidebar */}
            <Sidebar />

                {/* Main Content */}
                <main className="rounded-lg bg-white w-full h-full">
                        <Outlet />
                </main>
        </div>
    );
};
