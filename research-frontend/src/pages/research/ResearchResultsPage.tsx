import { BarChart3, Users, Clock, TrendingUp } from 'lucide-react';

/**
 * Research Results Page
 * Displays results and analytics for a research project
 */
export const ResearchResultsPage = () => {
    return (
        <div className="p-6 space-y-6">
            {/* Page Header */}
            <div className="border-b border-gray-200 pb-4">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                    Research Results
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    View and analyze research data and participant responses
                </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Total Participants</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                        </div>
                        <div className="bg-blue-50 rounded-full p-3">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Completion Rate</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">0%</p>
                        </div>
                        <div className="bg-green-50 rounded-full p-3">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Avg. Duration</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">--</p>
                        </div>
                        <div className="bg-purple-50 rounded-full p-3">
                            <Clock className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Content */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
                <div className="text-center py-12">
                    <div className="bg-gray-50 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                        <BarChart3 className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Results Available Yet
                    </h3>
                    <p className="text-sm text-gray-500">
                        Results will appear here once participants start completing your research.
                    </p>
                </div>
            </div>
        </div>
    );
};
