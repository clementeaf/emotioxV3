import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart3, Brain } from 'lucide-react';
import { SmartVOCResults } from '../../components/results/smart-voc/SmartVOCResults';

/**
 * Research Results Page
 * Hub for all results - SmartVOC and Cognitive Tasks
 */
export const ResearchResultsPage = () => {
    const { id: _id } = useParams<{ id: string }>();
    const [activeTab, setActiveTab] = useState<'smart-voc' | 'cognitive-task'>('smart-voc');

    return (
        <div className="p-6 space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('smart-voc')}
                        className={`
                            flex items-center gap-2 px-4 py-2 border-b-2 transition-colors
                            ${
                                activeTab === 'smart-voc'
                                    ? 'border-blue-600 text-blue-600 font-medium'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        <BarChart3 className="h-5 w-5" />
                        SmartVOC Results
                    </button>
                    <button
                        onClick={() => setActiveTab('cognitive-task')}
                        className={`
                            flex items-center gap-2 px-4 py-2 border-b-2 transition-colors
                            ${
                                activeTab === 'cognitive-task'
                                    ? 'border-blue-600 text-blue-600 font-medium'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        <Brain className="h-5 w-5" />
                        Cognitive Task Results
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="min-h-0 flex-1">
                {activeTab === 'smart-voc' ? (
                    <SmartVOCResults />
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
                        <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Cognitive Task Results
                        </h3>
                        <p className="text-sm text-gray-500">
                            Coming soon - Cognitive task analytics will be available here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
