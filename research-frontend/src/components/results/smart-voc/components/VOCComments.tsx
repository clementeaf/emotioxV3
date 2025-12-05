import { useState } from 'react';
import { User, ClipboardList, Hash } from 'lucide-react';
import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';

interface Comment {
  text: string;
  mood: string;
  selected?: boolean;
}

interface VOCCommentsProps {
  comments?: Comment[];
  questionNumber?: string;
  questionText?: string;
  className?: string;
}

export const VOCComments = ({ 
  comments = [],
  questionNumber = "2.6",
  questionText = "Voice of Customer (VOC)",
  className 
}: VOCCommentsProps) => {
  const [activeTab, setActiveTab] = useState<'sentiment' | 'themes' | 'keywords'>('sentiment');
  const [selectedComments, setSelectedComments] = useState<number[]>([]);

  const handleSelectAll = () => {
    if (selectedComments.length === comments.length) {
      setSelectedComments([]);
    } else {
      setSelectedComments(comments.map((_, i) => i));
    }
  };

  const handleSelectComment = (index: number) => {
    if (selectedComments.includes(index)) {
      setSelectedComments(selectedComments.filter(i => i !== index));
    } else {
      setSelectedComments([...selectedComments, index]);
    }
  };

  return (
    <Card className={cn('p-6 pb-24 space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">{questionNumber}- Question: {questionText}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 text-xs font-medium rounded text-green-600 bg-green-50">
              Short Text question
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded text-blue-600 bg-blue-50">
              Conditionality disabled
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded text-red-600 bg-red-50">
              Required
            </span>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Comments Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 text-left">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300"
                      checked={selectedComments.length === comments.length && comments.length > 0}
                      onChange={handleSelectAll}
                    />
                    <span className="font-medium text-gray-600 text-sm">Comment</span>
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L13 10.414V16z" />
                    </svg>
                  </div>
                </th>
                <th className="p-3 text-left">
                  <span className="font-medium text-gray-600 text-sm">Mood</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {comments.length > 0 ? (
                comments.map((comment, index) => (
                  <tr key={index} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300"
                          checked={selectedComments.includes(index)}
                          onChange={() => handleSelectComment(index)}
                        />
                        <span className="text-sm text-gray-700">{comment.text}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={cn(
                        'text-sm font-medium',
                        comment.mood === 'Positive' ? 'text-green-600' : 
                        comment.mood === 'green' ? 'text-green-600' : 
                        'text-gray-600'
                      )}>
                        {comment.mood}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="p-8 text-center text-gray-500 text-sm">
                    No comments available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right: Analysis Panel */}
        <div className="border rounded-lg overflow-hidden">
          {/* Tabs */}
          <div className="border-b flex">
            <button 
              className={cn(
                'px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors',
                activeTab === 'sentiment' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              )}
              onClick={() => setActiveTab('sentiment')}
            >
              <User className="w-4 h-4" />
              <span>Sentiment</span>
            </button>
            <button 
              className={cn(
                'px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors',
                activeTab === 'themes' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              )}
              onClick={() => setActiveTab('themes')}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Themes</span>
            </button>
            <button 
              className={cn(
                'px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors',
                activeTab === 'keywords' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              )}
              onClick={() => setActiveTab('keywords')}
            >
              <Hash className="w-4 h-4" />
              <span>Keywords</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 h-[380px] overflow-y-auto">
            {activeTab === 'sentiment' && (
              <div className="space-y-4">
                <h4 className="text-base font-semibold">Sentiment analysis</h4>
                
                {selectedComments.length > 0 && comments.length > 0 ? (
                  <div className="space-y-6">
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700">
                        Then I explore the nature of cognitive developmental improvements in working memory, 
                        the role of working memory in learning, and some potential implications of working memory 
                        and its development for the education of children and adults.
                      </p>
                      <p className="text-gray-700 mt-4">
                        The use of working memory is quite ubiquitous in human thought, but the best way to improve 
                        education using what we know about working memory is still controversial. I hope to provide 
                        some directions for research and educational practice.
                      </p>
                    </div>

                    <div className="mt-6">
                      <h5 className="text-sm font-semibold mb-3">Accionables:</h5>
                      <div className="text-sm text-gray-700 space-y-2">
                        <p>Using what we know about working memory is still controversial.</p>
                        <p className="mt-2">
                          I hope to provide some directions for research and educational practice.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">Select comments to view sentiment analysis</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'themes' && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">No themes data available yet</p>
                </div>
              </div>
            )}

            {activeTab === 'keywords' && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                    <Hash className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">No keywords data available yet</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
