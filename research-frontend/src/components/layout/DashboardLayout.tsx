import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';

/**
 * Main dashboard layout
 * Includes Sidebar and main content area
 */
export const DashboardLayout = () => {
    const location = useLocation();
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        setVisible(false);
        const id = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(id);
    }, [location.pathname]);

    return (
        <div className="bg-slate-100 flex p-4 gap-4 h-screen w-screen overflow-hidden">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <main
                className="rounded-lg bg-white w-full h-full overflow-hidden flex flex-col transition-opacity duration-200 ease-in-out"
                style={{ opacity: visible ? 1 : 0 }}
            >
                <Outlet />
            </main>
        </div>
    );
};
