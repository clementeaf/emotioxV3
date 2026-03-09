# Technology Stack

**Analysis Date:** 2025-03-09

## Languages

**Primary:**
- TypeScript (strict mode) - Used across all three subprojects (backend, research-frontend, participant-frontend)

**Secondary:**
- JavaScript (CommonJS) - Backend production entry point (`backend/server-cpanel.js`), Husky hooks
- SQL - MySQL migration files (`database/migrations-mysql/`)

## Runtime

**Environment:**
- Node.js (no `.nvmrc` or `.node-version` specified; inferred from dependencies as Node 18+)
- Browser (React 19 SPAs)

**Package Manager:**
- npm (each subproject has its own `package.json` and `node_modules`)
- Lockfile: `package-lock.json` present per subproject

## Frameworks

**Core:**
- Express 5.1.0 - Backend HTTP server (`backend/src/server.ts`, `backend/server-cpanel.js`)
- React 19.2.1 - Both frontends
- React Router 7.9.6 - Client-side routing in both frontends

**State Management:**
- Zustand 5.0.8 - Client state (both frontends, with localStorage persistence)
- TanStack React Query 5.90.10 - Server state (both frontends)

**Testing:**
- Vitest 4.0.16 - Participant frontend only (`participant-frontend/package.json`)
- Testing Library React 16.3.1 - Participant frontend only
- jsdom 27.4.0 - Test environment for participant-frontend

**Build/Dev:**
- Vite 7.2.4 - Both frontends (dev server + production build)
- `@vitejs/plugin-react` 5.1.1 - React Fast Refresh
- `tsc` (TypeScript 5.9.3) - Backend build to `dist/`
- `tsx` 4.20.6 - Backend dev mode (`tsx watch src/server.ts`)
- esbuild - Vite's default minifier for production builds

**Linting:**
- ESLint 9.39.1 - Both frontends (flat config: `eslint.config.js`)
- `eslint-plugin-react-hooks` 7.0.1 - React hooks rules
- `eslint-plugin-react-refresh` 0.4.24 - HMR safety

**Styling:**
- Tailwind CSS 3.4.18 - Both frontends (`tailwind.config.js`)
- PostCSS 8.5.6 + Autoprefixer 10.4.22 - CSS processing

**Pre-commit:**
- Husky 9.1.7 - Git hooks (`.husky/pre-commit`)
- Runs: `type-check` + `lint` on all 3 subprojects before every commit

## Key Dependencies

**Critical (Backend):**
- `mysql2` 3.11.5 - MySQL database driver with connection pooling (`backend/src/config/database.ts`)
- `jsonwebtoken` 9.0.2 - JWT token signing/verification (`backend/src/utils/auth.local.ts`)
- `bcrypt` 5.1.1 - Password hashing for local auth
- `google-auth-library` 9.15.1 - Google OAuth2 flow (`backend/src/modules/auth/auth.controller.ts`)
- `multer` 1.4.5-lts.1 - File upload handling (memory storage, `server-cpanel.js`)
- `cors` 2.8.5 - CORS middleware
- `dotenv` 17.2.3 - Environment variable loading
- `axios` 1.13.2 - HTTP client (used in backend and both frontends)

**Critical (Research Frontend):**
- `react-hook-form` 7.66.1 + `@hookform/resolvers` 5.2.2 + `zod` 4.1.12 - Form handling with schema validation
- `@dnd-kit/core` 6.3.1 + `@dnd-kit/sortable` 10.0.0 - Drag-and-drop for module builder
- `recharts` 3.5.1 - Analytics charts and visualizations
- `react-qr-code` 2.0.18 - QR code generation for participant links
- `@tanstack/react-table` 8.21.3 - Data tables
- `framer-motion` 12.23.24 - Animations
- `lucide-react` 0.554.0 - Icon library

**Critical (Participant Frontend):**
- `i18next` 25.8.14 + `react-i18next` 16.5.4 - Internationalization (ES/EN)
- `@marsidev/react-turnstile` 1.4.0 - Cloudflare Turnstile CAPTCHA
- `@mediapipe/tasks-vision` 0.10.32 - Eye tracking via camera (`participant-frontend/src/hooks/useEyeTracking.ts`)
- `react-window` 2.2.3 - Virtualized lists

**Infrastructure (Backend - Legacy/Partial Use):**
- `@aws-sdk/client-s3` 3.937.0 - S3 presigned URLs (dev mode; production uses local filesystem)
- `@aws-sdk/client-ssm` 3.937.0 - SSM Parameter Store (AWS Lambda mode only)
- `@aws-sdk/client-cognito-identity-provider` 3.936.0 - Legacy Cognito (replaced by local JWT)
- `@aws-sdk/client-apigatewaymanagementapi` 3.957.0 - Legacy WebSocket (replaced by SSE)
- `@modelcontextprotocol/sdk` 1.22.0 - MCP server integration

**Utility:**
- `uuid` 13.0.0 - UUID generation
- `clsx` 2.1.1 + `tailwind-merge` 3.4.0 - Conditional CSS class merging (both frontends)
- `date-fns` 4.1.0 - Date formatting (both frontends)
- `radashi` 12.7.1 - Utility functions (research-frontend)
- `jwks-rsa` 3.2.0 - JWKS key retrieval (legacy Cognito verification)

## Configuration

**Environment:**
- Backend: `.env` file loaded via `dotenv` (multiple path fallbacks in `backend/src/server.ts`)
- `.env.example` documents required vars: `DB_*`, `JWT_SECRET`, `AWS_*`, `S3_BUCKET_NAME`, `COGNITO_*`, `TURNSTILE_SECRET_KEY`, `TRELLO_*`
- `.env`, `.env.production`, `.env.claude` files present (never read contents)
- Frontends: `public/runtime-config.json` for API base URL (loaded at runtime, not baked into build)

**Build:**
- Backend: `backend/tsconfig.json` - Target ES2020, module CommonJS, strict, outDir `./dist`
- Research Frontend: `research-frontend/vite.config.ts` - Base path `/research/` in prod, port 12800
- Participant Frontend: `participant-frontend/vite.config.ts` - Base path `/participant/` in prod, port 12600
- Both frontends use manual chunk splitting for vendor bundles
- Research frontend drops `console` and `debugger` in production builds

**TypeScript:**
- All 3 subprojects use `strict: true`
- Backend: ES2020 target, CommonJS modules
- Frontends: Project references (`tsconfig.app.json` + `tsconfig.node.json`)

## Platform Requirements

**Development:**
- Node.js 18+ (inferred from ES2020 target and dependency versions)
- npm (each subproject independent)
- Both frontends proxy API calls to `https://emotio.cx/api` (no local backend needed)
- Backend dev: `tsx watch` on port 3000
- Research frontend dev: Vite on port 12800
- Participant frontend dev: Vite on port 12600

**Production:**
- cPanel shared hosting (emotio.cx)
- Phusion Passenger (Node.js app server, entry: `backend/server-cpanel.js`)
- MySQL database (`emotvehe_emotiox`)
- Local filesystem for media storage (replaces S3)
- GitHub Actions for CI/CD (3 separate workflows, triggered by path changes on `main`)

## Monorepo Structure

**Type:** Simple monorepo with independent `package.json` per subproject (no workspaces)

**Root `package.json`:**
- Husky for pre-commit hooks
- `ts-node` and `uuid` as dev dependencies
- No workspace configuration

---

*Stack analysis: 2025-03-09*
