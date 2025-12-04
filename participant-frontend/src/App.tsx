import { useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { Button } from './components/ui/Button';
import { useSessionStore } from './stores/useSessionStore';
import { useDeviceCollector } from './hooks/useDeviceCollector';
import { useLocationCollector } from './hooks/useLocationCollector';
import { useSessionTimer } from './hooks/useSessionTimer';

function App() {
  const { setConfig, config } = useSessionStore();

  // Initialize hooks - they will internally check the config
  useDeviceCollector();
  useLocationCollector();
  useSessionTimer();

  // Mock configuration loading (Replace with actual API call later)
  useEffect(() => {
    setConfig({
      id: 'mock-research-id',
      settings: {
        enableLocationCapture: true, // Change to false to test conditional logic
        enableDeviceCapture: true,
        enableSessionRecording: true,
      },
    });
  }, [setConfig]);

  return (
    <MainLayout
      footer={
        <Button onClick={() => console.log('Guardar y continuar')}>
          Guardar y continuar
        </Button>
      }
    >
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Contenedor del Paso
        </h1>
        <p className="text-gray-500">
          Aquí se renderizará el contenido dinámico del módulo.
        </p>

        {/* Debug Info Display */}
        <div className="text-xs text-left w-full bg-gray-50 p-4 rounded mt-4 border border-gray-200">
          <pre>{JSON.stringify(config, null, 2)}</pre>
        </div>
      </div>
    </MainLayout>
  );
}

export default App;
