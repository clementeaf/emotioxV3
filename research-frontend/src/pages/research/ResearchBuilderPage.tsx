import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { researchService, type Research } from '../../services/research.service';
import { Button } from '../../components/ui/Button';

export const ResearchBuilderPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [research, setResearch] = useState<Research | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchResearch = async () => {
            if (!id) {
                setError('No research ID provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const response = await researchService.getById(id);
                setResearch(response.research);
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load research';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        void fetchResearch();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                    <p className="mt-4 text-gray-600">Loading research...</p>
                </div>
            </div>
        );
    }

    if (error || !research) {
        return (
            <div className="max-w-2xl mx-auto mt-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Research</h2>
                    <p className="text-red-600 mb-4">{error || 'Research not found'}</p>
                    <Button onClick={() => navigate('/research')} variant="outline">
                        Back to Research List
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{research.name}</h1>
                        <p className="mt-2 text-sm text-gray-500">
                            Created on {new Date(research.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => navigate('/research')}>
                            Back to List
                        </Button>
                        <Button>Save Changes</Button>
                    </div>
                </div>

                {/* Status Badge */}
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    Status: {research.status}
                </div>
            </div>

            {/* Research Info Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Research Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Research ID</label>
                        <p className="text-sm text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded border border-gray-200">
                            {research.id}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Research Type</label>
                        <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                            {research.research_type_name || research.research_type_id}
                        </p>
                    </div>
                    {research.description && (
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                                {research.description}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Builder Section - Placeholder for future implementation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Research Builder</h2>
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                    <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Build Your Research</h3>
                    <p className="mt-2 text-sm text-gray-500">
                        Add modules, configure stages, and customize your research workflow.
                    </p>
                    <div className="mt-6">
                        <Button>Add Module</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
