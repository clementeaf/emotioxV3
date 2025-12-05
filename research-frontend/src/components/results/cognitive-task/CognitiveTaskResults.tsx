import { Card } from '../../ui/Card';
import { Filters } from '../smart-voc/components/Filters';
import { VOCComments } from '../smart-voc/components/VOCComments';
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
        </div>

        {/* Right: Filters Sidebar */}
        <div className="w-80 shrink-0">
          <Filters researchId={researchId} />
        </div>
      </div>
    </div>
  );
};
