# Frontend Patterns — EmotioX V3

## Component Architecture

### Three-Tier Component Hierarchy

```
Page (orchestrator)         → data loading, save logic, routing
  Card/Module (domain)      → forwardRef + useImperativeHandle, memoized
    Editor/UI (leaf)        → pure functional, switch on type, no state
```

- Pages: load data via React Query hooks, orchestrate children, handle navigation
- Cards: expose getters via `useImperativeHandle` for parent to collect on save
- Editors: switch on `component.type`, one renderer per type, never inline in switch/case

### Props Interface Convention

```typescript
interface ComponentProps {
  // Business data first
  item: DataType;
  // Callbacks
  onChange: (value: Type) => void;
  onSave?: (data: Data) => void;
  onClose?: () => void;
  // UI state
  isOpen?: boolean;
  isLoading?: boolean;
  // Optional customization last
  className?: string;
}
```

### Ref Pattern (Module Cards)

```typescript
export interface SmartVOCModuleCardRef {
  getComponentValues(): Record<string, string>;
  getComponents(): ComponentConfig[];
  getRequired(): boolean;
  getHidden(): boolean;
}

const SmartVOCModuleCard = forwardRef<Ref, Props>((props, ref) => {
  useImperativeHandle(ref, () => ({ getComponentValues, getComponents, getRequired, getHidden }));
});

// Parent collects on save:
const values = moduleRef.current?.getComponentValues();
```

---

## State Management

### Three-Tier State

| Tier | Tool | Scope | Examples |
|------|------|-------|---------|
| Global | Zustand | Auth, user | `useAuthStore` |
| Server | React Query | Async data | `useResearch(id)`, `useResearches()` |
| Local | useState | UI-only | modals, form values, toggles |

**Rule:** Never duplicate server state locally — derive with `useMemo`.

### Zustand Store Shape

```typescript
// Single store for auth
useAuthStore = create({
  user: User | null,
  token: string | null,
  rememberMe: boolean,
  isLoading: boolean,
  error: string | null,
  // Actions
  login, bootstrapSession, register, updateProfile, logout, setToken, clearError
})
```

- Persistence: localStorage (rememberMe=true) / sessionStorage (session-only)
- No persist middleware — manual save/restore in actions

### React Query Convention

```typescript
// Hierarchical query keys
researchKeys = {
  all: ['researches'],
  lists: () => [...all, 'list'],
  list: (filters?) => [...lists(), filters],
  details: () => [...all, 'detail'],
  detail: (id) => [...details(), id]
}

// Standard hook
useResearch(id) = useQuery({
  queryKey: researchKeys.detail(id),
  queryFn: () => requestDeduplicator.dedupe(`research-${id}`, () => researchService.getById(id)),
  enabled: !!id,
  staleTime: 5 * 60 * 1000,    // 5 min
  gcTime: 10 * 60 * 1000,      // 10 min
  retry: false,
  refetchOnWindowFocus: false,
})

// Mutations invalidate related queries
useCreateResearch() = useMutation({
  mutationFn: researchService.create,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: researchKeys.lists() }),
})
```

---

## Data Fetching

### API Client (Singleton Axios)

```typescript
class ApiClient {
  get<T>(url, config): Promise<T>
  post<T>(url, data, config): Promise<T>
  put<T>(url, data, config): Promise<T>
  delete<T>(url, config): Promise<T>
}

// Request interceptor: adds Authorization: Bearer {token}
// Response interceptor: 401 → single-lock refresh → retry original request
```

### Request Deduplication

```typescript
const result = await requestDeduplicator.dedupe('research-123', () => api.get('/research/123'));
// Concurrent calls for same key share one Promise
```

### Service Layer Convention

```typescript
class ResearchService {
  list(): Promise<Research[]>           // GET /research
  getById(id): Promise<Research>        // GET /research/:id
  create(data): Promise<Research>       // POST /research
  update(id, data): Promise<Research>   // PUT /research/:id
  delete(id): Promise<void>            // DELETE /research/:id
  private handleError(err): never      // Converts axios errors to Error
}
// Exported as singleton: export const researchService = new ResearchService()
```

### Real-Time (SSE)

```typescript
// Combined REST + SSE pattern
useSmartVOCAnalytics(researchId) {
  // 1. Initial fetch via REST
  const [data, setData] = useState(null);
  useEffect(() => { fetchInitial().then(setData); }, []);

  // 2. SSE for live updates
  useEffect(() => {
    const es = new EventSource(`/monitor/events/${researchId}?token=${token}`);
    es.addEventListener('smartvoc-update', (e) => setData(JSON.parse(e.data)));
    return () => es.close();
  }, [researchId]);
}
```

---

## UI Patterns

### Error & Loading States

```typescript
// Query-level → component-level fallback
const { data, isLoading, error } = useResearch(id);
if (error) return <LoadingErrorStates type="error" error={error} onBack={() => navigate('/research')} />;
if (isLoading) return <LoadingErrorStates type="loading" />;

// Toast for user feedback on mutations
const { toast } = useToast();
onError: (err) => toast.error(err.message)
```

### Modal Pattern

```typescript
// Base: generic Modal with portal rendering
<Modal isOpen={isOpen} onClose={onClose} title="..." size="lg" footer={<Button>Save</Button>}>
  {content}
</Modal>

// Domain modals extend base: CountryConfigModal, AgeConfigModal, etc.
// Internal state: tab switching, filtering, editing
// Quota management via useQuotaManagement hook
```

### Form Patterns

```typescript
// React Hook Form + Zod
const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
  resolver: zodResolver(loginSchema),
});
<Input {...register('email')} error={errors.email?.message} />

// Controlled inputs (EditableComponent)
const [componentValues, setComponentValues] = useState<Record<string, string>>({});
<Input value={componentValues[id] || ''} onChange={(e) => handleChange(id, e.target.value)} />
```

### Memoization Rules

```typescript
// useMemo for filtered/derived data
const filtered = useMemo(() => items.filter(...), [items, filter]);

// useCallback for handlers passed to children
const handleCopy = useCallback(async () => { ... }, [toast]);

// memo() for expensive row components
const ResearchTableRow = memo(({ research }) => { ... });
```

---

## Module Builder Type System

```typescript
// ComponentConfig: unified shape for all editable fields
interface ComponentConfig {
  id: string;
  type: ComponentType;  // 'input' | 'textarea' | 'select' | 'radio' | 'file-upload' | 'choices' | 'ranking' | 'ranking-list' | ...
  label: string;
  value: string;
  // Type-specific nested configs
  selectRange?: SelectRangeConfig;
  fileUpload?: FileUploadConfig;
  choicesConfig?: ChoicesConfig;
  rankingConfig?: RankingConfig;
  validation?: ValidationConfig;
}

// useModuleComponents hook: loads from config.structure.components, questions[], or template
// EditableComponent: switch on type → renders specific editor
```

---

## Routing

```typescript
// Centralized route config array
routesConfig: RouteConfig[] = [
  { path: '/research/:id/builder', element: <ResearchBuilderPage />, layout: 'dashboard', isProtected: true },
  ...
]

// URL-driven state in pages
const { id, moduleId, stageId } = useParams();
const navigate = useNavigate();

// Lazy loading
const DashboardLayout = lazy(() => import('./DashboardLayout'));
// Wrapped in Suspense with LayoutLoader
```

---

## Build & Code Splitting

```typescript
// Vite manual chunks
manualChunks: {
  'react-vendor':  [react, react-dom, react-router-dom],
  'query-vendor':  [@tanstack/react-query],
  'ui-vendor':     [@dnd-kit/*],
  'form-vendor':   [react-hook-form, zod],
  'chart-vendor':  [recharts],
}

// Base path: dev='/', prod='/research/'
// Console/debugger dropped in production
// Source maps disabled in production
```

---

## Config Resolution

```typescript
// Runtime config loading priority (ConfigService.init):
1. /research/runtime-config.json   (cPanel)
2. /runtime-config.json            (root)
3. VITE_API_URL env var
4. https://emotio.cx/api           (fallback)

// Media URL resolution
resolveMediaUrl(path) → prepends backend origin to relative /api/media/... paths
```

---

## Auth Flow

```
Login → store token (memory + storage) → fetch /auth/me → store user
Refresh → axios interceptor detects 401 → single-lock refresh → retry
Bootstrap → AuthProvider calls bootstrapSession() once on mount
Logout → clear store + storage + call /auth/logout
```

---

## i18n

- **Research frontend:** Framework installed, not fully implemented
- **Participant frontend:** Full i18n with react-i18next (ES/EN)
- Translation keys in `src/i18n/locales/{es,en}.json`
- `useTranslation()` hook in components

---

## Error Boundaries

```
Global ErrorBoundary (App.tsx)
  └─ RouteErrorBoundary (per layout)
       └─ PageErrorBoundary (per page, optional, with pageName)
```

Each renders fallback UI with retry/back options.
