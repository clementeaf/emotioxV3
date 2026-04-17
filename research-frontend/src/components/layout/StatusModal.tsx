import { Modal } from '../ui/Modal';

interface StatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentStatus: string | undefined;
    isUpdatingStatus: boolean;
    onChangeStatus: (newStatus: string) => void;
}

export const StatusModal = ({
    isOpen,
    onClose,
    currentStatus,
    isUpdatingStatus,
    onChangeStatus,
}: StatusModalProps) => {
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
                            Return to draft to edit configuration, participation mode, and modules.
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
                            Make available for participants.
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
                            Close the research. No new responses will be accepted.
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
