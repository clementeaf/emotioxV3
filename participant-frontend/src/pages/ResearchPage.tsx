import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { DevSidebar } from '../components/layout/DevSidebar';
import { DynamicStep } from '../components/steps/DynamicStep';
import { PreviewModeBanner } from '../components/ui/PreviewModeBanner';
import { useSessionStore } from '../stores/useSessionStore';
import { useNavigation } from '../hooks/useNavigation';
import { useDeviceCollector } from '../hooks/useDeviceCollector';
import { useLocationCollector } from '../hooks/useLocationCollector';
import { useSessionTimer } from '../hooks/useSessionTimer';
import { usePreviewMode } from '../hooks/usePreviewMode';
import { MOCK_MODULES } from '../data/mockModules';

export const ResearchPage = () => {
  const { researchId } = useParams<{ researchId: string }>();
  const { isPreviewMode, participantId } = usePreviewMode();
  const { setConfig } = useSessionStore();
  const { currentStep, goNext, isLastStep } = useNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize device collector
  useDeviceCollector();
  
  // Initialize location collector (will be called manually when needed)
  useLocationCollector();
  
  // Initialize session timer
  useSessionTimer();

  // Load research configuration
  useEffect(() => {
    if (!researchId) return;

    // TODO: Replace with actual API call to fetch research modules
    // For now, use mock configuration
    setConfig({
      id: researchId,
      settings: {
        enableLocationCapture: true,
        enableDeviceCapture: true,
        enableSessionRecording: true,
        enableInteractionTracking: true,
      },
    });
  }, [researchId, setConfig]);

  // Check if we're in development mode
  const isDev = import.meta.env.DEV;

  // Get current module
  const currentModule = MOCK_MODULES[currentStep];

  const handleNext = () => {
    // In preview mode, don't send data to backend
    if (isPreviewMode) {
      console.log('[Preview Mode] Skipping data submission');
      const result = goNext();
      if (!result.success && result.errors) {
        const errorMessage = result.errors.map(e => e.message).join('\n');
        alert(errorMessage);
      }
      return;
    }

    // In participant mode, send data to backend
    if (participantId) {
      console.log(`[Participant Mode] Submitting data for participant: ${participantId}`);
      // TODO: Implement actual API call to save responses
      // await saveResponse({ researchId, participantId, responses: ... });
    }

    const result = goNext();
    if (!result.success && result.errors) {
      const errorMessage = result.errors.map(e => e.message).join('\n');
      alert(errorMessage);
    }
  };

  if (!researchId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Invalid Research
          </h1>
          <p className="text-gray-600">
            No research ID provided
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Development Sidebar */}
      {isDev && (
        <DevSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      )}

      {/* Preview Mode Banner */}
      {isPreviewMode && <PreviewModeBanner />}

      <MainLayout
        footer={
          <Button
            onClick={handleNext}
            disabled={isLastStep}
          >
            {isLastStep ? 'Finalizar' : 'Guardar y continuar'}
          </Button>
        }
      >
        {currentModule ? (
          <DynamicStep module={currentModule} />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Step: {currentStep}
            </h1>
            <p className="text-gray-500">
              Este paso aún no está configurado.
            </p>
          </div>
        )}
      </MainLayout>
    </>
  );
};
