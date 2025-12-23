import { useParams } from 'react-router-dom';
import { ResearchInProgressContent } from '../../components/research/ResearchInProgress/ResearchInProgressContent';

/**
 * Research Progress Page
 * Shows real-time monitoring and progress statistics for a research
 */
export const ResearchProgressPage = () => {
    const { id } = useParams<{ id: string }>();

    if (!id) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center">
                    <p className="text-lg font-medium text-gray-900 mb-2">Research ID not found</p>
                    <p className="text-sm text-gray-500">Unable to load progress without a research ID.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            <ResearchInProgressContent researchId={id} />
        </div>
    );
};
