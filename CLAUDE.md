# CLAUDE.md

## Al iniciar conversación
- Leer `BITACORA.md` y `CHANGELOG.md` para entender el estado actual y cambios recientes
- Comunicarse en español
- Mantener sincronizada la nota operativa de Obsidian en `Desktop/personal/Proyectos/Proyectos/Emotioxv3.md`: cada pendiente, tarea en curso y elemento completado debe quedar registrado allí también

## Project Overview
EmotioX V3 — plataforma SaaS de investigación UX. Permite a investigadores crear estudios con módulos SmartVOC (NPS, CSAT, CES, CV, NEV, VOC), Cognitive Tasks (Ranking, Single/Multiple Choice, Short/Long Text, Linear Scale, Navigation Flow, Preference Test), configurar demografía, cuotas, y analizar resultados en tiempo real. Los participantes responden encuestas vía URL/QR.

## Tech Stack
- **Backend:** Node.js + TypeScript, Express 5, MySQL (mysql2), JWT + Google OAuth, AWS SDK (S3 media, Cognito legacy), Passenger (cPanel)
- **Research Frontend:** React 19, Vite, TypeScript, Zustand, React Query, Tailwind CSS, React Hook Form + Zod, i18n (ES/EN)
- **Participant Frontend:** React 19, Vite, TypeScript, Zustand, React Query, Tailwind CSS, Recharts, i18n (ES/EN)
- **Infra:** cPanel (emotio.cx), MySQL (emotvehe_emotiox), GitHub Actions CI/CD
- **Monorepo:** root package.json con Husky pre-commit hooks

## Architecture
```
emotioxV3/
├── backend/              # Express API, Passenger entry (server-cpanel.js)
│   ├── src/
│   │   ├── router.ts         # Normaliza paths API Gateway/Express, CORS, dispatch
│   │   ├── server.ts         # Dev entry (localhost:3000)
│   │   ├── server-cpanel.ts  # cPanel/Passenger entry
│   │   ├── handler.ts        # AWS Lambda entry (legacy)
│   │   └── modules/          # auth, research, stages, modules, responses, analytics, media, monitor, cache, config, quotas
│   └── server-cpanel.js      # Passenger startup wrapper
├── research-frontend/    # Herramienta del investigador (dashboard, builder, config, results)
├── participant-frontend/  # Interfaz del participante (survey flow, steps, thank you)
├── database/             # Migraciones MySQL (14 archivos)
├── infrastructure/       # Terraform (legacy AWS)
└── scripts/              # Deploy scripts, migraciones, utilidades
```
- **Estado:** Zustand + localStorage persistence + React Query (server state)
- **Auth:** JWT en Zustand store con axios interceptor, Google OAuth
- **Media:** Presigned S3 URLs (dev) o filesystem local (cPanel)
- **Real-time:** SSE para SmartVOC analytics (`/monitor/events/:researchId`)
- **Data:** JSONB para configs flexibles de módulos

## Development
```bash
# Backend
cd backend && npm install && npm run dev          # tsx watch → localhost:3000

# Research Frontend
cd research-frontend && npm install && npm run dev # Vite → localhost:5173

# Participant Frontend
cd participant-frontend && npm install && npm run dev # Vite → localhost:5174
```
- **No hay backend local** — ambos frontends apuntan a `https://emotio.cx/api` incluso en dev
- Backend usa `backend/.env` (symlink en root)
- Frontends usan `public/runtime-config.json` para API URL
- Pre-commit: build + type-check + lint (Husky, no skip)

## Conventions
- **Antes de escribir o modificar cualquier componente React**, consultar las reglas relevantes en `.claude/skills/react-best-practices/references/rules/` (rendering, re-renders, bundle, async, JS performance)
- **No definir componentes React inline** dentro de switch/case o renders — extraer como componentes standalone para evitar re-mount
- **URLs de media del backend son relativas** (`/api/media/...`) — ambos frontends tienen `resolveMediaUrl()` que las convierte a absolutas contra el origen del backend
- **ComponentType union** en `moduleBuilder.types.ts` debe incluir todos los tipos que usa el seed/BD
- El save de módulos usa el **toggle Hide explícito** del investigador, NO auto-calcula hidden
- TypeScript strict en los 3 subproyectos
- 0 errors, 0 warnings en lint + build (enforced por pre-commit)
- `Record<string, any>` solo donde es genuinamente dinámico (demographics config), marcado con eslint-disable
- Commits en inglés, código en inglés, comentarios en español/inglés mixto
- Branching: main (producción), feature branches ocasionales

## Key Files
- `backend/src/router.ts` — routing central, CORS, path normalization
- `backend/server-cpanel.js` — entry point producción (Passenger)
- `research-frontend/src/components/layout/ResearchBuilderSidebar.tsx` — sidebar con status modal (draft/active/completed), stage management
- `research-frontend/src/components/research/ResearchBuilderPage.tsx` — builder principal
- `research-frontend/src/components/research/ResearchConfigurationModule.tsx` — config, QR, URL, demografía
- `research-frontend/src/utils/demographicsMapper.ts` — mapeo demografía + LocationGranularity
- `participant-frontend/src/pages/ResearchPage.tsx` — flujo de encuesta del participante (incluye kiosk auto-reset)
- `participant-frontend/src/hooks/usePreviewMode.ts` — detecta preview vs participant vs kiosk mode
- `participant-frontend/src/stores/useParticipantStore.ts` — estado participante + participationMode
- `participant-frontend/src/services/public.service.ts` — API pública (getParticipationMode, requestKioskSession)
- `participant-frontend/src/components/steps/DemographicsStep.tsx` — paso demográfico
- `backend/src/modules/participants/participants.service.ts` — CRUD participantes panel, import CSV, status tracking
- `research-frontend/src/components/research/PanelParticipantsSection.tsx` — UI import CSV, tabla participantes, links, export
- `backend/src/modules/email/email.service.ts` — Nodemailer transporter + HTML invitation template
- `.cursorrules` — reglas de calidad (pre-commit verification obligatoria)
- `research-frontend/src/components/results/smart-voc/SmartVOCResults.tsx` — SmartVOC panel, NEV, NPS, CSAT, CES, CV, VOC, filtros, clusters, tooltips, exportación CSV de comentarios. CPV = CSAT positivo (4+5) - CES negativo (1+2). NPS agrupado por día en today/week con porcentajes para barras apiladas. NEV: lista canónica de 20 emociones (IDs alineados con participant EmotionSelector), normalización de claves al agregar, etiquetas solo en español.
- `research-frontend/src/components/results/smart-voc/components/NPSAnalysis.tsx` — NPS: barras apiladas Promoters/Neutrals/Detractors normalizadas al 100% (datos en porcentajes; Today/Week desde SmartVOCResults, Month desde backend); gráfico ComposedChart + circular score + Loyalty Evolution.
- `research-frontend/src/components/results/smart-voc/components/CPVCard.tsx` — CPV: pastilla compacta sticky en top-left con valor porcentual
- `research-frontend/src/components/results/smart-voc/components/NEVQuestionCard.tsx` — NEV: muestra todas las emociones con % encima de cada barra, techo 50%, clusters lado a lado, tooltip clusters
- `research-frontend/src/components/results/smart-voc/components/VOCComments.tsx` — VOC: tabla de comentarios, botón de exportar CSV (participant_id, demográficos, respuestas)
- `research-frontend/src/components/results/smart-voc/components/TrustFlowChart.tsx` — Trust Relationship Flow: NPS/NEV por tiempo (Today=LineChart, Week=BarChart, Month=LineChart). Caja "Latest point" en el encabezado (no sobre el gráfico) para no tapar el tooltip al pasar el mouse.
- `backend/src/modules/analytics/analytics.service.ts` — métricas SmartVOC; NEV usa IDs canónicos (minúsculas, sin tildes) y normalizeEmotionKey para conteo y cálculo de NEV
- `backend/src/modules/research/research-in-progress.service.ts` — progreso de participantes usa `component_id` (no `question_id`); el total para el 100% se calcula solo con componentes visibles/habilitados (excluye Research Configuration, módulos y componentes con `hidden: true`)

## Deploy
- **Referencia completa:** [Deploy Skill](skills/deploy.md) + [cPanel Runbook](docs/cpanel-runbook.md)
- **NO usar:** aws-runbook.md, git-deploy.md, server-runbook.md — este proyecto se despliega en cPanel
- **SSH:** `ssh cpanel-emotio` — credenciales en `.env.claude`

### Deploy manual (scripts locales)
```bash
./scripts/deploy-backend-cpanel.sh              # rsync src → remoto, npm install + build en remoto
./scripts/deploy-research-frontend-cpanel.sh    # build local, rsync dist/ → ~/public_html/research/
./scripts/deploy-participant-frontend-cpanel.sh # build local, rsync dist/ → ~/public_html/participant/
```
Post-deploy backend: `ssh cpanel-emotio "cd ~/emotioxv3/backend && touch tmp/restart.txt"`

### CI/CD (GitHub Actions, auto en push a main)
- `deploy-backend-cpanel.yml` — trigger: `backend/**`
- `deploy-research-frontend-cpanel.yml` — trigger: `research-frontend/**`
- `deploy-participant-frontend-cpanel.yml` — trigger: `participant-frontend/**`
- Secrets: `CPANEL_SSH_PRIVATE_KEY`, `CPANEL_SSH_HOST`, `CPANEL_SSH_USER`, `CPANEL_SSH_PORT`

### Rutas remotas
```
~/emotioxv3/backend/          → Backend (src + dist + .env + server-cpanel.js)
~/public_html/research/       → Research Frontend (Vite dist + runtime-config.json + .htaccess)
~/public_html/participant/    → Participant Frontend (Vite dist + runtime-config.json + .htaccess)
```

## Participation Modes (Kiosko vs Panel)
- Dos modos de participación: **Kiosko** (SmartVOC, ID autoincremental `kiosk-N`, reset automático post-submit) y **Panel** (Cognitive Tasks, ID externo/individual)
- **Fases 1-4.6 implementadas**. Pendiente: config SMTP en producción (`noreply@emotio.cx`). Plan completo: [docs/PLAN_PARTICIPATION_MODES.md](docs/PLAN_PARTICIPATION_MODES.md)
- `researches.config.participationMode`: `'kiosk' | 'panel'` (default: `'panel'` para retrocompatibilidad)
- Endpoints públicos: `GET /public/research/:id/mode`, `POST /public/research/:id/kiosk/session`
- Endpoints autenticados (panel): `GET/DELETE /participants/:researchId`, `POST /participants/:researchId/import`, `DELETE /participants/:researchId/:id`
- Endpoints email (panel): `POST /participants/:researchId/send-emails` (bulk), `POST /participants/:researchId/:id/send-email` (individual)
- Tabla `participants` (migración 015): email, name, external_id, status (pending/responded/disqualified/overquota), invited_at, IDs auto `panel-N`
- Research-frontend: `PanelParticipantsSection` en Research Configuration — import CSV, tabla, links individuales, export, status tracking, envío de invitaciones por email
- Backend: `email.service.ts` — Nodemailer con SMTP cPanel (Exim), template HTML de invitación
- `saveParticipantResponses()` auto-actualiza `participants.status` a `'responded'` al recibir respuestas
- Participant-frontend: `usePreviewMode` distingue preview (`?preview=true`), panel (`?participantId=xxx`), y kiosk (sin params, modo detectado del backend)
- Kiosk auto-reset: ref guard en ResearchPage evita programar múltiples timeouts de transición (fix loop en Safari al llegar a thank-you)

## References
- [CHANGELOG](CHANGELOG.md) — historial completo de versiones (533+ commits)
- [BITACORA](BITACORA.md) — notas de sesiones de desarrollo
- [Patterns](patterns/) — patrones de construcción repetibles (frontend, backend, devops, fullstack)
- [Issues & Fixes](docs/ISSUES_&_FIXES.md)
- [ISSUES_TRACKING](ISSUES_TRACKING.md) — 24 issues del feedback Dic 2024 (todos resueltos)
- [QR URL Report](REPORT_URL_QR_ISSUE.md) — análisis root cause del bug de QR/URL
- [Plan Modos de Participación](docs/PLAN_PARTICIPATION_MODES.md) — Kiosko vs Panel, diseño e implementación
- [Perfil de Datos](scripts/perfil_datos.py)
- [.agent/](/.agent/) — 13 docs de arquitectura detallada (data flows, API reference, etc.)
