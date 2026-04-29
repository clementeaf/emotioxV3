import { Modal } from '../ui/Modal';

interface StatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentStatus: string | undefined;
    isUpdatingStatus: boolean;
    onChangeStatus: (newStatus: string) => void;
    researchTypeName?: string;
}

const getStatusDescriptions = (typeName?: string) => {
    const lower = (typeName || '').toLowerCase();

    if (lower.includes('website tracking')) {
        return {
            draft: 'Return to draft to edit tracking configuration. The script will stop recording new sessions.',
            active: 'Start recording. The tracking script will capture visitor interactions.',
            completed: 'Stop tracking. No new sessions will be recorded.',
        };
    }
    if (lower.includes('attention prediction')) {
        return {
            draft: 'Return to draft to upload or change stimuli.',
            active: 'Make the prediction analysis available.',
            completed: 'Close the analysis. No further changes.',
        };
    }
    if (lower.includes('insights finding')) {
        return {
            draft: 'Return to draft to upload or change documents.',
            active: 'Make the analysis available.',
            completed: 'Close the analysis. No further changes.',
        };
    }
    // Default: survey-oriented
    return {
        draft: 'Return to draft to edit configuration, participation mode, and modules.',
        active: 'Make available for participants.',
        completed: 'Close the research. No new responses will be accepted.',
    };
};

export const StatusModal = ({
    isOpen,
    onClose,
    currentStatus,
    isUpdatingStatus,
    onChangeStatus,
    researchTypeName,
}: StatusModalProps) => {
    const descriptions = getStatusDescriptions(researchTypeName);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Change Research Status"
            size="md"
        >
            <div className="space-y-3 py-4">
                <p className="text-sm text-gray-600 mb-4">
                    Current status: <span className="font-medium capitalize">{currentStatus}</span>
                </p>
                {currentStatus !== 'draft' && (
                    <button
                        type="button"
                        onClick={() => void onChangeStatus('draft')}
                        disabled={isUpdatingStatus}
                        className="w-full text-left p-3 rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="font-medium text-gray-900">Draft</div>
                        <p className="text-xs text-gray-500 mt-1">
                            {descriptions.draft}
                        </p>
                    </button>
                )}
                {currentStatus !== 'active' && (
                    <button
                        type="button"
                        onClick={() => void onChangeStatus('active')}
                        disabled={isUpdatingStatus}
                        className="w-full text-left p-3 rounded-lg border-2 border-blue-200 hover:border-blue-400 bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="font-medium text-blue-900">Active</div>
                        <p className="text-xs text-blue-700 mt-1">
                            {descriptions.active}
                        </p>
                    </button>
                )}
                {currentStatus !== 'completed' && (
                    <button
                        type="button"
                        onClick={() => void onChangeStatus('completed')}
                        disabled={isUpdatingStatus}
                        className="w-full text-left p-3 rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="font-medium text-green-900">Completed</div>
                        <p className="text-xs text-green-700 mt-1">
                            {descriptions.completed}
                        </p>
                    </button>
                )}
                {isUpdatingStatus && (
                    <p className="text-sm text-gray-500 text-center">Updating status...</p>
                )}
            </div>
        </Modal>
    );
};
