import { useState } from 'react';

/**
 * Main Research page
 * Contains two tabs: create research type and create research
 */
export const ResearchPage = () => {
    const [activeTab, setActiveTab] = useState<'type' | 'research'>('type');

    return (
        <div className="h-full p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-800">Research</h1>
                <p className="mt-1 text-sm text-gray-500">Manage research types and create new researches</p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => setActiveTab('type')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'type'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Create Research Type
                        </button>
                        <button
                            onClick={() => setActiveTab('research')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'research'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Create Research
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'type' && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 mb-2">Create Research Type</h2>
                            <p className="text-gray-600">Form to create a new research type will appear here</p>
                        </div>
                    )}

                    {activeTab === 'research' && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 mb-2">Create Research</h2>
                            <p className="text-gray-600">Form to create a new research will appear here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

