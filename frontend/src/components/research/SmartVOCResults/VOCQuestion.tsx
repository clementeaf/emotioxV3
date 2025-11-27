import { ClipboardListIcon, KeyboardIcon, UserIcon } from 'lucide-react';

import { Card } from '@/components/ui/Card';

interface Comment {
  text: string;
  mood: string;
  selected?: boolean;
}

interface VOCQuestionProps {
  comments: Comment[];
  questionNumber?: string;
  questionType?: string;
  questionText?: string;
}

export function VOCQuestion({
  comments,
  questionNumber = "2.6",
  questionType = "VOC",
  questionText
}: VOCQuestionProps) {
  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">{questionNumber}- {questionText || "Voice of Customer"} ({questionType})</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 text-left">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-gray-300" />
                    <span className="font-medium text-gray-600">Comment</span>
                  </div>
                </th>
                <th className="p-3 text-left">
                  <span className="font-medium text-gray-600">Mood</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {comments.length > 0 ? (
                comments.map((comment, index) => (
                  <tr key={index} className={comment.selected ? 'bg-blue-50' : ''}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={comment.selected}
                          readOnly
                        />
                        <span className="text-sm">{comment.text}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`text-sm px-2 py-1 rounded-full ${comment.mood === 'Positive' ? 'bg-green-100 text-green-700' :
                        comment.mood === 'Negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                        {comment.mood}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="p-6 text-center text-gray-500">
                    No hay comentarios disponibles
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="border-b flex">
            <button className="px-4 py-2 text-blue-600 border-b-2 border-blue-600 flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              <span>Sentiment</span>
            </button>
            <button className="px-4 py-2 text-gray-600 flex items-center gap-2">
              <ClipboardListIcon className="w-4 h-4" />
              <span>Themes</span>
            </button>
            <button className="px-4 py-2 text-gray-600 flex items-center gap-2">
              <KeyboardIcon className="w-4 h-4" />
              <span>Keywords</span>
            </button>
          </div>
          <div className="p-4 h-[340px] overflow-y-auto">
            <div className="space-y-4">
              <h4 className="text-lg font-medium">Sentiment analysis</h4>

              {comments.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {comments.filter(c => c.mood === 'Positive').length}
                      </div>
                      <div className="text-sm text-green-600">Positivos</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {comments.filter(c => c.mood === 'Negative').length}
                      </div>
                      <div className="text-sm text-red-600">Negativos</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">
                        {comments.filter(c => c.mood !== 'Positive' && c.mood !== 'Negative').length}
                      </div>
                      <div className="text-sm text-gray-600">Neutrales</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h5 className="text-base font-medium mb-2">Accionables:</h5>
                    <div className="text-sm text-gray-600 space-y-2">
                      <p>• Revisar comentarios positivos para identificar fortalezas</p>
                      <p>• Analizar comentarios negativos para áreas de mejora</p>
                      <p>• Total de comentarios analizados: {comments.length}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">Aún no hay datos de análisis de sentimientos</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
