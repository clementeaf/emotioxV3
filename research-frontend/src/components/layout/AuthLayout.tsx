import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
    return (
        <div className="h-screen bg-[#f4f5f7] flex items-center justify-center overflow-hidden px-4">
            <div className="w-full max-w-[400px]">
                <Outlet />
            </div>
        </div>
    );
};
