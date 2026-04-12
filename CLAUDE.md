# CLAUDE.md

## Al iniciar conversación
- Leer `BITACORA.md` y `CHANGELOG.md` para entender el estado actual y cambios recientes
- Comunicarse en español
- Mantener sincronizada la nota operativa de Obsidian en `Desktop/personal/Proyectos/Proyectos/Emotioxv3.md`: cada pendiente, tarea en curso y elemento completado debe quedar registrado allí también

## Project Overview
EmotioX V3 — plataforma SaaS de investigación UX. Permite a investigadores crear estudios con stages: SmartVOC (NPS, CSAT, CES, CV, NEV, VOC), Cognitive Tasks (Ranking, Single/Multiple Choice, Short/Long Text, Linear Scale, Navigation Flow, Preference Test), Screener, Implicit Association (Attribute Testing, Comparing Attribute, Objects Comparing), Eye Tracking. Configurar demografía, cuotas, y analizar resultados en tiempo real. Los participantes responden encuestas vía URL/QR.

### Técnica "Biometric, Cognitive and Predictive"
Default stages al seleccionar esta técnica: Screener → Welcome Screen → Research Configuration → Implicit Association → Cognitive Tasks → Eye Tracking → Thank You Screen.
- **Screener** (`single_module`): pregunta de filtrado con choices Qualify/Disqualify.
- **Implicit Association** (`module_collection`): 3 paradigmas diferenciados:
  - **Attribute Testing** (Implicit Priming Test, 2 pasos): 2 targets + hasta 5 criteria. Cada criteria se asigna a un target (selector en builder). Step 1 = práctica de targets. Step 2 = criteria como estímulo, respuesta correcta = target asignado.
  - **Comparing Attribute** (Reaction Time Test, 1 paso): hasta 3 objects + 2 dimensions + hasta 15 criteria. Muestra Object + Criteria juntos, botones = dimension labels. Sin correcto/incorrecto, solo RT.
  - **Objects Comparing** (IAT clásico, 3 pasos): hasta 5 targets + criteria-1/criteria-2 (categorías) + hasta 15 criteria items. Step 1 = clasificar criteria. Step 2 = clasificar targets. Step 3 = combinado.
  - **Hide criteria** (v0.56.1): toggle Eye/EyeOff por criterion. `hidden: true` se persiste en el JSON, participant-frontend y analytics lo filtran.
  - **Test title** (v0.56.1): campo interno `test-title` (no visible al participante). Se muestra en results como label sobre el chart. Se guarda como componente virtual con `hidden: true` en root — excluido de `visibleComponents` pero cargado en `componentValues` por `buildInitialComponentValues`.
  - **testType alineado** (v0.56.1): `detectIATTestType` ya no tiene swap — `comparing_attribute` = Comparing Attribute, `objects_comparing` = Objects Comparing.
  - **Targets dinámicos** (v0.56.2): investigador agrega/quita targets desde el builder. `handleAddIatTarget` crea par name+image con `groupLabel`. Límites: AT 2-5, CA 1-5, OC 2-7. Backend y participant-frontend escanean hasta índice 20 con `continue`.
  - **Preview modal** (v0.56.3): botón "Preview" en header del card IAT. `IATPreviewModal` simula el flujo del test con datos en vivo (targets, criteria, priming, dimensions). Modo manual (step through) y automático (auto play). Dark-themed, progress dots.
  - **Flowchart reactivo** (v0.56.4): `IATFlowchart` reemplaza notas estáticas del sidebar. Diagrama de fases, targets, criteria, timing con datos en vivo. Layout diferente por paradigma.
  - **Multi-lang instrucciones** (v0.56.4): `MultiLangInput` con tabs EN/ES para exercise/test instructions. Valor JSON `{"en":"...","es":"..."}`. Participant-frontend usa `resolveMultiLang(raw, i18n.language)` con fallback a string plano.
- **Eye Tracking** (`single_module`): stimuli (imágenes/video), 2 modalidades: Stand Alone (imagen única) y Shelf (vitrina). Incluye Emotion Recognition y predicción de atención automáticos.
- **`research_techniques.default_stages`** (JSON): cada técnica puede definir sus stages default. Al crear un research, se priorizan sobre `default_modules` del research type. El frontend los muestra en el form de creación.
- **Rendering genérico**: `ResearchBuilderPage` usa lógica de `module_collection` generalizada — cualquier stage collection que no sea Smart VOC se renderiza con `CognitiveTaskModuleCard`. No hace falta agregar código específico por stage.
- **Screener Results** (v0.42.0): endpoint `GET /analytics/research/:id/screener` + componente `ScreenerResults` en research-frontend. Histograma de distribución por choice, status cards (overquota/disqualified/complete), best/slowest day, weekly chart. Tab dinámica en `ResearchResultsPage`.
- **Implicit Association Results** (v0.43.0): endpoint `GET /analytics/research/:id/implicit-association` + componente `ImplicitAssociationResults`. 3 visualizaciones: RadarChart (Attribute Testing), BarChart agrupado (Comparing Attribute), BarChart horizontal divergente (Objects Comparing). Detecta tipo de test por nombre del módulo. Computa D-scores desde trial responses (`component_id = 'iat-trials'`). Muestra config con scores vacíos cuando no hay respuestas.
- **Eye Tracking Results** (v0.44.0): endpoint `GET /analytics/research/:id/eye-tracking` + componente `EyeTrackingResults`. Per-stimulus cards con heatmap/image toggle, AOI list, métricas. Respuestas esperadas: `component_id = 'eye-tracking-data'`, value = `{ fixations: [{ x, y, duration, timestamp }], calibrationQuality, integrityScore }`. Tab dinámica en `ResearchResultsPage`.
- **Participant rendering** (v0.50.0): `ScreenerRenderer` (choice question), `ImplicitAssociationRenderer` (3 paradigmas: Attribute Testing 2 pasos con target assignment, Comparing Attribute Yes/No con dimensions, Objects Comparing IAT clásico 3 pasos. Teclado A/L + touch), `EyeTrackingRenderer` (BlazeGaze webcam en desktop, click/tap proxy en mobile/tablet, countdown timer, resolución S3). Los 3 producen el formato exacto que esperan los endpoints de analytics.
- **Attention Prediction** (v0.51.0): research type sin stages/módulos. Stimuli se suben desde Drawer al crear. Media vía `fetch PUT` (mismo flujo que Navigation Flow). Config: `{ stimuli: [{ url, mediaId, name, heatmapData?, processedAt? }] }`. Builder: `AttentionPredictionView` → `AttentionPredictionCard` (tabs Prediction/Video/Image, AOI drawing, Settings modal). Sidebar muestra stimuli. Ruta: `/research/:id/builder/stimulus/:stimulusId`. Tipo en BD: `"Attention's Prediction"`.
- **Attention Prediction backend** (v0.51.1): TranSalNet ONNX (`backend/models/transalnet_res.onnx`). Servicio: preprocesa imagen (384×288, ImageNet norm), inferencia CPU, postproceso con normalización relativa min/max (step=3, ~12K candidatos). Controller fire-and-forget: `POST /attention-prediction/research/:id/predict/:mediaId` → 202, procesa async, guarda `heatmapData` en config. `GET .../status/:mediaId` para polling.
- **Saliency rendering** (v0.51.1): `HeatmapRenderer` dual renderer. Saliencia → colormap pixel a pixel (OGAMA/OpenCV) con LUT 256, alpha cuadrático, threshold 0.4. Clicks → simpleheat.
- **Settings modal funcional** (v0.51.2): Blur, Opacity, Threshold controlan heatmap en tiempo real (debounce 150ms). Prediction Model (Simple/Advanced/Deep Learning) aplica presets. Portal para overlay completo.
- **`AttentionVideoPlayer`** (v0.51.2): animación progresiva del scanpath predicho (5s). Puntos por saliencia desc. Controles: play/pause, reset, barra de progreso. Círculo indicador de fijación actual.
- **Insights Finding** (v0.52.0): research type sin stages/módulos. Sube documentos (.csv, .txt, .xlsx, .docx, .pdf) desde Drawer. Parseo client-side: SheetJS, Mammoth, PDF.js, TextDecoder. Config: `stimuli[].entries` (200 max × 300 chars) + `stimuli[].analysis` (LLM). Builder: `InsightsFindingView` con tabla de entries (izq) + panel análisis (der, tabs Sentiment/Themes/Keywords).
- **Insights LLM analysis** (v0.52.0): GPT-4o (OpenAI) vía `insights.service.ts`. Fire-and-forget: `POST /insights/research/:id/analyze/:fileMediaId` → 202. Genera sentiment summary + actionables, themes con magnitude/sentimentScore, keywords. Resultado en `config.stimuli[].analysis`. Frontend auto-dispara y pollea cada 3s.
- **`isFileBasedResearch`** (v0.52.0): unifica Attention Prediction e Insights Finding. `skip_default_modules: true` en backend.
- **Custom Screening Questions** (v0.53.0, fix v0.55.1): preguntas de selección única con descalificación dentro de Demographics. Se almacenan como `demographics.customQuestion_<id>` con `questionLabel`, `validValues`, `disqualifications`, `options`. Drawer propio (`ScreenerQuestionDrawer`). Backend no requirió cambios — `checkDisqualifications` ya itera todos los keys dinámicamente. `transformResearchConfigComponentValues` y `flattenResearchConfig` manejan keys `customQuestion_*` para el ciclo save/reload. El drawer envía todas las opciones (qualifying + disqualifying) para que `validValues` incluya ambas.
- **Editable demographic labels** (v0.53.0): todos los modales demográficos permiten renombrar la pregunta vía `questionLabel`. Participant-frontend lo usa como override del label i18n. Conditionality modal (v0.57.0) lee `questionLabel` para mostrar el nombre correcto en el dropdown (demographics y custom screening questions).
- **Screening question toggle** (v0.57.0): `ScreenerQuestionDrawer` usa toggle verde/naranja (Qualify/Disqualify) en lugar de selector dropdown, alineado con el patrón de los drawers demográficos.
- **Pendiente**: webcam eye tracking (WebGazer.js) como mejora futura del proxy click-based.

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
- **Condicionalidad de módulos** soporta dos fuentes: demográfica (`DemographicConditionality`) y pregunta del estudio (`ModuleConditionality`). El tipo `ConditionalityConfig` es un union; usar type guards `isDemographicCondition()` / `isModuleCondition()` de `moduleRequired.ts`
- **Cuotas demográficas** siempre en porcentaje (%), aplicación inmediata al enviar demographics. El techo por bucket es `ceil(% × N / 100)` con **N** = límite global del estudio cuando está configurado y activo (`participantLimit` en el módulo *Research Configuration*: **número** legacy o `{ enabled, value }`). No es un porcentaje sobre el volumen dinámico de respuestas ya guardadas. `validateDemographics` → `tryIncrementQuota`. `saveParticipantResponses` no incrementa cuotas.
- **Bloqueo de participantes** tiene 3 capas: (1) `checkQuotaPreAvailability` al cargar (**activa + límite global**), (2) `validateDemographics` al enviar demographics (**activa + cuotas por bucket**), (3) `saveParticipantResponses` al guardar (status + límite → 410). El frontend muestra `MobileRestrictionScreen` en los 3 casos.
- TypeScript strict en los 3 subproyectos
- 0 errors, 0 warnings en lint + build (enforced por pre-commit)
- `Record<string, any>` solo donde es genuinamente dinámico (demographics config), marcado con eslint-disable
- Commits en inglés, código en inglés, comentarios en español/inglés mixto
- Branching: main (producción), feature branches ocasionales
- **Backlink redirects** reemplazan `@id` con el participant ID real y agregan `https://` si falta protocolo. Lógica en `redirectTo` de `ResearchPage.tsx`.
- **CES scale** en participant-frontend lee `comp.value` primero (lo que guardó el investigador), fallback a `selectRange.predefined` (default del template). En research-frontend el save sincroniza ambos campos.
- **CES sentiment zones**: rojo (negativo), ámbar (neutral), verde (positivo). Rangos: 1-5 → 1-2/3/4-5, 1-7 → 1-3/4/5-7, 1-10 → 1-3/4-7/8-10. Solo aplica a CES, no a CV ni Linear Scale.
- **NEV emociones**: 20 emociones canónicas. "Descontento" es negativa (rojo). Fila 1 = positivas (7), Fila 2 = atención (5), Fila 3 = negativas (8). Clasificación alineada entre participant-frontend, research-frontend preview y backend analytics.
- **CES analytics dinámico**: backend extrae la escala configurada (`scaleConfigs`) y la envía al frontend. El dashboard de resultados usa `getCESZones(scaleMax)` para breakdown, MetricCard, CPV y chart data. No más rangos hardcodeados.
- **View Progress completitud**: `getVisibleModuleIdsForProgress` usa `INNER JOIN stages` para excluir módulos con stage eliminado, y `isModuleConfiguredForProgress` para excluir módulos sin contenido. `panelStatus = 'responded'` fuerza 100%. Progress sin completar se capea a 99%.
- **Ciudades en Country & City** (v0.40.2): cuando granularidad es "País + Ciudad", el investigador agrega ciudades con un selector de país qualifying + input de nombre en `CountryConfigModal`. Cada ciudad tiene toggle Clasifica/Desclasifica y muestra el país asociado. Datos: `demographics.country.cities` (`{ name, country? }[]` para round-trip, backward-compatible con `string[]`) + `demographics.city` (entry separado con `validValues` string[] y `disqualifications` para el sistema de cuotas). Participante: si hay ciudades configuradas → `CustomSelect`; si no → no muestra campo de ciudad. Cuotas: por ciudad cuando countryCity, por país cuando countryOnly, nunca ambos.
- **Study Logo** (v0.41.0): `config.studyLogo: { enabled: boolean, s3Key?: string }` en Research Configuration. Participant-frontend muestra logo en top-left: client logo si s3Key existe, EmotioCX default si no, oculto si `enabled: false`.
- **Loading states**: usar skeleton (`animate-pulse` + bloques grises), nunca spinners.
- **Design system** (v0.54.0): spec en `docs/design-system/emotiox-palette.md`. Investigación de referencia de Vambe AI en `docs/design-system/` (solo inspiración, no dependencia). Paleta light-only: surface-app `#F1F5F9`, accent `#006AFF`, heading `#0F172A` (slate-900), body `#334155` (slate-500). Borders semi-transparentes (`black/[0.08]`), sin sombras decorativas. Font: Plus Jakarta Sans (research-frontend), Inter (participant-frontend — pendiente unificar). Login alineado a spec desde v0.54.0.
- **Dashboard table** (v0.54.0): columna Researcher visible solo en `xl` (≥1280px). En pantallas 13" (<xl) se oculta para evitar solapamiento con Actions. Anchos redistribuidos dinámicamente.
- **Screener ordering** (v0.54.1): Screener es "special step" como welcome/demographics/thank-you. Orden fijo: `welcome → screener → demographics → resto → thank-you`. Screener bloquea en tiempo real si choice tiene `eligibility: 'Disqualify'`. `ScreenerChoiceOption` preserva campo `eligibility` desde el JSON del módulo.
- **ResearchPage helpers** (v0.54.1): utilidades extraídas a `utils/researchPageHelpers.ts` — `isModuleConfigured`, `normalizeModule`, `getStepIdFromModuleName`, `getLinkConfig`, `getBacklinks`, `getDemographicsConfig`, `getStudyLogo`. `isModuleConfigured` usa `hasValidFileUpload()` compartida (DRY Navigation Flow / Preference Test).
- **Duplicate research** (v0.56.0): `POST /research/:id/duplicate` clona un estudio completo (stages, modules, questions, quotas, media) como `draft`. NO copia responses ni participants. Quotas reseteadas a 0. Remap de `sourceModuleId` en conditionality y `mediaId` en stimuli. Botón Copy en Dashboard table (lucide `Copy`, azul). `useDuplicateResearch` hook con invalidación de cache.
- **Draft persistence** (v0.55.0): `useModuleDraftStore` (Zustand, session-scoped) guarda drafts por moduleId al cambiar de stage. `useModuleComponents` compara contra `originalValuesRef` — solo crea draft si hay cambios reales. `PendingDraftsDropdown` en header muestra badge + dropdown con Save individual/Save all. Drafts se limpian al guardar o cambiar de research.
- **i18n drawers** (v0.55.0): todos los drawers demográficos 100% en inglés. Screening question drawer sin tab Dynamic Quotas (`hideQuotasTab`).
- **Eye Tracking híbrido** (v0.42.1→v0.42.5): ruta `/eye-tracking-hybrid` en participant-frontend. Flujo desktop: intro → setup → calibración **9 puntos** (grid 3×3 sobre imagen) → **validación** (punto off-grid, re-calibración si RMSE > 120px) → estímulo → heatmap **3×3 (9 zonas)** (upgraded from 2×2 in v0.53.1, stretch/nudge params retuned). Tablet/móvil usa taps como proxy (sin calibración webcam). BlazeGaze (`webeyetrack` npm) con **One-Euro filter** adaptativo (reemplaza EMA estático), campo IDW sobre residuos de calibración. **I-DT fixation detection** agrupa gaze samples en fijaciones reales (centroide, duración, pointCount) — response `gazePipeline: 'hybrid-idw-idt'`. Pipeline legacy `/eye-tracking-test` eliminado; solo queda `/labs/eye-tracking` (research-frontend BlazeGaze lab).
- **Eye Tracking IDs canónicos** (v0.42.0): module template (migración 020) con 10 componentes: `task-instructions`, `stimuli`, `emotion-recognition`, `attention-measurement`, `priming-time`, `display-mode`, `randomize-stimuli`, `shelf-count`, `shelf-items`, `aois`. Builder, renderer y analytics usan los mismos IDs. `priming-time` almacena segundos (5/10/15/20/30), renderer convierte a ms.
- **Eye Tracking AOI** (v0.42.0): `AOIDrawer` component en research-frontend. Investigador dibuja rectángulos sobre la imagen del stimulus. AOIs se guardan como JSON en componente `aois`. Backend analytics ya lee `c.id === 'aois'` para calcular intersecciones con fixations.
- **Eye Tracking BlazeGaze en survey** (v0.42.0): `EyeTrackingRenderer` usa BlazeGaze en desktop (webcam real, tracking silencioso). `<video>` persistente fuera de los bloques de fase. Mobile/tablet mantiene click-proxy. Response incluye `trackingMethod`, `deviceType`, `calibrationQuality` (`blazegaze-Npt` o `click-proxy`).

## Key Files
- `backend/src/router.ts` — routing central, CORS, path normalization
- `backend/server-cpanel.js` — entry point producción (Passenger)
- `research-frontend/src/components/layout/ResearchBuilderSidebar.tsx` — sidebar con status modal (draft/active/completed), stage management
- `research-frontend/src/pages/research/ResearchBuilderPage.tsx` — builder principal; lógica de `module_collection` generalizada (Smart VOC con card propio, todo lo demás con `CognitiveTaskModuleCard`). Draft clearing en save.
- `research-frontend/src/stores/useModuleDraftStore.ts` — Zustand store session-scoped para drafts de módulos no guardados
- `research-frontend/src/components/research/PendingDraftsDropdown.tsx` — dropdown en header con lista de módulos con cambios pendientes, save individual/all
- `research-frontend/src/components/research/ResearchConfigurationModule.tsx` — config, QR, URL, demografía, study logo, custom screening questions. Al habilitar un demográfico de opciones (Competencia técnica, etc.) se inyectan opciones por defecto (`DEFAULT_VALID_VALUES_BY_DEMOGRAPHIC`) para que el participante vea siempre selector, no input de texto. `renderLabelEditor()` genera input de label editable para todos los modales demográficos.
- `research-frontend/src/components/research/CustomScreeningQuestionConfigModal.tsx` — modal para preguntas de filtrado custom. Mismo patrón que HouseholdIncomeConfigModal con campo de nombre editable vía `headerContent`.
- `research-frontend/src/utils/demographicsMapper.ts` — mapeo demografía + LocationGranularity. Keys `customQuestion_*` se enrutan a `mapGenericOptionsToBackend`. Campo `questionLabel` soportado.
- `research-frontend/src/pages/research/ResearchHistoryPage.tsx` — historial de investigaciones por enterprise, chart lineal, "Who is", tabla de researches
- `research-frontend/src/pages/clients/ClientsPage.tsx` — vista Clients: benchmark scatter, explicación, best option, latest projects, tabla de researches
- `research-frontend/src/components/layout/StandardSidebar.tsx` — sidebar principal con nav items (Home, Research, Research's History, Clients, Research Type Builder, Modules)
- `backend/src/modules/enterprises/enterprises.controller.ts` — CRUD enterprises + `GET /enterprises/:id/researches`
- `participant-frontend/src/pages/EyeTrackingHybridPage.tsx` — test page híbrida: BlazeGaze en desktop, attention proxy en tablet/móvil
- `participant-frontend/src/hooks/useBlazeGaze.ts` — BlazeGaze CNN con One-Euro filter adaptativo (reemplaza EMA), calibración `handleClick`, `OneEuroFilter1D` por eje
- `participant-frontend/src/pages/ResearchPage.tsx` — flujo de encuesta del participante (incluye kiosk auto-reset, screener blocking, demographics validation)
- `participant-frontend/src/utils/researchPageHelpers.ts` — utilidades extraídas de ResearchPage: `isModuleConfigured`, `normalizeModule`, `getStepIdFromModuleName`, config extractors
- `participant-frontend/src/hooks/usePreviewMode.ts` — detecta preview vs participant vs kiosk mode
- `participant-frontend/src/stores/useParticipantStore.ts` — estado participante + participationMode
- `participant-frontend/src/services/public.service.ts` — API pública (getParticipationMode, requestKioskSession)
- `participant-frontend/src/components/steps/DemographicsStep.tsx` — paso demográfico; interpreta formato backend (validValues desde demographicsMapper), formato research UI (validAges, validCountries, options con value/label/name), y legacy (boolean o `{ enabled: true }` sin validValues). FALLBACK_OPTIONS provee opciones por defecto para demográficos de tipo selector cuando la config no incluye validValues. Renderiza custom screening questions (`customQuestion_*`) después de los predefinidos, usando `questionLabel` como label. Soporta `questionLabel` override también para demográficos predefinidos.
- `participant-frontend/src/components/steps/DynamicStep.tsx` — render genérico Welcome/Thank You; Thank You Screen muestra logo EmotioCX desde `public/EmotioCX-logo.svg`
- `participant-frontend/src/components/ui/NavigationFlow.tsx` — flujo fullscreen por hitzones. Usa `<img>` directo (no LazyImage) porque IntersectionObserver falla en elementos fixed. Hitzones se guardan en píxeles y se convierten a porcentaje con `convertPixelsToPercent` (función pura fuera del componente). Fallback: si `imgNatural` state no está listo, lee `naturalWidth/Height` del ref. Triple handler (pointerup+click+touchend) con dedupe 150ms. touchAction:'none', onContextMenu preventDefault, reset de imgNatural al cambiar imagen. Clicks en barras de letterboxing (`object-contain`) cuentan como failed attempts (fix v0.52.1). Completion overlay con botón azul "Tap to continue" (v0.56.8). `currentImage` con fallback a último elemento para evitar crash por índice fuera de rango. Save inline de completion status (sin useEffect que sobrescribía `completed: false`).
- `participant-frontend/src/components/ErrorBoundary.tsx` — (v0.56.8) Class component que envuelve `<App />`. Captura errores de render, muestra pantalla amigable con botón "Reload page" y mensaje de error. Evita pantalla blanca en producción.
- `participant-frontend/src/components/ui/CustomSelect.tsx` — selector custom (demografía, etc.); dropdown con position:fixed usa solo coordenadas viewport (sin scrollY/scrollX); abre hacia arriba automáticamente cuando no hay espacio suficiente debajo del trigger (evita solapar botón "Guardar y continuar").
- `research-frontend/src/utils/moduleRequired.ts` — flags de módulo (required, hidden, conditionality) y tipos `ConditionalityConfig` (union: demographic / module). Type guards y getters/setters.
- `research-frontend/src/components/research/ConditionalityModal.tsx` — modal de condicionalidad; soporta fuente demográfica y pregunta del estudio (Single/Multiple Choice anteriores). Exporta `StudyModuleOption`.
- `participant-frontend/src/hooks/useNavigation.ts` — navegación del participante; `isModuleConditionMet` evalúa condiciones demográficas y de módulo; filtra steps habilitados reactivamente.
- `backend/src/modules/participants/participants.service.ts` — CRUD participantes panel, import CSV, status tracking
- `research-frontend/src/components/research/PanelParticipantsSection.tsx` — UI import CSV, tabla participantes, links, export
- `backend/src/modules/email/email.service.ts` — Nodemailer transporter + HTML invitation template
- `backend/src/modules/research-techniques/research-techniques.service.ts` — CRUD técnicas con `default_stages` (JSON parseado desde MySQL)
- `research-frontend/src/hooks/useResearchForm.ts` — form de creación; prioriza `default_stages` de la técnica sobre `default_modules` del research type
- `research-frontend/src/components/research/ResearchFormStep2.tsx` — paso 2 de creación; muestra stages de la técnica seleccionada
- `scripts/stress-test-quotas.ts` — E2E stress test para cuotas atómicas (`npx tsx scripts/stress-test-quotas.ts`). Registra user temporal, crea research kiosk con cuotas, lanza 10 participantes concurrentes, verifica que no se exceden límites.
- `.cursorrules` — reglas de calidad (pre-commit verification obligatoria)
- `research-frontend/src/components/results/screener/ScreenerResults.tsx` — Screener results panel: histograma apilado por choice/route (Recharts BarChart), 3 status cards (overquota/disqualified/complete), best/slowest day, weekly line chart. Datos desde `GET /analytics/research/:id/screener`.
- `research-frontend/src/components/results/implicit-association/ImplicitAssociationResults.tsx` — Implicit Association results: 3 chart types (RadarChart para Attribute Testing, BarChart agrupado para Comparing Attribute, BarChart horizontal divergente para Objects Comparing). Datos desde `GET /analytics/research/:id/implicit-association`.
- `research-frontend/src/components/results/eye-tracking/EyeTrackingResults.tsx` — Eye Tracking results: per-stimulus cards, heatmap/image toggle, AOI list. Datos desde `GET /analytics/research/:id/eye-tracking`.
- `participant-frontend/src/components/renderers/ScreenerRenderer.tsx` — Screener: reutiliza `ChoiceQuestion`, response `component_id = 'choice'`.
- `participant-frontend/src/components/renderers/ImplicitAssociationRenderer.tsx` — IAT: 3 paradigmas (Attribute Testing = priming 2 pasos con targetId, Comparing Attribute = Yes/No 1 paso con dimensions, Objects Comparing = IAT clásico 3 pasos). Teclado A/L + botones touch. Response `component_id = 'iat-trials'`.
- `participant-frontend/src/components/renderers/EyeTrackingRenderer.tsx` — Eye Tracking: BlazeGaze webcam en desktop (gaze silencioso), click/tap proxy en mobile/tablet, countdown timer, resolución S3. Response `component_id = 'eye-tracking-data'`, incluye `trackingMethod`, `deviceType`, `calibrationQuality`.
- `research-frontend/src/components/research/AOIDrawer.tsx` — componente reutilizable de AOI drawing. Click-drag sobre imagen, SVG overlay, lista con thumbnails y remove. Props: `imageUrl`, `aois`, `onChange`.
- `research-frontend/src/components/results/smart-voc/SmartVOCResults.tsx` — SmartVOC panel, NEV, NPS, CSAT, CES, CV, VOC, filtros, clusters, tooltips, exportación CSV de comentarios. CPV = CSAT positivo (4+5) - CES negativo (1+2). NPS agrupado por día en today/week con porcentajes para barras apiladas. NEV: lista canónica de 20 emociones (IDs alineados con participant EmotionSelector), normalización de claves al agregar, etiquetas solo en español.
- `research-frontend/src/components/results/smart-voc/components/NPSAnalysis.tsx` — NPS: barras apiladas Promoters/Neutrals/Detractors normalizadas al 100% (datos en porcentajes; Today/Week desde SmartVOCResults, Month desde backend); gráfico ComposedChart + circular score + Loyalty Evolution.
- `research-frontend/src/components/results/smart-voc/components/CPVCard.tsx` — CPV: pastilla compacta sticky en top-left. Muestra el ratio sin `%` (CPV = CSAT% / CES%, es un ratio, no un porcentaje)
- `research-frontend/src/components/results/smart-voc/components/NEVQuestionCard.tsx` — NEV: badge NEV score con signo (Negative/Positive) y color; todas las emociones con % encima de cada barra, techo 50%, clusters con tendencia según datos (up/down)
- `research-frontend/src/components/results/smart-voc/components/VOCComments.tsx` — VOC y Long/Short Text (Cognitive Tasks): tabla de comentarios; botón Descargar comentarios (.csv) usa researchId/cognitiveExportRows cuando viene de CognitiveTaskResults; triggerDownload con appendChild para que el CSV se descargue en todos los navegadores.
- `research-frontend/src/components/results/smart-voc/components/TrustFlowChart.tsx` — Trust Relationship Flow: NPS/NEV por tiempo (Today=LineChart, Week=BarChart, Month=LineChart). Caja "Latest point" en el encabezado (no sobre el gráfico) para no tapar el tooltip al pasar el mouse.
- `backend/src/modules/quotas/quota.service.ts` — cuotas demográficas. Siempre porcentaje, siempre inmediata. `resolveAbsoluteLimit` convierte `ceil(% × participantLimit / 100)`. `tryIncrementQuota` es la operación atómica (check+increment con `FOR UPDATE`). `matchesQuotaValue` hace fallback a comparación exacta de strings cuando `parseInt` retorna NaN (opciones como "Menor 18"). `checkAllQuotasFull` deprecated (no usar en pre-check público). `checkQuotaAvailability` e `incrementQuota` están deprecated.
- `backend/src/modules/public/public.service.ts` — `getResearchConfiguration` lee el módulo **Research Configuration** (`modules.config`). `getEffectiveParticipantLimitCap` unifica `participantLimit` en número vs objeto. `validateDemographics` (status activo; `RESEARCH_CLOSED` si no). `checkQuotaPreAvailability`: activo + límite global; sin buckets en GET. `getParticipantStatus` sin solo-demografía. `saveParticipantResponses`: 410 si inactiva o límite global. `getParticipantCount` excluye `module_id = 'demographics'`.
- `backend/src/modules/analytics/analytics.service.ts` — métricas SmartVOC; NEV usa IDs canónicos (minúsculas, sin tildes) y normalizeEmotionKey para conteo y cálculo de NEV
- `backend/src/modules/research/research-in-progress.service.ts` — progreso de participantes. `getVisibleModuleIdsForProgress`: INNER JOIN con stages (excluye módulos con stage borrado), excluye Research Configuration/Welcome/ThankYou/hidden, y `isModuleConfiguredForProgress` excluye módulos sin contenido. `panelStatus = 'responded'` fuerza 100%. LEFT JOIN con `participants` para overquota/disqualified/responded en View Progress.
- `scripts/test-quota-redirect-scenarios.ts` — E2E test de 8 escenarios de cuotas/redirect/completion (`npx tsx scripts/test-quota-redirect-scenarios.ts`). Crea researches temporales, simula participantes, verifica bloqueos y limpia al final.
- `research-frontend/src/components/research/AttentionPredictionView.tsx` — vista del builder para Attention Prediction: si hay stimulus activo muestra `AttentionPredictionCard`, si no muestra uploader con `FileUploadAdvanced`.
- `research-frontend/src/components/research/AttentionPredictionCard.tsx` — card de análisis por stimulus. Tabs: Prediction (heatmap + AOI drawing), Attention Video, Image. Settings abre modal con controles de Blur/Opacity/Threshold/Model + controles de Composición (Analysis window, Frames in fixation, Dispersion, Merge range). Usa `HeatmapRenderer` con props configurables.
- `research-frontend/src/components/research/CreateResearchForm.tsx` — form de creación; incluye Drawer de stimuli para Attention Prediction. Upload usa `fetch()` (no Axios) para enviar binarios al mismo endpoint que `FileUploadAdvanced`.

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

## Eye Tracking (v0.40.0, branch feature/eye-tracking-system)
- **Lab page:** `/labs/eye-tracking` en research-frontend — prototipo de gaze tracking por webcam
- **Motor de gaze:** BlazeGaze CNN (670KB, paquete `webeyetrack`) — usa imagen de ojos + head pose, no solo landmarks
- **Pipeline:** WebEyeTrack corre su propio MediaPipe internamente; un solo pipeline (sin duplicación)
- **Calibración:** 17 puntos guiados → cada click alimenta `adapt()` (few-shot). `useBlazeGaze.calibrate()` resetea debounce interno
- **Smoothing:** Adaptativo (alpha 0.12–0.4 según distancia), deadzone 4px, blink filtering (ignora frames con ojos cerrados)
- **Limitación conocida:** Iris ratios de MediaPipe tienen rango dinámico muy bajo (~0.008 delta por 55% pantalla) — insuficiente para gaze solo con landmarks. BlazeGaze resuelve esto usando la imagen completa del ojo
- **Assessment completo:** [docs/eye-tracking-assessment.md](docs/eye-tracking-assessment.md)
- **Key files:**
  - `research-frontend/src/pages/labs/EyeTrackingLabPage.tsx` — página principal del lab
  - `research-frontend/src/hooks/useBlazeGaze.ts` — hook BlazeGaze (gaze prediction)
  - `research-frontend/src/hooks/useFaceDetection.ts` — hook MediaPipe (detección facial)
  - `research-frontend/src/lib/eyeTracking/` — librería compartida (landmarks, features, ridge, overlay)
  - `research-frontend/public/web/model.json` — modelo BlazeGaze TF.js (gitignored, copiar desde WebEyeTrack repo)

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
