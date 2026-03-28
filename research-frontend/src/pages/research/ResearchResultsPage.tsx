import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart3, Brain, Eye, Filter, Zap } from 'lucide-react';
import { SmartVOCResults } from '../../components/results/smart-voc/SmartVOCResults';
import { CognitiveTaskResults } from '../../components/results/cognitive-task/CognitiveTaskResults';
import { ScreenerResults } from '../../components/results/screener/ScreenerResults';
import { ImplicitAssociationResults } from '../../components/results/implicit-association/ImplicitAssociationResults';
import { EyeTrackingResults } from '../../components/results/eye-tracking/EyeTrackingResults';
import { useResearch } from '../../hooks/useResearchQuery';

type TabId = 'screener' | 'smart-voc' | 'cognitive-task' | 'implicit-association' | 'eye-tracking';

interface TabDef {
    id: TabId;
    label: string;
    icon: React.ReactNode;
    stageDetector: (name: string) => boolean;
}

const TAB_DEFS: TabDef[] = [
    {
        id: 'screener',
        label: 'Screener',
        icon: <Filter className="h-5 w-5" />,
        stageDetector: (name) => name.toLowerCase() === 'screener',
    },
    {
        id: 'smart-voc',
        label: 'SmartVOC Results',
        icon: <BarChart3 className="h-5 w-5" />,
        stageDetector: (name) => {
            const lower = name.toLowerCase();
            return lower.includes('smart voc') || lower === 'smart voc';
        },
    },
    {
        id: 'cognitive-task',
        label: 'Cognitive Task Results',
        icon: <Brain className="h-5 w-5" />,
        stageDetector: (name) => {
            const lower = name.toLowerCase();
            return lower.includes('cognitive task') || lower === 'cognitive tasks';
        },
    },
    {
        id: 'implicit-association',
        label: 'Implicit Association',
        icon: <Zap className="h-5 w-5" />,
        stageDetector: (name) => name.toLowerCase() === 'implicit association',
    },
    {
        id: 'eye-tracking',
        label: 'Eye Tracking',
        icon: <Eye className="h-5 w-5" />,
        stageDetector: (name) => name.toLowerCase() === 'eye tracking',
    },
];

/**
 * Research Results Page
 * Hub for all results - Screener, SmartVOC, and Cognitive Tasks
 */
export const ResearchResultsPage = () => {
    const { id } = useParams<{ id: string }>();
    const { data: research } = useResearch(id || null);
    const [activeTab, setActiveTab] = useState<TabId>('smart-voc');
    const [tabInitialized, setTabInitialized] = useState(false);

    useEffect(() => {
        if (!research || tabInitialized) return;

        const stageNames = (research.stages ?? []).map((s: { name: string }) => s.name);

        // Pick the first available tab that has a matching stage
        const firstAvailable = TAB_DEFS.find(tab =>
            stageNames.some(name => tab.stageDetector(name))
        );
        if (firstAvailable) {
            setActiveTab(firstAvailable.id);
        }
        setTabInitialized(true);
    }, [research, tabInitialized]);

    // Compute which tabs are visible based on stages present
    const visibleTabs = TAB_DEFS.filter(tab => {
        if (!research?.stages) return true; // Show all while loading
        return research.stages.some((s: { name: string }) => tab.stageDetector(s.name));
    });

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
                    {visibleTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2 border-b-2 transition-colors
                                ${
                                    activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600 font-medium'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                            `}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="min-h-0 flex-1">
                {activeTab === 'screener' && <ScreenerResults researchId={id} />}
                {activeTab === 'smart-voc' && <SmartVOCResults researchId={id} />}
                {activeTab === 'cognitive-task' && <CognitiveTaskResults researchId={id} />}
                {activeTab === 'implicit-association' && <ImplicitAssociationResults researchId={id} />}
                {activeTab === 'eye-tracking' && <EyeTrackingResults researchId={id} />}
            </div>
        </div>
    );
};
