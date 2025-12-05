import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface PreviewModeResult {
  isPreviewMode: boolean;
  participantId: string | null;
}

/**
 * Hook to detect if we're in preview mode (researcher viewing)
 * Preview mode = no participantId in URL
 * Participant mode = participantId present in URL
 */
export const usePreviewMode = (): PreviewModeResult => {
  const [searchParams] = useSearchParams();

  const result = useMemo(() => {
    const participantId = searchParams.get('participantId');
    
    return {
      isPreviewMode: !participantId,
      participantId: participantId,
    };
  }, [searchParams]);

  return result;
};
