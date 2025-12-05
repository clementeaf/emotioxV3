import { Card } from '../../ui/Card';
import { Filters } from '../smart-voc/components/Filters';
import { VOCComments } from '../smart-voc/components/VOCComments';
import { ChoiceQuestionCard } from './components/ChoiceQuestionCard';
import { LinearScaleQuestionCard } from './components/LinearScaleQuestionCard';
import { RankingQuestionCard } from './components/RankingQuestionCard';
import { NavigationTestCard } from './components/NavigationTestCard';
import { PreferenceTestCard } from './components/PreferenceTestCard';
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

          {/* Question 3.6 - Ranking */}
          <RankingQuestionCard
            questionNumber="3.6"
            questionText="Question"
            questionType="Ranking question"
            conditionalityDisabled={true}
            required={true}
            totalResponses={28635}
            options={[
              {
                id: '1',
                label: 'Option 2',
                mean: 2.4,
                segments: [
                  { position: 1, percentage: 20, color: '#A5B4FC' },
                  { position: 2, percentage: 35, color: '#818CF8' },
                  { position: 3, percentage: 15, color: '#6366F1' },
                  { position: 4, percentage: 10, color: '#4F46E5' },
                  { position: 5, percentage: 12, color: '#4338CA' },
                  { position: 6, percentage: 8, color: '#3730A3' }
                ]
              },
              {
                id: '2',
                label: 'Option 5',
                mean: 2.8,
                segments: [
                  { position: 1, percentage: 18, color: '#A5B4FC' },
                  { position: 2, percentage: 25, color: '#818CF8' },
                  { position: 3, percentage: 22, color: '#6366F1' },
                  { position: 4, percentage: 15, color: '#4F46E5' },
                  { position: 5, percentage: 12, color: '#4338CA' },
                  { position: 6, percentage: 8, color: '#3730A3' }
                ]
              },
              {
                id: '3',
                label: 'Option 3',
                mean: 3.1,
                segments: [
                  { position: 1, percentage: 15, color: '#A5B4FC' },
                  { position: 2, percentage: 20, color: '#818CF8' },
                  { position: 3, percentage: 25, color: '#6366F1' },
                  { position: 4, percentage: 18, color: '#4F46E5' },
                  { position: 5, percentage: 14, color: '#4338CA' },
                  { position: 6, percentage: 8, color: '#3730A3' }
                ]
              },
              {
                id: '4',
                label: 'Option 4',
                mean: 3.4,
                segments: [
                  { position: 1, percentage: 12, color: '#A5B4FC' },
                  { position: 2, percentage: 18, color: '#818CF8' },
                  { position: 3, percentage: 15, color: '#6366F1' },
                  { position: 4, percentage: 25, color: '#4F46E5' },
                  { position: 5, percentage: 20, color: '#4338CA' },
                  { position: 6, percentage: 10, color: '#3730A3' }
                ]
              },
              {
                id: '5',
                label: 'Option 6',
                mean: 3.7,
                segments: [
                  { position: 1, percentage: 10, color: '#A5B4FC' },
                  { position: 2, percentage: 12, color: '#818CF8' },
                  { position: 3, percentage: 15, color: '#6366F1' },
                  { position: 4, percentage: 18, color: '#4F46E5' },
                  { position: 5, percentage: 28, color: '#4338CA' },
                  { position: 6, percentage: 17, color: '#3730A3' }
                ]
              },
              {
                id: '6',
                label: 'Option 1',
                mean: 3.8,
                segments: [
                  { position: 1, percentage: 8, color: '#A5B4FC' },
                  { position: 2, percentage: 10, color: '#818CF8' },
                  { position: 3, percentage: 12, color: '#6366F1' },
                  { position: 4, percentage: 15, color: '#4F46E5' },
                  { position: 5, percentage: 25, color: '#4338CA' },
                  { position: 6, percentage: 30, color: '#3730A3' }
                ]
              }
            ]}
          />

          {/* Question 3.7 - Navigation Test */}
          <NavigationTestCard
            questionNumber="3.7"
            questionText="Navigation Test"
            questionType="Navigation Test"
            conditionalityDisabled={true}
            required={true}
            steps={[
              {
                stepNumber: 1,
                title: 'Step 1 and task description',
                duration: '2s',
                completionRate: 100,
                participantCount: 3,
                hasHeatmap: true,
                aois: [
                  { id: '1', label: 'Area of Interest (AOI)', percentage: 14 },
                  { id: '2', label: 'Area of Interest (AOI)', percentage: 14 },
                  { id: '3', label: 'Area of Interest (AOI)', percentage: 14 },
                  { id: '4', label: 'Area of Interest (AOI)', percentage: 14 }
                ]
              },
              {
                stepNumber: 2,
                title: 'Step 2 and task description',
                duration: '55s',
                completionRate: 100,
                participantCount: 3,
                hasHeatmap: false
              },
              {
                stepNumber: 3,
                title: 'Step 3 and task description',
                duration: '70s',
                completionRate: 100,
                participantCount: 4,
                hasHeatmap: false
              }
            ]}
          />

          {/* Question 3.8 - Preference Test */}
          <PreferenceTestCard
            questionNumber="3.8"
            questionText="Preference Test"
            questionType="Preference Test"
            conditionalityDisabled={true}
            required={true}
            steps={[
              {
                stepNumber: 1,
                duration: '10s',
                completionRate: 100,
                participantCount: 5,
                selectionCount: 17,
                progressColor: '#9333EA'
              },
              {
                stepNumber: 2,
                duration: '54s',
                completionRate: 100,
                participantCount: 5,
                selectionCount: 0,
                progressColor: '#9333EA'
              },
              {
                stepNumber: 3,
                duration: '70s',
                completionRate: 100,
                participantCount: 9,
                selectionCount: 0,
                progressColor: '#6366F1'
              }
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
