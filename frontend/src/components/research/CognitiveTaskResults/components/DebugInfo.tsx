'use client';


interface DebugInfoProps {
  loadingState: string;
  error: string | null;
  participantCount: number;
  processedDataCount: number;
  researchId: string;
}

export function DebugInfo({
  loadingState,
  error,
  participantCount,
  processedDataCount,
  researchId
}: DebugInfoProps) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <h4 className="text-sm font-semibold text-yellow-800 mb-2">🔍 Debug Info (Solo Desarrollo)</h4>
      <div className="text-xs text-yellow-700 space-y-1">
        <p><strong>Research ID:</strong> {researchId}</p>
        <p><strong>Loading State:</strong> {loadingState}</p>
        <p><strong>Error:</strong> {error || 'None'}</p>
        <p><strong>Participants:</strong> {participantCount}</p>
        <p><strong>Processed Questions:</strong> {processedDataCount}</p>
      </div>
    </div>
  );
}
