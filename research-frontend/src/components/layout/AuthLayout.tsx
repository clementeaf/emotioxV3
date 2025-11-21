import { Outlet } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';

export const AuthLayout = () => {
    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="rounded-full bg-blue-50 p-3">
                        <BrainCircuit className="h-10 w-10 text-blue-500" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-semibold tracking-tight text-gray-800">
                    Emotiox V3
                </h2>
                <p className="mt-2 text-center text-sm text-gray-500">
                    Research Administration Platform
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <Outlet />
            </div>
        </div>
    );
};
