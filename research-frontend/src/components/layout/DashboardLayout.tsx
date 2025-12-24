import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

/**
 * Main dashboard layout
 * Includes Sidebar and main content area
 */
export const DashboardLayout = () => {
    return (
        <div className="bg-slate-100 flex p-4 gap-4 h-screen w-screen overflow-hidden">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <main className="rounded-lg bg-white w-full h-full overflow-hidden flex flex-col">
                <div className="h-full overflow-y-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
