/**
 * Time formatting utilities
 */

export const calculateTimeAgo = (timestamp: string | undefined): string => {
  if (!timestamp) return '0s';
  
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `${diffSecs}s`;
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
};

export const getLatestTimestamp = (responses: Array<{ created_at?: string }>): string | undefined => {
  if (!responses || responses.length === 0) return undefined;
  
  const timestamps = responses
    .map(r => r.created_at)
    .filter((t): t is string => !!t)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  return timestamps[0];
};
