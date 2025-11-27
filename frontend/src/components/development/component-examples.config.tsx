import React from 'react';
import { FormToggle } from '@/components/common/FormToggle';
import { FormInput } from '@/components/common/FormInput';
import { FormTextarea } from '@/components/common/FormTextarea';
import { ActionButton } from '@/components/common/ActionButton';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { OptimisticFormWrapper } from '@/components/common/OptimisticFormWrapper';
import { OptimisticButton } from '@/components/common/OptimisticButton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ConfigCard } from '@/components/common/ConfigCard';
import { ProgressiveLoader } from '@/components/common/ProgressiveLoader';
import { SimulatedDataBanner } from '@/components/common/SimulatedDataBanner';
import { PlaceholderCard } from '@/components/common/PlaceholderCard';
import { EducationalSidebar } from '@/components/common/EducationalSidebar';
import { ReorderableGrid } from '@/components/common/ReorderableGrid';
import { ConditionalSection } from '@/components/common/ConditionalSection';
import { FormSelect } from '@/components/common/FormSelect';
import { LabeledInput } from '@/components/common/LabeledInput';
import { ScaleSelector } from '@/components/common/ScaleSelector';
import { QuestionPreview } from '@/components/common/QuestionPreview';

// Tipos para los handlers
export interface ComponentHandlers {
  handleChange: (field: string, value: any) => void;
  handleSubmit: () => void;
  handlePreview: () => void;
  handleDelete: () => void;
}

// Tipo para la configuración de ejemplos
export interface ComponentExampleConfig {
  title: string;
  props: Record<string, any>;
  children: (formData: any, handlers: ComponentHandlers) => React.ReactNode;
}

// Configuración de ejemplos para cada componente
export const COMPONENT_EXAMPLES: Record<string, ComponentExampleConfig> = {
  FormCard: {
    title: "FormCard - Contenedor de Formulario",
    props: { title: "FormCard - Contenedor de Formulario" },
    children: (formData: any, handlers: ComponentHandlers) => (
      <div className="space-y-6">
        <FormToggle
          label="Habilitar funcionalidad"
          description="Esta funcionalidad está habilitada y se mostrará en la aplicación"
          checked={formData.isEnabled}
          onChange={(checked) => handlers.handleChange('isEnabled', checked)}
        />
        <FormInput
          label="Título"
          value={formData.title}
          onChange={(value) => handlers.handleChange('title', value)}
          placeholder="Ingresa el título"
        />
        <FormTextarea
          label="Mensaje"
          value={formData.message}
          onChange={(value) => handlers.handleChange('message', value)}
          placeholder="Ingresa el mensaje"
          rows={4}
        />
        <FormInput
          label="Texto del botón"
          value={formData.buttonText}
          onChange={(value) => handlers.handleChange('buttonText', value)}
          placeholder="Ingresa el texto del botón"
        />
      </div>
    )
  },
  ActionButton: {
    title: "ActionButton - Variantes",
    props: {},
    children: (handlers: ComponentHandlers) => (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <ActionButton variant="primary" onClick={handlers.handleSubmit}>
            Primary (Negro)
          </ActionButton>
          <ActionButton variant="secondary" onClick={handlers.handlePreview}>
            Secondary (Blanco)
          </ActionButton>
          <ActionButton variant="danger" onClick={handlers.handleDelete} icon="🗑️">
            Danger (Rojo)
          </ActionButton>
          <ActionButton variant="success" onClick={() => console.log('Success')}>
            Success (Verde)
          </ActionButton>
        </div>
        <div className="flex flex-wrap gap-4">
          <ActionButton variant="primary" onClick={handlers.handleSubmit}>
            Normal
          </ActionButton>
          <ActionButton variant="primary" onClick={handlers.handleSubmit} loading>
            Loading
          </ActionButton>
          <ActionButton variant="primary" onClick={handlers.handleSubmit} disabled>
            Disabled
          </ActionButton>
        </div>
      </div>
    )
  },
  LoadingSkeleton: {
    title: "LoadingSkeleton - Tipos",
    props: {},
    children: () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Form Skeleton</h3>
          <LoadingSkeleton type="form" count={3} />
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Card Skeleton</h3>
          <LoadingSkeleton type="card" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Dashboard Skeleton</h3>
          <LoadingSkeleton type="dashboard" />
        </div>
      </div>
    )
  },
  OptimisticFormWrapper: {
    title: "OptimisticFormWrapper - Formulario Optimista",
    props: {},
    children: (formData: any, handlers: ComponentHandlers) => (
      <OptimisticFormWrapper
        onSubmit={async () => handlers.handleSubmit()}
        submitButtonText="Guardar con Optimismo"
        loadingText="Guardando..."
        successText="✓ Guardado"
        skeletonType="form"
        skeletonCount={4}
      >
        <div className="space-y-4">
          <FormInput
            label="Campo 1"
            value=""
            onChange={() => {}}
            placeholder="Campo de prueba"
          />
          <FormTextarea
            label="Campo 2"
            value=""
            onChange={() => {}}
            placeholder="Textarea de prueba"
          />
        </div>
      </OptimisticFormWrapper>
    )
  },
  OptimisticButton: {
    title: "OptimisticButton - Botón Optimista",
    props: {},
    children: (handlers: ComponentHandlers) => (
      <div className="flex gap-5">
        <OptimisticButton onClick={handlers.handleSubmit}>
          Botón Optimista
        </OptimisticButton>
        <OptimisticButton onClick={handlers.handleSubmit} variant="danger">
          Botón Danger
        </OptimisticButton>
        <OptimisticButton onClick={handlers.handleSubmit} variant="success">
          Botón Success
        </OptimisticButton>
      </div>
    )
  },
  ConfigCard: {
    title: "ConfigCard - Card de Configuración",
    props: {},
    children: () => (
      <ConfigCard>
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Ejemplo ConfigCard</h3>
          <p className="text-gray-600">Descripción del card</p>
          <p className="mt-4">Contenido del ConfigCard</p>
        </div>
      </ConfigCard>
    )
  },
  ErrorBoundary: {
    title: "ErrorBoundary - Manejo de Errores",
    props: {},
    children: () => (
      <>
        <p className="text-gray-600 mb-4">ErrorBoundary se muestra cuando hay errores en componentes hijos.</p>
        <ErrorBoundary>
          <div>
            <p>Contenido protegido por ErrorBoundary</p>
          </div>
        </ErrorBoundary>
      </>
    )
  },
  ProgressiveLoader: {
    title: "ProgressiveLoader - Loader Progresivo",
    props: {},
    children: () => (
      <ProgressiveLoader isLoading={false}>
        <div className="p-4 bg-green-50 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800">Contenido Cargado</h3>
          <p className="text-green-600">Este contenido se muestra cuando isLoading es false</p>
        </div>
      </ProgressiveLoader>
    )
  },
  SimulatedDataBanner: {
    title: "SimulatedDataBanner - Banner de Datos Simulados",
    props: {},
    children: () => <SimulatedDataBanner />
  },
  FormToggle: {
    title: "FormToggle - Switch/Toggle",
    props: {},
    children: (formData: any, handlers: ComponentHandlers) => (
      <div className="space-y-4">
        <FormToggle
          label="Habilitar funcionalidad"
          description="Esta funcionalidad está habilitada y se mostrará en la aplicación"
          checked={formData.isEnabled}
          onChange={(checked) => handlers.handleChange('isEnabled', checked)}
        />
      </div>
    )
  },
  FormInput: {
    title: "FormInput - Campo de Texto",
    props: {},
    children: (formData: any, handlers: ComponentHandlers) => (
      <div className="space-y-4">
        <FormInput
          label="Título"
          value={formData.title}
          onChange={(value) => handlers.handleChange('title', value)}
          placeholder="Ingresa el título"
        />
      </div>
    )
  },
  FormTextarea: {
    title: "FormTextarea - Área de Texto",
    props: {},
    children: (formData: any, handlers: ComponentHandlers) => (
      <div className="space-y-4">
        <FormTextarea
          label="Mensaje"
          value={formData.message}
          onChange={(value) => handlers.handleChange('message', value)}
          placeholder="Ingresa el mensaje"
          rows={4}
        />
      </div>
    )
  },
  PlaceholderCard: {
    title: "PlaceholderCard - Card de Placeholder",
    props: {},
    children: () => (
      <div className="space-y-4">
        <PlaceholderCard
          title="Configuración"
          description="Configuración para investigación coming soon..."
          variant="coming-soon"
        />
        <PlaceholderCard
          title="Estado Vacío"
          description="No hay datos disponibles en este momento"
          variant="empty-state"
        />
        <PlaceholderCard
          title="Placeholder por Defecto"
          description="Este es un placeholder genérico"
        />
      </div>
    )
  },
  QRCodeModal: {
    title: "QRCodeModal - Modal de Código QR",
    props: {},
    children: (formData: any, handlers: ComponentHandlers) => (
      <div className="space-y-4">
        <p className="text-gray-600 mb-4">
          QRCodeModal se muestra como modal. Aquí se muestra el componente sin el modal wrapper.
        </p>
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <p className="text-sm text-gray-500">
            Para probar el QRCodeModal completo, necesitarías implementarlo en un contexto real con estado de modal.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            URL de ejemplo: https://example.com/research/123
          </p>
        </div>
      </div>
    )
  },
  EducationalSidebar: {
    title: "EducationalSidebar - Sidebar Educativo",
    props: {},
    children: () => (
      <div className="space-y-4">
        <EducationalSidebar
          content={{
            title: "Técnica de Investigación",
            generalDescription: "Esta técnica te permite recopilar datos de manera efectiva.",
            typeExplanation: "Detalles específicos sobre cómo funciona esta técnica y qué beneficios aporta."
          }}
          loading={false}
          error={null}
          title="Guía de Configuración"
        />
        <EducationalSidebar
          content={null}
          loading={true}
          error={null}
          title="Cargando Contenido"
        />
        <EducationalSidebar
          content={null}
          loading={false}
          error="Error al cargar el contenido educativo"
          title="Estado de Error"
        />
      </div>
    )
  },
  ReorderableGrid: {
    title: "ReorderableGrid - Grid Reordenable",
    props: {},
    children: () => {
      const sampleItems = [
        { id: '1', name: 'Item 1', description: 'Primer elemento' },
        { id: '2', name: 'Item 2', description: 'Segundo elemento' },
        { id: '3', name: 'Item 3', description: 'Tercer elemento' }
      ];

      return (
        <div className="space-y-4">
          <ReorderableGrid
            items={sampleItems}
            onReorder={(items) => console.log('Reordered:', items)}
            onRemove={(id) => console.log('Remove:', id)}
            renderItem={(item) => (
              <div className="p-2">
                <h4 className="font-medium">{item.name}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            )}
            columns={2}
            showDragHandle={true}
            showRemoveButton={true}
          />
        </div>
      );
    }
  },
  LoadingTransition: {
    title: "LoadingTransition - Transición con Loading",
    props: {},
    children: () => (
      <div className="space-y-4">
        <p className="text-gray-600 mb-4">
          LoadingTransition se muestra como pantalla completa. Aquí se muestra una versión simplificada.
        </p>
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <p className="text-sm text-gray-500">
            Para probar el LoadingTransition completo, necesitarías implementarlo en un contexto real con redirección.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Props: redirectTo, message, delay, showSpinner, spinnerSize
          </p>
        </div>
      </div>
    )
  },
  ConflictResolutionModal: {
    title: "ConflictResolutionModal - Modal de Resolución de Conflictos",
    props: {},
    children: () => (
      <div className="space-y-4">
        <p className="text-gray-600 mb-4">
          ConflictResolutionModal se muestra como modal. Aquí se muestran ejemplos de diferentes variantes.
        </p>
        
        {/* Ejemplo Info */}
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="font-medium text-gray-800 mb-2">Variante: Info (Azul)</h4>
          <p className="text-sm text-gray-600 mb-2">
            Título: "Información importante"<br/>
            Mensaje: "Se ha detectado una situación que requiere tu atención."<br/>
            Botones: "Continuar" / "Crear nuevo"
          </p>
        </div>

        {/* Ejemplo Warning */}
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="font-medium text-gray-800 mb-2">Variante: Warning (Ámbar)</h4>
          <p className="text-sm text-gray-600 mb-2">
            Título: "Investigación en curso detectada"<br/>
            Mensaje: "Ya tienes una investigación activa. ¿Qué deseas hacer?"<br/>
            Botones: "Ir a la investigación actual" / "Reemplazar con nueva"
          </p>
        </div>

        {/* Ejemplo Draft */}
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="font-medium text-gray-800 mb-2">Variante: Draft (Ámbar)</h4>
          <p className="text-sm text-gray-600 mb-2">
            Título: "Borrador encontrado"<br/>
            Mensaje: "Tienes un borrador sin completar. ¿Deseas continuar?"<br/>
            Botones: "Continuar con el borrador" / "Crear nuevo borrador"
          </p>
        </div>

        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
          <p className="text-sm text-blue-600">
            <strong>Props disponibles:</strong> isOpen, onClose, onContinue, onNew, title, message, continueText, newText, variant, icon, className
          </p>
        </div>
      </div>
    )
  },
  ConditionalSection: {
    title: "ConditionalSection - Sección Condicional",
    props: {},
    children: (formData: any, handlers: ComponentHandlers) => (
      <div className="space-y-4">
        <p className="text-gray-600 mb-4">
          ConditionalSection muestra contenido solo cuando isVisible es true, con animaciones opcionales.
        </p>
        
        {/* Ejemplo con FormToggle */}
        <div className="space-y-4">
          <FormToggle
            label="Mostrar contenido condicional"
            description="Toggle para mostrar/ocultar el contenido"
            checked={formData.showConditional || false}
            onChange={(checked) => handlers.handleChange('showConditional', checked)}
          />
          
          <ConditionalSection 
            isVisible={formData.showConditional || false}
            animation={true}
            fadeIn={true}
          >
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Contenido Condicional</h4>
              <p className="text-green-600 text-sm">
                Este contenido solo se muestra cuando el toggle está habilitado.
                Tiene animación de fade-in suave.
              </p>
            </div>
          </ConditionalSection>
        </div>

        {/* Ejemplo con slide down */}
        <div className="space-y-4">
          <FormToggle
            label="Mostrar con slide down"
            description="Toggle para mostrar con animación de slide"
            checked={formData.showSlide || false}
            onChange={(checked) => handlers.handleChange('showSlide', checked)}
          />
          
          <ConditionalSection 
            isVisible={formData.showSlide || false}
            animation={true}
            slideDown={true}
          >
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Contenido con Slide</h4>
              <p className="text-blue-600 text-sm">
                Este contenido se muestra con animación de slide down.
              </p>
            </div>
          </ConditionalSection>
        </div>

        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
          <p className="text-sm text-blue-600">
            <strong>Props disponibles:</strong> isVisible, children, className, animation, fadeIn, slideDown
          </p>
        </div>
      </div>
    )
  },
  FormSelect: {
    title: "FormSelect - Selector/Dropdown",
    props: {},
    children: (formData: any, handlers: ComponentHandlers) => (
      <div className="space-y-4">
        <FormSelect
          label="Tipo de visualización"
          value={formData.displayType || 'stars'}
          onChange={(value) => handlers.handleChange('displayType', value)}
          options={[
            { value: 'stars', label: 'Estrellas' },
            { value: 'numbers', label: 'Números' }
          ]}
          placeholder="Selecciona un tipo"
        />
        
        <FormSelect
          label="Escala de valoración"
          value={formData.scale || '1-5'}
          onChange={(value) => handlers.handleChange('scale', value)}
          options={[
            { value: '1-5', label: 'Escala 1-5' },
            { value: '1-7', label: 'Escala 1-7' },
            { value: '1-10', label: 'Escala 1-10' },
            { value: '0-10', label: 'Escala 0-10' }
          ]}
        />
      </div>
    )
  },
  LabeledInput: {
    title: "LabeledInput - Input con Etiqueta",
    props: {},
    children: (formData: any, handlers: ComponentHandlers) => (
      <div className="space-y-4">
        <LabeledInput
          label="Etiqueta inicio"
          value={formData.startLabel || ''}
          onChange={(value) => handlers.handleChange('startLabel', value)}
          placeholder="Texto de inicio"
        />
        
        <LabeledInput
          label="Etiqueta fin"
          value={formData.endLabel || ''}
          onChange={(value) => handlers.handleChange('endLabel', value)}
          placeholder="Texto de fin"
        />
      </div>
    )
  },
  ScaleSelector: {
    title: "ScaleSelector - Selector de Escalas",
    props: {},
    children: (formData: any, handlers: ComponentHandlers) => (
      <div className="space-y-4">
        <ScaleSelector
          value={formData.scaleRange || { start: 1, end: 5 }}
          onChange={(range) => handlers.handleChange('scaleRange', range)}
        />
      </div>
    )
  },
  QuestionPreview: {
    title: "QuestionPreview - Vista Previa de Preguntas",
    props: {},
    children: (formData: any, handlers: ComponentHandlers) => (
      <div className="space-y-4">
        <p className="text-gray-600 mb-4">
          QuestionPreview muestra cómo se verá una pregunta para los participantes.
        </p>
        
        <QuestionPreview
          title={formData.title || '¿Qué tan satisfecho estás con nuestro servicio?'}
          description={formData.description || 'Por favor califica tu experiencia'}
          instructions={formData.instructions || 'Selecciona una opción'}
          type="CSAT"
          config={{ type: 'stars' }}
        />
        
        <QuestionPreview
          title="¿Qué tan fácil fue completar esta tarea?"
          description="Califica la facilidad de uso"
          type="CES"
        />
        
        <QuestionPreview
          title="¿Qué tan probable es que recomiendes nuestro producto?"
          description="Escala de 0 a 10"
          type="NPS"
          config={{ scaleRange: { start: 0, end: 10 } }}
        />
      </div>
    )
  }
} as const;