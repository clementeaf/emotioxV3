import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';

interface VOCCommentsProps {
  comments: Array<{
    id: string;
    text: string;
    timestamp: string;
    sentiment?: string;
  }>;
  className?: string;
}

export const VOCComments = ({ comments, className }: VOCCommentsProps) => {
  return (
    <Card className={cn('p-6', className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Voice of Customer Comments
      </h3>
      
      {comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No comments yet
        </div>
      ) : (
        <div className="space-y-4">
          {comments.slice(0, 5).map((comment) => (
            <div key={comment.id} className="border-l-4 border-blue-500 pl-4 py-2">
              <p className="text-gray-700 text-sm">{comment.text}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <span>{new Date(comment.timestamp).toLocaleDateString()}</span>
                {comment.sentiment && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{comment.sentiment}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
