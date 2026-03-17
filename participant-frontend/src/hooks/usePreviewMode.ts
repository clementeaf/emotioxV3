import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useParticipantStore } from '../stores/useParticipantStore';

interface PreviewModeResult {
  isPreviewMode: boolean;
  participantId: string | null;
}

/**
 * Hook to detect if we're in preview mode (researcher viewing)
 *
 * Preview mode rules:
 * - If ?preview=true is in URL → always preview
 * - If ?participantId=xxx is in URL → never preview (panel mode)
 * - If no participantId AND participationMode is 'kiosk' → NOT preview (kiosk gets ID from backend)
 * - If no participantId AND mode is null/panel → preview (researcher testing)
 */
export const usePreviewMode = (): PreviewModeResult => {
  const [searchParams] = useSearchParams();
  const participationMode = useParticipantStore((state) => state.participationMode);
  const storedParticipantId = useParticipantStore((state) => state.participantId);

  const result = useMemo(() => {
    const urlParticipantId = searchParams.get('participantId') ?? searchParams.get('participantid');
    const explicitPreview = searchParams.get('preview') === 'true';

    // Explicit preview flag always wins
    if (explicitPreview) {
      return { isPreviewMode: true, participantId: null };
    }

    // If participantId in URL → participant mode (panel)
    if (urlParticipantId) {
      return { isPreviewMode: false, participantId: urlParticipantId };
    }

    // Kiosk mode: no URL participantId, but backend assigns one
    if (participationMode === 'kiosk') {
      return { isPreviewMode: false, participantId: storedParticipantId };
    }

    // No participantId, not kiosk → preview mode
    return { isPreviewMode: true, participantId: null };
  }, [searchParams, participationMode, storedParticipantId]);

  return result;
};
