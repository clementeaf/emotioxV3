# DevOps Patterns — EmotioX V3

## Hosting

```
cPanel (emotio.cx) + Passenger (Node.js)

Remote paths:
~/emotioxv3/backend/          → Backend (src + dist + .env + server-cpanel.js)
~/public_html/research/       → Research Frontend (Vite dist/)
~/public_html/participant/    → Participant Frontend (Vite dist/)
```

---

## Deploy Scripts (Manual)

### Backend

```bash
./scripts/deploy-backend-cpanel.sh
# 1. Verify SSH (cpanel-emotio alias)
# 2. Create remote dirs
# 3. rsync src/ (exclude node_modules, dist, .env)
# 4. SSH: npm install --production=false
# 5. SSH: npm run build (tsc → dist/)
# 6. Verify server-cpanel.js exists
# 7. Test: timeout 5 npm start
```

Post-deploy: `ssh cpanel-emotio "cd ~/emotioxv3/backend && touch tmp/restart.txt"`

### Frontends

```bash
./scripts/deploy-research-frontend-cpanel.sh
./scripts/deploy-participant-frontend-cpanel.sh
# 1. Configure runtime-config.json (apiBaseUrl)
# 2. npm install + npm run build (tsc -b && vite build)
# 3. SSH: backup remote dir
# 4. SSH: clean remote (except .well-known)
# 5. rsync dist/ → remote
# 6. scp runtime-config.json
# 7. Configure .htaccess (SPA + cache + security)
# 8. Verify file count
```

---

## CI/CD (GitHub Actions)

### Trigger Model

| Workflow | Trigger | Path Filter |
|----------|---------|-------------|
| deploy-backend-cpanel.yml | push to main | `backend/**` |
| deploy-research-frontend-cpanel.yml | push to main | `research-frontend/**` |
| deploy-participant-frontend-cpanel.yml | push to main | `participant-frontend/**` |

All support `workflow_dispatch` for manual trigger.

### Secrets

```
CPANEL_SSH_PRIVATE_KEY  → SSH private key
CPANEL_SSH_HOST         → Server IP
CPANEL_SSH_USER         → SSH user (emotvehe)
CPANEL_SSH_PORT         → SSH port
```

### Backend Workflow Steps

```yaml
1. Checkout
2. Setup SSH (webfactory/ssh-agent)
3. Add known_hosts
4. Verify remote .env exists
5. Create remote directory
6. rsync backend/ → remote (exclude node_modules, dist, .env)
7. SSH: npm install --production=false
8. SSH: npm run build
9. Verify entry points
10. Test startup: timeout 5 npm start
```

### Frontend Workflow Steps

```yaml
1. Checkout
2. Setup Node.js 20 + cache npm
3. npm ci
4. Clean: rm -rf dist node_modules/.vite
5. Write runtime-config.json
6. npm run build
7. Setup SSH
8. SSH: backup remote dir
9. SSH: clean remote
10. rsync dist/ → remote
11. scp runtime-config.json
12. Write .htaccess (SPA + cache + security headers)
13. Verify: count remote files
```

---

## .htaccess (SPA Routing + Cache)

```apache
# SPA routing
RewriteEngine On
RewriteRule \.json$ - [L]
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
RewriteRule ^ index.html [L]

# Cache: HTML/JSON → no-cache, hashed assets → 1 year
ExpiresByType text/html "access plus 0 seconds"
ExpiresByType application/json "access plus 0 seconds"
ExpiresByType text/css "access plus 1 year"
ExpiresByType application/javascript "access plus 1 year"

# Security headers
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin

# Gzip compression
AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript
```

---

## Pre-Commit Hooks (Husky)

```bash
# .husky/pre-commit — ALL must pass or commit blocked
cd backend && npm run type-check
cd participant-frontend && npm run type-check && npm run lint
cd research-frontend && npm run type-check && npm run lint
```

Enforces: 0 TypeScript errors, 0 lint errors across all 3 subprojects.

---

## Build Configuration

### Backend

```json
// tsconfig.json
{ "target": "ES2020", "module": "commonjs", "outDir": "./dist", "strict": true }

// Scripts
"dev":   "tsx watch src/server.ts"
"build": "tsc"
"start": "node server-cpanel.js"
```

### Frontends (Vite)

```typescript
// vite.config.ts
base: process.env.NODE_ENV === 'production' ? '/research/' : '/'  // or /participant/
server: { port: 12800 }  // research: 12800, participant: 5174

// Manual chunks for code splitting
manualChunks: {
  'react-vendor':  [react, react-dom, react-router-dom, scheduler],
  'query-vendor':  [@tanstack/react-query],
  'ui-vendor':     [@dnd-kit/*],
  'form-vendor':   [react-hook-form, zod],
  'chart-vendor':  [recharts],
}

// Production optimizations
drop: ['console', 'debugger']
sourcemap: false
chunkSizeWarningLimit: 1000
```

### TypeScript (Frontends)

```json
{ "target": "ES2022", "module": "ESNext", "strict": true, "jsx": "react-jsx",
  "noUnusedLocals": true, "noUnusedParameters": true }
```

---

## Runtime Config

```json
// public/runtime-config.json (written at build/deploy time)
// Research:
{ "apiBaseUrl": "https://emotio.cx/api", "participantBaseUrl": "https://emotio.cx/participant" }

// Participant:
{ "apiBaseUrl": "https://emotio.cx/api" }
```

Config loaded at startup by ConfigService.init() — no env vars baked into bundle.

---

## SSH Setup

```bash
# Alias: cpanel-emotio (defined in ~/.ssh/config)
# Key: ~/.ssh/cpanel_cursor (passphrase in .env.claude)
# Load per session: ssh-add ~/.ssh/cpanel_cursor
# Trick for non-interactive: use SSH_ASKPASS with temp script
```

---

## Environment Detection

```
Dev:  Both frontends → Vite dev server → API at https://emotio.cx/api (no local backend)
Prod: Static files on cPanel → API at https://emotio.cx/api → Passenger Node.js

Backend detects environment via request origin header:
  localhost → dev behavior
  emotio.cx → prod behavior
Both use same MySQL database (emotvehe_emotiox)
```

---

## Monorepo Structure

```
root package.json  → Husky pre-commit hooks, shared dev deps
backend/           → commonjs, Express 5, MySQL, JWT
research-frontend/ → ESM, React 19, Vite 7, Zustand, React Query
participant-frontend/ → ESM, React 19, Vite 7, Zustand, i18next

No shared source code between subprojects (types duplicated).
Each subproject has independent node_modules, tsconfig, eslint config.
```
