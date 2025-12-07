# 📖 EmotioX v3 - Glosario de Términos

Definiciones de todos los términos técnicos y conceptos del sistema.

## A

### AccessToken
Token JWT de corta duración (1 hora) emitido por AWS Cognito. Se usa para autenticar requests al backend. Se renueva automáticamente usando el RefreshToken.

### Answer
Respuesta individual a una pregunta específica. Parte de una Response. Se almacena en la tabla `answers`.

### API Gateway
Servicio de AWS que maneja las requests HTTP y las rutea al backend Lambda.

### AWS Cognito
Servicio de AWS para autenticación y gestión de usuarios. Maneja login, registro, y refresh de tokens.

## B

### Backend
Aplicación Node.js + TypeScript que corre en AWS Lambda. Maneja toda la lógica de negocio, DB, y S3.

### Blob URL
URL temporal generada por el navegador (`blob:http://...`). Solo funciona en la sesión actual. NO debe guardarse en DB.

### Bundle
Archivo JavaScript compilado que contiene toda la aplicación. Vite genera bundles optimizados.

## C

### Cache
Sistema de almacenamiento temporal. React Query cachea datos del servidor. Backend cachea templates en memoria.

### CES (Customer Effort Score)
Métrica SmartVOC que mide el esfuerzo del cliente (1-7). Menor es mejor.

### CloudFront
CDN de AWS. Distribuye los frontends globalmente con baja latencia.

### Cognitive Tasks
Conjunto de 8 módulos para tareas cognitivas: Short Text, Long Text, Single Choice, Multiple Choice, Linear Scale, Ranking, Navigation Flow, Preference Test.

### Component
Elemento configurable dentro de un módulo. Puede ser: input, textarea, select, radio, checkbox, file-upload, choices.

### ComponentConfig
Interface TypeScript que define la estructura de un componente:
```typescript
{
  id: string;
  type: 'input' | 'textarea' | ...;
  label: string;
  value?: string;
  // ... más propiedades
}
```

### CORS (Cross-Origin Resource Sharing)
Política de seguridad del navegador. Backend debe permitir requests desde dominios específicos.

### CSAT (Customer Satisfaction)
Métrica SmartVOC que mide satisfacción del cliente (1-5). Mayor es mejor.

### CV (Cognitive Value)
Métrica SmartVOC que mide valor cognitivo.

## D

### Database
PostgreSQL RDS que almacena toda la data del sistema.

### Detractors
En NPS, usuarios que dan rating 0-6. Se consideran insatisfechos.

## E

### Enterprise
Organización o cliente que usa EmotioX. Agrupa usuarios y research.

### ESLint
Linter para JavaScript/TypeScript. Detecta errores y enforce estilo de código.

## H

### HMR (Hot Module Replacement)
Feature de Vite que actualiza el código en el navegador sin recargar la página completa.

### Hitzone
Área clickeable en una imagen. Usada en Navigation Flow para tracking de clicks.

## J

### JSONB
Tipo de dato de PostgreSQL que almacena JSON de forma eficiente. Usado para `module.config`.

### JWT (JSON Web Token)
Formato de token usado por Cognito. Contiene info del usuario codificada.

## L

### Lambda
Servicio serverless de AWS. El backend corre como función Lambda.

### Lazy Loading
Cargar código solo cuando se necesita. Reduce bundle size inicial.

## M

### Media
Archivo subido a S3. Metadata se guarda en tabla `media`.

### Module
Cuestionario o tarea configurable. Parte de un Stage. Contiene Components.

### Module Template
Plantilla predefinida de módulo (ej: "Short Text", "Navigation Flow").

### Monorepo
Repositorio que contiene múltiples proyectos (backend + frontends).

## N

### Navigation Flow
Módulo cognitivo para pruebas de flujo de navegación. Permite definir hitzones en imágenes.

### NEV (Net Emotional Value)
Métrica SmartVOC que mide valor emocional neto.

### NPS (Net Promoter Score)
Métrica SmartVOC que mide probabilidad de recomendar (0-10). Fórmula: `(Promoters - Detractors) / Total * 100`.

## O

### Optimistic Update
Actualizar UI antes de confirmar con servidor. Si falla, hacer rollback.

## P

### Participant
Usuario final que responde un research. Accede vía QR code.

### Participant Frontend
Aplicación React para participantes. URL pública sin autenticación.

### Partialize
Función de Zustand persist que selecciona qué parte del state guardar en localStorage.

### Passives
En NPS, usuarios que dan rating 7-8. Considerados neutrales.

### Placeholder
Texto de ayuda en inputs. Ejemplo: "Escribe aquí...".

### PostgreSQL
Base de datos relacional open-source. Soporta JSONB.

### Presigned URL
URL temporal generada por S3 que permite upload/download sin credenciales AWS.

### Promoters
En NPS, usuarios que dan rating 9-10. Considerados muy satisfechos.

## Q

### QR Code
Código QR que redirige a participant-frontend con ID del research.

### Query
En React Query, representa un request de datos del servidor con cache automático.

### Query Invalidation
Marcar cache como stale para forzar refetch de datos.

## R

### RDS (Relational Database Service)
Servicio de AWS para PostgreSQL managed.

### React Query
Librería para manejo de server state con cache, refetch, y mutations.

### RefreshToken
Token de larga duración (30 días) que permite renovar el AccessToken. Se guarda SIEMPRE, incluso si rememberMe=false.

### Research
Estudio completo con stages y modules. Creado por investigador.

### Research Configuration
Stage especial que SIEMPRE se crea por defecto. Contiene config general del research.

### Research Frontend
Aplicación React para investigadores. Requiere autenticación.

### Response
Conjunto completo de respuestas de un participante a un research.

## S

### S3 (Simple Storage Service)
Servicio de AWS para almacenamiento de archivos. Usado para media files y hosting de frontends.

### S3 Key
Path único del archivo en S3. Ejemplo: `research/uuid/123-image.png`.

### Seed
Script que inserta datos iniciales en DB (templates, etc).

### Selector
En Zustand, función que extrae parte específica del state para evitar re-renders innecesarios.

### Serverless
Arquitectura donde el código corre en funciones efímeras (Lambda) sin servidores persistentes.

### Serverless Framework
Herramienta para deployar funciones serverless a AWS.

### SmartVOC
Conjunto de 5 módulos de análisis emocional: CES, CSAT, NPS, NEV, CV.

### Stage
Etapa de un research. Puede contener uno o múltiples modules.

### Stage Template
Plantilla predefinida de stage (ej: "Smart VOC", "Cognitive Tasks").

### Stale
En React Query, datos que están desactualizados y necesitan refetch.

### Store
En Zustand, objeto global que contiene state y actions.

### Strict Mode
Modo de TypeScript con validaciones más estrictas. Previene errores comunes.

## T

### TailwindCSS
Framework de CSS utility-first. Usado en todos los frontends.

### Template
Patrón predefinido para crear stages o modules rápidamente.

### TypeScript
Superset de JavaScript con tipos estáticos. Usado en todo el proyecto.

## U

### Upload
Proceso de subir archivo a S3 usando presigned URL.

## V

### Vite
Build tool moderno para React. Más rápido que Create React App.

## Z

### Zustand
Librería de state management minimalista. Usado para auth store.

---

## Abreviaciones Comunes

| Abreviación | Significado |
|-------------|-------------|
| API | Application Programming Interface |
| AWS | Amazon Web Services |
| CDN | Content Delivery Network |
| CES | Customer Effort Score |
| CORS | Cross-Origin Resource Sharing |
| CSAT | Customer Satisfaction |
| CV | Cognitive Value |
| DB | Database |
| HMR | Hot Module Replacement |
| JWT | JSON Web Token |
| NEV | Net Emotional Value |
| NPS | Net Promoter Score |
| RDS | Relational Database Service |
| S3 | Simple Storage Service |
| UI | User Interface |
| UX | User Experience |
| UUID | Universally Unique Identifier |

---

## Convenciones de Naming

### Tablas (snake_case)
```
research
stage_templates
module_templates
media
```

### Variables/Functions (camelCase)
```
researchId
getUserById
handleSaveModule
```

### Components (PascalCase)
```
ResearchCard
ModuleEditor
FileUploadAdvanced
```

### Types/Interfaces (PascalCase)
```
Research
ComponentConfig
UploadedFile
```

### Constants (UPPER_SNAKE_CASE)
```
MAX_FILE_SIZE
API_URL
S3_BUCKET_NAME
```

---

## Términos Relacionados

### Stage vs Module
- **Stage**: Contenedor de modules (ej: "Smart VOC")
- **Module**: Cuestionario individual (ej: "NPS")

### Template vs Instance
- **Template**: Patrón predefinido (stage_templates, module_templates)
- **Instance**: Copia creada a partir de template (stages, modules)

### Research vs Study
- Mismo concepto. "Research" es el término usado en el código.

### Participant vs User
- **Participant**: Usuario final que responde (sin cuenta)
- **User**: Investigador con cuenta y autenticación

### Component vs Module
- **Component**: Elemento individual (input, select, etc)
- **Module**: Conjunto de components (ej: "Short Text")

### Upload vs Save
- **Upload**: Subir archivo a S3 (inmediato)
- **Save**: Guardar config de módulo en DB (después de editar)

---

## Relaciones Importantes

```
Enterprise
  └─ User (investigador)
       └─ Research
            └─ Stage
                 └─ Module
                      └─ Component (en config JSONB)

Research
  └─ Response (de participante)
       └─ Answer (a pregunta específica)

Research
  └─ Media (archivos en S3)
```

---

**💡 Tip**: Usa Ctrl+F para buscar términos específicos en este glosario.
