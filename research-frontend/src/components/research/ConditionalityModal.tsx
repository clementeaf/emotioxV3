import { Modal } from '../ui/Modal';

interface ConditionalityModalProps {
    isOpen: boolean;
    onClose: () => void;
    moduleName: string;
}

/**
 * Modal for configuring conditionality rules on a question/section.
 * Pure UI — no functional logic yet.
 */
export const ConditionalityModal = ({
    isOpen,
    onClose,
    moduleName,
}: ConditionalityModalProps) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Show conditionality"
            size="md"
            footer={
                <button
                    type="button"
                    className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                >
                    Save configuration
                </button>
            }
        >
            <div className="space-y-5">
                {/* Question header */}
                <div>
                    <h3 className="text-base font-semibold text-gray-900">{moduleName}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Please, select the configuration for this question
                    </p>
                </div>

                {/* Condition row: Show / this section if */}
                <div className="flex items-center gap-3">
                    <select
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        defaultValue="show"
                    >
                        <option value="show">Show</option>
                    </select>
                    <span className="text-sm text-gray-700">this section if</span>
                </div>

                {/* Question selector */}
                <div>
                    <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        defaultValue=""
                    >
                        <option value="" disabled>Select a question</option>
                        <option value="placeholder">3.3.- Question &nbsp; Ask something</option>
                    </select>
                </div>

                {/* Answer selector */}
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 shrink-0">answer is</span>
                    <select
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        defaultValue=""
                    >
                        <option value="" disabled>Select an option</option>
                        <option value="placeholder">Option 2</option>
                    </select>
                </div>

                {/* Warning banner */}
                <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-semibold text-gray-900">
                        The target you&apos;re using for this condition is optional.
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                        If participants don&apos;t answer that question this condition won&apos;t be
                        triggered, you may want to make it required.
                    </p>
                </div>
            </div>
        </Modal>
    );
};
