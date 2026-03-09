# Codebase Concerns

**Analysis Date:** 2026-03-09

## Tech Debt

**PostgreSQL-to-MySQL Compatibility Layer:**
- Issue: The entire backend was migrated from PostgreSQL to MySQL but retains a thick compatibility shim (`convertPgToMysql`) that translates PG query syntax at runtime. The codebase still uses `$1, $2` placeholders, `::jsonb` type casts, `ILIKE`, `JSON_AGG`, `uuid_generate_v4()`, and `ANY($1)` syntax — all converted on-the-fly via regex.
- Files: `backend/src/config/database.ts` (lines 92-146)
- Impact: Every SQL query pays a regex-replacement cost. Edge cases in the regex could silently produce incorrect SQL. The `order_index` → `display_order` column-name rewrite (lines 141-143) is fragile — any new column with "order_index" in its name would be incorrectly rewritten. Additionally, complex queries (subqueries, CTEs) may not be correctly converted.
- Fix approach: Rewrite queries to use native MySQL `?` placeholders and MySQL-native functions directly. Remove the compatibility layer entirely.

**Duplicated Dev-Prefix Table Lists:**
- Issue: The list of tables needing `dev_` prefix for development environment is duplicated between `pool.query()` and `pool.connect()` in the database wrapper, and the two lists are already out of sync — `pool.query()` includes `demographic_quotas` and `participant_demographics` but `pool.connect()` does not.
- Files: `backend/src/config/database.ts` (lines 308-315 vs 360-366)
- Impact: Queries using `pool.connect()` (transactions) will NOT prefix `demographic_quotas` or `participant_demographics` in dev, causing them to hit production tables from development.
- Fix approach: Extract the table list to a single constant and reference it from both methods.

**CORS Configuration Duplicated:**
- Issue: CORS allowed origins are defined in three separate places with different values — `backend/src/utils/response.ts` (lines 9-38), `backend/src/server-cpanel.ts` (lines 30-44), and in the Express middleware. They include stale CloudFront and legacy domain entries.
- Files: `backend/src/utils/response.ts`, `backend/src/server-cpanel.ts`
- Impact: CORS behavior differs depending on whether the request goes through the Lambda router path vs Express middleware. Stale origins clutter configuration.
- Fix approach: Consolidate into a single shared `ALLOWED_ORIGINS` constant. Remove legacy CloudFront and domain entries that are no longer in use.

**AWS Lambda Types Pervasive in cPanel-Only Backend:**
- Issue: The backend uses `APIGatewayProxyEvent` and `APIGatewayProxyResult` types throughout all controllers and the router, even though deployment is exclusively on cPanel/Passenger. The Express server in `server-cpanel.ts` manually constructs fake `APIGatewayProxyEvent` objects to pass into the Lambda-style router.
- Files: `backend/src/router.ts`, `backend/src/server-cpanel.ts`, all controller files in `backend/src/modules/*/`
- Impact: Every controller must parse/serialize to Lambda event/response format unnecessarily. Adding new Express middleware or features (e.g., streaming, websockets) requires working around the Lambda abstraction. Dependencies include unused AWS SDK packages (`@aws-sdk/client-apigatewaymanagementapi`, `@aws-sdk/client-cognito-identity-provider`, `@aws-sdk/client-ssm`).
- Fix approach: Refactor controllers to use Express `Request`/`Response` directly. Remove the Lambda shim layer and unused AWS SDK dependencies from `backend/package.json`.

**Legacy AWS Infrastructure Artifacts:**
- Issue: Unused AWS infrastructure code remains: `backend/src/handler.ts` (Lambda entry), `backend/src/config/cognito.ts` (Cognito config), `backend/src/config/ssm.ts` (SSM parameter loading), `backend/src/modules/monitor/handler.ts` (WebSocket Lambda handler), `infrastructure/main.tf` with Terraform state files.
- Files: `backend/src/handler.ts`, `backend/src/config/cognito.ts`, `backend/src/config/ssm.ts`, `backend/src/modules/monitor/handler.ts`, `infrastructure/main.tf`, `infrastructure/terraform.tfstate`
- Impact: Dead code confuses future developers. Terraform state files committed to git could contain sensitive resource identifiers. AWS SDK dependencies inflate `node_modules`.
- Fix approach: Delete all legacy AWS files. Remove unused AWS SDK packages. Delete or `.gitignore` the Terraform state files.

**Cognitive Task Analytics Uses Mock Data in Production:**
- Issue: `useCognitiveTaskAnalytics` hook returns hardcoded mock data with a simulated 500ms delay instead of calling the actual API. The real service import is commented out with a TODO.
- Files: `research-frontend/src/hooks/useCognitiveTaskAnalytics.ts` (entire file, 167 lines)
- Impact: Research dashboard shows fake analytics for cognitive tasks. Users see fabricated response counts and percentages.
- Fix approach: Implement the backend analytics endpoint and connect the hook to the real API.

**Mock Data Files Shipped to Production:**
- Issue: Large mock data files exist in participant-frontend and may be bundled, even though they appear to only be used by the DevSidebar.
- Files: `participant-frontend/src/data/mockSmartVOCModules.ts` (365 lines), `participant-frontend/src/data/mockCognitiveModules.ts` (374 lines), `participant-frontend/src/data/mockModules.ts`
- Impact: Increased bundle size. Risk of mock data being accidentally displayed to real participants.
- Fix approach: Move mock data behind a dev-only import or remove entirely. Gate DevSidebar behind `import.meta.env.DEV`.

**Service Worker Permanently Disabled:**
- Issue: Service worker registration in participant-frontend is disabled via `const ENABLE_SW = false` with a comment "TEMPORARILY DISABLED to break cache cycle." This appears to be a long-standing workaround.
- Files: `participant-frontend/src/main.tsx` (line 27)
- Impact: No offline support or caching for participants. The SW code (50+ lines) is dead weight.
- Fix approach: Either fix the cache cycle issue and re-enable, or remove the SW code entirely.

**Research Types Cache Disabled:**
- Issue: Cache for research types is explicitly disabled with comment "TEMPORARY: Disable cache to ensure fresh data after cleanup" and a TODO to re-enable.
- Files: `backend/src/modules/research-types/research-types.service.ts` (lines 13-15)
- Impact: Every research types request hits the database. On a busy dashboard this adds unnecessary load.
- Fix approach: Investigate and fix the cache issue, then re-enable caching.

## Security Considerations

**JWT Secret Fallback to Hardcoded Value:**
- Risk: If `JWT_SECRET` env var is not set, the code falls back to the string `'change-this-secret-in-production'`. Same for refresh secret: `'change-this-refresh-secret-in-production'`. This is present in THREE separate locations.
- Files: `backend/src/utils/auth.local.ts` (line 11), `backend/src/modules/auth/auth.controller.ts` (line 462), `backend/src/modules/auth/auth.service.local.ts` (line 15)
- Current mitigation: Relies on `.env` file being properly configured in production.
- Recommendations: Throw an error at startup if `JWT_SECRET` is not set in production. Remove the fallback entirely. Centralize JWT secret retrieval to a single location.

**No Rate Limiting:**
- Risk: No rate limiting on any endpoints including authentication (`/auth/login`, `/auth/register`), public response submission (`/public/research/:id/responses`), or API endpoints.
- Files: `backend/src/server-cpanel.ts`, `backend/src/router.ts`
- Current mitigation: None detected.
- Recommendations: Add `express-rate-limit` middleware for auth endpoints (strict), public endpoints (moderate), and authenticated API endpoints (lenient).

**No Security Headers (Helmet):**
- Risk: No `helmet` or equivalent middleware to set security headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.).
- Files: `backend/src/server-cpanel.ts`
- Current mitigation: None.
- Recommendations: Add `helmet` middleware to the Express app.

**Debug Endpoints Exposed in Production:**
- Risk: `/debug-headers` and `/debug/ranking-module` endpoints are active in production with no authentication required. `/debug-headers` returns all request headers.
- Files: `backend/src/router.ts` (lines 58-75), `backend/src/modules/debug/debug.controller.ts`
- Current mitigation: None. Comment says "temporary - remove in production" but they remain.
- Recommendations: Remove debug routes or gate them behind authentication + admin role check + `NODE_ENV !== 'production'`.

**Turnstile Anti-Bot Protection Disabled:**
- Risk: Cloudflare Turnstile verification is disabled globally (`TURNSTILE_ENABLED = false` in participant-frontend, `turnstileEnabled` checks `process.env.TURNSTILE_SECRET_KEY` which is apparently not set).
- Files: `participant-frontend/src/pages/ResearchPage.tsx` (line 31), `participant-frontend/src/services/response.service.ts` (lines 65, 216), `backend/src/modules/public/public.service.ts` (line 623)
- Current mitigation: None — survey responses can be submitted without any bot protection.
- Recommendations: Configure `TURNSTILE_SECRET_KEY` and enable verification, or implement an alternative anti-abuse measure.

**SSL Certificate Verification Disabled:**
- Risk: Database SSL connections use `rejectUnauthorized: false`, which disables certificate validation and makes the connection vulnerable to MITM attacks.
- Files: `backend/src/config/database.ts` (lines 51, 163, 175)
- Current mitigation: Database is on localhost in cPanel, so the risk is minimal in current deployment.
- Recommendations: When using remote databases, configure proper SSL certificate validation.

**No Backend Input Validation Framework:**
- Risk: Backend controllers accept request body data without schema validation (no Zod, Joi, or similar). Validation is ad-hoc per endpoint.
- Files: All controller files in `backend/src/modules/*/`
- Current mitigation: SQL parameterized queries prevent injection, but malformed data can cause unexpected behavior.
- Recommendations: Add Zod schema validation at the controller/middleware level for all endpoints.

**Token Logged to Console:**
- Risk: Auth store logs partial token values to console: `token.substring(0, 30)`.
- Files: `research-frontend/src/stores/auth.store.ts` (line 137)
- Current mitigation: Only first 30 chars logged.
- Recommendations: Remove token logging or reduce to boolean presence check only.

## Performance Bottlenecks

**Excessive Console Logging in Production:**
- Problem: 280 `console.log/warn/error` calls across 43 backend source files. Many are verbose debug logs (full JSON dumps, query results, parameter values) that run in production.
- Files: `backend/src/modules/research/research.service.ts` (73 occurrences), `backend/src/modules/public/public.service.ts` (31), `backend/src/modules/research-types/research-types.controller.ts` (18)
- Cause: No log-level system; all logs always emit.
- Improvement path: Introduce a structured logger (e.g., `pino` or `winston`) with configurable log levels. Use `debug` level for query/parameter logging. Set `info` or `warn` in production.

**research.service.ts God File:**
- Problem: Single file at 1,387 lines handles research CRUD, stage creation, module cloning, template instantiation, stage reordering, module reordering, and welcome/thank-you screen management.
- Files: `backend/src/modules/research/research.service.ts`
- Cause: All research-related business logic accumulated in one file.
- Improvement path: Split into focused services: `research-crud.service.ts`, `research-stages.service.ts`, `research-modules.service.ts`, `research-templates.service.ts`.

**ResearchPage.tsx (Participant) Monolith:**
- Problem: 1,017-line component handles the entire participant survey flow including step navigation, response collection, validation, device/location detection, and completion logic.
- Files: `participant-frontend/src/pages/ResearchPage.tsx`
- Cause: All survey orchestration logic lives in one component.
- Improvement path: Extract step management, response submission, and flow control into custom hooks. Break into smaller components.

## Fragile Areas

**PG-to-MySQL Query Converter:**
- Files: `backend/src/config/database.ts` (lines 92-146)
- Why fragile: Regex-based SQL rewriting is inherently fragile. The `$N` placeholder replacement sorts numerically to avoid `$1` matching part of `$10`, but the approach of `split().join()` replaces ALL occurrences including those inside string literals. Column name rewrites (`order_index` to `display_order`) apply globally and could affect unrelated columns.
- Safe modification: Test any new query containing `$N` placeholders, type casts, or `order_index` columns carefully. Consider adding integration tests for the converter.
- Test coverage: Zero tests for the query converter.

**Dev-Environment Table Prefixing:**
- Files: `backend/src/config/database.ts` (lines 305-331, 356-378)
- Why fragile: Uses regex to prefix table names in raw SQL strings. Could match table names inside string literals, column aliases, or JOIN conditions. The two table lists are already out of sync.
- Safe modification: Always verify dev queries manually after adding new tables. Keep both lists synchronized.
- Test coverage: No tests.

**Research Creation Flow:**
- Files: `backend/src/modules/research/research.service.ts` (lines 72-247)
- Why fragile: Complex transaction with multiple conditional branches: stage template creation, module cloning, name normalization (e.g., "Cognitive Task" to "Cognitive Tasks", "Thank you screen" to "Thank You Screen"). Hardcoded stage template names used as identifiers.
- Safe modification: Any change to template names in the database must be mirrored in the hardcoded `stageTemplateNames` array. Test creation with all research type combinations.
- Test coverage: No automated tests.

**Auth Token Storage (Dual-Path):**
- Files: `research-frontend/src/stores/auth.store.ts`, `research-frontend/src/services/api/client.ts`
- Why fragile: Authentication uses both httpOnly cookies AND Authorization headers simultaneously as a "temporary" measure. Tokens are stored in localStorage/sessionStorage AND in Zustand store AND sent as cookies. Multiple TODO comments indicate this was meant to be simplified. The dual-path makes it hard to reason about which auth mechanism is actually being used.
- Safe modification: Any auth change must consider all three storage mechanisms. Test both cookie and header auth paths.
- Test coverage: No tests.

## Scaling Limits

**In-Memory Cache:**
- Current capacity: Node.js process memory (single instance).
- Limit: Cache is lost on process restart (Passenger `touch tmp/restart.txt`). No shared cache between potential multiple worker processes.
- Scaling path: Replace with Redis for shared, persistent caching if horizontal scaling is needed.

**Single MySQL Connection Pool:**
- Current capacity: 10 connections (`connectionLimit: 10`).
- Limit: Under heavy concurrent load, all 10 connections could be occupied, causing request queuing.
- Scaling path: Increase `connectionLimit` as needed. Monitor connection usage. Consider connection pooling proxy for multiple backend instances.

**SSE Connections for Real-Time Monitoring:**
- Current capacity: One SSE connection per researcher per research.
- Limit: SSE connections hold open HTTP connections. With many concurrent researchers, this consumes server resources proportionally.
- Scaling path: `backend/src/modules/monitor/monitor-sse.service.ts` (160 lines). Consider WebSocket upgrade or polling fallback.

## Dependencies at Risk

**Unused AWS SDK Packages:**
- Risk: Five `@aws-sdk/*` packages are installed but only `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` are actively used. The rest (`client-apigatewaymanagementapi`, `client-cognito-identity-provider`, `client-ssm`) serve legacy Lambda/Cognito code paths.
- Impact: Inflated `node_modules` size, slower installs, potential security vulnerabilities in unused code.
- Migration plan: Remove `@aws-sdk/client-apigatewaymanagementapi`, `@aws-sdk/client-cognito-identity-provider`, `@aws-sdk/client-ssm` after removing legacy code.

**PostgreSQL Package in DevDependencies:**
- Risk: `pg` (PostgreSQL client) is still listed in `devDependencies` despite full migration to MySQL.
- Impact: Confusing for developers; suggests PostgreSQL support.
- Migration plan: Remove `pg` and `@types/pg` from `backend/package.json`.

**Serverless Framework in DevDependencies:**
- Risk: `serverless`, `serverless-domain-manager`, `serverless-dotenv-plugin`, `serverless-offline` are still in `devDependencies`. No `serverless.yml` appears to be in active use.
- Impact: Unnecessary dev dependencies, misleading project setup.
- Migration plan: Remove serverless-related packages and scripts (`dev:serverless`, `deploy`).

## Test Coverage Gaps

**Backend: Zero Test Files:**
- What's not tested: The entire backend has no test files. All 11,220 lines of TypeScript are untested.
- Files: All files in `backend/src/`
- Risk: Any refactoring (especially the PG-to-MySQL converter, auth, research creation) could introduce regressions silently.
- Priority: High — especially for `backend/src/config/database.ts` (query converter), `backend/src/modules/research/research.service.ts` (business logic), and `backend/src/utils/auth.local.ts` (security).

**Research Frontend: Zero Test Files:**
- What's not tested: All 31,477 lines across the research dashboard have no tests.
- Files: All files in `research-frontend/src/`
- Risk: UI regressions in builder, configuration, and analytics views go undetected.
- Priority: Medium — critical paths include `ResearchBuilderPage.tsx`, `ResearchConfigurationModule.tsx`, and `demographicsMapper.ts`.

**Participant Frontend: Single Test File:**
- What's not tested: Only `DemographicsStep.test.tsx` (138 lines) exists. The core survey flow (`ResearchPage.tsx`, 1,017 lines), response submission, validation, and all other components are untested.
- Files: `participant-frontend/src/components/steps/DemographicsStep.test.tsx` is the sole test.
- Risk: Survey flow bugs (navigation, response saving, completion) would not be caught by CI.
- Priority: High — `ResearchPage.tsx` orchestrates the entire participant experience.

## Missing Critical Features

**No Request Input Validation:**
- Problem: Backend has no schema validation middleware. Controller handlers trust client-submitted data shapes.
- Blocks: Cannot guarantee data integrity at the API boundary. Makes it harder to provide clear error messages for malformed requests.

**No Structured Error Responses:**
- Problem: Error responses vary in format across controllers. Some return `{ message }`, others throw and let the router catch produce `{ message }`. No standardized error codes or field-level validation errors.
- Blocks: Frontend error handling must guess error format. Cannot display field-specific validation errors to users.

**NEV Analytics Not Calculated:**
- Problem: NEV (Net Emotional Value) analytics are hardcoded to `0` in the dashboard timeline with `// TODO: Calculate NEV if needed`.
- Files: `backend/src/modules/analytics/analytics.service.ts` (line 601)
- Blocks: Researchers cannot see NEV trends over time despite NEV being a core SmartVOC metric.

---

*Concerns audit: 2026-03-09*
