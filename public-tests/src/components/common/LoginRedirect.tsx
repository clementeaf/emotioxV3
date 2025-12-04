import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTestStore } from '../../stores/useTestStore';
import { useParticipantStore } from '../../stores/useParticipantStore';
import { usePreviewModeStore } from '../../stores/usePreviewModeStore';

const LoginRedirect: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { setParticipant } = useTestStore();
  
  const [hasProcessed, setHasProcessed] = useState(false);
  const processedRef = useRef<string | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  
  const handleNavigation = useCallback(() => {
    if (hasProcessed || isProcessingRef.current) {
      return;
    }
    
    const pathResearchId = params.researchId;
    const pathParticipantId = params.participantId;
    
    // Fallback para móviles: leer directamente de window.location.search si location.search está vacío
    const searchString = location.search || window.location.search;
    const urlParams = new URLSearchParams(searchString);
    const queryResearchId = urlParams.get('researchId');
    const queryParticipantId = urlParams.get('participantId');
    const queryUserId = urlParams.get('userId');
    const researchId = pathResearchId || queryResearchId;
    const participantId = pathParticipantId || queryParticipantId || queryUserId;
    const processKey = `${researchId}-${participantId || 'preview'}`;
    
    if (processedRef.current === processKey) {
      return;
    }

    isProcessingRef.current = true;
    
    const { setParticipantId } = useParticipantStore.getState();
    const { setPreviewMode } = usePreviewModeStore.getState();

    if (!researchId) {
      isProcessingRef.current = false;
      navigate('/error-no-research-id');
      return;
    }

    setHasProcessed(true);
    processedRef.current = processKey;

    if (participantId) {
      setPreviewMode(false);
      setParticipantId(participantId);

      const participantName = `Participante ${participantId.slice(-6).toUpperCase()}`;
      const participantEmail = `${participantId.slice(-8)}@participant.study`;

      setParticipant(
        participantId,
        participantName,
        participantEmail,
        researchId
      );

      navigate(`/test?researchId=${researchId}&participantId=${participantId}`);
    } else {
      setPreviewMode(true);

      const previewParticipantId = `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setParticipantId(previewParticipantId);

      const participantName = `Preview User`;
      const participantEmail = `preview@test.local`;

      setParticipant(
        previewParticipantId,
        participantName,
        participantEmail,
        researchId
      );

      navigate(`/test?researchId=${researchId}`);
    }
    
    isProcessingRef.current = false;
  }, [params.researchId, params.participantId, location.search, navigate, setParticipant, hasProcessed]);

  useEffect(() => {
    handleNavigation();
  }, [handleNavigation]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Iniciando participación...
        </h2>
        <p className="text-gray-600">
          Configurando el test para el participante
        </p>
      </div>
    </div>
  );
};

export default LoginRedirect;