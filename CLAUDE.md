# CLAUDE.md

## Al iniciar conversación
- Leer `BITACORA.md` y `CHANGELOG.md` para entender el estado actual y cambios recientes
- Comunicarse en español

## Project Overview
EmotioX V3 — plataforma SaaS de investigación UX. Permite a investigadores crear estudios con stages: SmartVOC (NPS, CSAT, CES, CV, NEV, VOC), Cognitive Tasks (Ranking, Single/Multiple Choice, Short/Long Text, Linear Scale, Navigation Flow, Preference Test), Screener, Implicit Association (Attribute Testing, Comparing Attribute, Objects Comparing), Eye Tracking. Configurar demografía, cuotas, y analizar resultados en tiempo real. Los participantes responden encuestas vía URL/QR.

### Técnica "Biometric, Cognitive and Predictive"
Default stages: Screener → Welcome Screen → Research Configuration → Implicit Association → Cognitive Tasks → Eye Tracking → Thank You Screen.
- **Screener** (`single_module`): pregunta de filtrado con choices Qualify/Disqualify.
- **Implicit Association** (`module_collection`): 3 paradigmas:
  - **Attribute Testing** (Implicit Priming Test, 2 pasos): 2-5 targets + hasta 5 criteria con `targetId`. Step 1 = práctica de targets. Step 2 = criteria como estímulo, respuesta correcta = target asignado. Hide criteria toggle, test-title interno.
  - **Comparing Attribute** (Reaction Time Test, 1 paso): 1-5 objects + 2 dimensions + hasta 15 criteria. Botones = dimension labels. Solo RT.
  - **Objects Comparing** (IAT clásico, 3 pasos): 2-7 targets + criteria-1/criteria-2 + hasta 15 criteria items. Clasificación en 3 pasos.
  - Features: targets dinámicos, preview modal, flowchart reactivo, multi-lang instrucciones (EN/ES JSON).
- **Eye Tracking** (`single_module`): stimuli (imágenes/video), modalidades Stand Alone y Shelf. Incluye Emotion Recognition y predicción de atención.
- **Rendering genérico**: `ResearchBuilderPage` usa `module_collection` generalizada — todo lo que no sea Smart VOC usa `CognitiveTaskModuleCard`.
- **Attention Prediction**: research type sin stages. TranSalNet ONNX genera heatmap, GPT-4o Vision genera análisis cualitativo. Predict síncrono (await, no polling). `HeatmapRenderer` dual (saliencia LUT + clicks simpleheat). Inline controls (presets + sliders blur/opacity/threshold) + Settings modal para preview/download. `AttentionVideoPlayer` scanpath animado. AOIs manuales + auto-detectadas por IA (importables). `AiAnalysisPanel` con secciones colapsables: contexto, attention score (gauge SVG), confianza, AOIs auto, flujo de atención, gaze path predictivo, neuro-insights Gestalt, metodología. `GazePathOverlay` SVG con fijaciones numeradas. Resultados cacheados en `stimulus.aiAnalysis`. Upload siempre visible. Error state con retry.
- **Insights Finding**: research type sin stages. Documentos (.csv, .txt, .xlsx, .docx, .pdf) → parseo client-side → GPT-4o analysis (sentiment/themes/keywords). Fire-and-forget + polling.
- **`isFileBasedResearch`**: unifica Attention Prediction e Insights Finding (`skip_default_modules: true`).
- **Custom Screening Questions**: preguntas de selección única con descalificación dentro de Demographics. Keys `customQuestion_<id>`, `questionLabel` editable.
- **Condicionalidad**: 3 tipos — demográfica (`DemographicConditionality`), pregunta del estudio (`ModuleConditionality`), link con módulo (`LinkedModuleConditionality`). Evaluación recursiva con protección anti-loop.
- **Duplicate research**: `POST /research/:id/duplicate` clona estudio completo como draft. Remap conditionality y media.

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
├── database/             # Migraciones MySQL (20 archivos)
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
cd backend && npm install && npm run dev          # tsx watch → localhost:3000
cd research-frontend && npm install && npm run dev # Vite → localhost:5173
cd participant-frontend && npm install && npm run dev # Vite → localhost:5174
```
- **No hay backend local** — ambos frontends apuntan a `https://emotio.cx/api` incluso en dev
- Backend usa `backend/.env` (symlink en root)
- Frontends usan `public/runtime-config.json` para API URL
- Pre-commit: build + type-check + lint (Husky, no skip)

## Conventions
- **Antes de escribir o modificar cualquier componente React**, consultar reglas en `.claude/skills/react-best-practices/references/rules/`
- **No definir componentes React inline** dentro de switch/case o renders — extraer como componentes standalone
- **URLs de media del backend son relativas** (`/api/media/...`) — frontends usan `resolveMediaUrl()` para absolutas
- **ComponentType union** en `moduleBuilder.types.ts` debe incluir todos los tipos del seed/BD
- El save de módulos usa el **toggle Hide explícito** del investigador, NO auto-calcula hidden
- **Condicionalidad de módulos**: union `ConditionalityConfig`, type guards `isDemographicCondition()` / `isModuleCondition()` en `moduleRequired.ts`
- **Cuotas demográficas**: siempre porcentaje (%), aplicación inmediata. Techo = `ceil(% × participantLimit / 100)`. `validateDemographics` → `tryIncrementQuota`. `saveParticipantResponses` no incrementa cuotas.
- **Bloqueo de participantes** 3 capas: (1) `checkQuotaPreAvailability` al cargar, (2) `validateDemographics` al enviar, (3) `saveParticipantResponses` al guardar (410). Frontend: `MobileRestrictionScreen`.
- TypeScript strict en los 3 subproyectos. 0 errors, 0 warnings (enforced por pre-commit).
- `Record<string, any>` solo donde genuinamente dinámico, marcado con eslint-disable
- Commits en inglés, código en inglés, comentarios mixto. Branching: main (producción).
- **Backlink redirects**: reemplazan `@id` con participant ID, agregan `https://` si falta.
- **CES scale**: participant lee `comp.value` primero, fallback `selectRange.predefined`. Pregunta "¿Qué tan fácil fue?" — score alto = fácil = positivo (verde), score bajo = difícil = negativo (rojo). Zones: escala 1-5 → positive [4,5], neutral [3,3], negative [1,2]. Solo CES, no CV ni Linear Scale.
- **NEV emociones**: 20 canónicas. "Descontento" = negativa. Fila 1 = positivas (7), Fila 2 = atención (5), Fila 3 = negativas (8).
- **CES analytics dinámico**: backend envía `scaleConfigs`, frontend usa `getCESZones(scaleMax)`.
- **View Progress**: `getVisibleModuleIdsForProgress` con INNER JOIN stages. `panelStatus = 'responded'` → 100%. Sin completar → cap 99%. Filtro de progreso mínimo (slider 0-100%). Share: botón "Send Link" → Drawer con emails + "Copy link" → `/progress/:id` público read-only.
- **Response saving**: `saveParticipantResponses` usa batch INSERT (1 query para N responses). Sin SELECTs post-INSERT. Sentiment se computa antes de abrir transacción.
- **Analytics caching**: `getResearchConfiguration` (60s), `getParticipantCount` (10s), `getMediaUrlByS3Key` (5min client-side). Results wrappers usan `useResearch()` (React Query dedup).
- **DB pool**: `connectionLimit: 20`. MySQL `max_user_connections = 50` (límite de hosting). Índice compuesto `idx_responses_research_module_component`.
- **`/cognitive-tasks` payload**: módulos con endpoint propio (Nav Flow, Preference, Choice, Scale, Ranking) retornan solo COUNT — no responses completas. Short/Long Text sí traen `value` + sentiment.
- **Study Logo**: `config.studyLogo: { enabled, s3Key? }`. Client logo o EmotioCX default.
- **Loading states**: skeleton (`animate-pulse`), nunca spinners.
- **Design system**: spec en `docs/design-system/emotiox-palette.md`. Light-only: surface-app `#F1F5F9`, accent `#006AFF`, heading slate-900, body slate-500. Font: Plus Jakarta Sans (research), Inter (participant).
- **Screener ordering**: special step. Orden fijo: `welcome → screener → demographics → resto → thank-you`.
- **Draft persistence**: `useModuleDraftStore` (Zustand, session-scoped). `PendingDraftsDropdown` en header.
- **Eye Tracking híbrido**: BlazeGaze + One-Euro filter + IDW + I-DT fixation detection. 9-point calibración, validación RMSE. Mobile: tap proxy. IDs canónicos: 10 componentes en template (migración 020).
- **Eye Tracking AOI**: Stand Alone: `AOIDrawer` dibuja rectángulos sobre stimulus. Shelf: AOIs auto-generadas (1 por columna, 100% altura). Backend lee `aois` para intersecciones.
- **Eye Tracking Shelf mode**: Auto-detectado cuando >1 imagen subida. Column-based grid: cada imagen = 1 columna repetida en todas las filas. `ShelfGrid` componente reutilizable (participant). `display-mode` se sincroniza automáticamente. `randomize-stimuli` baraja orden de columnas por participante. Shelf config (count/items) visible solo en shelf mode. Coordenadas de fijación relativas al contenedor compuesto.
- **Ciudades en Country & City**: `demographics.country.cities` + `demographics.city`. Cuotas por ciudad (countryCity) o por país (countryOnly), nunca ambos.
- **NavigationFlow**: `<img>` directo (no LazyImage). Hitzones px → %. Triple handler con dedupe 150ms. Completion overlay con "Tap to continue". `key={module.id}` fuerza re-mount.
- **Configurable language switcher**: `linkConfig.allowLanguageSwitch` (default false).
- **Research collaborators**: `research_collaborators` table. `buildOwnershipClause` includes collaborator access. Endpoints: `GET/POST/DELETE /research/:id/collaborators`. `ShareResearchDrawer` in builder sidebar.
- **Completion filter**: "Min. completion %" slider in all results Filters sidebars. `useResultsFilter` hook fetches participant progress and combines with demographic filters. Applied across SmartVOC, Cognitive Tasks, Screener, IAT, Eye Tracking. Value persists in `localStorage` per research (`completionMin-{researchId}`).
- **Sentiment filter**: Checkboxes (Positive/Negative/Neutral/Indeterminate) in Filters sidebar. Applied to SmartVOC VOC comments and Cognitive Short/Long Text. State in `useResultsFilter` (`sentimentFilter` + `filterBySentiment`).
- **Text analysis (LLM)**: `POST/GET /analytics/research/:id/text-analysis/:moduleId`. GPT-4o themes/keywords/sentiment for VOC and Cognitive text. Cached in `config.textAnalysis.<moduleId>`. `VOCComments` loads cache on mount, "Analyze with AI" button triggers, "Refresh analysis" re-runs with filtered participants. POST accepts optional `participantIds` array in body. `moduleId="voc"` for SmartVOC VOC.
- **Video prediction**: `AttentionPredictionView` accepts video (mp4/webm/mov). Client-side frame extraction (`extractVideoFrames.ts`), sequential upload + TranSalNet per frame. Stored in `stimulus.frames[]`. `VideoFrameScrubber` in AttentionPredictionCard shows side-by-side original/heatmap with frame scrubber.
- **ET heatmap settings**: `HeatmapSettingsModal` (shared) with presets Smooth/Balanced/Detailed + blur/opacity/threshold sliders. Used in `StimulusCard` (ET results) and `AttentionPredictionCard`.
- **IAT validation bypass**: IAT modules skip generic required-field validation in participant flow — structure components are researcher config, not participant input. `validation.ts` returns `isValid: true` for IAT modules.
- **IAT response keys**: Configurable via `response-keys` component (`"letters"` or `"arrows"`, default `"letters"`). Builder shows segmented control in IAT module header. Participant labels adapt (`A/L` vs `←/→`). Keyboard handler always accepts both A/ArrowLeft and L/ArrowRight.
- **IAT completion advance**: `onComplete` stored in ref (`onCompleteRef`) to avoid unstable callback reference cancelling the 800ms advance timer via effect cleanup. Never put `onComplete` in the dependency array of the save/advance effect.
- **Insights Finding upload in view**: `InsightsFindingView` has "Add files" button + empty-state CTA. Uses `documentParser.ts` (client-side) + `mediaService.uploadFile()`. Auto-triggers LLM on upload.
- **Benchmark research editor**: `ClientsBenchmarkView` has "Edit selection" panel — checkboxes for all ET researches. Saves to `config.stimuli[].researchId`. Live refresh.
- **Benchmark CSV export**: "Export CSV" button on comparative table.
- **LLM model configurable**: `OPENAI_MODEL` env var (default `gpt-4o`). Used by `insights.service.ts`.
- **Website Tracking coordinates (v0.70.0)**: Snippet stores **raw pixels** (`pageX`, `pageY`). Backend normalizes at query time: `x / viewport_width * 100`. Frontend renders: `(pct/100) * renderWidth`. Never normalize in the client snippet.
- **Website Tracking snippet v2**: Event queue buffers until session confirms. Viewport heartbeat every 1s (scroll events). Mousemove throttle 100ms. Session retry on failure. No `mouseleave` event type — use `pageview` with `metadata.friction`.
- **Website Tracking results layout (v0.70.0)**: Heatmap renders inline (no modal). `Tip` component (portal-based, viewport-clamped) for all tooltips. Sessions tab = Visitor accordion only (no "All Sessions" table).
- **Website Tracking PDF report (v0.70.1)**: `WebTrackingReportButton` with section picker (grouped by tab/subtab). AI Analysis option calls `POST /tracking/:id/report` with `{ sections }` — prompt contextual, only analyzes selected data. Cached in `config.trackingReport`.
- **Configurable funnels**: `config.trackingConfig.funnels` — array of `{id, name, steps: [{url, label}]}`. `computeFunnelDropoff` checks sequential visitor reach. Endpoint: `GET /tracking/:id/funnels/:funnelId`.
- **Session replay modal**: `SessionReplayPlayer` renders as fixed overlay, not inline. Uses DOM snapshot (iframe) for background, not screenshots.
- **Status modal contextual**: `StatusModal` adapts descriptions per `researchTypeName` — Website Tracking, Attention Prediction, Insights Finding have specific texts.
- **Live tab SSE**: `GET /tracking/:id/live/stream?token=xxx` — SSE endpoint in `server-cpanel.js` (Passenger entry point). Frontend uses `EventSource`, no polling. Route registered with both `/api/` and `/` prefixes for Passenger compatibility.
- **Passenger dual entry points**: `server-cpanel.js` (JS, Passenger entry) and `src/server-cpanel.ts` (TS, compiled to `dist/`). New Express routes must be added to **both** files — Passenger executes the JS wrapper, not the compiled TS.
- **Session replay unified timeline**: `SessionReplayPlayer` loads ALL sessions of the same visitor via `visitorId`, merges events into one sorted timeline. DOM snapshot changes dynamically per active page. Clicks rendered as simpleheat heatmap overlay (no cursor dot).
- **Attention Prediction tabs**: `AttentionPredictionCard` has 4 tabs over the image: Original, Heatmap, Gaze Paths (dark alpha overlay), AOI Editor (colored rects, 7 rotating colors). Right panel (`AiAnalysisPanel`) remains.
- **Prediction pipeline v2 (v0.68.0)**: `predictAttention` runs 3 augmentations (original, h-flip, crop 90%), averages directly (no logit fusion). Post-process: mild center bias (σ=0.5, floor 60%), blur, stochastic jitter (0.15), normalize. Returns `{ points, autoPresets, griddedAOIs }`. `autoPresets` recommends blur/opacity/threshold from map distribution. `griddedAOIs` detects AOIs via 4×4 grid + flood-fill clustering.
- **Hybrid saliency fusion (v0.68.0)**: `POST /attention-prediction/research/:id/module/:mediaId/hybrid-predict`. Pipeline: 3× TranSalNet averaged → Gemini semantic grid (10×8, 3 iterations) → weighted fusion (α=0.65 + β=0.35) → focal equalization (peripheral boost × semantic boost × center attenuation) → stochastic jitter (0.12). Produces eye-tracking-like distribution. Uses Gemini primary, GPT-4o fallback.
- **3 gaze path routes (v0.67.1)**: AI analysis returns `gazePathRoutes` — 3 viewing strategies (Typical Scan, Group Scan, Novelty Search). Frontend renders each with unique color (blue/green/amber), toggleable. `GazePathOverlay` accepts `routeColor` + `markerId` for multi-route rendering.
- **Configurable saliency model (v0.67.2)**: `SALIENCY_MODEL` env var (default `transalnet_res.onnx`). `SALIENCY_WIDTH`/`SALIENCY_HEIGHT` for different architectures. Conversion scripts: `scripts/convert-transalnet-to-onnx.py` (Dense/Res), `scripts/convert-sum-to-onnx.py` (SUM, WACV 2025). To swap: convert → upload `.onnx` to `backend/models/` → set env var → restart.

- **Analysis profiles (v0.69.1)**: `AnalysisProfile` type in `ai-analysis.service.ts`. Context-aware β: shelf/packaging=0.50, ad=0.45, web=0.40, general=0.35. Profile injected into **both** semantic grid prompt (heatmap) **and** AI analysis prompt (textual analysis). ViT bottom-up ensemble (70% semantic + 30% feature-integration). `AnalysisProfilePanel` in `AttentionPredictionView`, persisted in `research.settings.analysisProfile`. Controller reads profile from `settings.analysisProfile` for `/analyze/:mediaId`.
- **Brand attention (v0.69.0)**: AI analysis prompt auto-detects logos → `brandAttention` in `AiAnalysisResult` (logos[], brandAttentionScore, recommendation). `Brand Attention` section in `AiAnalysisPanel`.
- **FACS Action Units (v0.69.0)**: `extractActionUnitsFrom68()` in `facsClassifier.ts` — 9 AUs from face-api 68 landmarks. `face_landmark_68` model in `public/models/`. `ActionUnitsPanel` + `MicroExpressionsPanel` in `EmotionPanel`.
- **Standalone modules (v0.69.0)**: `Emotion Analysis` (webcam only, no ET), `EEG Recording` (Web Bluetooth), `Biometric Wearable` (BLE HR 0x180D). DynamicStep dispatches by module name. Module templates in migrations 028-029.
- **Cerulean Ledger (v0.69.0)**: `backend/src/modules/cerulean/` — client + integration service + controller. Routes under `/cerulean/`. `CERULEAN_ENABLED=true` to activate. Auto-triggers on study close (integrity hash + credential + audit). `BlockchainCertification` component in results.
- **Dashboard (v0.69.0)**: `GET /research/dashboard-summary` returns stats, trends, top researches. `useDashboardSummary` hook. Search + archive toggle + activity chart + metrics trends in `DashboardPage`.
- **Automation (v0.69.0)**: Auto-trigger LLM on close + every 10 participants. Executive summary (`/analytics/research/:id/executive-summary`). Alerts (`/analytics/research/:id/alerts`). PDF report via `ReportGeneratorButton`.
- **Research tags (v0.69.0)**: `research_tags` table (migration 027). `GET /research/tags`, `POST/DELETE /research/:id/tags/:tag`. `archived_at` column, `POST /research/:id/archive|unarchive`.
- **Mouse attention (v0.69.0)**: `GET /tracking/:id/mouse-attention` — mousemove events aggregated as gaze-proxy heatmap.

## Key Files
### Backend
- `backend/src/router.ts` — routing central, CORS, path normalization
- `backend/server-cpanel.js` — entry point producción (Passenger)
- `backend/src/modules/enterprises/enterprises.controller.ts` — CRUD enterprises
- `backend/src/modules/participants/participants.service.ts` — CRUD participantes panel, CSV import
- `backend/src/modules/email/email.service.ts` — Nodemailer + invitation template
- `backend/src/modules/research-techniques/research-techniques.service.ts` — CRUD técnicas con `default_stages`
- `backend/src/modules/quotas/quota.service.ts` — cuotas demográficas atómicas (`tryIncrementQuota`)
- `backend/src/modules/public/public.service.ts` — endpoints públicos, validación, save responses
- `backend/src/modules/analytics/analytics.service.ts` — métricas SmartVOC, NEV, Eye Tracking (FACS, AOI, sequence), IAT (D-score, errors)
- `backend/src/modules/attention-prediction/attention-prediction.controller.ts` — TranSalNet prediction (research stimuli + module stimuli)
- `backend/src/modules/tracking/tracking.controller.ts` — Website Tracking public + auth endpoints
- `backend/src/modules/tracking/tracking.service.ts` — sessions, events batch insert, heatmap aggregation
- `backend/src/modules/tracking/tracking-snippet.ts` — injectable JS generator
- `backend/src/modules/research/research-in-progress.service.ts` — progreso participantes

### Research Frontend
- `research-frontend/src/pages/research/ResearchBuilderPage.tsx` — builder principal, module_collection generalizada
- `research-frontend/src/components/layout/ResearchBuilderSidebar.tsx` — sidebar con status modal, stage management
- `research-frontend/src/components/research/ResearchConfigurationModule.tsx` — config, QR, URL, demografía, study logo, screening questions
- `research-frontend/src/stores/useModuleDraftStore.ts` — draft store session-scoped
- `research-frontend/src/components/research/PendingDraftsDropdown.tsx` — save individual/all drafts
- `research-frontend/src/utils/demographicsMapper.ts` — mapeo demografía + LocationGranularity
- `research-frontend/src/utils/moduleRequired.ts` — flags módulo, ConditionalityConfig, type guards
- `research-frontend/src/components/research/ConditionalityModal.tsx` — modal condicionalidad (demográfica + study question)
- `research-frontend/src/components/research/AOIDrawer.tsx` — AOI drawing sobre imágenes
- `research-frontend/src/components/results/smart-voc/SmartVOCResults.tsx` — panel SmartVOC completo
- `research-frontend/src/components/research/AttentionPredictionCard.tsx` — análisis por stimulus (heatmap, video, AOI)
- `research-frontend/src/components/research/WebsiteTrackingConfig.tsx` — tracking config panel (snippet, domains, toggles)
- `research-frontend/src/components/results/website-tracking/WebsiteTrackingResults.tsx` — click heatmap + overview
- `research-frontend/src/services/tracking.service.ts` — API client for tracking endpoints
- `research-frontend/src/hooks/useResearchForm.ts` — form creación con prioridad default_stages

### Participant Frontend
- `participant-frontend/src/pages/ResearchPage.tsx` — flujo encuesta (kiosk reset, screener blocking, demographics validation)
- `participant-frontend/src/utils/researchPageHelpers.ts` — utilidades extraídas de ResearchPage
- `participant-frontend/src/hooks/usePreviewMode.ts` — preview vs participant vs kiosk
- `participant-frontend/src/hooks/useNavigation.ts` — navegación, condiciones, filtro steps
- `participant-frontend/src/hooks/useBlazeGaze.ts` — BlazeGaze CNN + One-Euro filter
- `participant-frontend/src/components/steps/DemographicsStep.tsx` — paso demográfico (3 formatos + custom screening)
- `participant-frontend/src/components/ui/NavigationFlow.tsx` — flujo fullscreen hitzones
- `participant-frontend/src/components/ui/CustomSelect.tsx` — selector custom, position:fixed, auto-flip
- `participant-frontend/src/components/renderers/ImplicitAssociationRenderer.tsx` — IAT 3 paradigmas
- `participant-frontend/src/components/renderers/EyeTrackingRenderer.tsx` — BlazeGaze desktop, click proxy mobile, face-api.js emotion recognition, video stimulus
- `participant-frontend/src/hooks/useFaceApiEmotions.ts` — face-api.js TinyFaceDetector + FaceExpressionNet for 7 Ekman emotions
- `participant-frontend/src/lib/eyeTracking/facsClassifier.ts` — EmotionSample types + aggregation utilities
- `participant-frontend/src/components/ErrorBoundary.tsx` — error boundary para producción

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
- **ONNX model:** `backend/models/transalnet_res.onnx` (290MB) is gitignored. Deploy script auto-syncs it if missing on server. CI/CD excludes `models/` from rsync `--delete`.

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
- **Kiosko**: SmartVOC, ID `kiosk-N`, reset automático. **Panel**: Cognitive Tasks, ID externo/individual.
- `researches.config.participationMode`: `'kiosk' | 'panel'` (default: `'panel'`)
- Endpoints públicos: `GET /public/research/:id/mode`, `POST /public/research/:id/kiosk/session`
- Endpoints panel: `GET/DELETE /participants/:researchId`, `POST .../import`, email bulk/individual
- `usePreviewMode` distingue preview (`?preview=true`), panel (`?participantId=xxx`), kiosk (sin params)

## Website Tracking (v0.68.0)
- **Research type:** "Website Tracking" (`skip_default_modules: true`, file-based). No stages, no participant-frontend.
- **Injectable script:** `GET /public/tracking/:id/script.js` — async JS. Captures clicks, scroll, mousemove. Buffer cap 50 events, flush every 2s. `localStorage` visitor ID. Domain validation client + server. html2canvas screenshot capture per device category.
- **Screenshots:** Snippet captures pixel-perfect JPEG via html2canvas (CDN loaded). Classified by viewport: mobile (<768), tablet (768-1024), desktop (>1024). Stored in `tracking_pages.screenshot_devices` JSON. `POST /public/tracking/:id/screenshot`.
- **Coordinates:** Viewport-relative percentages. X = `clientX/innerWidth*100`, Y = `pageY/innerWidth*100`.
- **SPA support:** Intercepts `pushState`/`replaceState`/`popstate`. New session per route.
- **DOM snapshot:** Captured as fallback for session replay. `tracking_pages.page_snapshot`.
- **Friction detection:** dead-click, rage-click (3+ in 1s), speed-browsing (<2s), mouse-out. Stored in `metadata.friction`.
- **Config:** `captureClicks`, `captureScroll`, `captureMousemove`, `consentRequired`, `samplingRate`, `excludedIPs`, `targetPages`/`excludePages`, `dataRetentionDays`, `allowedDomains`, `verified`, `funnels[]`.
- **Builder:** `WebsiteTrackingConfig` — checklist (Activate/Snippet/Verify/View Results). Verify persists. View Results disabled until verified (config + sidebar).
- **Results tabs:** Funnels (default, SVG trapezoids + "Ver página" + page screenshot grid) → Heatmaps (Click/Scroll/Attention) → Sessions (merged Visitors+Sessions, grouped by visitor) → Live (SSE, last-event detection).
- **Heatmaps:** Screenshot-based (`<img>`) when available, DOM snapshot fallback (`<iframe>`). Device filter enabled per available screenshots. Click: red gradient. Attention: viewport-time color bands (green→yellow→red). Scroll: depth gradient bands.
- **Session replay:** `SessionReplayPlayer` — screenshot background, animated cursor (blue ring), click ripples (red fade), scroll sync (`translateY`). Real timestamps, 1x/4x/8x/16x speed, "Skip idle" button. Portal modal. Activity timeline bar (red=click, blue=cursor, dark=idle).
- **Live sessions:** SSE stream. Active = last event within 5 minutes (not just `started_at`).
- **Detection:** `isWebsiteTracking` in `isFileBasedResearch`. Sidebar shows config + results.

## Eye Tracking (v0.58.0)
- **Motor:** BlazeGaze CNN (670KB, `webeyetrack`) — imagen de ojos + head pose
- **Pipeline:** WebEyeTrack con MediaPipe interno, sin duplicación
- **Calibración:** 9 puntos sobre stimulus + validación RMSE + IDW correction field
- **Smoothing:** One-Euro filter (cutoff 0.8, beta 0.005), blink filtering
- **Video stimulus:** `EyeTrackingRenderer` detecta mp4/webm, renderiza `<video>` con gaze tracking sincronizado a `videoTime`
- **Emotion Recognition:** face-api.js (vladmandic fork) — TinyFaceDetector + FaceExpressionNet. 7 Ekman emotions via trained neural model. `useFaceApiEmotions` hook, parallel to BlazeGaze. Models in `public/models/` (~511KB). Client-side, GDPR compliant.
- **Builder toggles:** `attention-measurement` y `emotion-recognition` controlan qué datos se recolectan
- **Results tabs:** Heat map, Scan Path, First Look, Transparency, Emotions, Prediction (TranSalNet), Video Gaze, Sequence
- **AOI metrics:** dwell %, fixation count, avg duration, TTFF, notice rate, dominant emotion. Soft Gaussian intersection (not binary point-in-rect).
- **Micro-recalibration:** Every 45s during viewing, invisible dot probes gaze drift and updates IDW correction field. Constants in `hybridCalibrationField.ts` (`MICRO_RECALIB_*`).
- **Quality gate:** Participants classified `good`/`fair`/`low` by calibration RMSE, integrity score, fixation count. Low excluded from aggregates. `qualitySummary` in ET response.
- **Calibration click isolation:** WebEyeTrack registers a global `click` listener that feeds mouse coords as calibration. `CalibrationPhase` and `ValidationPhase` use `onClickCapture` + `stopImmediatePropagation()` so only our explicit `blaze.calibrate()` feeds the model. Validation RMSE threshold: 150px (`HYBRID_RECALIBRATION_RMSE_THRESHOLD_PX`).
- **Attention Prediction:** `POST /attention-prediction/research/:id/module/:moduleId/predict` — TranSalNet sobre stimulus, soporta `imageIndex` para multi-imagen (Nav Flow).
- **AI Analysis:** `POST /attention-prediction/research/:id/analyze/:mediaId` — GPT-4o Vision sobre imagen + saliency. Retorna `AiAnalysisResult` (contexto, scores, AOIs, flujo, gaze path, neuro-insights). Síncrono (await). Cacheado en `stimulus.aiAnalysis`.
- **Assessment:** [docs/eye-tracking-assessment.md](docs/eye-tracking-assessment.md)
- **Lab:** `/labs/eye-tracking` en research-frontend

## Implicit Association Analytics (v0.65.1)
- **Greenwald D-score:** `computeGreenwaldDScore()` — filter >10s, pooled SD, D = (mean_incompat - mean_compat) / pooled_SD
- **Per-participant D-scores:** Individual D + effect classification (none/slight/moderate/strong)
- **Aggregate D-score:** Mean + 95% CI (t-distribution)
- **Error analysis:** Per-phase (practice/test) y per-combination (target×attribute) error rates
- **Effect size visualization:** D-score distribution histogram (7 buckets)
- **Advanced filters:** Demographic sidebar en todos los result tabs (Screener, SmartVOC, Cognitive, IAT, Eye Tracking)
- **Module filter:** Analytics query filters by module name (`Attribute`/`Comparing`/`Objects`), excluding non-IAT modules (e.g. Linear Scale) that may share the stage.
- **Trial phases:** `computeIATScores` includes `block-1`/`block-2`/`block-3` trials (not just `phase === 'test'`).
- **Compound targetId:** Comparing Attribute trials use `"object-N__criterion-UUID"` — base ID extracted for RT grouping.
- **Objects Comparing scores:** Always uses `criteria-1`/`criteria-2` as chart dimensions. Per-target association derived from block-2 vs block-3 RT differences.
- **Eye Tracking Shelf grid:** `ShelfGrid` uses `shelfItems` as column count (not `Math.max(shelfItems, urls.length)`).

## References
- [CHANGELOG](CHANGELOG.md) — historial completo de versiones (533+ commits)
- [BITACORA](BITACORA.md) — notas de sesiones de desarrollo
- [Patterns](patterns/) — patrones de construcción repetibles
- [Issues & Fixes](docs/ISSUES_&_FIXES.md)
- [Plan Modos de Participación](docs/PLAN_PARTICIPATION_MODES.md)
- [.agent/](/.agent/) — 13 docs de arquitectura detallada
