# Fullstack Patterns — EmotioX V3

## Data Flow

```
React Component
  → Custom Hook (useResearch, useSmartVOCAnalytics)
    → React Query (caching, dedup, mutations)
      → Service Layer (singleton class, axios wrapper)
        → ApiClient (auth headers, token refresh, error conversion)
          → Backend API (Express/Passenger on cPanel)
            → Controller (route matching, auth, CORS)
              → Service (DB queries, business logic)
                → MySQL Pool (pg-compatible, auto-converts syntax)
```

---

## Request Lifecycle

### Outbound (Frontend → Backend)

```
1. Component calls hook:          useResearch(id)
2. Hook calls React Query:        useQuery({ queryFn: () => service.getById(id) })
3. Service calls ApiClient:       apiClient.get(`/research/${id}`)
4. Axios interceptor:             adds Authorization: Bearer {token}
5. Request hits backend router:   router.ts normalizes path, dispatches to controller
6. Controller:                    requireAuth(event) → validates JWT
7. Service:                       pool.query('SELECT ...') → returns data
8. Controller:                    success(data, 200, [], origin) → adds CORS headers
9. Response returns through chain
```

### 401 Auto-Refresh

```
1. Response interceptor detects 401
2. Acquires single refresh lock (prevents concurrent refreshes)
3. POST /auth/refresh with refreshToken
4. Updates token in Zustand store + storage
5. Retries original request with new token
6. All queued 401 requests resolve with new token
7. If refresh fails → logout()
```

---

## Auth Architecture

### Token Flow

```
Frontend                          Backend
────────                          ───────
POST /auth/login                  → validate credentials
  { email, password, rememberMe } → generate JWT (24h) + refresh (48h)
                                  ← Set-Cookie + body: { token, refreshToken }

GET /auth/me                      → verify JWT from cookie or header
  Authorization: Bearer {token}   ← { user }

POST /auth/refresh                → verify refresh token
  Cookie: refreshToken            → generate new JWT
                                  ← Set-Cookie + body: { token }
```

### Storage Strategy

| Storage | When | What |
|---------|------|------|
| Memory (Zustand) | Always | Current token for Authorization header |
| localStorage | rememberMe=true | Token + refreshToken (persistent) |
| sessionStorage | rememberMe=false | Token + refreshToken (session only) |
| httpOnly cookies | Always (backend sets) | Preferred auth method |

---

## API Contract

### Request Format

```
GET    /api/{resource}              → list
GET    /api/{resource}/:id          → get by ID
POST   /api/{resource}              → create
PUT    /api/{resource}/:id          → update
DELETE /api/{resource}/:id          → delete
PATCH  /api/{resource}/:id/status   → partial update
```

### Response Format

```typescript
// Success
{ statusCode: 200, body: JSON.stringify(data), headers: { CORS } }

// Error
{ statusCode: 4xx|5xx, body: JSON.stringify({ error: "message" }), headers: { CORS } }

// With cookies
{ multiValueHeaders: { 'Set-Cookie': ['token=...', 'refreshToken=...'] } }
```

### CORS

```
Allowed origins: localhost:*, emotio.cx
Credentials: true (withCredentials)
Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Exposed: Set-Cookie
```

---

## Real-Time Architecture (SSE)

```
Participant submits response
  → backend: responses.save() → INSERT INTO responses
  → backend: monitorService.notifyResearchUpdate(researchId, payload)
  → backend: broadcastToResearch(researchId, 'smartvoc-update', freshAnalytics)
  → SSE push to all connected research-frontend clients
  → research-frontend: useSmartVOCAnalytics setData(newData)
  → UI re-renders with live data

Connection: GET /monitor/events/:researchId?token=xxx
Events: connected, smartvoc-update, participant:login, participant:step, participant:completed
```

---

## Media URL Resolution

```
Backend stores:    /api/media/abc123          (relative path)
Frontend resolves: https://emotio.cx/api/media/abc123  (absolute)

// Both frontends have resolveMediaUrl():
function resolveMediaUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${backendOrigin}${path}`;
}
```

---

## Module Configuration Flow

### Research Builder (save)

```
1. ResearchBuilderPage collects data from module card refs:
   moduleRef.current.getComponentValues()   → { [componentId]: value }
   moduleRef.current.getComponents()        → ComponentConfig[]
   moduleRef.current.getHidden()            → boolean (explicit toggle)
   moduleRef.current.getRequired()          → boolean

2. Transforms to backend format:
   { config: { structure: { components } }, hidden, required }

3. PUT /modules/:id → backend saves JSON config to modules table

4. Invalidates React Query cache → UI refreshes
```

### Participant Survey (response)

```
1. ResearchPage loads research config: GET /research/:id
2. Renders steps based on stages/modules
3. Participant interacts → local state in Zustand store
4. On step complete: POST /responses → saves answer
5. Backend triggers SSE broadcast → research-frontend updates live
```

---

## Demographics Configuration

```
Research Frontend (Modal UI)
  → demographicsMapper.ts transforms modal output
    → mapModalConfigToBackend(type, config)
      → age:     { ranges, disqualifications, quotas }
      → country: { countries, granularity, quotas }
      → gender:  { options, quotas, disqualifications }
      → generic: { options, quotas } (education, income, employment, etc.)
  → Saved as JSON in research configuration module

Participant Frontend (Survey Step)
  → DemographicsStep reads config from research
  → Renders appropriate inputs per demographic type
  → Validates against quotas/disqualifications
  → Submits demographic responses
```

---

## Config Service Discovery

```
Frontend startup:
  1. ConfigService.init() fetches runtime-config.json
  2. Sets apiClient.setBaseUrl(apiBaseUrl)
  3. Fetches /config from backend → endpoint mappings, features, limits
  4. configService.getEndpoint('research', 'getById', { id }) → '/research/abc123'

Backend:
  GET /config → returns { endpoints, features, limits, cache }
```

---

## Error Handling Chain

```
Backend Service:   throw { message: 'Not found', statusCode: 404 }
Backend Controller: catch → isAuthError(err) → error(msg, status, [], origin)
Axios Response:    throws AxiosError with response.data
Frontend Service:  handleError(err) → new Error(message)
React Query:       catches error → sets error state
Component:         if (error) return <LoadingErrorStates />
Toast:             onError: (err) => toast.error(err.message)
```

---

## Type Duplication

```
No shared code between subprojects. Types defined independently:

Backend:            src/modules/*/types.ts
Research Frontend:  src/types/, src/services/api/types.ts
Participant FE:     src/types/

Shared concepts duplicated:
  - User, Research, Module, Response interfaces
  - ComponentType union
  - LocationGranularity type
  - API response wrappers
```

---

## Environment Parity

```
                    Dev                         Prod
Frontend server:    Vite (localhost:12800/5174)  Apache (cPanel static)
Backend server:     tsx watch (localhost:3000)   Passenger (server-cpanel.js)
API URL:            https://emotio.cx/api       https://emotio.cx/api
Database:           emotvehe_emotiox            emotvehe_emotiox (same)
Media:              S3 presigned (legacy)       Filesystem (cPanel)
Auth cookies:       secure: false, Lax          secure: true, Lax
```

Both environments share the same database. No local backend in standard dev flow — frontends always hit production API.
