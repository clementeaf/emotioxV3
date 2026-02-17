# CHANGELOG

## [0.1.0] Foundation - 2025-11-20 to 2025-11-21

### Added
- Initial monorepo setup with backend (Node.js/Express) and two frontends (research-frontend, participant-frontend)
- Dynamic JSON-based architecture documentation with research types and comprehensive examples
- AWS setup script and environment configuration (EC2, S3, RDS)
- PostgreSQL database migrations and setup scripts
- Complete backend implementation with REST API, services, and controllers
- Research-frontend initialization with strict TypeScript, Husky pre-commit hooks
- API services architecture with ErrorBoundaries in research-frontend
- Research page with tabs and dashboard layout structure
- Routing system with iterable layouts config and Sidebar navigation

### Changed
- Configured specific ports for each frontend service
- Applied clean CSS design with light blue aesthetic
- Simplified App.tsx routing and removed TopBar component
- Translated all Spanish text to English in research-frontend

### Fixed
- Research technique linking, lint errors, and build setup issues

---

## [0.2.0] Research Type Builder & Module System - 2025-11-22 to 2025-11-23

### Added
- Research Type Builder with refactored ResearchPage
- Module builder with component-specific configurations
- Module preview modal for researcher view (full-screen with React Portal)
- Full authentication system with Cognito auto-confirmation
- Reusable ConfirmationModal component (replaced window.confirm)
- Research types and techniques structure with assignment functionality
- Separate module template assignment page
- Card/list view toggle on Modules page
- Module assignment backend functionality
- Search and filter functionality for modules
- Smart VOC module seeds: CES, CSAT, CV, NEV, NPS, VOC
- Welcome Screen module template with configurable start button text
- Hidden property for ComponentConfig

### Fixed
- Module_templates.created_by made nullable to avoid foreign key constraint
- Invalid date display in research types list
- Module structure parsing in frontend and ModulePreviewModal
- Module template structures for CSAT, CES, CV corrected

---

## [0.3.0] Stage System & Research Builder - 2025-11-24 to 2025-11-28

### Added
- Stage system for organizing module templates (Smart VOC, Cognitive Tasks)
- Stage_type support with improved research builder
- Research creation redirect with dynamic sidebar
- Delete functionality for research projects with stage highlighting
- Thank You Screen module template
- Cognitive Task modules 3.1 and 3.2 with corrected labels
- Smart VOC and Cognitive Tasks seed scripts from .md documentation
- File Upload with multiple file support and hitzone editor for Navigation Flow
- Cognitive Tasks and Smart VOC added to stage selection modal
- Research activation functionality
- Enhanced Module Management with advanced features
- Module-templates usage endpoint
- MCP tools for database optimization and analysis

### Changed
- Optimized ResearchBuilderPage with separated components and hooks
- Improved Sidebar structure
- Removed 'No modules' text and improved stage accordion UI
- Updated Multiple Choice module to use 3 individual input components grouped under CHOICES

### Fixed
- Thank You Screen module components loading and stage type issues
- Shared apiClient used for stage templates authentication
- TypeScript errors and dependency updates

---

## [0.4.0] Backend Caching & Module Configuration - 2025-12-01 to 2025-12-02

### Added
- Backend caching system for improved performance
- Choices component with complete configuration and preview
- Image selection toggle for participant in File Upload
- Remember Me functionality with refresh token
- Unified Smart VOC view with module configurations
- Smart VOC previews with fixed NPS range (0-10)

### Changed
- Service layers updated with caching improvements
- LivePreviewPanel simplified
- Removed `any` types and improved TypeScript typing in research-frontend
- Smart VOC modules translated to English

### Fixed
- Overflow and scrollbars in Create New Module
- Toggles corrected and Validation Rules removed from ComponentConfigPanel
- Module name and description restored in preview
- SQL errors in getUsage endpoint (500 errors, missing created_at)
- Form field id/name attributes added for accessibility and CSP issues
- NEV range selector visibility
- Remember Me token refresh issue
- Stage ordering

### Performance
- Optimized usage data loading on ModulesPage

---

## [0.5.0] Participant Frontend - 2025-12-04

### Added
- Basic responsive layout and styles for participant-frontend
- Conditional data collection (location, device, session metadata)
- Development sidebar for module navigation with stage grouping
- Dynamic module system with display-only content rendering
- SmartVOC renderer supporting all module types (NPS, CSAT, CES, CV, NEV, VOC)
- Reusable ScaleSelector component for SmartVOC modules
- StarSelector component for CSAT star rating
- EmotionSelector component for NEV with 20 emotions
- Cognitive Tasks renderer with ChoiceSelector
- Slider variant for Linear Scale
- Ranking module with vertical drag reordering
- Navigation Flow and Preference Test modules with advanced features
- Unified store for responses and navigation
- Clean user tracking system
- Module save functionality in research-frontend

### Changed
- Simplified navigation architecture and improved sidebar UI

### Fixed
- DynamicStep syntax and sidebar cognitive tasks integration
- Type errors in mock cognitive modules
- Navigation Flow and Preference Test added to DynamicStep detection
- Components made more compact and responsive
- Missing 'name' property in CognitiveTaskRenderer fallback objects

---

## [0.6.0] Dashboard, Results & Analytics - 2025-12-05

### Added
- Research Configuration stage as default for all researches
- QR Code modal functionality in Research Configuration
- Comprehensive Dashboard page with research management
- Results section in sidebar navigation
- Results architecture for SmartVOC and Cognitive Task analytics
- Interactive charts using Recharts library
- SmartVOC Results: TrustFlowChart (NPS/NEV dual visualization), CPVCard with wave pattern, shared QuestionCard format for CSAT/CES/CV, NEV Question Card, NPS Question component, VOC Question component
- Cognitive Task Results: Choice, LinearScale, Ranking, Navigation Test, and Preference Test cards with Filters sidebar
- SmartVOC calculation formulas (CPV = CSAT/CES)
- Preview mode in participant-frontend
- ParticipantId validation in backend
- QR generator with participant-frontend URL

### Fixed
- Dashboard layout and removed duplicate filters
- Checkboxes disabled instead of hidden when parent is unchecked
- PreferenceTestCard progress bars and layout
- CPVCard equation styling

### Changed
- Removed EmotionalStates and VOCComments from SmartVOC results

---

## [0.7.0] AWS Production Deployment - 2025-12-05 to 2025-12-07

### Added
- Complete AWS production deployment infrastructure (Lambda, API Gateway, S3, CloudFront)
- Service discovery pattern for environment-agnostic backend consumption
- GitHub Actions secrets setup script
- Cognito configuration and test scripts
- Workflow_dispatch for manual deployment triggers
- CloudFront permissions fix script for S3 buckets
- Real-time participant response capture and submission
- Complete analytics visualization with database migration
- Interactive question components in participant-frontend
- Legacy module structure handling with data format spec

### Fixed
- Legacy-peer-deps for npm ci in deployment
- Database connection timeout and Lambda resources increased
- SSL enabled for RDS database connections
- Service worker syntax error and refresh token handling
- TypeScript warnings and type safety improvements
- Filters component prop typing
- @types/react-dom version pinned

### Performance
- Major performance optimizations for research-frontend
- Major performance optimizations for participant-frontend

---

## [0.8.0] Production Stabilization & AWS Fixes - 2025-12-09 to 2025-12-19

### Added
- CORS middleware for backend server
- SSM Parameter Store for backend secrets management
- Module hide flag with participant-side skip logic
- Auto-navigation on NavigationFlow completion
- Dynamic button text based on module type
- Auto-advance modules with hidden buttons and instruction texts
- Configurable start button text in Welcome Screen
- Responsive DevSidebar with burger menu on mobile
- Optimized caching strategies for both frontends (instant updates)
- Emergency cache clear page for service worker issues

### Fixed
- Module state persistence and Service Worker chrome-extension filter
- Presigned URL usage for S3 image uploads
- Save Changes button added to Cognitive Tasks stage
- Participant public research stages and responses
- Backend npm ci by pinning serverless-offline to v13
- Participant flow, runtime config, and media presigned URLs
- Auth 401 handling with refresh and rememberMe
- Serverless dotenv path and SSM variable resolution
- Link preview using participant CloudFront URL via runtime-config
- Hitzone click detection for object-contain images
- Validation for Navigation Flow display components
- NPS scale numbers made circular with proper spacing
- Scale validation for all SmartVOC modules (CSAT, NPS, CES, CV) handling edge cases including 0 values
- Stale closure prevention using getState() in validation
- Specific validation for VOC and NEV modules
- TextQuestion state sharing between Short/Long Text modules prevented with key prop
- Start_button_text filtering with multiple layers of protection
- CloudFront invalidation wait for deployment completion
- Service worker updated to network-first strategy
- S3 bucket cleaned before deployment to remove stale assets
- Runtime-config.json enforced over VITE_API_URL
- CloudFront URLs added to CORS allowed origins
- Content-Type headers for JS files in S3 deployment

### Changed
- CI workflow improvements: check-changes job, paths-filter, workflow-success conditions
- Service worker registration disabled to prevent caching issues

---

## [0.9.0] Security, Monitoring & UX Improvements - 2025-12-20 to 2025-12-26

### Added
- Cloudflare Turnstile anti-bot CAPTCHA protection
- Real-time monitoring system (WebSocket-based)
- Google login button with OAuth integration
- Default modules toggle in research creation flow
- Compact research type cards with resizable table

### Changed
- Research builder UX improvements and module management
- Extracted UI state screens to separate components (participant-frontend)
- Extracted UI components to separate files for maintainability
- Optimized Sidebar component
- Organized project structure (docs and scripts directories)
- Consolidated env variables into backend, removed root env files
- Removed unused examples and consolidated duplicate code

### Fixed
- BootstrapErrorScreen moved to separate file (Fast Refresh warning)
- ESLint warnings and React hooks errors
- WebSocket connection and monitoring improvements
- Session bootstrapping with AuthProvider
- Research Config componentValues initialization from nested config

---

## [0.10.0] Demographics, Custom Domains & Dashboard Polish - 2025-12-29 to 2026-01-04

### Added
- Demographic quotas system with specific config modals (Age Range, Gender, etc.)
- Demographics mapper for modal-to-backend data transformation
- Custom domains: emotiox.org for frontends, api.emotiox.org for backend
- Skeleton loader for dashboard
- SingleChoice auto-advance behavior
- ThankYou screen: removed button, added close window message
- Public User Management system
- Collapsible sidebar with toggle button
- Automatic redirect to builder after research creation
- Token expiration extended to 24 hours

### Fixed
- Session persistence, mobile layout, NEV auto-advance
- Heatmap image loading and S3 URL expiration
- Dashboard and research builder page layouts
- Step reset to welcome for new participants and sidebar step numbering
- NEV special validation for emotions array
- Default module creation on research creation
- Cache synchronization between views
- Dashboard column widths and empty state centering
- Cognitive Tasks module association to correct stage template
- Research Types page layout
- Query invalidation after saving modules
- Refresh token cookie maxAge aligned with Cognito (2 days)
- Automatic token refresh without session logout
- API Gateway path normalization (stage prefix removal)
- Backend error handling for media filenames with spaces
- Participant-frontend validation and Turnstile handling

---

## [0.11.0] Research Builder Refinements & Smart VOC Focus - 2026-01-09 to 2026-01-17

### Added
- Automatic user registration on Google OAuth login
- NEV emotions preview in Smart VOC module
- Visual focus styles for Input and Textarea components
- Link Preview validation and error handling in Research Configuration

### Fixed
- Age Range modal opening and row click behavior
- Age Range toggle enable/disable functionality
- QR code URL generation for production
- Stage deletion in ResearchBuilderSidebar
- Stage deletion error handling in backend
- Smart VOC module reordering (backend + frontend)
- Clickable navigation and visual focus for Smart VOC modules
- NPS question placeholder updated per PDF specification
- Module order parameter processing in backend updates
- useParams consistency in ResearchBuilderSidebar
- Duplicate bootstrapSession calls eliminated
- Service worker cross-origin interception issue
- Google OAuth enabled for localhost development
- CORS: localhost:12800 added to allowed origins

### Changed
- Reorganized project documentation structure

---

## [0.12.0] Migration to cPanel & MySQL - 2026-01-18 to 2026-01-25

### Added
- cPanel deployment support with local authentication (replacing AWS Cognito)
- GitHub Actions workflows for cPanel deployments (backend, research-frontend, participant-frontend)
- Auto-convert PostgreSQL query syntax to MySQL (JSON functions, column names)
- Stage_templates_module_templates junction table migration
- Static file serving for Cognitive Tasks images in cPanel
- Upload-direct endpoint for multipart file uploads (cPanel)
- All-endpoints cPanel testing script
- Auto-hide unconfigured modules
- Welcome/Thank You screens as defaults for all researches
- Endpoint and UI to add Welcome/Thank You screens to existing researches
- Environment-aware database routing with dev_ table prefixes
- Real-time monitoring migrated from WebSocket to SSE for cPanel compatibility

### Changed
- Removed backend-graphql service
- Optimized config for cPanel with no AWS dependencies
- Migrated seed scripts to work with both PostgreSQL and MySQL
- Improved deploy scripts with aggressive cache busting
- Standardized padding across SmartVOC and CognitiveTask module cards
- Cleaned up Research Configuration UI labels

### Fixed
- MySQL compatibility: column renames (settings->config, user_id->created_by, stage_type->type), removed non-existent columns
- PostgreSQL json_agg FILTER converted to MySQL JSON_ARRAYAGG subquery
- MySQL-compatible syntax for conditional DDL in migrations
- CI migrated from PostgreSQL to MySQL
- Auth: password_hash update for existing users, JSON metadata parsing from MySQL
- Runtime-config.json path for /participant/ base
- Build time injection moved to buildEnd hook
- SSH port support in cPanel deployment workflows
- Google OAuth credentials path for cPanel
- Turnstile completely disabled for cPanel environment
- Ranking module: support for ranking-list format, items extraction from multiple component types
- Navigation skip for virtual welcome step when not configured
- Media endpoint: s3_key/media_path compatibility
- Welcome/Thank You duplicate prevention (stage name check, StrictMode handling)
- mod_security disabled for API directory (endpoint URL filtering)
- OAuth callback routing for local development
- Welcome Screen input widths and textarea resize limited
- Smart VOC header removed, Cognitive Tasks stage detection fixed
- Local auth implementation and API client configuration updated
- Results showing only components with data in SmartVOC and Cognitive Tasks

---

## [0.13.0] Results Visualization & Module Editors - 2026-01-28 to 2026-02-17

### Added
- Image rendering in Preference Test results
- HitZones overlay and click correctness visualization in Navigation Flow results
- Tab navigation with Heat Click Map, Click Map, and Image views in Navigation Flow results
- Ranking builder with functional editor
- Dynamic add/remove choices for Multiple Choice module editor
- Checkbox-list/option-list support with choice fallback parsing
- Draft research preview from participant-frontend
- Functional Ranking editor with minimum 2 items enforcement across modules
- DB migration script for fixing existing Ranking module configs

### Fixed
- URL preview race condition in Research Configuration
- CognitiveTask null-safety improvements
- Misleading text corrections in UI
- Vite.svg 404 replaced with inline empty favicon
- Multiple Choice choices reset on React Query refetch
- Initial component load by initializing prevContentKey as empty string
- RadioChoicesEditor delete button disabled when only 2 choices remain
- Quota sync and backlink URL normalization in Research Configuration
- Backlinks delivery and demographics persistence in participant-frontend
- ParticipantLimit persistence (saved as {enabled, value} for backend)
- Ranking module: `ranking-list` component type handling, extracted RankingItemsEditor as standalone component (fixed React anti-pattern)
- Dotenv path in ranking migration script
- 24 existing Ranking modules in production DB updated with correct config structure
