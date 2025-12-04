import React from 'react';
import { useStepNavigation } from '../../stores/useStepNavigation';

interface DevSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

export const DevSidebar: React.FC<DevSidebarProps> = ({ isOpen, onToggle }) => {
    const { currentStep, setCurrentStep } = useStepNavigation();

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className="fixed top-4 left-4 z-50 bg-blue-600 text-white p-2 rounded-lg shadow-lg hover:bg-blue-700 transition-all"
                aria-label="Toggle sidebar"
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    {isOpen ? (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    ) : (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    )}
                </svg>
            </button>

            {/* Sidebar */}
            <div
                className={`fixed top-0 left-0 h-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] border-r border-gray-200 transition-transform duration-300 z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                style={{ width: '280px' }}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Dev Navigation
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Development mode only
                        </p>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <nav className="space-y-1">
                            <button
                                onClick={() => {
                                    setCurrentStep('welcome');
                                    onToggle();
                                }}
                                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center gap-3 ${currentStep === 'welcome'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                                    }`}
                            >
                                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${currentStep === 'welcome' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    1
                                </span>
                                <span>Welcome</span>
                            </button>

                            <button
                                onClick={() => {
                                    setCurrentStep('thank-you');
                                    onToggle();
                                }}
                                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center gap-3 ${currentStep === 'thank-you'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                                    }`}
                            >
                                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${currentStep === 'thank-you' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    2
                                </span>
                                <span>Thank You</span>
                            </button>
                        </nav>
                    </div>
                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200">
                        <div className="text-xs text-gray-400 text-center">
                            DEV MODE
                        </div>
                    </div>
                </div>
            </div>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-20 z-30 transition-opacity"
                    onClick={onToggle}
                />
            )}
        </>
    );
};
