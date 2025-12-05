import { Card } from '../../ui/Card';
import { Filters } from '../smart-voc/components/Filters';
import { VOCComments } from '../smart-voc/components/VOCComments';
import { ChoiceQuestionCard } from './components/ChoiceQuestionCard';
import { LinearScaleQuestionCard } from './components/LinearScaleQuestionCard';
import { cn } from '../../../lib/utils';

interface CognitiveTaskResultsProps {
  researchId: string;
  className?: string;
}

export const CognitiveTaskResults = ({ researchId, className }: CognitiveTaskResultsProps) => {
  return (
    <div className={cn('max-h-[calc(100vh-9rem)] overflow-y-auto', className)}>
      {/* Main Content + Sidebar */}
      <div className="flex gap-6">
        {/* Left: Main Content */}
        <div className="flex-1 space-y-6">
          {/* Cognitive Task Header */}
          <Card className="p-4 bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900">2.0.- Cognitive task</h2>
          </Card>

          {/* Question 3.1 - Short Text (VOC style) */}
          <VOCComments
            questionNumber="3.1"
            questionText="Question"
            comments={[
              { text: 'Camera lens working memory in...', mood: 'Positive' },
              { text: 'Laptop, Camera lens memory in...', mood: 'Positive' },
              { text: 'Mobile', mood: 'Positive' },
              { text: 'Camera lens', mood: 'Positive' },
              { text: 'Computer accessories', mood: 'Positive' },
              { text: 'TV, Camera lens working memory in...', mood: 'Positive' },
              { text: 'Mobile, lens working memory in...', mood: 'Positive' },
              { text: 'Laptop', mood: 'green' },
              { text: 'Camera lens working memory in...', mood: 'green' },
              { text: 'Camera lens working memory in...', mood: 'green' }
            ]}
          />

          {/* Question 3.2 - Another Short Text */}
          <VOCComments
            questionNumber="3.2"
            questionText="Question"
            comments={[
              { text: 'Camera lens working memory in...', mood: 'Positive' },
              { text: 'Laptop, Camera lens memory in...', mood: 'Positive' },
              { text: 'Mobile', mood: 'Positive' },
              { text: 'Camera lens', mood: 'Positive' },
              { text: 'Computer accessories', mood: 'Positive' },
              { text: 'TV, Camera lens working memory in...', mood: 'Positive' },
              { text: 'Mobile, lens working memory in...', mood: 'Positive' },
              { text: 'Laptop', mood: 'green' },
              { text: 'Camera lens working memory in...', mood: 'green' },
              { text: 'Camera lens working memory in...', mood: 'green' }
            ]}
          />

          {/* Question 3.3 - Single Choice */}
          <ChoiceQuestionCard
            questionNumber="3.3"
            questionText="Question"
            questionType="Single Choice question"
            conditionalityDisabled={true}
            totalResponses={28635}
            options={[
              { id: '1', text: 'Answer 01', percentage: 70, color: '#6366F1' },
              { id: '2', text: 'Answer 02', percentage: 10, color: '#6366F1' },
              { id: '3', text: 'Answer 03', percentage: 20, color: '#6366F1' }
            ]}
          />

          {/* Question 3.4 - Multiple Choice */}
          <ChoiceQuestionCard
            questionNumber="3.4"
            questionText="Question"
            questionType="Multiple Choice question"
            conditionalityDisabled={true}
            required={true}
            totalResponses={28635}
            options={[
              { id: '1', text: 'Answer 01', percentage: 70, color: '#6366F1' },
              { id: '2', text: 'Answer 02', percentage: 10, color: '#6366F1' },
              { id: '3', text: 'Answer 03', percentage: 20, color: '#6366F1' }
            ]}
          />

          {/* Question 3.5 - Linear Scale */}
          <LinearScaleQuestionCard
            questionNumber="3.5"
            questionText="Question"
            questionType="Linear Scale question"
            conditionalityDisabled={true}
            required={true}
            totalResponses={28635}
            options={[
              { value: 1, percentage: 70, color: '#EF4444' },
              { value: 2, percentage: 10, color: '#9CA3AF' },
              { value: 3, percentage: 20, color: '#9CA3AF' },
              { value: 4, percentage: 20, color: '#10B981' },
              { value: 5, percentage: 20, color: '#10B981' }
            ]}
          />
        </div>

        {/* Right: Filters Sidebar */}
        <div className="w-80 shrink-0">
          <Filters researchId={researchId} />
        </div>
      </div>
    </div>
  );
};
