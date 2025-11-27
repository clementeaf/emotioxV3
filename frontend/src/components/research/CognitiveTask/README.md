# Componente CognitiveTask

Este módulo implementa el componente de tareas cognitivas para la creación y gestión de cuestionarios y evaluaciones cognitivas.

## Estructura del componente

El componente sigue una arquitectura modular para facilitar su mantenimiento y extensión:

```
CognitiveTask/
├── components/           # Subcomponentes individuales
│   ├── questions/        # Componentes específicos para tipos de preguntas
│   │   ├── TextQuestion.tsx
│   │   ├── ChoiceQuestion.tsx
│   │   ├── ScaleQuestion.tsx
│   │   └── FileUploadQuestion.tsx
│   ├── AddQuestionModal.tsx
│   ├── CognitiveTaskFooter.tsx
│   ├── CognitiveTaskHeader.tsx
│   ├── CognitiveTaskSettings.tsx
│   ├── ErrorModal.tsx
│   ├── QuestionCard.tsx
│   └── index.ts
├── constants/            # Constantes, textos y configuraciones
│   └── index.ts
├── hooks/                # Custom hooks para la lógica del formulario
│   └── useCognitiveTaskForm.ts
├── types/                # Definiciones de tipos
│   └── index.ts
├── README.md             # Esta documentación
└── index.tsx             # Componente principal
```

## Componentes principales

### CognitiveTaskForm

El componente principal que integra todos los subcomponentes. Proporciona la interfaz para crear y editar tareas cognitivas.

**Props:**
- `className`: Clases CSS adicionales
- `researchId`: ID de la investigación asociada
- `onSave`: Callback cuando se guarda el formulario

### QuestionCard

Componente contenedor para mostrar y configurar diferentes tipos de preguntas. Renderiza el componente específico según el tipo de pregunta.

### Componentes de preguntas

- **TextQuestion**: Para preguntas de texto corto y largo
- **ChoiceQuestion**: Para preguntas de opción única, múltiple y ranking
- **ScaleQuestion**: Para preguntas de escala lineal
- **FileUploadQuestion**: Para preguntas de carga de archivos y pruebas de preferencia

## Hook principal: useCognitiveTaskForm

Este hook encapsula toda la lógica del formulario, incluyendo:

- Gestión del estado del formulario
- Carga de datos existentes
- Validación del formulario
- Guardado de datos
- Gestión de errores

## Tipos principales

- **Question**: Definición básica de una pregunta
- **QuestionType**: Tipos de preguntas soportados
- **CognitiveTaskFormData**: Estructura completa de los datos del formulario

## Flujo de trabajo

1. El componente `CognitiveTaskForm` se inicializa con un `researchId`
2. El hook `useCognitiveTaskForm` intenta cargar datos existentes para ese ID
3. Si existen datos, se cargan en el formulario, de lo contrario se usa la configuración por defecto
4. El usuario puede añadir, editar y eliminar preguntas de diferentes tipos
5. Al guardar, se validan los datos y se envían al servidor
6. Se notifica al componente padre a través del callback `onSave`

## Uso

```tsx
import { CognitiveTaskForm } from '@/components/research/CognitiveTask';

const ResearchPage = () => {
  const handleSave = (data) => {
    // Hacer algo con los datos guardados
  };

  return (
    <div>
      <CognitiveTaskForm 
        researchId="research-123"
        onSave={handleSave}
      />
    </div>
  );
};
``` 