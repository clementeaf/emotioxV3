import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart3, Brain, Eye, Filter, Zap, Download, SmilePlus, Activity, Heart } from 'lucide-react';
import { SmartVOCResults } from '../../components/results/smart-voc/SmartVOCResults';
import { CognitiveTaskResults } from '../../components/results/cognitive-task/CognitiveTaskResults';
import { ScreenerResults } from '../../components/results/screener/ScreenerResults';
import { ImplicitAssociationResults } from '../../components/results/implicit-association/ImplicitAssociationResults';
import { EyeTrackingResults } from '../../components/results/eye-tracking/EyeTrackingResults';
import { WebsiteTrackingResults } from '../../components/results/website-tracking/WebsiteTrackingResults';
import { EmotionAnalysisResults } from '../../components/results/emotion-analysis/EmotionAnalysisResults';
import { useResearch } from '../../hooks/useResearchQuery';
import { downloadResearchExport } from '../../services/export.service';
import { ExecutiveSummaryPanel } from '../../components/results/shared/ExecutiveSummaryPanel';
import { AlertsBar } from '../../components/results/shared/AlertsBar';
import { ReportGeneratorButton } from '../../components/results/shared/ReportGenerator';
import { BlockchainCertification } from '../../components/results/shared/BlockchainCertification';
import { useResultsFilter } from '../../hooks/useResultsFilter';

type TabId = 'screener' | 'smart-voc' | 'cognitive-task' | 'implicit-association' | 'eye-tracking' | 'emotion-analysis' | 'eeg' | 'wearable';

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
        label: 'Eye Tracking Results',
        icon: <Eye className="h-5 w-5" />,
        stageDetector: (name) => name.toLowerCase() === 'eye tracking',
    },
    {
        id: 'emotion-analysis',
        label: 'Emotion Analysis',
        icon: <SmilePlus className="h-5 w-5" />,
        stageDetector: (name) => name.toLowerCase().includes('emotion analysis'),
    },
    {
        id: 'eeg',
        label: 'EEG Recording',
        icon: <Activity className="h-5 w-5" />,
        stageDetector: (name) => name.toLowerCase().includes('eeg'),
    },
    {
        id: 'wearable',
        label: 'Biometric Wearable',
        icon: <Heart className="h-5 w-5" />,
        stageDetector: (name) => name.toLowerCase().includes('biometric wearable'),
    },
];

/**
 * Research Results Page
 * Hub for all results - Screener, SmartVOC, and Cognitive Tasks
 */
export const ResearchResultsPage = () => {
    const { id } = useParams<{ id: string }>();
    const { data: research } = useResearch(id || null);
    const [activeTab, setActiveTab] = useState<TabId | null>(null);
    const [tabInitialized, setTabInitialized] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Read completionMin + filtered participant IDs from shared filter hook
    const { filteredParticipantIds } = useResultsFilter(id || '');
    const filteredPidsArray = useMemo(
        () => filteredParticipantIds ? Array.from(filteredParticipantIds) : undefined,
        [filteredParticipantIds]
    );

    const handleExport = useCallback(async () => {
        if (!id || exporting) return;
        setExporting(true);
        try {
            await downloadResearchExport(id, research?.name || 'research', filteredPidsArray);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setExporting(false);
        }
    }, [id, exporting, research?.name, filteredPidsArray]);

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

    const isWebsiteTracking = research?.research_type_name === 'Website Tracking';

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

    // Website Tracking has its own results layout (no stage-based tabs)
    if (isWebsiteTracking) {
        return (
            <div className="p-6 space-y-6 h-full overflow-y-auto">
                <WebsiteTrackingResults researchId={id} />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 h-full overflow-y-auto">
            {/* Tabs + Export */}
            <div className="border-b border-gray-200 flex items-center justify-between">
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
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-gray-800 transition-colors disabled:opacity-50 mb-1"
                    >
                        <Download className="h-4 w-4" />
                        {exporting ? 'Exporting...' : 'Export XLSX'}
                    </button>
                    <ReportGeneratorButton researchId={id} filteredParticipantIds={filteredPidsArray} />
                </div>
            </div>

            {/* Alerts */}
            <AlertsBar researchId={id} />

            {/* Blockchain Certification */}
            <BlockchainCertification researchId={id} />

            {/* Executive Summary */}
            <ExecutiveSummaryPanel researchId={id} filteredParticipantIds={filteredPidsArray} />

            {/* Content */}
            <div className="min-h-0 flex-1">
                {!activeTab ? (
                    <div className="space-y-6 animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-48" />
                        <div className="h-64 bg-gray-200 rounded-xl" />
                        <div className="h-48 bg-gray-200 rounded-xl" />
                    </div>
                ) : (
                    <>
                        {activeTab === 'screener' && <ScreenerResults researchId={id} />}
                        {activeTab === 'smart-voc' && <SmartVOCResults researchId={id} />}
                        {activeTab === 'cognitive-task' && <CognitiveTaskResults researchId={id} />}
                        {activeTab === 'implicit-association' && <ImplicitAssociationResults researchId={id} />}
                        {activeTab === 'eye-tracking' && <EyeTrackingResults researchId={id} />}
                        {activeTab === 'emotion-analysis' && <EmotionAnalysisResults researchId={id} />}
                        {activeTab === 'eeg' && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                                <Activity className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">EEG recording results will appear here when participants complete sessions with connected EEG devices.</p>
                                <p className="text-xs text-gray-400 mt-2">Supports Muse 2/S, Emotiv Insight/EPOC, OpenBCI via Web Bluetooth</p>
                            </div>
                        )}
                        {activeTab === 'wearable' && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                                <Heart className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">Heart rate and HRV results will appear here when participants complete sessions with connected wearables.</p>
                                <p className="text-xs text-gray-400 mt-2">Supports any BLE heart rate monitor (Polar, Garmin, Wahoo, etc.)</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
