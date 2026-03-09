# External Integrations

**Analysis Date:** 2025-03-09

## APIs & External Services

**Google OAuth:**
- Purpose: Social login for researchers (alternative to email/password)
- SDK/Client: `google-auth-library` 9.15.1
- Implementation: OAuth2 authorization code flow
- Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` env vars (or `google-credentials.json` file)
- Endpoints: `GET /auth/google` (initiate), `GET /auth/google/callback` (handle redirect)
- Files: `backend/src/modules/auth/auth.controller.ts` (lines 311-553), `backend/src/modules/auth/auth.service.local.ts`

**Cloudflare Turnstile:**
- Purpose: Bot protection on participant survey submissions
- SDK/Client: `@marsidev/react-turnstile` 1.4.0 (frontend), server-side verification via HTTP
- Auth (frontend): `VITE_TURNSTILE_SITE_KEY` env var
- Auth (backend): `TURNSTILE_SECRET_KEY` env var
- Files:
  - `participant-frontend/src/components/security/TurnstileWidget.tsx` - CAPTCHA widget
  - `backend/src/modules/public/public.service.ts` - Server-side token verification
  - `participant-frontend/src/pages/ResearchPage.tsx` - Integration in survey flow

**MediaPipe (Google):**
- Purpose: Browser-based eye tracking via webcam for UX research
- SDK/Client: `@mediapipe/tasks-vision` 0.10.32
- Auth: None (client-side ML model, no API key)
- Files: `participant-frontend/src/hooks/useEyeTracking.ts`

**Trello API (MCP):**
- Purpose: Project management integration via Model Context Protocol
- SDK/Client: `@modelcontextprotocol/sdk` 1.22.0
- Auth: `TRELLO_API_KEY`, `TRELLO_TOKEN`, `TRELLO_BOARD_ID` env vars
- Status: Configured in `.env.example`, likely used for development tooling

## AWS Services (Legacy / Partial)

**AWS S3:**
- Purpose: Media file storage (presigned URLs for upload/download)
- SDK/Client: `@aws-sdk/client-s3` 3.937.0, `@aws-sdk/s3-request-presigner` 3.937.0
- Auth: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` env vars
- Status: **Replaced in production** by local filesystem storage on cPanel
- Production replacement: `backend/src/modules/media/media.service.local.ts` uses `backend/src/config/local-storage.ts`
- S3 client still exists: `backend/src/config/s3.ts` (used in dev mode or legacy Lambda deployment)
- Files: `backend/src/config/s3.ts`, `backend/src/modules/media/media.service.local.ts`

**AWS SSM Parameter Store:**
- Purpose: Secrets management for database credentials
- SDK/Client: `@aws-sdk/client-ssm` 3.937.0
- Auth: AWS IAM role (Lambda) or `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`
- Status: **Only used if `SSM_PREFIX` env var is set** (AWS Lambda deployments)
- Production (cPanel): Uses `DB_*` env vars from `.env` file directly
- Files: `backend/src/config/ssm.ts`, `backend/src/config/secrets.ts`

**AWS Cognito:**
- Purpose: User authentication (user pools)
- SDK/Client: `@aws-sdk/client-cognito-identity-provider` 3.936.0
- Auth: `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` env vars
- Status: **Replaced** by local JWT authentication (`backend/src/utils/auth.local.ts`)
- Legacy files still present in codebase

**AWS API Gateway WebSocket:**
- Purpose: Real-time monitoring connections
- SDK/Client: `@aws-sdk/client-apigatewaymanagementapi` 3.957.0
- Status: **Replaced** by Server-Sent Events (SSE) for cPanel compatibility
- Replacement: `backend/src/modules/monitor/monitor-sse.service.ts`
- Legacy: `backend/src/modules/monitor/monitor.service.ts`

## Data Storage

**Database:**
- Type: MySQL
- Driver: `mysql2` 3.11.5 (promise-based connection pool)
- Connection: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL` env vars
- Database name: `emotvehe_emotiox` (production)
- Connection pooling: 10 connections, 30s idle timeout, 20s connect timeout
- SSL: Auto-detected based on host (enabled for `.rds.amazonaws.com`, disabled for localhost)
- Environment routing: `dev_` table prefix for development requests (based on request origin via `AsyncLocalStorage`)
- PostgreSQL compatibility layer: Queries written in PG syntax (`$1`, `::jsonb`) auto-converted to MySQL syntax (`?`) at runtime
- Files: `backend/src/config/database.ts` (pool, query converter, environment routing)
- Migrations: `database/migrations-mysql/` (14 SQL files, `001_initial_schema.sql` through `014_create_stage_templates_module_templates.sql`)

**File Storage:**
- Production: Local filesystem at `~/emotioxv3/backend/media/` (cPanel)
- Configurable via `MEDIA_BASE_DIR` env var
- Served statically at `/media/*` and `/api/media/*` paths
- Upload: Multer (memory storage, 50MB limit) via `POST/PUT /api/media/upload-direct`
- Files: `backend/server-cpanel.js` (static serving + upload endpoints), `backend/src/modules/media/media.service.local.ts`, `backend/src/config/local-storage.ts`

**Caching:**
- In-memory cache (custom implementation)
- Files: `backend/src/config/cache.ts`
- Admin endpoints: `GET /cache/stats`, `DELETE /cache/clear`
- Stats logged every 5 minutes

## Authentication & Identity

**Primary Auth: Local JWT**
- Implementation: `jsonwebtoken` library with `JWT_SECRET` env var
- Access token: 24h expiry, sent as httpOnly cookie + response body
- Refresh token: 7d expiry (or 2d with `rememberMe`), uses `JWT_REFRESH_SECRET`
- Token extraction: Cookie (`accessToken=...`) or `Authorization: Bearer ...` header
- Files: `backend/src/utils/auth.local.ts` (verify, extract, requireAuth), `backend/src/modules/auth/auth.service.local.ts` (register, login, refresh)

**Secondary Auth: Google OAuth2**
- Flow: Authorization code grant
- Redirect: `GET /auth/google` -> Google -> `GET /auth/google/callback`
- After OAuth: Creates/finds user in DB, issues local JWT tokens
- Files: `backend/src/modules/auth/auth.controller.ts`

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, or similar)

**Logs:**
- `console.log` / `console.error` throughout backend
- Structured logging for DB routing decisions (origin detection)
- Production frontends: `console` and `debugger` statements dropped by esbuild

**Real-time Monitoring:**
- SSE (Server-Sent Events) for live research monitoring
- Endpoint: `GET /api/monitor/events/:researchId?token=xxx`
- Ping every 30s, stale cleanup every 60s
- Files: `backend/src/modules/monitor/monitor-sse.service.ts`, `backend/server-cpanel.js` (SSE endpoint)

## CI/CD & Deployment

**Hosting:**
- cPanel shared hosting at `emotio.cx`
- Phusion Passenger as Node.js application server
- Entry point: `backend/server-cpanel.js`

**CI Pipeline:**
- GitHub Actions (3 workflows):
  - `deploy-backend-cpanel.yml` - Triggered by changes in `backend/**`
  - `deploy-research-frontend-cpanel.yml` - Triggered by changes in `research-frontend/**`
  - `deploy-participant-frontend-cpanel.yml` - Triggered by changes in `participant-frontend/**`
- All triggered on push to `main` or `workflow_dispatch`
- Backend deploy: rsync source -> remote npm install -> remote tsc build -> verify files
- Frontend deploy: local build -> rsync `dist/` to remote `public_html/`

**CI Secrets:**
- `CPANEL_SSH_PRIVATE_KEY` - SSH key for deployment
- `CPANEL_SSH_HOST` - cPanel server hostname
- `CPANEL_SSH_USER` - SSH username
- `CPANEL_SSH_PORT` - SSH port

**Remote Paths:**
- Backend: `~/emotioxv3/backend/`
- Research Frontend: `~/public_html/research/`
- Participant Frontend: `~/public_html/participant/`

**Legacy Workflows (unused):**
- `deploy-backend.yml`, `deploy-research-frontend.yml`, `deploy-participant-frontend.yml` - AWS Lambda/S3 deployments
- `ci-smoke.yml` - Smoke tests

## Environment Configuration

**Required env vars (backend):**
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - MySQL connection
- `JWT_SECRET` - JWT token signing
- `JWT_REFRESH_SECRET` - Refresh token signing

**Optional env vars (backend):**
- `DB_SSL` - Enable SSL for database (`true`/`false`)
- `NODE_ENV` - `development` or `production`
- `PORT` - Server port (default 3000)
- `CORS_ORIGIN`, `RESEARCH_FRONTEND_URL`, `PARTICIPANT_FRONTEND_URL` - Additional CORS origins
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (or `GOOGLE_CREDENTIALS_PATH`) - Google OAuth
- `TURNSTILE_SECRET_KEY` - Cloudflare Turnstile server verification
- `MEDIA_BASE_DIR` - Local media storage directory
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` - S3 (dev only)
- `SSM_PREFIX`, `SSM_REGION` - AWS SSM (Lambda only)
- `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` - Legacy Cognito
- `TRELLO_API_KEY`, `TRELLO_TOKEN`, `TRELLO_BOARD_ID` - Trello MCP

**Frontend env vars:**
- `VITE_TURNSTILE_SITE_KEY` - Cloudflare Turnstile site key (participant-frontend)

**Runtime config (frontends):**
- `research-frontend/public/runtime-config.json`: `{ "apiBaseUrl": "https://emotio.cx/api", "participantBaseUrl": "https://emotio.cx/participant" }`
- `participant-frontend/public/runtime-config.json`: `{ "apiBaseUrl": "https://emotio.cx/api" }`

**Secrets location:**
- Backend: `.env` file on server (`~/emotioxv3/backend/.env`), never committed
- CI/CD: GitHub Actions secrets
- SSH: `ssh cpanel-emotio` alias (configured in `.env.claude`)

## Webhooks & Callbacks

**Incoming:**
- `GET /auth/google/callback` - Google OAuth2 redirect callback

**Outgoing:**
- None detected

## Internationalization

**Participant Frontend:**
- Framework: `i18next` 25.8.14 + `react-i18next` 16.5.4
- Languages: Spanish (ES) and English (EN)
- Config: `participant-frontend/src/i18n/index.ts`
- Translations: `participant-frontend/src/i18n/locales/`

**Research Frontend:**
- No i18n library detected (likely Spanish-only or handled differently)

---

*Integration audit: 2025-03-09*
