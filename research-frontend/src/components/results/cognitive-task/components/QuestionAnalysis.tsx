import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ProcessedQuestionData } from '../../../../services/cognitiveTask.service';

interface QuestionAnalysisProps {
    processedData: ProcessedQuestionData[];
}

export const QuestionAnalysis = ({ processedData }: QuestionAnalysisProps) => {
    const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

    const toggleQuestion = (questionId: string) => {
        setExpandedQuestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(questionId)) {
                newSet.delete(questionId);
            } else {
                newSet.add(questionId);
            }
            return newSet;
        });
    };

    if (processedData.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
                <p className="text-sm text-gray-500">No questions analyzed yet</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Question Analysis</h2>
            <div className="space-y-3">
                {processedData.map((question) => {
                    const isExpanded = expandedQuestions.has(question.questionId);
                    return (
                        <div key={question.questionId} className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* Question Header */}
                            <button
                                onClick={() => toggleQuestion(question.questionId)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-start gap-3 flex-1 text-left">
                                    <div className="mt-1">
                                        {isExpanded ? (
                                            <ChevronDown className="h-5 w-5 text-gray-400" />
                                        ) : (
                                            <ChevronRight className="h-5 w-5 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{question.questionText}</p>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-xs text-gray-500">Type: {question.questionType}</span>
                                            <span className="text-xs text-gray-500">
                                                Responses: {question.totalResponses}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </button>

                            {/* Question Data */}
                            {isExpanded && (
                                <div className="border-t border-gray-200 p-4 bg-gray-50">
                                    <pre className="text-xs text-gray-700 overflow-x-auto">
                                        {JSON.stringify(question.data, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
