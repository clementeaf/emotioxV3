# CHANGELOG

> **533 commits** | **Nov 20 2025 → Feb 17 2026** | Monorepo: research-frontend (196 files) · participant-frontend (67 files) · backend (60 files)

---

## v0.19.1 — PreferenceTest fixes (2026-03-05)

- PreferenceTest now renders title and description from module config
- Replaced auto-advance (`setTimeout 500ms`) with explicit "Continue" button
- Extracted 4 hardcoded Spanish strings to i18n (`preferenceTest.*` keys in es.json + en.json)
- Removed debug/mock text visible in production

## v0.19.0 — Participant UX: explicit Continue buttons (2026-03-04)

- Replaced auto-advance (`setTimeout 500ms`) with explicit "Continue" button across all participant steps
- Affects: ChoiceQuestion (single/multiple), LinearScaleQuestion, SmartVOC (NPS, CSAT, CES, CV, NEV)
- Button appears only after participant makes a selection
- Removed unused `onComplete` prop from ScaleSelector, StarSelector, EmotionSelector
- NavigationFlow now renders title and description; removed instruction box
- Added `common.continue` translation key (ES: "Continuar", EN: "Continue")

## v0.18.1 — Participant vendor chunk fix (2026-03-04)

- Fixed `manualChunks` in participant-frontend Vite config that caused React crash in production
- Root cause: `id.includes('react')` was capturing all react-* libraries (router, i18next, window, turnstile) into `react-vendor` chunk, while `scheduler` (react-dom dependency) fell into generic `vendor` chunk, breaking initialization order
- Fix: specific library matches run before generic React match; core React uses exact path matching (`/react/`, `/react-dom/`, `/scheduler/`) to keep only essential modules together

## v0.18.0 — Participant i18n (2026-03-04)

- Internationalization for participant-frontend using `react-i18next` + `i18next`
- Language selector (🌐 ES/EN) fixed top-right, visible on all pages
- ~90 strings extracted from 22 files into `es.json` and `en.json` translation files
- Language preference persisted in localStorage (`emotiox-lang` key)
- Spanish as default language, English as secondary
- Participant chooses their language (not the researcher)
- Covers: Welcome, Demographics, SmartVOC, Cognitive Tasks, Eye Tracking, Thank You, error screens
- Demographics labels fully translated (Edad/Age, País/Country, Género/Gender, etc.)

## v0.17.0 — Location Granularity (2026-03-04)

- `LocationGranularity` type simplified to `'countryOnly' | 'countryCity'` across all 3 sub-projects
- Researcher picks "Solo país" or "País + Ciudad" in `CountryConfigModal`
- `DemographicsStep` shows a free-text city input when granularity is `countryCity`
- Removed `chile-geography.ts` from both frontends (no longer needed)
- Removed hardcoded Chile region/commune logic from backend `quota.service.ts`
- All 3 sub-projects pass type-check and lint with 0 errors

---

## Current State Summary (as of 2026-02-17)

### research-frontend (https://emotio.cx/research)
- **Dashboard**: Research list with status, type, technique, participant count. Skeleton loader.
- **Research Builder**: Multi-stage editor (Welcome Screen → Research Configuration → Smart VOC → Cognitive Tasks → Thank You). Save Changes per stage. Module reordering for Smart VOC.
- **Research Configuration**: Participant limit, backlinks, demographics with quotas (Age Range, Gender, etc.), QR code generation, link preview.
- **Smart VOC Modules**: NPS (0-10 scale), CSAT (star rating), CES, CV, NEV (20 emotions), VOC (open text). Each with question title, description, and specific configuration. Visual focus and clickable navigation between modules.
- **Cognitive Task Modules**: Short Text, Long Text, Single Choice (option-list + eligibility), Multiple Choice (checkbox-list + eligibility), Linear Scale, Ranking (ranking-list with add/remove items), Navigation Flow (file upload + hitzones), Preference Test (file upload + A/B comparison).
- **Module Editors**: RadioChoicesEditor for Single/Multiple Choice with dynamic add/remove and min 2 enforcement. RankingItemsEditor for Ranking with numbered inputs and min 2 enforcement. FileUploadEditorComponent (standalone) with hitzone editor for Navigation Flow. All editors extracted as standalone components to prevent re-mount on sibling state changes.
- **Results**: SmartVOC results (TrustFlowChart, CPVCard, QuestionCards for CSAT/CES/CV, NEV card, NPS component, VOC component). Cognitive Task results (Choice, LinearScale, Ranking with segmented bar chart, Navigation Flow with heat/click map tabs and hitzone overlay, Preference Test with image rendering).
- **Auth**: Google OAuth login. Session persistence with 24h tokens and auto-refresh.
- **Deployment**: Build locally → rsync to cPanel ~/public_html/research via SSH. Aggressive cache busting for HTML/JSON, immutable hashes for assets. GitHub Actions workflow available.

### participant-frontend (https://emotio.cx/participant)
- **Research Flow**: Welcome Screen → Smart VOC modules → Cognitive Tasks → Thank You Screen. Step-by-step navigation with validation.
- **Smart VOC Renderers**: ScaleSelector (NPS, CES, CV), StarSelector (CSAT), EmotionSelector (NEV with 20 emotions), VOC open text. Auto-advance for SingleChoice. Validation per module type including edge cases (0 values, emotions arrays).
- **Cognitive Task Renderers**: TextQuestion (Short/Long Text with key prop to prevent state sharing), ChoiceSelector (Single/Multiple), LinearScale (slider variant), Ranking (vertical drag reordering), Navigation Flow (iframe + hitzone click detection), Preference Test (A/B image selection).
- **Data Collection**: Location, device, session metadata. Demographic quotas enforcement.
- **Response Submission**: Real-time capture, unified store (Zustand), flush on completion.
- **Preview Mode**: Draft research preview allowed for researchers.
- **DevSidebar**: Module navigation grouped by stage, responsive with burger menu on mobile.
- **Eye Tracking**: Webcam-based gaze estimation with MediaPipe Face Landmarker + Ridge Regression. 9-point calibration (15 frames/point), real-time tracking with lerp smoothing. Standalone test page at `/eye-tracking-test`.
- **i18n**: Spanish (default) + English via react-i18next. Language selector visible on all pages. ~90 translated strings. Persisted in localStorage.
- **Security**: Turnstile disabled for cPanel environment.
- **Deployment**: Build locally → rsync to cPanel ~/public_html/participant. GitHub Actions workflow available.

### backend (https://emotio.cx/api)
- **Database**: MySQL on cPanel (emotvehe_emotiox). Auto-converts PostgreSQL syntax to MySQL ($1→?, ::jsonb removal, JSON_BUILD_OBJECT→JSON_OBJECT, etc.). Environment-aware routing with dev_ table prefixes.
- **Auth**: Local JWT authentication (24h access, 7d refresh). Google OAuth with automatic user registration. No AWS Cognito dependency.
- **API Modules**: research, modules, module-templates, questions, responses, stage-templates, research-types, research-techniques, analytics, media, enterprises, users, quotas, monitor, public, debug, cache, config.
- **Media**: Local file storage on cPanel (~/emotioxv3/media). Upload-direct endpoint for multipart. Static file serving at /api/media for Cognitive Tasks images. Presigned URL fallback for S3 compatibility. Frontend resolves relative media URLs against backend origin for cross-origin compatibility.
- **Analytics**: Ranking responses aggregation (mean position). SmartVOC and Cognitive Task analytics endpoints.
- **Monitoring**: SSE-based real-time monitoring (migrated from WebSocket for cPanel compatibility).
- **Seeds**: Module templates for all Smart VOC and Cognitive Task types. Research types and techniques. Stage templates.
- **Deployment**: Express app on cPanel via Passenger (Node.js 24.12.0). SSH deploy scripts available. GitHub Actions workflow available.

### Known Issues / Technical Debt
- SSH key to cPanel requires passphrase (`sshpass` used in deploy scripts)
- Service worker registration disabled to prevent caching issues
- Some Spanish text remaining in code comments and variable names (research-frontend + backend)
- DB migration pending: `remove_image_upload_from_modules.ts` (clean up image-upload from existing modules)

---

## [0.17.0] Eye-tracking con webcam — calibración + rastreo de mirada — 2026-02-21

### participant-frontend
- **New feature**: Webcam-based eye-tracking system with calibration and gaze estimation
- Added standalone test page at `/eye-tracking-test` with state machine: permission → calibrating → tracking → done
- **MediaPipe Face Landmarker** integration for real-time 478-landmark facial detection (WASM + CDN model loading)
- **Ridge Regression** engine (`ridgeRegression.ts`): pure matrix algebra (transpose, multiply, Gauss-Jordan inverse), maps iris features to screen coordinates
- **Rich feature extraction**: relative iris position within eye (using eye corner landmarks as reference, invariant to head position), head pose (nose tip), polynomial cross-terms (14 features total)
- **Multi-frame calibration**: 9-point calibration grid, collects 15 frames per point with averaged features for noise reduction
- **Calibration UI**: fullscreen white screen with animated red dot, progress ring animation during frame collection, progress bar
- **Tracking UI**: fullscreen dark overlay with webcam feed and green gaze indicator dot with lerp smoothing
- `useWebcam` hook: camera access lifecycle (start/stop), stream management, cleanup on unmount
- `useEyeTracking` hook: orchestrates FaceLandmarker init, calibration state machine, frame collection with setInterval, gaze prediction loop via requestAnimationFrame
- Added `@mediapipe/tasks-vision` dependency; Vite configured with `optimizeDeps.exclude` for WASM compatibility

---

## [0.16.0] Conditionality config persistence & participant-side filtering — 2026-02-21

### research-frontend
- `ConditionalityModal` now fully functional: saves `conditionalityConfig` (demographicKey + demographicValue) to module config
- Added `onSave`/`initialConfig` props to modal; re-opening the modal restores the saved condition
- Save button disabled until both question and answer are selected
- SmartVOC and CognitiveTask cards expose `getConditionalityConfig()` via imperative ref
- Visual indicator below toggle shows configured condition (e.g. "Condition: Show if age = 18-24") with click to re-edit
- Toggling conditionality OFF clears the config; closing modal without saving reverts toggle only if no config was previously set
- `ResearchBuilderPage.handleSaveModule` persists `conditionalityConfig` alongside `conditionality` flag to backend
- Added `ConditionalityConfig` interface, `getModuleConditionalityConfig` and `withModuleConditionalityConfig` helpers in `moduleRequired.ts`

### participant-frontend
- **Conditionality filtering**: `useNavigation` skips modules whose condition is not met based on participant's demographic responses
- Modules with conditions are shown by default until demographics are answered, then re-evaluated
- `demographicResponses` read reactively from Zustand store (re-filters navigation on demographic change)
- **DemographicsStep revamp**: title changed from "Information" to "Demographics", removed internal border/shadow and "Continue" button
- Demographic fields now use configured options from Research Configuration (validAges for age ranges, options for gender/education/etc., validCountries for country)
- Server-side demographic validation (quota/disqualification) moved to `ResearchPage.handleNext` for the demographics step

## [0.15.0] Conditionality toggle & modal for Cognitive Task and Smart VOC — 2026-02-21

### research-frontend
- Added "Show conditionality" toggle to Cognitive Task and Smart VOC module cards (alongside existing Required and Hide toggles)
- Added `ConditionalityModal` component with condition configuration UI: action selector (Show), question selector, answer selector, and optional-target warning banner
- Modal opens automatically when toggle is activated; closing the modal (X, overlay click, or Escape) deactivates the toggle
- Added `getModuleConditionality` / `withModuleConditionality` utility functions in `moduleRequired.ts`
- Conditionality flag persisted to `module.config.conditionality` on save
- ConditionalityModal identifies the source module by name

---

## [0.14.1] Fix preview mode: step reset & sidebar visibility — 2026-02-17

### participant-frontend
- Fixed preview mode showing last visited step instead of first: added `isPreviewMode` condition to always reset `currentStep` to the first available step when `?preview=true`
- Fixed DevSidebar not visible in production for preview mode: changed render condition from `isDev` to `isDev || isPreviewMode` so researchers can navigate between modules

---

## [0.14.0] Technical Debt Resolution — 2026-02-17

### research-frontend
- Eliminated all ~42 ESLint warnings (0 errors, 0 warnings)
- Created typed interfaces replacing `any`: `ModuleTemplateRef`, `BackendQuota`, `ModuleComponent`, `ModuleConfigStructure`, `HitzoneRegion`, `UploadedFileData`
- Added `syncRankingConfig` helper to sync `rankingConfig.items` from `comp.value` on every save (Smart VOC, Cognitive Tasks, active module)
- Inlined `buildParticipantShareUrl` into useMemo, removed dead helper functions
- Fixed `ResearchBuilderSidebar` useEffect dependency alignment
- Removed unused catch variables, destructured props, and obsolete eslint-disable directives
- Removed `image-upload` component from all 6 Cognitive Task seed templates

### participant-frontend
- Eliminated all ~8 ESLint warnings (0 errors, 0 warnings)
- Replaced `as any` casts with proper types in `DemographicsStep.tsx` and test file
- Added `backlinks.complete` to useCallback dependency in `ResearchPage.tsx`
- Replaced `delete (window as any).location` with `Object.defineProperty` in tests

### backend
- Created DB migration script `remove_image_upload_from_modules.ts` for cleaning existing modules

---

## [0.13.0] Results Visualization & Module Editors — 2026-01-28 to 2026-02-17

### research-frontend
- Added image rendering in Preference Test results
- Added HitZones overlay and click correctness visualization in Navigation Flow results
- Added tab navigation with Heat Click Map, Click Map, and Image views in Navigation Flow results
- Added functional Ranking builder with numbered item inputs
- Added dynamic add/remove choices for Multiple Choice module editor
- Added checkbox-list/option-list type support with choice fallback parsing
- Added draft research preview capability
- Extracted RankingItemsEditor as standalone component (fixed React anti-pattern of inline component definition)
- Extracted FileUploadEditorComponent as standalone component (fixed same anti-pattern causing file-upload re-mount on every sibling keystroke)
- Added `ranking-list` to ComponentType union and EditableComponent switch
- Unsupported component types (e.g. image-upload) now silently return null instead of showing error message
- Fixed module Hide auto-override: save now uses researcher's explicit Hide toggle instead of auto-computing `hidden` based on whether module has values (was locking unconfigured modules after save)
- Fixed Hide toggle only visible on localhost — now visible in all environments
- Fixed media URL resolution: `resolveMediaUrl()` in media.service.ts converts relative backend URLs to absolute (enables cross-origin media loading from localhost dev)
- Fixed upload URL resolution: `generateUploadUrl` result now resolved to absolute URL
- Fixed URL preview race condition in Research Configuration
- Fixed CognitiveTask null-safety across results wrappers
- Fixed vite.svg 404 by replacing missing favicon with inline empty icon
- Fixed Multiple Choice choices reset on React Query background refetch (prevContentKey initialization)
- Fixed RadioChoicesEditor delete button disabled when only 2 choices remain
- Fixed quota sync and backlink URL normalization in Research Configuration
- Fixed participantLimit persistence (saved as {enabled, value} for backend)

### participant-frontend
- Added checkbox-list/option-list support in renderers
- Fixed media URL resolution: `resolveMediaUrl()` in media.service.ts converts relative backend URLs to absolute (enables cross-origin image loading from localhost dev for Navigation Flow / Preference Test)
- Fixed config service initialization in dev mode: tries `/runtime-config.json` first (Vite serves `public/` at root), then `/participant/runtime-config.json`, with fallback to `https://emotio.cx/api`
- Fixed sync-runtime-config script: updated default URL from CloudFront (AWS) to `https://emotio.cx/participant`
- Fixed default API base URL from `localhost:3000` to `https://emotio.cx/api` (no local backend)
- Removed stale "AWS backend" text from bootstrap error screen
- Fixed backlinks delivery and demographics persistence
- Fixed vite.svg 404 with inline empty favicon

### backend
- Added DB migration script (fix_ranking_module_config_mysql.ts) to update 24 existing Ranking modules with correct `ranking-list` structure
- Fixed Ranking module config in production DB: replaced image-upload with question-description component for consistency with other modules
- Fixed hidden=true on Navigation Flow/Preference Test modules set by auto-compute logic
- Fixed dotenv path in migration script (../../.env → ../.env for cPanel)
- Fixed quota sync endpoints

---

## [0.12.0] Migration to cPanel & MySQL — 2026-01-18 to 2026-01-25

### backend
- Replaced AWS Cognito with local JWT authentication (bcrypt + jsonwebtoken)
- Implemented PostgreSQL-to-MySQL auto-conversion layer (convertPgToMysql) handling: $N→? placeholders, type casts removal, ILIKE→LIKE, JSON function mapping, column name remapping
- Added environment-aware database routing with dev_ table prefixes based on request origin
- Added upload-direct endpoint for multipart file uploads (replacing S3 presigned URLs)
- Added static file serving for media files stored on cPanel disk
- Migrated real-time monitoring from WebSocket to SSE for cPanel compatibility
- Added Welcome/Thank You screen creation endpoint for existing researches
- Added mod_security disable for API directory (.htaccess) to prevent URL filtering
- Fixed MySQL column compatibility: settings→config, user_id→created_by, stage_type→type
- Fixed PostgreSQL json_agg FILTER to MySQL JSON_ARRAYAGG subquery conversion
- Fixed auth: password_hash update for existing users, JSON metadata parsing from MySQL
- Fixed media endpoint: s3_key/media_path compatibility layer
- Removed backend-graphql service (replaced by REST)
- Removed all AWS dependencies for runtime (Cognito, S3 upload, SSM)

### research-frontend
- Updated API client configuration for cPanel backend
- Added Welcome/Thank You screen auto-addition for new researches
- Fixed duplicate Welcome/Thank You prevention (stage name check, React StrictMode)
- Fixed OAuth callback routing for local development
- Migrated monitoring from WebSocket to SSE
- Standardized padding across SmartVOC and CognitiveTask module cards
- Cleaned up Research Configuration UI labels
- Limited Welcome Screen input widths and disabled textarea resize

### participant-frontend
- Completely disabled Turnstile verification for cPanel environment
- Fixed runtime-config.json path for /participant/ base
- Moved build time injection to buildEnd hook
- Fixed navigation skip for virtual welcome step when not configured
- Added ranking-list format support with items extraction from multiple component types

### infrastructure
- Added GitHub Actions workflows for cPanel deployments (backend, research-frontend, participant-frontend)
- Added SSH port support in deployment workflows
- Migrated CI from PostgreSQL to MySQL
- Improved deploy scripts with aggressive cache busting for HTML/JSON
- Migrated seed scripts to work with both PostgreSQL and MySQL

---

## [0.11.0] Research Builder Refinements & Smart VOC Focus — 2026-01-09 to 2026-01-17

### research-frontend
- Added NEV emotions preview in Smart VOC module editor
- Added visual focus styles for Input and Textarea components
- Added Link Preview validation and error handling in Research Configuration
- Added clickable navigation between Smart VOC modules with visual focus indicator
- Fixed Age Range modal opening and row click behavior
- Fixed Age Range toggle enable/disable functionality
- Fixed QR code URL generation for production
- Fixed stage deletion in ResearchBuilderSidebar
- Fixed Smart VOC module reordering (drag & drop)
- Fixed useParams consistency across sidebar components
- Fixed duplicate bootstrapSession calls
- Fixed service worker cross-origin interception issue

### backend
- Added automatic user registration on Google OAuth login
- Fixed NPS question placeholder updated per PDF specification
- Fixed module order parameter processing in backend updates
- Fixed stage deletion error handling
- Fixed Smart VOC module reordering endpoint
- Added localhost:12800 to CORS allowed origins
- Enabled Google OAuth for localhost development

---

## [0.10.0] Demographics, Custom Domains & Dashboard Polish — 2025-12-29 to 2026-01-04

### research-frontend
- Added demographic quotas system with specific config modals (Age Range, Gender, Location, Education, Occupation, Income)
- Added demographics mapper for transforming modal data to backend format
- Added skeleton loader for dashboard
- Added collapsible sidebar with toggle button
- Added automatic redirect to builder after research creation
- Fixed dashboard layout, column widths, and empty state centering
- Fixed Research Types page layout
- Fixed query invalidation after saving modules to update UI
- Fixed cache synchronization between list and detail views

### participant-frontend
- Added SingleChoice auto-advance behavior
- Removed ThankYou button, replaced with close window message
- Fixed step reset to welcome for new participants
- Fixed sidebar step numbering
- Fixed NEV special validation for emotions array
- Fixed scale selector layout split into two rows
- Improved validation and Turnstile handling

### backend
- Added demographic quotas endpoints and database support
- Added Public User Management system
- Extended token expiration to 24 hours
- Fixed automatic token refresh without session logout
- Fixed refresh token cookie maxAge aligned with Cognito (2 days)
- Fixed API Gateway path normalization (stage prefix removal)
- Fixed error handling for media filenames with spaces
- Fixed Cognitive Tasks module association to correct stage template
- Fixed default module creation on research creation

### infrastructure
- Configured custom domains: emotiox.org for frontends, api.emotiox.org for backend
- Added domain configuration scripts and DNS setup

---

## [0.9.0] Security, Monitoring & UX Improvements — 2025-12-20 to 2025-12-26

### research-frontend
- Added Google login button with OAuth integration
- Added default modules toggle to research creation flow
- Added compact research type cards with resizable table
- Improved research builder UX and module management
- Extracted UI components to separate files for maintainability
- Optimized Sidebar component
- Removed unused examples and consolidated duplicate code
- Fixed session bootstrapping with AuthProvider
- Fixed Research Config componentValues initialization from nested config

### participant-frontend
- Added Cloudflare Turnstile anti-bot CAPTCHA protection
- Extracted UI state screens (bootstrap error, loading) to separate components
- Fixed BootstrapErrorScreen moved to separate file (Fast Refresh warning)

### backend
- Implemented real-time monitoring system (WebSocket-based)
- Fixed WebSocket connection and monitoring endpoint improvements
- Consolidated env variables into backend, removed root env files
- Fixed ESLint warnings and React hooks errors across projects

---

## [0.8.0] Production Stabilization & AWS Fixes — 2025-12-09 to 2025-12-19

### research-frontend
- Added Save Changes button to Cognitive Tasks stage
- Added module hide flag toggle (local-only)
- Added link preview using participant CloudFront URL
- Optimized caching strategy for instant updates (network-first for HTML, immutable for hashed assets)
- Fixed presigned URL usage for S3 image uploads

### participant-frontend
- Added auto-navigation on NavigationFlow completion
- Added dynamic button text based on module type (Continue / Next / Submit)
- Added auto-advance modules with hidden buttons and instruction texts
- Added configurable start button text from Welcome Screen module
- Added responsive DevSidebar with burger menu on mobile
- Added emergency cache clear page for service worker issues
- Fixed module state persistence and Service Worker chrome-extension filter
- Fixed hitzone click detection for object-contain images
- Fixed Navigation Flow display component validation
- Fixed NPS scale numbers made circular with proper spacing
- Fixed scale validation for all SmartVOC modules (CSAT, NPS, CES, CV) including 0-value edge cases
- Fixed stale closure prevention using getState() in validation
- Fixed specific validation for VOC and NEV modules
- Fixed TextQuestion state sharing between Short/Long Text modules (key prop)
- Fixed start_button_text filtering with multiple layers of protection
- Updated service worker to network-first strategy
- Enforced runtime-config.json over VITE_API_URL

### backend
- Added SSM Parameter Store for secrets management
- Added CORS middleware
- Fixed participant public research stages and responses endpoints
- Fixed npm ci by pinning serverless-offline to v13
- Fixed participant flow, runtime config, and media presigned URLs
- Fixed auth 401 handling with refresh and rememberMe
- Fixed Serverless dotenv path and SSM variable resolution
- Added module hide flag persistence and participant-side skip logic

### infrastructure
- Fixed CI workflow: check-changes job, paths-filter, workflow-success conditions
- Fixed CloudFront invalidation wait for deployment completion
- Fixed S3 bucket cleaned before deployment to remove stale assets
- Fixed Content-Type headers for JS files in S3 deployment
- Added CloudFront URLs to CORS allowed origins
- Disabled service worker registration to prevent caching issues

---

## [0.7.0] AWS Production Deployment — 2025-12-05 to 2025-12-07

### research-frontend
- Implemented service discovery pattern for environment-agnostic backend consumption (runtime-config.json)
- Major performance optimizations (code splitting, lazy loading)

### participant-frontend
- Added interactive question components for all module types
- Added real-time participant response capture and submission
- Handled legacy module structure with data format spec
- Major performance optimizations

### backend
- Complete AWS deployment: Lambda, API Gateway, S3, CloudFront
- RDS database setup with SSL, data migration from development
- Database connection timeout and Lambda resources increased
- Complete analytics visualization endpoints with database migration

### infrastructure
- Added complete AWS production deployment infrastructure (GitHub Actions)
- Added Cognito configuration and test scripts
- Added workflow_dispatch for manual deployment triggers
- Added CloudFront permissions fix script for S3 buckets
- Fixed legacy-peer-deps for npm ci in deployment

---

## [0.6.0] Dashboard, Results & Analytics — 2025-12-05

### research-frontend
- Added Research Configuration stage as default for all researches
- Added QR Code modal functionality in Research Configuration
- Added comprehensive Dashboard page with research list, status indicators, and management actions
- Added Results section in sidebar navigation
- Added SmartVOC Results: TrustFlowChart (NPS/NEV dual visualization), CPVCard with wave pattern, QuestionCard format for CSAT/CES/CV, NEV Question Card, NPS component, VOC component
- Added Cognitive Task Results: Choice, LinearScale, Ranking, Navigation Test, and Preference Test cards with Filters sidebar
- Implemented SmartVOC calculation formulas (CPV = CSAT/CES)
- Interactive charts using Recharts library
- Fixed dashboard layout, duplicate filters, and PreferenceTestCard progress bars

### participant-frontend
- Added preview mode for researchers to test survey flow
- Added QR generator with participant-frontend URL

### backend
- Added Research Configuration stage creation as default
- Added participantId validation for response submission
- Added analytics endpoints for SmartVOC and Cognitive Task results

---

## [0.5.0] Participant Frontend — 2025-12-04

### participant-frontend
- Implemented complete participant survey experience from scratch
- Basic responsive layout and styles
- Conditional data collection (location, device, session metadata)
- Development sidebar for module navigation with stage grouping
- Dynamic module system with display-only content rendering
- SmartVOC renderer supporting all module types: NPS (ScaleSelector), CSAT (StarSelector), CES/CV (ScaleSelector), NEV (EmotionSelector with 20 emotions), VOC (open text)
- Cognitive Tasks renderer with ChoiceSelector for Single/Multiple Choice
- Slider variant for Linear Scale
- Ranking module with vertical drag-and-drop reordering
- Navigation Flow with iframe and hitzone tracking
- Preference Test with A/B image comparison
- Unified store (Zustand) for responses and navigation
- Clean user tracking system

### research-frontend
- Added module save functionality for persisting researcher configurations

---

## [0.4.0] Backend Caching & Module Configuration — 2025-12-01 to 2025-12-02

### backend
- Implemented caching system for improved API performance
- Added module-templates usage endpoint
- Fixed SQL errors in getUsage endpoint (500 errors, missing created_at)
- Fixed stage ordering

### research-frontend
- Added Choices component with complete configuration and preview
- Added image selection toggle for participant in File Upload
- Implemented unified Smart VOC view with module configurations
- Smart VOC previews with fixed NPS range (0-10)
- Added Remember Me functionality with refresh token
- Simplified LivePreviewPanel
- Removed `any` types and improved TypeScript typing
- Translated Smart VOC modules to English
- Fixed overflow and scrollbars in Create New Module
- Fixed toggles and removed Validation Rules from ComponentConfigPanel
- Fixed module name and description in preview
- Fixed form field id/name attributes for accessibility
- Fixed NEV range selector visibility
- Optimized usage data loading on ModulesPage

---

## [0.3.0] Stage System & Research Builder — 2025-11-24 to 2025-11-28

### research-frontend
- Added stage system UI for organizing module templates (Smart VOC, Cognitive Tasks)
- Research creation redirect with dynamic sidebar
- Delete functionality for research projects with stage highlighting
- Cognitive Tasks and Smart VOC added to stage selection modal
- Research activation functionality
- Enhanced Module Management with advanced features
- File Upload with multiple file support and hitzone editor for Navigation Flow
- Optimized ResearchBuilderPage with separated components and hooks
- Improved Sidebar structure and stage accordion UI

### backend
- Added stage system with stage_type support
- Added Thank You Screen module template
- Added Cognitive Task modules 3.1 and 3.2 with corrected labels
- Added Smart VOC and Cognitive Tasks seed scripts
- Added module-templates usage endpoint
- Added MCP tools for database optimization and analysis
- Updated Multiple Choice module to use 3 individual input components grouped under CHOICES
- Fixed Thank You Screen module components loading and stage type issues

---

## [0.2.0] Research Type Builder & Module System — 2025-11-22 to 2025-11-23

### research-frontend
- Implemented Research Type Builder with refactored ResearchPage
- Module builder with component-specific configurations
- Module preview modal (full-screen with React Portal)
- Reusable ConfirmationModal component
- Research types and techniques structure with assignment functionality
- Separate module template assignment page
- Card/list view toggle and search/filter on Modules page
- Hidden property for ComponentConfig
- Fixed module structure parsing in ModulePreviewModal

### backend
- Full authentication system with Cognito auto-confirmation
- Module assignment functionality
- Smart VOC module seeds: CES, CSAT, CV, NEV, NPS, VOC
- Welcome Screen module template with configurable start button text
- Fixed module_templates.created_by made nullable
- Fixed invalid date display in research types list

---

## [0.1.0] Foundation — 2025-11-20 to 2025-11-21

### backend
- Initial monorepo setup with Express backend
- Complete REST API implementation with services and controllers
- PostgreSQL database migrations and setup scripts

### research-frontend
- Project initialization with strict TypeScript and Husky pre-commit hooks
- API services architecture with ErrorBoundaries
- Research page with tabs and dashboard layout structure
- Routing system with iterable layouts config and Sidebar navigation
- Clean CSS design with light blue aesthetic

### participant-frontend
- Project initialization and port configuration

### infrastructure
- AWS setup script and environment configuration (EC2, S3, RDS)
- Dynamic JSON-based architecture documentation
