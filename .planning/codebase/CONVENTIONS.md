# Coding Conventions

**Analysis Date:** 2025-03-09

## Naming Patterns

**Files:**
- Backend modules: `kebab-case` directories, `kebab-case.controller.ts` / `kebab-case.service.ts` (e.g., `backend/src/modules/auth/auth.controller.ts`, `backend/src/modules/module-templates/module-templates.controller.ts`)
- Frontend services: `camelCase.service.ts` (e.g., `research-frontend/src/services/research.service.ts`, `smartVOC.service.ts`)
- Frontend stores: `camelCase.store.ts` or `useCamelCase.ts` (e.g., `research-frontend/src/stores/auth.store.ts`, `participant-frontend/src/stores/useSessionStore.ts`)
- Frontend hooks: `useCamelCase.ts` (e.g., `research-frontend/src/hooks/useResearchQuery.ts`)
- React components: `PascalCase.tsx` (e.g., `research-frontend/src/components/ui/Button.tsx`, `participant-frontend/src/components/steps/DemographicsStep.tsx`)
- Utility files: `camelCase.ts` (e.g., `research-frontend/src/utils/demographicsMapper.ts`)
- Type files: `camelCase.types.ts` (e.g., `research-frontend/src/types/moduleBuilder.types.ts`)

**Functions:**
- Use `camelCase` for all functions and methods
- React hooks: prefix with `use` (e.g., `useResearchQuery`, `useDeviceCollector`)
- Backend controllers export a single `handleXxxRoutes` function (e.g., `handleAuthRoutes`, `handleModulesRoutes`)
- Backend services export individual functions (e.g., `create`, `update`, `deleteModule`)

**Variables:**
- Use `camelCase` for variables and parameters
- Constants: `UPPER_SNAKE_CASE` for true constants (e.g., `STORAGE_KEYS`, `DEFAULT_PRODUCTION_API_BASE_URL`)
- Database columns: `snake_case` (e.g., `research_id`, `order_index`, `created_at`)

**Types/Interfaces:**
- Use `PascalCase` for types and interfaces (e.g., `AuthState`, `ResearchData`, `ModuleConfig`)
- Interface names describe the shape directly -- no `I` prefix (e.g., `ButtonProps`, not `IButtonProps`)
- Use `type` imports with `import type` syntax where possible

## Code Style

**Formatting:**
- No Prettier configured -- formatting relies on ESLint and editor defaults
- Indentation: 4 spaces in backend, mixed 2/4 in frontends (no strict enforcement)
- Semicolons: always used
- Quotes: single quotes for strings

**Linting:**
- ESLint flat config (`eslint.config.js`) in both frontends
- Backend has no ESLint config -- relies on TypeScript compiler strict mode
- Key rules (both frontends):
  - `@typescript-eslint/no-explicit-any`: warn
  - `@typescript-eslint/no-unused-vars`: warn
  - `react-hooks/exhaustive-deps`: warn
  - `react-refresh/only-export-components`: warn
- Additional research-frontend rules:
  - `react-hooks/set-state-in-effect`: off (false positives with derived state)
  - `react-hooks/preserve-manual-memoization`: off
  - `no-case-declarations`: warn
  - `no-useless-escape`: warn

**TypeScript:**
- Strict mode enabled in all 3 subprojects
- Backend: `tsconfig.json` with `target: ES2020`, `module: commonjs`, `strict: true`
- Frontends: `tsconfig.app.json` with `target: ES2022`, `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `verbatimModuleSyntax: true`
- `Record<string, any>` only where genuinely dynamic (demographics config), marked with `eslint-disable`

**Pre-commit enforcement (`.husky/pre-commit`):**
- Runs `type-check` on all 3 subprojects (backend, participant-frontend, research-frontend)
- Runs `lint` on both frontends
- Zero errors required; warnings allowed
- Does NOT run tests

## Import Organization

**Order (observed pattern):**
1. React/framework imports (`react`, `react-router-dom`, `react-i18next`)
2. Third-party libraries (`axios`, `zustand`, `@tanstack/react-query`, `lucide-react`)
3. Internal absolute imports (services, stores, hooks, components, types, utils)

**Path Aliases:**
- No path aliases configured -- all imports use relative paths (e.g., `../../stores/auth.store`, `../../services/api/client`)

**Import style:**
- Use named exports/imports predominantly
- Use `import type` for type-only imports (enforced by `verbatimModuleSyntax` in frontends)
- Default exports used for: `apiClient` (`research-frontend/src/services/api/client.ts`), React Router lazy components
- Named exports used for: React components, hooks, services (class instances), store hooks

## Error Handling

**Backend controllers (`backend/src/modules/*/`):**
- Wrap entire route handler in `try/catch`
- Check `isAuthError(err)` first for auth-specific status codes
- Fall through to `instanceof Error` for message extraction
- Return `error(message, statusCode, undefined, origin)` using `backend/src/utils/response.ts`
- Pattern:
```typescript
try {
    await requireAuth(event);
    // ... route logic
} catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('ModuleName error:', err);
    if (isAuthError(err)) {
        return error(errorMessage, err.statusCode, undefined, origin);
    }
    return error(errorMessage, 500, undefined, origin);
}
```

**Backend services (`backend/src/modules/*/*.service.ts`):**
- Throw `Error` objects with descriptive messages (e.g., `throw new Error('Research not found or deleted')`)
- No custom error classes -- use string-based error differentiation in controllers
- Auth controller does string matching on error messages to determine status codes (fragile pattern)

**Frontend services (`research-frontend/src/services/`):**
- Services are class instances exported as singletons (e.g., `export const researchService = new ResearchService()`)
- Methods use `try/catch` with `error instanceof Error` checks
- Extensive `console.error` logging with tagged prefixes (e.g., `[ResearchService]`)

**Frontend hooks (`research-frontend/src/hooks/`):**
- React Query `onError` callbacks show toast notifications
- Errors are re-thrown after logging to let React Query handle retry/error state

**Frontend stores (`research-frontend/src/stores/`):**
- Zustand stores manage `isLoading` and `error` state manually
- Helper function `asyncOperation` in auth store for consistent async state management
- Errors stored as string messages in store state

## Logging

**Framework:** `console` (no structured logging framework)

**Patterns:**
- Backend: `console.log` for request logging, `console.error` for errors, `console.warn` for non-critical issues
- Frontend: Heavy use of tagged `console.log` with prefixes like `[ApiClient]`, `[AuthStore]`, `[ResearchService]`, `[ConfigService]`
- Debug logging is pervasive and NOT stripped in production builds
- Pattern: `console.log('[ClassName] Action description:', variable);`

## Comments

**When to Comment:**
- JSDoc-style comments on exported functions and classes (especially in services and utils)
- Inline comments in Spanish/English mix (e.g., `// Crear cookies para los tokens`, `// Fallback to environment variable`)
- `TODO:` comments for known temporary workarounds (several in auth flow)
- `TEMPORAL:` used for temporary code that should be removed later

**JSDoc/TSDoc:**
- Used on service methods, utility functions, and controller handlers
- Pattern: `@param`, `@returns`, `@throws` tags
- Not consistently applied -- some files have full JSDoc, others have none

## Function Design

**Backend controllers:**
- Single exported async function per controller: `handleXxxRoutes(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>`
- Route matching via regex on `path` string (e.g., `path.match(/^\/modules\/([^\/]+)$/)`)
- Body parsed inline with `JSON.parse(event.body || '{}')`
- Auth checked via `await requireAuth(event)` at top of try block

**Backend services:**
- Exported as individual async functions (not classes)
- Accept primitive params or `Record<string, unknown>` for flexible data
- Return database row objects directly

**Frontend services:**
- Class-based singletons with typed methods
- Each method returns a typed Promise
- Use `apiClient` (wrapper around axios) for HTTP calls
- Use `configService.getEndpoint(category, action, params)` for URL resolution -- no hardcoded routes

**Frontend hooks (React Query):**
- Query key factories: `researchKeys.all`, `researchKeys.detail(id)` pattern (`research-frontend/src/hooks/useResearchQuery.ts`)
- `staleTime: 5 * 60 * 1000` (5 min), `gcTime: 10 * 60 * 1000` (10 min) as common defaults
- Mutations invalidate related queries on success
- Toast notifications on success/error

## Module Design

**Exports:**
- Backend: named function exports from service files, single `handleXxxRoutes` from controllers
- Frontend: named exports for components, hooks, and store hooks
- Frontend services: singleton class instances (e.g., `export const researchService = new ResearchService()`)
- Config service: singleton `export const configService = new ConfigService()`

**Barrel Files:**
- `research-frontend/src/services/index.ts` exists as barrel
- `participant-frontend/src/hooks/index.ts` exists as barrel
- Not systematically used across all directories

## React Component Patterns

**Component structure:**
- Functional components only (no class components)
- Use `forwardRef` for UI primitives that need ref forwarding (`research-frontend/src/components/ui/Button.tsx`)
- Set `displayName` on forwardRef components
- Props interfaces defined inline or co-located (e.g., `ButtonProps`)

**Styling:**
- Tailwind CSS with `cn()` utility from `clsx` + `tailwind-merge` (`research-frontend/src/lib/utils.ts`)
- Component variants defined as inline objects, not extracted to separate config
- No CSS modules or styled-components

**State management:**
- Zustand for client state (auth, session, participant)
- React Query (`@tanstack/react-query`) for server state (research data, modules, analytics)
- No Redux

**Critical rules (from CLAUDE.md):**
- Never define React components inline inside switch/case or render functions -- extract as standalone components
- Consult `.claude/skills/react-best-practices/references/rules/` before modifying React components
- URLs from backend are relative (`/api/media/...`) -- use `resolveMediaUrl()` to convert to absolute

## i18n

**Libraries:** `i18next` + `react-i18next` (participant-frontend only; research-frontend has no i18n)
**Languages:** ES/EN
**Translation files:** `participant-frontend/src/i18n/locales/`
**Usage:** `useTranslation()` hook in participant-frontend components

---

*Convention analysis: 2025-03-09*
