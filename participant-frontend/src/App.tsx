import { MainLayout } from './components/layout/MainLayout';
import { Button } from './components/ui/Button';

function App() {
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
        <div className="w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
          <span className="text-sm text-gray-400">Area de contenido</span>
        </div>
      </div>
    </MainLayout>
  );
}

export default App;
