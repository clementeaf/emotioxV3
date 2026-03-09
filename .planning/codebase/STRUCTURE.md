# Codebase Structure

**Analysis Date:** 2026-03-09

## Directory Layout

```
emotioxV3/
├── backend/                    # Express API server
│   ├── src/
│   │   ├── config/             # Database, cache, S3, secrets, SSM, Cognito configs
│   │   ├── modules/            # Feature modules (controller + service pairs)
│   │   │   ├── analysis/       # AI-powered analysis
│   │   │   ├── analytics/      # Research analytics/stats
│   │   │   ├── auth/           # JWT + Google OAuth authentication
│   │   │   ├── cache/          # In-memory cache management endpoints
│   │   │   ├── config/         # API config/discovery endpoint
│   │   │   ├── debug/          # Debug endpoints (temporary)
│   │   │   ├── enterprises/    # Enterprise/organization management
│   │   │   ├── media/          # File upload/serving (S3 + local)
│   │   │   ├── module-templates/ # Predefined module configurations
│   │   │   ├── modules/        # Research module CRUD
│   │   │   ├── monitor/        # SSE real-time monitoring
│   │   │   ├── public/         # Unauthenticated participant endpoints
│   │   │   ├── questions/      # Question management
│   │   │   ├── quotas/         # Demographic quota enforcement
│   │   │   ├── research/       # Research study CRUD + in-progress
│   │   │   ├── research-techniques/ # Research technique catalog
│   │   │   ├── research-types/ # Research type catalog
│   │   │   ├── responses/      # Participant response retrieval (authed)
│   │   │   ├── stage-templates/ # Predefined stage configurations
│   │   │   └── users/          # User management (admin)
│   │   ├── utils/              # Auth, response helpers, cache helpers, request utils
│   │   ├── router.ts           # Central path-based routing dispatcher
│   │   ├── server.ts           # Development server entry
│   │   ├── server-cpanel.ts    # Production cPanel/Passenger entry
│   │   └── handler.ts          # Legacy AWS Lambda entry
│   ├── server-cpanel.js        # Passenger bootstrap wrapper (loads dist/)
│   ├── media/                  # Local file storage (cPanel uploads)
│   ├── migrations/             # Backend-local migration scripts
│   └── scripts/                # Utility scripts
├── research-frontend/          # Researcher dashboard SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── hitzone/        # Hitzone editor components
│   │   │   ├── layout/         # AuthLayout, DashboardLayout, Sidebar
│   │   │   ├── modules/        # Module builder components (config panel, preview)
│   │   │   ├── research/       # Research builder, config, demographics, forms
│   │   │   │   ├── demographic-config/ # Demographic field config modals
│   │   │   │   ├── participants/       # Participant management views
│   │   │   │   └── ResearchInProgress/ # Active research monitoring
│   │   │   ├── research-types/ # Research type management components
│   │   │   ├── results/        # Results visualization
│   │   │   │   ├── cognitive-task/     # CT results (components/ + utils/)
│   │   │   │   ├── shared/             # Shared result components/utils
│   │   │   │   └── smart-voc/          # SmartVOC results (components/ + utils/)
│   │   │   └── ui/             # Reusable UI primitives (Button, Card, Modal, etc.)
│   │   ├── config/
│   │   │   └── routes.tsx      # Centralized route configuration
│   │   ├── contexts/           # React contexts (ToastContext)
│   │   ├── data/               # Static data/constants
│   │   ├── hooks/              # React Query hooks + utility hooks
│   │   ├── lib/                # Third-party library wrappers
│   │   ├── pages/              # Route-level page components
│   │   │   ├── admin/          # UserManagementPage
│   │   │   ├── auth/           # LoginPage, RegisterPage, AuthCallbackPage
│   │   │   ├── dashboard/      # DashboardPage
│   │   │   ├── modules/        # ModulesPage, ModuleBuilderPage
│   │   │   ├── profile/        # ProfilePage
│   │   │   ├── research/       # ResearchPage, ResearchBuilderPage, ResultsPage, ProgressPage
│   │   │   ├── research-techniques/ # CRUD pages
│   │   │   └── research-types/ # CRUD pages + module template assignation
│   │   ├── providers/          # QueryProvider, AuthProvider
│   │   ├── services/           # API service wrappers (one per backend module)
│   │   │   └── api/            # Axios client, config service, types
│   │   ├── stores/             # Zustand stores (auth.store.ts)
│   │   ├── types/              # TypeScript interfaces (auth.ts, moduleBuilder.types.ts)
│   │   └── utils/              # Helpers (demographicsMapper, presignedUrlCache, etc.)
│   └── public/
│       └── runtime-config.json # Runtime API URL configuration
├── participant-frontend/       # Participant survey SPA
│   ├── src/
│   │   ├── api/                # API client setup
│   │   ├── components/
│   │   │   ├── layout/         # MainLayout, DevSidebar
│   │   │   ├── questions/      # ChoiceQuestion, RankingQuestion, TextQuestion, LinearScaleQuestion
│   │   │   ├── renderers/      # SmartVOCRenderer, CognitiveTaskRenderer, InputRenderer
│   │   │   ├── security/       # Security-related components
│   │   │   ├── steps/          # WelcomeStep, DemographicsStep, DynamicStep, ThankYouStep
│   │   │   └── ui/             # Specialized UI (EmotionSelector, NavigationFlow, etc.)
│   │   ├── data/               # Static data/constants
│   │   ├── hooks/              # Navigation, validation, device/location collection
│   │   ├── i18n/
│   │   │   └── locales/        # ES/EN translation files
│   │   ├── lib/                # Library wrappers
│   │   ├── pages/              # HomePage, ResearchPage, EyeTrackingTestPage
│   │   ├── providers/          # QueryProvider
│   │   ├── services/           # public.service, response.service, config.service, media.service
│   │   ├── stores/             # useSessionStore, useParticipantStore
│   │   ├── types/              # module.ts, research-config.ts, responses.ts
│   │   └── utils/              # cn, emotionSelectionLimit, moduleComponent, validation
│   └── public/
│       └── runtime-config.json # Runtime API URL configuration
├── database/
│   ├── migrations/             # PostgreSQL migrations (legacy, 10 files)
│   └── migrations-mysql/       # MySQL migrations (current, 12 files)
├── infrastructure/             # Terraform (legacy AWS, unused)
├── scripts/                    # Deploy scripts, migration utils, DB tools
├── .github/workflows/          # GitHub Actions CI/CD (3 cPanel deploy workflows + legacy)
├── .husky/                     # Pre-commit hooks (build + type-check + lint)
├── .agent/                     # Architecture documentation (13 files)
├── .claude/                    # Claude skills and rules
│   └── skills/react-best-practices/ # React coding rules
├── docs/                       # Project documentation
├── patterns/                   # Design pattern references
├── skills/                     # Skill documentation (deploy.md)
└── package.json                # Root monorepo package (Husky only)
```

## Directory Purposes

**`backend/src/modules/`:**
- Purpose: All backend business logic organized by domain
- Contains: Each subdirectory has a `[name].controller.ts` and `[name].service.ts`, some have additional `.local.ts` variants for cPanel-specific code
- Key files: `research/research.service.ts` (main CRUD), `public/public.service.ts` (participant data), `modules/modules.service.ts` (module CRUD), `monitor/monitor-sse.service.ts` (real-time)

**`backend/src/config/`:**
- Purpose: Infrastructure configuration and adapters
- Contains: `database.ts` (MySQL pool + PG-to-MySQL converter), `cache.ts` (in-memory), `s3.ts` (AWS S3), `secrets.ts` (env/SSM), `cognito.ts` (legacy), `ssm.ts` (AWS SSM), `local-storage.ts`
- Key files: `database.ts` is critical - all SQL flows through its `pool.query()` method

**`research-frontend/src/services/`:**
- Purpose: API communication layer - one service file per backend module
- Contains: `research.service.ts`, `modules.service.ts`, `analytics.service.ts`, `smartVOC.service.ts`, `cognitiveTask.service.ts`, etc.
- Key files: `api/client.ts` (Axios instance with auth interceptor), `api/config.service.ts` (endpoint discovery)

**`research-frontend/src/components/research/`:**
- Purpose: Research study builder UI - the core of the researcher experience
- Contains: Builder page, config module, demographic config modals (Age, Gender, Country, Education, etc.), module cards, forms
- Key files: `ResearchConfigurationModule.tsx` (settings, QR, URL, demographics), `ResearchBuilderHeader.tsx`, `ModuleContentEditor.tsx`

**`research-frontend/src/components/results/`:**
- Purpose: Results visualization split by module type
- Contains: `smart-voc/` (SmartVOC result charts), `cognitive-task/` (CT result tables), `shared/` (common result components)
- Each subdirectory has `components/` and `utils/` subdirectories

**`participant-frontend/src/components/steps/`:**
- Purpose: Survey step components shown to participants in sequence
- Contains: `WelcomeStep.tsx`, `DemographicsStep.tsx`, `DynamicStep.tsx` (routes to appropriate renderer), `ThankYouStep.tsx`, `EyeTrackingStep.tsx`
- Key files: `DynamicStep.tsx` is the central router for module rendering

**`participant-frontend/src/components/renderers/`:**
- Purpose: Module-type-specific rendering for participants
- Contains: `SmartVOCRenderer.tsx`, `CognitiveTaskRenderer.tsx`, `InputRenderer.tsx`, `TextareaRenderer.tsx`
- Pattern: `DynamicStep` selects renderer based on module type

**`database/migrations-mysql/`:**
- Purpose: Current MySQL schema migrations (12 files, numbered 001-014)
- Contains: `001_initial_schema.sql` (all core tables), `002_seed_data.sql`, subsequent migrations for features
- Key files: `001_initial_schema.sql` defines the full data model

## Key File Locations

**Entry Points:**
- `backend/src/server.ts`: Dev server (localhost:3000)
- `backend/src/server-cpanel.ts`: Production server (Passenger)
- `backend/server-cpanel.js`: Passenger bootstrap wrapper
- `research-frontend/src/main.tsx`: Research app entry
- `participant-frontend/src/main.tsx`: Participant app entry

**Configuration:**
- `backend/src/config/database.ts`: MySQL pool, PG-to-MySQL converter, dev/prod routing
- `backend/src/config/cache.ts`: In-memory cache implementation
- `research-frontend/src/config/routes.tsx`: All route definitions
- `research-frontend/src/services/api/config.service.ts`: API endpoint discovery
- `participant-frontend/src/services/config.service.ts`: Participant API config
- `research-frontend/public/runtime-config.json`: Runtime API base URL
- `participant-frontend/public/runtime-config.json`: Runtime API base URL

**Core Logic:**
- `backend/src/router.ts`: Central routing dispatcher
- `backend/src/modules/research/research.service.ts`: Research CRUD + stage/module management
- `backend/src/modules/public/public.service.ts`: Participant data fetching + response saving
- `backend/src/modules/modules/modules.service.ts`: Module CRUD
- `backend/src/modules/auth/auth.service.local.ts`: JWT auth (cPanel)
- `backend/src/modules/monitor/monitor-sse.service.ts`: SSE real-time
- `research-frontend/src/components/research/ResearchBuilderPage.tsx`: Main builder UI (via pages wrapper)
- `participant-frontend/src/pages/ResearchPage.tsx`: Survey flow orchestrator
- `participant-frontend/src/components/steps/DynamicStep.tsx`: Module type routing

**Testing:**
- `participant-frontend/src/components/steps/DemographicsStep.test.tsx`: Only test file detected in the codebase

**Types:**
- `research-frontend/src/types/moduleBuilder.types.ts`: ComponentType union (must include all module types)
- `research-frontend/src/types/auth.ts`: User, LoginCredentials, etc.
- `participant-frontend/src/types/module.ts`: ModuleConfig, ModuleComponent
- `participant-frontend/src/types/research-config.ts`: Research configuration types
- `participant-frontend/src/types/responses.ts`: Response submission types

**Utilities:**
- `backend/src/utils/auth.local.ts`: JWT verification, AuthError class
- `backend/src/utils/response.ts`: Standardized success/error response builders
- `research-frontend/src/utils/demographicsMapper.ts`: Demographics + LocationGranularity mapping
- `participant-frontend/src/utils/moduleComponent.ts`: Component text extraction helpers

## Naming Conventions

**Files:**
- Backend modules: `kebab-case.controller.ts`, `kebab-case.service.ts` (e.g., `research-techniques.controller.ts`)
- Backend local variants: `[name].service.local.ts`, `[name].controller.local.ts`
- Research-frontend services: `camelCase.service.ts` (e.g., `researchTypes.service.ts`)
- Research-frontend components: `PascalCase.tsx` (e.g., `ResearchBuilderPage.tsx`)
- Research-frontend hooks: `useCamelCase.ts` (e.g., `useResearchQuery.ts`)
- Participant-frontend stores: `useCamelCase.ts` (e.g., `useSessionStore.ts`)
- Participant-frontend components: `PascalCase.tsx`
- Database migrations: `NNN_descriptive_name.sql`

**Directories:**
- Backend modules: `kebab-case/` matching the URL path prefix
- Frontend: `kebab-case/` for multi-word directories
- Pages subdirectories: `kebab-case/` matching route segments

## Where to Add New Code

**New Backend Module:**
1. Create directory: `backend/src/modules/[module-name]/`
2. Create `[module-name].controller.ts` exporting `handleXxxRoutes(event): Promise<APIGatewayProxyResult>`
3. Create `[module-name].service.ts` with business logic functions using `pool.query()`
4. Add route in `backend/src/router.ts` with `path.startsWith('/[module-name]')` check and dynamic import
5. Use `requireAuth(event)` from `backend/src/utils/auth.local.ts` for protected routes
6. Return responses via `success()` / `error()` from `backend/src/utils/response.ts`

**New Research Frontend Page:**
1. Create page component: `research-frontend/src/pages/[domain]/[PageName].tsx`
2. Add route config in `research-frontend/src/config/routes.tsx`
3. Set `layout: 'dashboard'` and `isProtected: true` for authenticated pages
4. Create service if new API calls needed: `research-frontend/src/services/[name].service.ts`
5. Create React Query hook if needed: `research-frontend/src/hooks/use[Name].ts`

**New Research Frontend Component:**
- Domain-specific: `research-frontend/src/components/[domain]/[ComponentName].tsx`
- Reusable UI: `research-frontend/src/components/ui/[ComponentName].tsx`
- Results: `research-frontend/src/components/results/[module-type]/components/[ComponentName].tsx`

**New Participant Module Renderer:**
1. Create renderer: `participant-frontend/src/components/renderers/[Type]Renderer.tsx`
2. Register in `participant-frontend/src/components/steps/DynamicStep.tsx`
3. Add question components if needed: `participant-frontend/src/components/questions/[Type]Question.tsx`
4. Add UI widgets if needed: `participant-frontend/src/components/ui/[WidgetName].tsx`

**New Database Migration:**
- Create: `database/migrations-mysql/[NNN]_[description].sql`
- Follow sequential numbering (current highest: 014)

**Shared Utilities:**
- Backend: `backend/src/utils/[name].ts`
- Research-frontend: `research-frontend/src/utils/[name].ts`
- Participant-frontend: `participant-frontend/src/utils/[name].ts`
- Note: There is NO shared code between the 3 sub-projects

## Special Directories

**`.agent/`:**
- Purpose: Detailed architecture documentation (13 files covering data flows, API reference, etc.)
- Generated: No (manually written)
- Committed: Yes

**`.claude/skills/`:**
- Purpose: React best practices rules referenced before writing/modifying React components
- Key path: `.claude/skills/react-best-practices/references/rules/`
- Generated: No
- Committed: Yes

**`backend/media/`:**
- Purpose: Local file storage for uploaded media (cPanel production)
- Generated: Yes (user uploads)
- Committed: No (gitignored)

**`infrastructure/`:**
- Purpose: Terraform configuration for AWS (legacy, no longer used)
- Generated: No
- Committed: Yes (historical)

**`migration-backups/`:**
- Purpose: Database backup snapshots from migration runs
- Generated: Yes (by migration scripts)
- Committed: Partial

**`backend/mcp-server/`, `backend/mcp-server-gmail/`, `backend/mcp-server-trello/`:**
- Purpose: MCP (Model Context Protocol) server integrations
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-03-09*
