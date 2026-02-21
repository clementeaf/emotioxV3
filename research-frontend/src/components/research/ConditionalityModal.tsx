import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { CustomSelect } from '../ui/CustomSelect';
import type { EnabledDemographic } from '../../pages/research/ResearchBuilderPage';

interface ConditionalityModalProps {
    isOpen: boolean;
    onClose: () => void;
    moduleName: string;
    demographics: EnabledDemographic[];
}

/**
 * Modal for configuring conditionality rules on a question/section.
 * Populates selects from enabled demographics in Research Configuration.
 */
export const ConditionalityModal = ({
    isOpen,
    onClose,
    moduleName,
    demographics,
}: ConditionalityModalProps) => {
    const [selectedQuestion, setSelectedQuestion] = useState('');
    const [selectedOption, setSelectedOption] = useState('');

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedQuestion(demographics.length === 1 ? demographics[0].key : '');
            setSelectedOption('');
        }
    }, [isOpen, demographics]);

    const selectedDemographic = useMemo(
        () => demographics.find(d => d.key === selectedQuestion),
        [demographics, selectedQuestion]
    );

    const questionOptions = useMemo(
        () => demographics.map(d => ({ value: d.key, label: d.label })),
        [demographics]
    );

    const answerOptions = useMemo(
        () => selectedDemographic?.validValues.map(val => ({ value: val, label: val })) || [],
        [selectedDemographic]
    );

    const handleQuestionChange = (key: string) => {
        setSelectedQuestion(key);
        setSelectedOption('');
    };

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
                    <CustomSelect
                        options={[{ value: 'show', label: 'Show' }]}
                        value="show"
                        className="w-auto"
                    />
                    <span className="text-sm text-gray-700">this section if</span>
                </div>

                {/* Question selector */}
                <CustomSelect
                    options={questionOptions}
                    value={selectedQuestion}
                    onChange={handleQuestionChange}
                    placeholder="Select a question"
                />

                {/* Answer selector */}
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 shrink-0">answer is</span>
                    <CustomSelect
                        options={answerOptions}
                        value={selectedOption}
                        onChange={setSelectedOption}
                        placeholder="Select an option"
                        disabled={!selectedDemographic}
                    />
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
