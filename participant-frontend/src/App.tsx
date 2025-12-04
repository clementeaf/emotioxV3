import { useEffect, useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { Button } from './components/ui/Button';
import { DevSidebar } from './components/layout/DevSidebar';
import { DynamicStep } from './components/steps/DynamicStep';
import { useSessionStore } from './stores/useSessionStore';
import { useStepNavigation } from './stores/useStepNavigation';
import { useDeviceCollector } from './hooks/useDeviceCollector';
import { useLocationCollector } from './hooks/useLocationCollector';
import { useSessionTimer } from './hooks/useSessionTimer';
import { MOCK_MODULES } from './data/mockModules';

function App() {
  const { setConfig } = useSessionStore();
  const { currentStep } = useStepNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize hooks - they will internally check the config
  useDeviceCollector();
  useLocationCollector();
  useSessionTimer();

  // Mock configuration loading (Replace with actual API call later)
  useEffect(() => {
    setConfig({
      id: 'mock-research-id',
      settings: {
        enableLocationCapture: true,
        enableDeviceCapture: true,
        enableSessionRecording: true,
      },
    });
  }, [setConfig]);

  // Check if we're in development mode
  const isDev = import.meta.env.DEV;

  // Get current module
  const currentModule = MOCK_MODULES[currentStep];

  return (
    <>
      {/* Development Sidebar */}
      {isDev && (
        <DevSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      )}

      <MainLayout
        footer={
          <Button onClick={() => console.log('Guardar y continuar')}>
            Guardar y continuar
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
}

export default App;
