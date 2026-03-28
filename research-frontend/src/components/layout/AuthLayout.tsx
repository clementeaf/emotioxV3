import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
    return (
        <div className="h-screen bg-slate-50 flex flex-col justify-center overflow-hidden px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <Outlet />
            </div>
        </div>
    );
};
