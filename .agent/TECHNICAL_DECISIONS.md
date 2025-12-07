# EmotioX v3 - Decisiones Técnicas y Patrones

Este documento explica **por qué** se tomaron ciertas decisiones técnicas y **cuándo** usar cada patrón.

## 📋 Índice

1. [Estado Global: Zustand vs Context API](#1-estado-global-zustand-vs-context-api)
2. [Server State: React Query](#2-server-state-react-query)
3. [Módulos como JSONB vs Tablas Relacionales](#3-módulos-como-jsonb-vs-tablas-relacionales)
4. [Subida Inmediata vs Lazy Upload](#4-subida-inmediata-vs-lazy-upload)
5. [Serverless vs Traditional Server](#5-serverless-vs-traditional-server)
6. [Monorepo vs Múltiples Repos](#6-monorepo-vs-múltiples-repos)
7. [TypeScript Strict Mode](#7-typescript-strict-mode)
8. [Vite vs Create React App](#8-vite-vs-create-react-app)

---

## 1. Estado Global: Zustand vs Context API

### ✅ Decisión: Zustand

**Por qué:**

```typescript
// ❌ Context API Problem: Re-renders todos los consumers
const AuthContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  
  // TODOS los componentes que usen useContext(AuthContext)
  // se re-renderizan cuando CUALQUIER valor cambia
  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

// ✅ Zustand Solution: Selectores granulares
export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token })
}));

// Solo se re-renderiza si 'user' cambia
const user = useAuthStore((state) => state.user);

// Solo se re-renderiza si 'token' cambia
const token = useAuthStore((state) => state.token);
```

**Cuándo usar Zustand:**
- ✅ Estado que se comparte entre muchos componentes
- ✅ Necesitas acceso fuera de React (interceptors)
- ✅ Necesitas persistencia automática
- ✅ Estado que cambia frecuentemente

**Cuándo usar Context:**
- ✅ Estado que casi nunca cambia (theme, i18n)
- ✅ Prefieres solución nativa de React
- ✅ Proyecto pequeño sin muchos consumers

### Persistencia Automática

```typescript
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      // ... actions
    }),
    {
      name: 'auth-storage',  // localStorage key
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        refreshToken: state.refreshToken  // ✅ SIEMPRE guardar
      })
    }
  )
);
```

**Ventajas:**
- ✅ Token persiste en localStorage automáticamente
- ✅ Se restaura al recargar página
- ✅ No necesitas código manual de persistence

---

## 2. Server State: React Query

### ✅ Decisión: React Query (TanStack Query)

**Por qué:**

```typescript
// ❌ Sin React Query: Boilerplate manual
function ResearchList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetch('/api/research')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);
  
  // Sin cache, sin refetch, sin invalidation
}

// ✅ Con React Query: Automático
function ResearchList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['research'],
    queryFn: () => researchService.getAll()
  });
  
  // ✅ Cache automático
  // ✅ Refetch en background
  // ✅ Invalidation inteligente
}
```

**Características clave:**

1. **Cache Inteligente**
```typescript
// Primera carga: Fetch del servidor
const { data } = useQuery(['research', id], () => fetch(...));

// Segunda carga (mismo componente): Usa cache
const { data } = useQuery(['research', id], () => fetch(...));

// Refetch en background si es stale
```

2. **Invalidación de Cache**
```typescript
// Después de crear research
const mutation = useMutation({
  mutationFn: createResearch,
  onSuccess: () => {
    // Invalida y refetch automático
    queryClient.invalidateQueries(['research']);
  }
});
```

3. **Optimistic Updates**
```typescript
const mutation = useMutation({
  mutationFn: updateModule,
  onMutate: async (newData) => {
    // Cancelar queries en vuelo
    await queryClient.cancelQueries(['module', id]);
    
    // Snapshot del valor anterior
    const previous = queryClient.getQueryData(['module', id]);
    
    // Actualizar cache optimistically
    queryClient.setQueryData(['module', id], newData);
    
    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback en caso de error
    queryClient.setQueryData(['module', id], context.previous);
  }
});
```

**Cuándo usar React Query:**
- ✅ Cualquier dato que venga del servidor
- ✅ Necesitas cache automático
- ✅ Necesitas refetch periódico
- ✅ Necesitas invalidación de cache

**Cuándo NO usar React Query:**
- ❌ Estado local de UI (usar useState)
- ❌ Estado de formularios (usar react-hook-form)
- ❌ Estado global de cliente (usar Zustand)

---

## 3. Módulos como JSONB vs Tablas Relacionales

### ✅ Decisión: JSONB en PostgreSQL

**Por qué:**

```sql
-- ❌ Enfoque Relacional: Muchas tablas
CREATE TABLE modules (
  id UUID PRIMARY KEY,
  name TEXT
);

CREATE TABLE components (
  id UUID PRIMARY KEY,
  module_id UUID REFERENCES modules(id),
  type TEXT,
  label TEXT,
  order_index INTEGER
);

CREATE TABLE component_settings (
  id UUID PRIMARY KEY,
  component_id UUID REFERENCES components(id),
  key TEXT,
  value TEXT
);

-- Problema: Necesitas 3 JOINs para obtener un módulo completo

-- ✅ Enfoque JSONB: Un campo flexible
CREATE TABLE modules (
  id UUID PRIMARY KEY,
  name TEXT,
  config JSONB  -- Todo el módulo aquí
);

-- Obtener módulo completo: 1 query simple
SELECT * FROM modules WHERE id = $1;
```

**Ventajas de JSONB:**

1. **Flexibilidad de Estructura**
```json
{
  "structure": {
    "components": [
      {
        "id": "comp-1",
        "type": "input",
        "label": "Título",
        "placeholder": { "enabled": true, "text": "..." },
        "customField": "cualquier cosa"  // ✅ Fácil agregar campos
      }
    ]
  }
}
```

2. **Queries Eficientes**
```sql
-- Buscar módulos que tengan componentes de tipo "file-upload"
SELECT * FROM modules
WHERE config->'structure'->'components' @> '[{"type": "file-upload"}]';

-- Actualizar un campo específico
UPDATE modules
SET config = jsonb_set(
  config,
  '{structure,components,0,label}',
  '"Nuevo título"'
)
WHERE id = $1;
```

3. **Sin Migraciones para Cambios de Schema**
```typescript
// Agregar nuevo campo a componente: No necesita migración
const component = {
  ...existingComponent,
  newFeature: true  // ✅ Simplemente agrégalo
};
```

**Desventajas:**
- ❌ No puedes hacer FK a campos dentro del JSON
- ❌ Queries complejas pueden ser menos legibles
- ❌ Validación de schema debe hacerse en código

**Cuándo usar JSONB:**
- ✅ Estructura de datos flexible/dinámica
- ✅ No necesitas relaciones complejas
- ✅ Schema puede evolucionar frecuentemente

**Cuándo usar Tablas Relacionales:**
- ✅ Necesitas integridad referencial estricta
- ✅ Muchas queries JOIN complejas
- ✅ Schema muy estable

---

## 4. Subida Inmediata vs Lazy Upload

### ✅ Decisión: Upload Inmediato al seleccionar archivo

**Por qué:**

```typescript
// ❌ Lazy Upload: Subir en "Save Changes"
const handleSaveModule = async () => {
  // 1. Subir archivos (puede tardar mucho)
  const uploadedFiles = await Promise.all(
    files.map(file => uploadToS3(file))
  );
  
  // 2. Guardar módulo
  await saveModule({ files: uploadedFiles });
  
  // Problema: Usuario espera mucho tiempo
  // Si falla upload, pierde todos los cambios
};

// ✅ Immediate Upload: Subir al seleccionar
const handleFileSelect = async (files) => {
  setStatus('uploading');
  
  const uploadedFiles = await Promise.all(
    files.map(file => uploadToS3(file))
  );
  
  setStatus('uploaded');
  setFiles(uploadedFiles);  // Ya tienen s3Key
};

const handleSaveModule = async () => {
  // Archivos ya están en S3, solo guardar referencias
  await saveModule({
    files: files.map(f => ({
      s3Key: f.s3Key,
      mediaId: f.mediaId,
      hitZones: f.hitZones
    }))
  });
  
  // ✅ Save Changes es instantáneo
};
```

**Ventajas:**

1. **UX Mejorada**
   - Usuario ve progreso de upload inmediatamente
   - Puede continuar editando mientras sube
   - "Save Changes" es rápido

2. **Detección Temprana de Errores**
   - Si S3 falla, usuario lo sabe antes de Save Changes
   - Puede reintentar upload sin perder otros cambios

3. **Progreso Visual**
```typescript
<FileUploadAdvanced
  files={files}
  onUploadStart={() => setUploading(true)}
  onUploadComplete={() => setUploading(false)}
  onUploadError={(err) => toast.error(err.message)}
/>

// Muestra:
// "Uploading to S3..." → "✓ Uploaded to S3"
```

**Cuándo usar Immediate Upload:**
- ✅ Archivos grandes (>1MB)
- ✅ UX es prioridad
- ✅ Tienes presigned URLs

**Cuándo usar Lazy Upload:**
- ✅ Archivos muy pequeños
- ✅ Necesitas validación del formulario completo antes de subir
- ✅ No tienes presigned URLs

---

## 5. Serverless vs Traditional Server

### ✅ Decisión: AWS Lambda (Serverless)

**Por qué:**

```yaml
# Serverless (Lambda)
Pros:
  ✅ Auto-scaling (0 a 1000 requests/seg)
  ✅ Pay-per-use (solo pagas cuando se usa)
  ✅ Sin mantenimiento de servidores
  ✅ Deploy rápido con Serverless Framework
  
Cons:
  ❌ Cold starts (~500ms primera request)
  ❌ Límite de 15min por request
  ❌ Más complejo para debugging local

# Traditional Server (EC2)
Pros:
  ✅ Sin cold starts
  ✅ No limits de tiempo de ejecución
  ✅ Más fácil debugging
  
Cons:
  ❌ Siempre pagando (incluso sin tráfico)
  ❌ Necesitas configurar auto-scaling
  ❌ Mantenimiento de servidor (updates, security)
```

**Para EmotioX:**

```javascript
// Patrón de tráfico: Bursty
// - Research se crea ocasionalmente
// - Participantes responden en waves
// - Análisis se consulta esporádicamente

// Lambda es perfecto para esto:
- 0 cost cuando no hay tráfico
- Scale automático cuando llegan 100 participantes
- No necesitas provisionar capacidad
```

**Cold Start Mitigation:**

```typescript
// Mantener Lambda warm con scheduled ping
// cloudwatch-event.yml
events:
  - schedule:
      rate: rate(5 minutes)
      handler: handler.ping
```

**Cuándo usar Serverless:**
- ✅ Tráfico variable/impredecible
- ✅ Múltiples microservicios pequeños
- ✅ Startup/MVP (minimizar costos)

**Cuándo usar Traditional Server:**
- ✅ Tráfico constante y predecible
- ✅ Procesamiento de larga duración (>15min)
- ✅ Necesitas mucho control del ambiente

---

## 6. Monorepo vs Múltiples Repos

### ✅ Decisión: Monorepo

**Por qué:**

```
# Estructura del monorepo
emotioxV3/
├── backend/
├── research-frontend/
├── participant-frontend/
└── shared/  (types, utils)

# Ventajas:
✅ Compartir types entre frontend y backend
✅ Deploy atómico (un commit = todo deploy)
✅ Un solo CI/CD pipeline
✅ Fácil hacer cambios cross-proyecto
```

**Ejemplo de Shared Types:**

```typescript
// shared/types/research.ts
export interface Research {
  id: string;
  name: string;
  stages: Stage[];
}

// Usado en backend
import { Research } from '../../../shared/types/research';

// Usado en frontend
import { Research } from '../../shared/types/research';

// ✅ Siempre sincronizados
// ❌ En repos separados: tendríamos que duplicar o usar npm package
```

**Desventajas:**
- ❌ Repo más grande (más tiempo para clone)
- ❌ CI/CD más complejo (necesita conditional deploys)

**Cuándo usar Monorepo:**
- ✅ Frontends y backend fuertemente acoplados
- ✅ Equipo pequeño (todos trabajan en todo)
- ✅ Necesitas compartir mucho código

**Cuándo usar Multiple Repos:**
- ✅ Equipos separados por proyecto
- ✅ Proyectos con ciclos de release diferentes
- ✅ Necesitas permisos granulares

---

## 7. TypeScript Strict Mode

### ✅ Decisión: Strict Mode Enabled

**Por qué:**

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true
  }
}
```

**Beneficios:**

1. **Catch Errors at Compile Time**
```typescript
// ❌ Sin strict mode: Compila, pero crash en runtime
function getUser(id: string) {
  const users = { '1': 'John' };
  return users[id].toUpperCase();  // Crash si id no existe
}

// ✅ Con strict mode: Error en compile time
function getUser(id: string) {
  const users: Record<string, string | undefined> = { '1': 'John' };
  return users[id]?.toUpperCase();  // ✅ Manejo seguro
}
```

2. **Better IDE Support**
```typescript
// ✅ Autocomplete exacto
interface User {
  name: string;
  email: string;
}

const user: User = {
  name: 'John',
  // ❌ Error: Property 'email' is missing
};
```

3. **Refactoring Seguro**
```typescript
// Cambiar interface
interface Research {
  name: string;
  // description: string;  // Removed
  summary: string;  // Added
}

// ✅ TypeScript señala todos los lugares que necesitan actualización
```

**Costo:**
- ❌ Más verboso (necesitas tipos explícitos)
- ❌ Curva de aprendizaje más alta

**Cuándo usar Strict Mode:**
- ✅ Proyecto de producción
- ✅ Equipo con experiencia en TypeScript
- ✅ Codebase que crecerá mucho

**Cuándo NO usar Strict Mode:**
- ✅ Prototipos rápidos
- ✅ Migrando de JavaScript gradualmente
- ✅ Equipo nuevo en TypeScript

---

## 8. Vite vs Create React App

### ✅ Decisión: Vite

**Por qué:**

```yaml
# Vite
Pros:
  ✅ Build extremadamente rápido (esbuild)
  ✅ HMR instantáneo (<100ms)
  ✅ Dev server rápido
  ✅ Bundles optimizados (code splitting automático)
  
Cons:
  ❌ Ecosistema más nuevo
  ❌ Algunos plugins pueden faltar

# Create React App
Pros:
  ✅ Ecosistema maduro
  ✅ Muchos tutoriales
  
Cons:
  ❌ Build lento (webpack)
  ❌ HMR lento
  ❌ No tiene mantenimiento activo
```

**Comparación de Performance:**

```bash
# Create React App
npm run build
> Building... ⏱️ 45 segundos

# Vite
npm run build
> Building... ⏱️ 8 segundos

# ✅ 5x más rápido
```

**Dev Experience:**

```typescript
// Cambias un componente

// CRA: Esperas ~3 segundos para ver cambio
// Vite: Cambio instantáneo (<100ms)
```

**Cuándo usar Vite:**
- ✅ Proyecto nuevo
- ✅ Performance de desarrollo es importante
- ✅ Necesitas builds rápidos

**Cuándo usar CRA:**
- ✅ Proyecto legacy con CRA
- ✅ Necesitas soporte para IE11
- ✅ Equipo muy familiarizado con webpack

---

## 🎯 Resumen de Decisiones

| Decisión | Elegido | Alternativa | Por qué |
|----------|---------|-------------|---------|
| Estado Global | Zustand | Context API | Performance, persistencia |
| Server State | React Query | useState | Cache, refetch automático |
| Module Storage | JSONB | Tablas relacionales | Flexibilidad, menos migraciones |
| File Upload | Inmediato | Lazy | UX, detección temprana de errores |
| Backend | Lambda | EC2 | Auto-scaling, pay-per-use |
| Repo | Monorepo | Multiple | Compartir types, deploy atómico |
| TypeScript | Strict | Loose | Safety, mejor DX |
| Build Tool | Vite | CRA | Performance, HMR |

---

## 🔄 Cuando Reconsiderar Decisiones

### Escenarios de Cambio:

1. **Zustand → Context API**
   - Si el proyecto se vuelve muy simple
   - Si el equipo prefiere soluciones nativas

2. **JSONB → Relational**
   - Si necesitas muchas queries complejas con JOINs
   - Si la integridad referencial es crítica

3. **Lambda → EC2**
   - Si cold starts se vuelven problema
   - Si tráfico es muy constante y predecible

4. **Monorepo → Multiple Repos**
   - Si los equipos se separan completamente
   - Si los proyectos necesitan ciclos de release diferentes
