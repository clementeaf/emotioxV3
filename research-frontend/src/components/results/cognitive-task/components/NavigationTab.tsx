import { cn } from '../../../../lib/utils';
import type { NavigationStep, NavigationResponse } from './navigationTestCard.types';

const getClicks = (r: NavigationResponse) => r.totalClicks ?? r.clicks ?? 0;
const getDuration = (r: NavigationResponse) => r.totalDuration ?? r.duration ?? 0;
const getCompleted = (r: NavigationResponse) => r.completed ?? r.completedFlow ?? false;

export const NavigationTab = ({ step }: { step: NavigationStep }) => {
  const responses = step.responses || [];
  const totalClicks = responses.reduce((sum, r) => sum + getClicks(r), 0);
  const totalCorrect = responses.reduce((sum, r) => sum + r.correctClicks, 0);
  const overallAccuracy = totalClicks > 0 ? Math.round((totalCorrect / totalClicks) * 100) : 0;
  const avgDuration = responses.length > 0
    ? (responses.reduce((sum, r) => sum + getDuration(r), 0) / responses.length / 1000).toFixed(1)
    : '0';
  const completedCount = responses.filter(r => getCompleted(r)).length;

  return (
    <div className="space-y-6">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border rounded-lg text-center cursor-help" title="Sum of all clicks across all participants">
          <div className="text-2xl font-bold text-gray-900">{totalClicks}</div>
          <div className="text-xs text-gray-500 mt-1">Total Clicks</div>
        </div>
        <div className="p-4 bg-white border rounded-lg text-center cursor-help" title="Clicks that landed inside a defined hit zone">
          <div className="text-2xl font-bold text-green-600">{totalCorrect}</div>
          <div className="text-xs text-gray-500 mt-1">Correct Clicks</div>
        </div>
        <div className="p-4 bg-white border rounded-lg text-center cursor-help" title="Correct clicks ÷ total clicks × 100">
          <div className="text-2xl font-bold text-blue-600">{overallAccuracy}%</div>
          <div className="text-xs text-gray-500 mt-1">Accuracy</div>
        </div>
        <div className="p-4 bg-white border rounded-lg text-center cursor-help" title="Average time per participant to complete the flow">
          <div className="text-2xl font-bold text-gray-900">{avgDuration}s</div>
          <div className="text-xs text-gray-500 mt-1">Avg Duration</div>
        </div>
      </div>

      {/* Completion summary */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-600">Completed flow:</span>
        <span className="font-semibold text-green-600 cursor-help" title="Participants who navigated through all steps ÷ total participants">{completedCount}/{responses.length}</span>
        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${responses.length > 0 ? (completedCount / responses.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Per-participant table */}
      {responses.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Participant</th>
                <th className="text-center px-4 py-2 font-medium text-gray-600">Completed</th>
                <th className="text-center px-4 py-2 font-medium text-gray-600">Clicks</th>
                <th className="text-center px-4 py-2 font-medium text-gray-600">Correct</th>
                <th className="px-4 py-2 font-medium text-gray-600">Accuracy</th>
                <th className="text-center px-4 py-2 font-medium text-gray-600">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {responses.map((r, idx) => {
                const clicks = getClicks(r);
                const acc = clicks > 0 ? Math.round((r.correctClicks / clicks) * 100) : 0;
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900 font-mono text-xs">
                      {r.participantId.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-2 text-center">
                      {getCompleted(r) ? (
                        <span className="text-green-600 font-semibold">Yes</span>
                      ) : (
                        <span className="text-red-500">No</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center text-gray-700">{clicks}</td>
                    <td className="px-4 py-2 text-center text-gray-700">{r.correctClicks}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={cn(
                              'h-2 rounded-full transition-all',
                              acc >= 70 ? 'bg-green-500' : acc >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            )}
                            style={{ width: `${acc}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-10 text-right">{acc}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center text-gray-700">{(getDuration(r) / 1000).toFixed(1)}s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {responses.length === 0 && (
        <div className="text-center py-8 text-gray-500">No participant data available</div>
      )}
    </div>
  );
};
