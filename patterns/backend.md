# Backend Patterns — EmotioX V3

## Architecture

```
backend/src/
├── server.ts              # Dev entry (localhost:3000)
├── server-cpanel.ts       # cPanel/Passenger entry (loads .env, multer, media serving)
├── handler.ts             # AWS Lambda entry (legacy, unused)
├── router.ts              # Master dispatch (~900 lines): path normalization, CORS, route matching
├── config/
│   ├── database.ts        # MySQL pool, PG→MySQL conversion, AsyncLocalStorage context
│   └── cache.ts           # In-memory Map cache with TTL
├── modules/
│   ├── auth/              # JWT + Google OAuth
│   ├── research/          # Research CRUD + stages
│   ├── modules/           # Module CRUD + templates
│   ├── responses/         # Response saving + retrieval
│   ├── analytics/         # SmartVOC, CT, NavFlow, PrefTest aggregations
│   ├── monitor/           # SSE real-time connections
│   ├── media/             # File upload (S3 presigned or filesystem)
│   ├── cache/             # Cache management endpoints
│   ├── config/            # App config + service discovery
│   ├── quotas/            # Quota enforcement
│   └── stages/            # Stage management
└── utils/
    ├── response.ts        # success(), error(), CORS headers, cookies
    └── auth.local.ts      # verifyToken(), requireAuth()
```

---

## Module Pattern (Controller + Service)

### Controller

```typescript
export const handleResearchRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { httpMethod, path } = event;
  const origin = getRequestOrigin(event);

  try {
    const user = await requireAuth(event);  // JWT verification, throws 401

    // Route matching with regex
    const match = path.match(/^\/research\/([^/]+)$/);
    if (match && httpMethod === 'GET') {
      const result = await researchService.getById(match[1], user.id);
      return success(result, 200, [], origin);
    }

    return error('Not found', 404, [], origin);
  } catch (err) {
    if (isAuthError(err)) return error(err.message, err.statusCode, [], origin);
    return error('Internal error', 500, [], origin);
  }
};
```

### Service

```typescript
// Pure database queries, no HTTP concerns
class ResearchService {
  async getById(id: string, userId: string): Promise<Research> {
    const { rows } = await pool.query('SELECT * FROM researches WHERE id = ? AND user_id = ?', [id, userId]);
    if (!rows.length) throw { message: 'Not found', statusCode: 404 };
    return rows[0];
  }
}
```

### Separation

| Layer | Responsibility |
|-------|---------------|
| Controller | HTTP handling, auth, route matching, error mapping |
| Service | Business logic, DB queries, data transformation |
| Router | Path normalization, CORS preflight, dynamic dispatch |

---

## Router (Master Dispatch)

```typescript
// router.ts handles:
// 1. Normalize path: remove API Gateway stage prefix (/dev/, /prod/)
// 2. CORS: OPTIONS → 200 with headers
// 3. Route dispatch: regex matching → dynamic import controller
// 4. 404 fallback

const normalizePath = (rawPath: string, stage?: string): string => { ... };

// Dynamic module loading
if (path.startsWith('/research')) {
  const { handleResearchRoutes } = await import('./modules/research/research.controller');
  return handleResearchRoutes(event);
}
```

---

## Database

### MySQL Pool (pg-compatible wrapper)

```typescript
// Single pool: mysql2/promise
const pool = createPool({
  host, port, user, password, database,
  connectionLimit: 10,
  ssl: autoDetected
});

// PG→MySQL auto-conversion
pool.query('SELECT * FROM users WHERE id = $1', [id])
// → converted to: 'SELECT * FROM users WHERE id = ?', [id]

// Conversions handled:
// $1, $2, $N → ?
// ::type casts → removed
// ILIKE → LIKE
// JSON_AGG → JSON_ARRAYAGG
// NOW() preserved
```

### AsyncLocalStorage

```typescript
// Tracks request origin for environment detection
const requestContext = new AsyncLocalStorage<{ origin: string }>();
// Used in database.ts to route queries (future: dev vs prod tables)
```

---

## Authentication

### JWT Strategy

```
Access Token:  24h, signed with JWT_SECRET
Refresh Token: 48h (rememberMe) or session cookie, signed with JWT_REFRESH_SECRET
```

### Auth Middleware

```typescript
// utils/auth.local.ts
async function requireAuth(event: APIGatewayProxyEvent): Promise<User> {
  // 1. Extract token from Authorization header or cookies
  // 2. jwt.verify(token, JWT_SECRET)
  // 3. Return decoded user payload
  // 4. Throw { statusCode: 401, message: 'Unauthorized' } on failure
}
```

### Cookie Configuration

```typescript
resolveCookieAttributes(origin) → {
  localhost:    { secure: false, sameSite: 'Lax' }
  emotio.cx:   { secure: true,  sameSite: 'Lax' }
  cross-site:  { secure: true,  sameSite: 'None' }
}
```

### Google OAuth

```
POST /auth/google       → generates consent URL, redirects
GET  /auth/google/callback → handles callback, creates/finds user, sets JWT cookies, redirects to frontend
```

---

## Response Helpers

```typescript
// utils/response.ts
success<T>(data: T, statusCode = 200, cookies?: string[], origin?: string)
error(message: string, statusCode = 500, cookies?: string[], origin?: string)

// Returns APIGatewayProxyResult format:
{
  statusCode,
  headers: getCorsHeaders(origin),
  multiValueHeaders: { 'Set-Cookie': cookies },
  body: JSON.stringify(data)
}

// CORS headers include:
// Access-Control-Allow-Origin: {origin} (if allowlisted)
// Access-Control-Allow-Credentials: true
// Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
// Access-Control-Expose-Headers: Set-Cookie
```

---

## Caching

```typescript
// In-memory Map with TTL
cache.get<T>(key): T | null
cache.set<T>(key, value, ttl = MEDIUM)
cache.getOrSet<T>(key, fetchFn, ttl): Promise<T>
cache.deletePattern(pattern): number

// TTL presets
SHORT: 60s | MEDIUM: 300s | LONG: 900s | VERY_LONG: 3600s | DAY: 86400s

// Key convention: category:identifier
// e.g. research:abc123, research_types:list, module_template:xyz
```

---

## SSE (Server-Sent Events)

```typescript
// monitor.service.ts
registerConnection(connectionId, researchId, userId, response)
broadcastToResearch(researchId, eventType, data)

// Endpoint: GET /monitor/events/:researchId?token=xxx
// Events: connected, smartvoc-update, participant:login, participant:step, participant:completed, research:update

// Trigger flow:
// participant submits → responses.save() → monitorService.notifyResearchUpdate() → SSE broadcast
```

---

## Analytics Aggregation

```typescript
// analytics.service.ts
getSmartVOCResults(researchId)     → NPS score, CSAT%, CES avg, CV%, NEV emotions, VOC text
getCognitiveTaskResults(researchId) → responses grouped by module
getNavigationFlowResults(researchId, moduleId)  → completion rate, accuracy, heatmap data
getPreferenceTestResults(researchId, moduleId)  → selection counts, view times
getChoiceResponses(researchId, moduleId)        → choice distributions
getScaleResponses(researchId, moduleId)         → scale averages, distributions
getRankingResponses(researchId, moduleId)       → ranking positions
```

---

## Media Handling

```typescript
// Two modes:
// 1. S3 presigned URLs (dev/AWS legacy)
generateUploadUrl(data) → POST /media/upload → returns presigned S3 URL

// 2. Filesystem (cPanel production)
// server-cpanel.ts configures multer for local file uploads
// Static serving: express.static for /media/* path
```

---

## Response Storage

```typescript
// responses table: stores all participant answers
save(researchId, participantId, moduleId, questionId, answer, metadata)
// answer: JSON.stringify(value) — flexible type (string | number | boolean | object | array)
// metadata: optional module-specific context (timing, clicks, coordinates)
```

---

## Error Convention

```typescript
// Service throws with statusCode
throw { message: 'Research not found', statusCode: 404 };

// Controller catches with type guard
if (isAuthError(err)) return error(err.message, err.statusCode, [], origin);

// isAuthError: checks for statusCode property on error object
```
