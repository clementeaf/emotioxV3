import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart3, Brain } from 'lucide-react';
import { SmartVOCResults } from '../../components/results/smart-voc/SmartVOCResults';
import { CognitiveTaskResults } from '../../components/results/cognitive-task/CognitiveTaskResults';
import { useResearch } from '../../hooks/useResearchQuery';

/**
 * Research Results Page
 * Hub for all results - SmartVOC and Cognitive Tasks
 */
export const ResearchResultsPage = () => {
    const { id } = useParams<{ id: string }>();
    const { data: research } = useResearch(id || null);
    const [activeTab, setActiveTab] = useState<'smart-voc' | 'cognitive-task'>('smart-voc');
    const [tabInitialized, setTabInitialized] = useState(false);

    useEffect(() => {
        if (!research || tabInitialized) return;
        const hasSmartVOC = research.stages?.some((s: { name: string }) =>
            s.name.toLowerCase().includes('smart voc') || s.name.toLowerCase() === 'smart voc'
        );
        if (!hasSmartVOC) {
            setActiveTab('cognitive-task');
        }
        setTabInitialized(true);
    }, [research, tabInitialized]);

    if (!id) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center">
                    <p className="text-lg font-medium text-gray-900 mb-2">Research ID not found</p>
                    <p className="text-sm text-gray-500">Unable to load results without a research ID.</p>
                </div>
            </div>
        );
    }

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
                    <SmartVOCResults researchId={id} />
                ) : (
                    <CognitiveTaskResults researchId={id} />
                )}
            </div>
        </div>
    );
};
