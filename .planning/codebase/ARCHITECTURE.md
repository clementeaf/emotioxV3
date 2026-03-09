# Architecture

**Analysis Date:** 2026-03-09

## Pattern Overview

**Overall:** Monorepo with 3 independent sub-projects (backend, research-frontend, participant-frontend) sharing no code. Backend uses a custom Lambda-compatible routing layer on Express; frontends are standard React SPAs.

**Key Characteristics:**
- Backend wraps Express requests into AWS Lambda `APIGatewayProxyEvent` objects, then dispatches through a manual path-matching router (`router.ts`). This is a legacy adapter from an AWS Lambda origin, now running on cPanel/Passenger.
- Each backend module follows a strict **controller + service** pattern with raw SQL queries (no ORM).
- Frontends are fully decoupled SPAs that communicate with the backend exclusively via REST API. Research-frontend requires JWT auth; participant-frontend uses public (unauthenticated) endpoints.
- Database layer includes a PostgreSQL-to-MySQL query converter, a legacy artifact from migrating databases.

## Layers

**Router / Entry Point:**
- Purpose: Receives HTTP requests, normalizes paths, dispatches to module controllers
- Location: `backend/src/router.ts`
- Contains: Path matching via `startsWith()`, lazy dynamic imports of controllers
- Depends on: `backend/src/utils/response.ts` for standardized responses
- Used by: `backend/src/server.ts` (dev), `backend/src/server-cpanel.ts` (production)

**Controllers:**
- Purpose: Parse request events, extract auth, call services, return HTTP responses
- Location: `backend/src/modules/*/[name].controller.ts`
- Contains: Route matching via regex on `event.path`, auth enforcement via `requireAuth()`, JSON body parsing
- Depends on: Services, `backend/src/utils/auth.local.ts`, `backend/src/utils/response.ts`
- Used by: Router via dynamic `import()`

**Services:**
- Purpose: Business logic and database queries
- Location: `backend/src/modules/*/[name].service.ts`
- Contains: Raw SQL queries using `pool.query()`, data transformation, cache management
- Depends on: `backend/src/config/database.ts`, `backend/src/config/cache.ts`
- Used by: Controllers

**Database / Config:**
- Purpose: Connection pooling, query conversion, secrets management
- Location: `backend/src/config/`
- Key files:
  - `backend/src/config/database.ts` - MySQL pool with PG-to-MySQL syntax converter, dev/prod table prefix routing via `AsyncLocalStorage`
  - `backend/src/config/cache.ts` - In-memory cache
  - `backend/src/config/secrets.ts` - Environment variable / SSM parameter loading
  - `backend/src/config/s3.ts` - AWS S3 client for media
  - `backend/src/config/cognito.ts` - Legacy Cognito client (mostly unused)
- Depends on: Environment variables from `.env`
- Used by: All services

**Research Frontend (React SPA):**
- Purpose: Dashboard for researchers to create/configure studies, view results
- Location: `research-frontend/src/`
- Layers:
  - Pages (`pages/`) - Route-level components, each maps to a route in `config/routes.tsx`
  - Components (`components/`) - UI building blocks organized by domain (research, modules, results, ui, layout)
  - Services (`services/`) - API call wrappers, one per backend module
  - Stores (`stores/auth.store.ts`) - Zustand auth state with localStorage persistence
  - Hooks (`hooks/`) - React Query wrappers and reusable logic
  - Types (`types/`) - Shared TypeScript interfaces

**Participant Frontend (React SPA):**
- Purpose: Survey experience for research participants
- Location: `participant-frontend/src/`
- Layers:
  - Pages (`pages/`) - Only 3 routes: HomePage, ResearchPage, EyeTrackingTestPage
  - Components: steps (`components/steps/`), renderers (`components/renderers/`), questions (`components/questions/`), ui (`components/ui/`)
  - Stores (`stores/`) - `useSessionStore.ts` (session tracking), `useParticipantStore.ts` (response accumulation)
  - Services (`services/`) - `public.service.ts` (fetch research), `response.service.ts` (submit responses), `config.service.ts`, `media.service.ts`
  - Hooks (`hooks/`) - Navigation, validation, device/location collection, session timing

## Data Flow

**Researcher Creates/Edits a Research Study:**

1. Research-frontend pages use React Query hooks (e.g., `useResearchQuery`) to fetch/mutate data
2. Hooks call service functions in `research-frontend/src/services/research.service.ts`
3. Services use `apiClient` (`research-frontend/src/services/api/client.ts`) - an Axios instance with JWT interceptor
4. Axios sends request to `https://emotio.cx/api/research/...`
5. Backend `server-cpanel.ts` receives request, converts to `APIGatewayProxyEvent`, calls `route()`
6. `router.ts` matches path prefix, dynamically imports `research.controller.ts`
7. Controller calls `requireAuth()` to verify JWT, then calls `research.service.ts`
8. Service executes SQL via `pool.query()` which auto-converts PG syntax to MySQL
9. Response flows back as `{ statusCode, headers, body }` Lambda-style result

**Participant Completes a Survey:**

1. Participant visits `/participant/research/:researchId`
2. `ResearchPage.tsx` calls `publicService.getResearch(researchId)` (no auth)
3. Backend `public.controller.ts` returns full research with stages and modules
4. `ResearchPage.tsx` builds ordered step list: Welcome -> Demographics -> Modules (by stage order) -> ThankYou
5. Each module renders via `DynamicStep.tsx` which routes to `SmartVOCRenderer`, `CognitiveTaskRenderer`, or input renderers
6. Participant responses accumulate in `useParticipantStore`
7. On completion, `responseService.submitResponses()` POSTs to `/public/research/:id/responses`

**API Configuration Discovery:**

1. Both frontends use `ConfigService` (singleton) to discover API endpoints at runtime
2. ConfigService loads `runtime-config.json` from the frontend's public directory to get `apiBaseUrl`
3. Then fetches `/config` from backend to get full endpoint map, feature flags, and limits
4. All subsequent API calls use `configService.getEndpoint(category, action)` for URL construction

**State Management:**
- Research-frontend: Zustand (`auth.store.ts`) for auth state with localStorage/sessionStorage fallback for JWT tokens. React Query for all server state.
- Participant-frontend: Zustand stores for session (`useSessionStore`) and accumulated responses (`useParticipantStore`). No React Query - direct service calls.

**Real-time Monitoring:**
- Backend implements SSE (Server-Sent Events) via `backend/src/modules/monitor/monitor-sse.service.ts`
- Research-frontend connects via `useMonitoringReceiver` hook
- SSE chosen over WebSocket for cPanel/Passenger compatibility

## Key Abstractions

**Module System:**
- Purpose: Represents configurable research components (NPS, CSAT, CES, CV, NEV, VOC for SmartVOC; Ranking, Choice, Text, Scale, Navigation Flow, Preference Test for Cognitive Tasks)
- Backend: `backend/src/modules/modules/modules.service.ts` - CRUD for modules with JSON config
- Research-frontend types: `research-frontend/src/types/moduleBuilder.types.ts` - ComponentType union
- Participant-frontend types: `participant-frontend/src/types/module.ts` - ModuleConfig, ModuleComponent
- Pattern: Modules have a `type` field and a `config` JSON column. Components within modules are defined in the config JSON.

**Stage System:**
- Purpose: Groups modules into ordered sections within a research study
- Tables: `stages` (with `display_order`), linked to `modules`
- Pattern: Research -> Stages (ordered) -> Modules (ordered within stage)

**Template System:**
- Purpose: Predefined module/stage configurations that seed new research studies
- Backend: `backend/src/modules/module-templates/`, `backend/src/modules/stage-templates/`
- Tables: `module_templates`, `stage_templates`, `stage_templates_module_templates` (junction)
- Pattern: When creating a research, `use_default_modules` clones templates into real modules

**Dev/Prod Table Prefixing:**
- Purpose: Isolates development data from production in the same MySQL database
- Location: `backend/src/config/database.ts`
- Pattern: `AsyncLocalStorage` captures request origin. If localhost, all table names get `dev_` prefix via regex replacement before query execution.

## Entry Points

**Backend - Development:**
- Location: `backend/src/server.ts`
- Triggers: `npm run dev` (tsx watch)
- Responsibilities: Express server on port 3000, converts Express req to Lambda event, calls `route()`

**Backend - Production (cPanel/Passenger):**
- Location: `backend/src/server-cpanel.ts` (compiled to `backend/dist/server-cpanel.js`), bootstrapped by `backend/server-cpanel.js`
- Triggers: Passenger process manager
- Responsibilities: Full Express server with multer file upload, SSE endpoint handling, media serving, same Lambda event conversion

**Backend - Lambda (Legacy):**
- Location: `backend/src/handler.ts`
- Triggers: Was AWS API Gateway, currently unused
- Responsibilities: Direct Lambda handler calling `route()`

**Research Frontend:**
- Location: `research-frontend/src/main.tsx` -> `research-frontend/src/App.tsx`
- Basename: `/research` (production), `/` (development)
- Responsibilities: React app with BrowserRouter, lazy-loaded layouts (AuthLayout, DashboardLayout), route config in `research-frontend/src/config/routes.tsx`

**Participant Frontend:**
- Location: `participant-frontend/src/main.tsx` -> `participant-frontend/src/App.tsx`
- Basename: `/participant` (production), `/` (development)
- Responsibilities: React app with createBrowserRouter, 3 routes only

## Error Handling

**Strategy:** Try/catch at controller level with standardized error responses

**Patterns:**
- Controllers wrap all logic in try/catch, return `error(message, statusCode)` from `backend/src/utils/response.ts`
- Auth errors use custom `AuthError` class (`backend/src/utils/auth.local.ts`) with `statusCode: 401` and typed error codes (`NO_TOKEN`, `INVALID_TOKEN`)
- Services throw errors which controllers catch and translate to HTTP responses
- Research-frontend: Multi-layer ErrorBoundary system - `ErrorBoundary` (global), `RouteErrorBoundary` (per layout context), `PageErrorBoundary` (per page)
- Research-frontend: Axios interceptor handles 401 by attempting token refresh, then logout on failure
- Participant-frontend: `ErrorScreen` component for fatal errors, individual step error handling

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.error` throughout backend with `[ModuleName]` prefix tags (e.g., `[Research Service]`, `[DB Router]`, `[Public API]`). No structured logging framework.

**Validation:** Zod + React Hook Form in research-frontend for form validation. Backend validates at service level with manual checks. Participant-frontend has `useValidation` hook.

**Authentication:** JWT tokens verified via `backend/src/utils/auth.local.ts`. Research-frontend attaches JWT via Axios request interceptor from Zustand store. Public/participant endpoints skip auth entirely. Google OAuth supported as login method.

**Internationalization:** Both frontends use `react-i18next` with ES/EN locales. Participant-frontend: `participant-frontend/src/i18n/locales/`. Research-frontend: implied by i18n imports.

**CORS:** Configured in both `server.ts` and `server-cpanel.ts` with allowlist of localhost ports and `emotio.cx` domains. Dynamic origin validation.

**Media:** Files uploaded via multer (cPanel) or presigned S3 URLs (dev/legacy). Media URLs are relative (`/api/media/...`); frontends resolve them to absolute via `resolveMediaUrl()` utility.

---

*Architecture analysis: 2026-03-09*
