## v0.26.14 — VOCComments CSV download reliability fix (2026-03-16)

### research-frontend
- Fix: VOCComments CSV download — split handleDownloadCSV into sync (Cognitive Tasks) and async (SmartVOC) paths so Cognitive Tasks downloads stay within the browser's user-gesture window. Delayed URL.revokeObjectURL by 200ms, removed display:none from temp anchor, added defensive String() coercion on CSV fields.

---

## v0.26.13 — CustomSelect dropdown direction fix (2026-03-16)

### participant-frontend
- Fix: CustomSelect dropdown now opens upward when there isn't enough space below the trigger, preventing overlap with the "Guardar y continuar" button on demographics fields near the bottom of the screen.

---

## v0.26.12 — Demographics fallback options and label alignment (2026-03-15)

### participant-frontend
- Fix: DemographicsStep renders text input instead of selector when config lacks validValues (legacy researches stored as boolean `true` or `{ enabled: true }` without options). Added FALLBACK_OPTIONS map for all option-based demographics so participants always see a CustomSelect.
- Fix: annualIncome label changed from "Ingreso Anual" / "Annual Income" to "Ingreso Familiar" / "Household Income" to match research-frontend configuration label.

---

## v0.26.11 — Navigation Flow cross-browser fixes (2026-03-15)

### participant-frontend
- Fix: Navigation Flow — reduce click dedupe window from 400ms to 150ms so quick taps are no longer swallowed (all browsers).
- Fix: Navigation Flow — skip placeholder onLoad (1x1 GIF) to prevent imgNatural and renderedRect from being set to incorrect values before the real image loads.
- Fix: Navigation Flow — change touchAction from 'manipulation' to 'none' to fully block browser panning/zooming gestures on the interactive area (Safari, Chrome mobile).
- Fix: Navigation Flow — prevent context menu on long-press (Brave, Opera, Safari mobile).
- Fix: Navigation Flow — reset imgNatural and renderedRect to null on image transition to avoid stale hitzone positioning from the previous image.

---

## v0.26.10 — Navigation Flow advance, CustomSelect dropdown, Long Text CSV (2026-03-12)

### participant-frontend
- Fix: Navigation Flow — getClickableRect falls back to container rect when no img (placeholder, loading, or mock) so taps/clicks advance in Safari, Opera, DuckDuckGo, Chrome, Brave. Non-passive touch listeners for reliable tap handling.
- Fix: CustomSelect dropdown position — use viewport-only coordinates (no scrollY/scrollX) for position:fixed so dropdown aligns in Opera, DuckDuckGo. Download trigger appends link to body before click for browser compatibility.
- Test: NavigationFlow test verifies onComplete when clicking container (fallback rect).

### research-frontend
- Fix: Cognitive Tasks Long Text (e.g. 3.2) — "Descargar comentarios (.csv)" now downloads: VOCComments accepts researchId and cognitiveExportRows; when used from CognitiveTaskResults, CSV is built from module responses and triggerDownload uses appendChild for reliable download.

---

## v0.26.9 — Demographics step: interpret backend config format (2026-03-12)

### participant-frontend
- Fix: DemographicsStep now correctly interprets Research Configuration demographics served by the backend. Backend stores `validValues` (from demographicsMapper); step accepts both backend shape (validValues) and research UI shape (validAges, validCountries, options). Option entries support `name` in addition to value/label. Legacy array or boolean per demographic handled.

---

## v0.26.8 — Demographics defaults, NEV sign, Navigation Flow UX (2026-03-11)

### research-frontend
- Feat: Enabling an option-based demographic (Competencia técnica, gender, educationLevel, etc.) in Research Configuration now injects default validValues so participants always see a selector instead of a free-text input.
- Fix: SmartVOC NEV section shows NEV score with correct Positive/Negative label and color (red when &lt; 0); cluster trends are now data-driven (up/down from cluster value) instead of hardcoded.

### participant-frontend
- Fix: Navigation Flow — title and instructions moved above the image (no overlay) so top hitzones are clickable on mobile, tablet, and desktop.
- Fix: Navigation Flow — pointer and touch events (onPointerUp, onTouchEnd) with click dedupe so taps/clicks register in Opera and all browsers; when no hitzones are configured, whole image is treated as valid so the flow can advance.

---

## v0.26.7 — Thank You Screen: EmotioCX logo (2026-03-11)

### participant-frontend
- Feat: Thank You Screen step now displays EmotioCX logo above title and message. Logo asset in `public/EmotioCX-logo.svg` (from docs); DynamicStep shows it only when module is Thank You Screen, using `import.meta.env.BASE_URL` for dev and production paths.

---

## v0.26.6 — Kiosk transition loop fix (Safari) (2026-03-11)

### participant-frontend
- Fix: Kiosk auto-reset no longer loops in Safari — effect that runs on thank-you was scheduling a new timeout on every run; added `kioskResetScheduledRef` so only one transition timeout is scheduled per thank-you visit, then reset in finally and on effect cleanup.

---

## v0.26.5 — NPS stacked bars at 100% (2026-03-11)

### research-frontend
- Fix: SmartVOC Results NPS — stacked bars (Promoters / Neutrals / Detractors) now display at 100% height. Today/Week chart data use percentages instead of counts; NPSAnalysis normalizes each row so the three segments sum to 100 (fixes rounding and ensures full bar fill).

---

## v0.26.4 — NEV: canonical emotions, normalized keys, Spanish labels only (2026-03-11)

### research-frontend
- Fix: NEV Results — emotional states now use a single canonical list (20 emotions) aligned with participant-frontend EmotionSelector; keys normalized when aggregating so no records are lost (e.g. "Enérgico" / "energico" count together)
- Fix: NEV labels shown only in Spanish; removed mixed English (joy, trust, anger, etc.); clusters use canonical IDs and include all 8 negative emotions (estresado, infeliz, desatendido, apresurado)

### backend
- Fix: NEV calculation — POSITIVE_EMOTIONS and NEGATIVE_EMOTIONS use canonical IDs (lowercase, no accents); added `normalizeEmotionKey` so participant submissions match (e.g. "decepcion" / "Decepción" both count as negative)
- Fix: Emotional states aggregation stores normalized keys so response counts are consistent with frontend

---

## v0.26.3 — Trust Flow: latest-point box in header, tooltip no longer covered (2026-03-11)

### research-frontend
- Fix: Trust Relationship Flow — "Latest point" (NPS/NEV) box moved from chart overlay to header row so Recharts tooltip is not covered when hovering over points (e.g. 15:00)
- Feat: Overlay label now shows the last data point's timestamp (time for Today, date for Week/Month) instead of current time; added "Latest point" label to clarify it is not global average or query time

---

## v0.26.2 — Progress 100% from visible components only (2026-03-11)

### backend
- Fix: Progress and completion rate now use only visible/enabled components — excludes Research Configuration, hidden modules (`config.hidden`), and hidden components; 100% aligns with questions actually shown in the study (e.g. SmartVOC only after removing cognitive block)

---

## v0.26.1 — Status Modal: Change Status (Draft/Active/Completed) (2026-03-11)

### research-frontend
- Feat: Status modal now allows changing between Draft, Active, and Completed — previously only allowed activating
- Feat: Status badge in sidebar uses semantic colors (gray=draft, blue=active, green=completed)
- Fix: Researchers can now return a research to Draft to change participation mode, modules, or configuration

---

## v0.26.0 — SmartVOC Metrics Fixes, Progress Tracking, UI Polish (2026-03-11)

### backend
- Fix: Participant progress tracking now uses `component_id` instead of `question_id` — the modern response endpoint saves to `component_id` while progress was counting `question_id` (always NULL), causing 0% progress and "Por iniciar" status for all participants
- Fix: Total expected responses now computed from module config `components[]` arrays instead of the `questions` table
- Fix: `getParticipantDetails` status/progress now correctly calculated from component-based data
- Fix: Completion rate in overview metrics uses real completed participants count (all components answered)

### research-frontend
- Fix: CPV calculation corrected from `csatPct / cesPct` (ratio) to `csatPct - cesPct` (percentage points) — formula: CSAT positive (4+5) minus CES negative (1+2)
- Fix: CES QuestionCard breakdown was inverted — scores 1+2 labeled "Little effort" (green) and 4+5 "Much effort" (red); now correctly: 4+5 = "Easy" (green), 1+2 = "Difficult" (red)
- Fix: NPS chart in Today/Week views showed individual responses as separate data points; now aggregates scores by day with proper NPS ratio calculation
- Fix: Removed redundant time-range filter inside NPSAnalysis (data arrives pre-filtered from SmartVOCResults)
- Feat: CPVCard redesigned as compact sticky pill at top-left with time range selector — stays visible on scroll
- Feat: NEVQuestionCard now shows percentage labels above each emotion bar
- Feat: NEV clusters displayed side by side (2-column grid) instead of stacked vertically
- Feat: ResearchInProgressContent shows disconnection warning and explanatory note about progress calculation
- Refactor: Simplified publicTestsUrl to prioritize runtime-config.json participantBaseUrl

---

## v0.25.2 — NEV: All Emotions, Cluster Tooltip (2026-03-11)
## v0.25.3 — VOC Comments CSV Export (2026-03-11)

### research-frontend
- Feat: Added button to export all Voice of Customer (VOC) comments to CSV in SmartVOC Results. CSV includes participant_id, demographic data, and all SmartVOC responses for participants who left comments.

### research-frontend
- Feat: NEVQuestionCard now displays all 20 emotions (positive and negative), even if not selected, with a max bar percent of 50% (each emotion can reach up to 5% if distributed equally).
- Feat: Added tooltip to NEV clusters explaining the meaning of up/down arrows and the period (day/week/month) according to the selected time range.
# CHANGELOG

> **533 commits** | **Nov 20 2025 → Feb 17 2026** | Monorepo: research-frontend (196 files) · participant-frontend (67 files) · backend (60 files)

---

## v0.25.1 — TrustFlowChart: Week View as Bar Chart (2026-03-11)

### research-frontend
- Feat: TrustFlowChart "Last week" view now renders as a BarChart (7 grouped bars for NPS/NEV) instead of a LineChart — each bar represents the average ratio for a 24h interval
- Feat: Week view X-axis labels show weekday names (Mon, Tue, Wed…) instead of dates
- Today (intraday lines) and Month (daily lines) views remain unchanged

---

## v0.25.0 — SmartVOC Filters: Time Range Across All Panels (2026-03-11)

### backend
- Feat: Score arrays (`csatScores`, `cesScores`, `cvScores`, `npsScores`) now include timestamps (`{value, date}`) — enables frontend time-range filtering
- Feat: New `npsScores` field in metrics response (previously only aggregate counts were returned)
- Feat: New `nevResponsesData` field with per-response emotions + timestamp for NEV time filtering

### research-frontend
- Feat: Time range filter (Today/Week/Month) now affects all 5 SmartVOC panels — previously only TrustFlowChart and NPSAnalysis were filtered
- Feat: CPVCard value recalculated from filtered CSAT/CES scores per time range
- Feat: MetricCards (CSAT/CES/CV) scores recalculated from filtered data
- Feat: QuestionCards breakdown percentages and response counts reflect selected time range
- Feat: NEVQuestionCard emotional states, clusters, and percentages filtered by time range
- Feat: VOCComments filtered to show only comments within selected time range
- Refactor: Centralized `filterByTimeRange()` helper and `filtered` useMemo in SmartVOCResults — single source of truth for time-filtered data
- Types: Added `TimestampedScore`, updated `SmartVOCMetrics` and `SmartVOCAnalytics` interfaces
- Updated `hasScores()` utility to accept both `number[]` and `{value}[]` arrays

---

## v0.24.0 — SmartVOC Analytics: Real Metrics (2026-03-11)

### backend
- Feat: `generateTimeSeriesData` now computes all metrics per day (NPS, NEV, CSAT, CES, CV, CPV) — previously NEV was hardcoded to 0 and only NPS was calculated
- Feat: Time series expanded from 7 to 30 days to support all frontend time range filters (today/week/month)
- Feat: New `generateMonthlyMetricsData` produces 6-month monthly breakdowns for CSAT (satisfied/dissatisfied), CES (positive/negative), CV (positive/negative), and CPV — consumed by MetricCard charts
- Fix: `generateMonthlyNPSData` used hardcoded year `2024` — now uses actual year from response dates
- Refactor: Extracted shared helpers (`POSITIVE_EMOTIONS`, `parseScoreValue`, `extractScores`, `calculateNPSFromScores`, `calculateNEVFromResponses`, `calculateCSATPercentage`, `calculateCESPercentage`) eliminating duplicated logic
- Refactor: Removed unused `modulesQuery`/`modulesResult` and unnecessary `async`/`researchId` params from helper functions
- Return type of `getSmartVOCResults` now includes `monthlyMetricsData` (auto-broadcast via SSE)

### research-frontend
- Feat: MetricCard (CSAT/CES/CV) mini-charts now render real monthly satisfied/dissatisfied data from `monthlyMetricsData` — previously used hardcoded empty `defaultData`
- Feat: CPVCard generates dynamic SVG curve from real CPV monthly data with auto-positioned peak label — previously used static SVG path and hardcoded "83,62" label
- Feat: TrustFlowChart NEV line now displays real data (backend fix) and Y-axis corrected from arbitrary 0-12k scale to -100/+100 range matching NPS/NEV percentages
- Feat: NPSAnalysis Loyalty Evolution now calculates real month-over-month NPS delta — previously hardcoded "+16% Since last month"
- Feat: NEVQuestionCard clusters now computed from real emotional states grouped by category (Advocacy, Recommendation, Engagement, Destroying) — previously used mock values
- Refactor: Updated `SmartVOCResults`, `SmartVOCAnalytics`, and `SmartVOCTimeSeriesData` types to include new backend fields (`monthlyMetricsData`, `csat`, `ces`, `cv`, `cpv` in time series)
- Cleanup: Removed unused `hasData` prop and `defaultData` constant from MetricCard

---

## v0.23.3 — Memory Leak Fixes (2026-03-11)

### participant-frontend
- Fix: Browser freezing after multiple participant sessions — React Query cache (`gcTime` 10min→2min), MediaService URL cache, and session store interactions accumulated without cleanup between participants
- Fix: `useSessionTimer` effect re-running on every render due to unstable store deps — stabilized with `useRef` + empty deps to prevent event listener and interval accumulation
- Fix: Session store `interactions[]` not cleared on `startSession()` — now resets to empty array
- Fix: Added `mediaService.clearCache()` + `queryClient.clear()` on all session reset paths (participant change, kiosk auto-reset, manual restart)

---

## v0.23.2 — SmartVOC Auto-Advance Fix (2026-03-11)

### participant-frontend
- Fix: SmartVOC scale steps (CSAT, NPS, CES, CV) getting stuck — `onComplete` reference changes caused the auto-advance timer to be canceled via effect cleanup, while the `autoAdvanceFired` guard prevented re-scheduling. Solved by storing `onComplete` in a ref so the effect only depends on `scaleValue`.
- Fix: NPS scale value 0 not registering — `(value as number) || null` treated `0` as falsy. Now uses explicit `typeof` check to preserve zero as a valid selection.

---

## v0.23.1 — Navigation Flow Cross-Browser Fixes (2026-03-11)

### participant-frontend
- Fix: iOS Safari tap highlight (blue/gray flash) — added `-webkit-tap-highlight-color: transparent`
- Fix: iOS Safari long-press context menu on images — added `-webkit-touch-callout: none`
- Fix: Desktop image drag interrupting clicks (Chrome/Edge/Opera) — added `draggable={false}` + `pointer-events-none` on image
- Fix: 300ms touch delay on mobile — added `touch-action: manipulation`
- Fix: Accidental text selection on long-press — added `select-none` on clickable area
- Fix: iPhone X+ notch/home indicator overlapping fullscreen overlay — added `env(safe-area-inset-*)` padding

---

## v0.23.0 — Panel Email Invitations (2026-03-11)

### backend
- New `email` module with Nodemailer transport configured for cPanel SMTP (Exim)
- HTML invitation email template with EmotioX branding, participant name greeting, and participation button/link
- New endpoints for sending invitation emails (authenticated, panel-mode only):
  - `POST /participants/:researchId/send-emails` — bulk send to all pending participants with email, returns `{ sent, failed, results }`
  - `POST /participants/:researchId/:id/send-email` — send to a single participant (for resends/retries)
- Both endpoints validate `participationMode === 'panel'` before sending (returns 400 for kiosk)
- `invited_at` timestamp updated on successful send
- SMTP env variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`

### research-frontend
- "Send invitations" button in PanelParticipantsSection — bulk sends to all pending participants with email
- Confirmation dialog before bulk send showing count of recipients
- Per-row resend button (mail icon) for individual participants with email
- New "Invited" column in participants table showing last invitation date
- `researchName` prop threaded from ResearchBuilderPage → ResearchConfigurationModule → PanelParticipantsSection

### pending
- Create `noreply@emotio.cx` email account in cPanel and configure SMTP credentials in production `.env`

---

## v0.22.0 — Panel Participants: CSV Import, Links & Status Tracking (2026-03-11)

### database
- New migration `015_create_participants.sql`: `participants` table with fields for email, name, external_id, status tracking, and unique constraint on (research_id, participant_id)

### backend
- New `participants` module (service + controller) with authenticated endpoints:
  - `GET /participants/:researchId` — list all participants for a research
  - `POST /participants/:researchId/import` — import participants from CSV text (flexible column mapping: email/name/externalId, supports `,` and `;` delimiters)
  - `DELETE /participants/:researchId/:id` — delete single participant
  - `DELETE /participants/:researchId` — delete all participants
- Participant IDs auto-generated as `panel-N` (incremental per research), or uses `externalId` from CSV if provided
- Duplicate detection by email within same research (skipped on import)
- Auto-status tracking: `saveParticipantResponses()` now updates `participants.status` to `'responded'` when responses are saved (non-blocking, backwards-compatible)

### research-frontend
- New `PanelParticipantsSection` component in Research Configuration (visible only in Panel mode):
  - CSV import button with flexible column detection (email, name, externalId — all optional)
  - Participants table with status badges (pending/responded/disqualified/overquota)
  - Copy individual participant link (`?participantId=panel-N`)
  - Copy all links (CSV format to clipboard)
  - Export participants + links as downloadable CSV
  - Delete individual or all participants
  - Stats summary (pending/responded counts)
- New `participants.service.ts` frontend service for API communication

---

## v0.21.0 — Participation Modes: Kiosk vs Panel — Phases 1, 2 & 3 (2026-03-11)

### participant-frontend (Phase 3)
- Kiosk mode: participant-frontend detects participation mode on load via `GET /public/research/:id/mode`
- Kiosk URLs work without `?participantId` — backend auto-assigns incremental IDs (`kiosk-1`, `kiosk-2`, ...)
- `usePreviewMode` hook updated: kiosk mode (no URL participantId) is NOT preview, explicit `?preview=true` always forces preview
- After completing a kiosk survey, a 4-second transition screen shows ("Preparing next participant...") then auto-resets to Welcome
- Reset clears all responses, requests a new kiosk session ID, and navigates to Welcome — SPA reset without page reload
- Kiosk auto-reset uses a dedicated `useEffect` watching `currentStep` (not `handleNext`) since thank-you screen has no button
- Fresh kiosk session always requested on page load to handle stale localStorage from different researches
- `participationMode` persisted in Zustand store (`useParticipantStore`) with localStorage persistence
- Added `getParticipationMode()` and `requestKioskSession()` to `publicService` using service discovery endpoints
- Panel mode and existing researches (no mode set) behave exactly as before — zero retrocompatibility impact
- Added kiosk i18n strings (ES/EN) for transition screen
- Backend config controller updated with `participationMode` and `kioskSession` endpoint discovery

### research-frontend (Phase 2)
- Added participation mode selector (Kiosk / Panel radio cards) in Research Configuration, above demographics
- Kiosk mode hides demographic questions section and disqualification/overquota backlinks
- Panel mode shows all sections as before (retrocompatible)
- Mode selector disabled when research is active (only editable in draft)
- URL helper text adapts to selected mode (kiosk: shared device hint, panel: participantId hint)
- `participationMode` persisted in module config via existing componentValues pipeline

### backend
- Added `ParticipationMode` type (`'kiosk' | 'panel'`) and `getParticipationMode()` service method
- New public endpoint `GET /public/research/:id/mode` returns the participation mode for a research (defaults to `'panel'` for retrocompatibility)
- New public endpoint `POST /public/research/:id/kiosk/session` generates incremental participant IDs (`kiosk-1`, `kiosk-2`, ...) for kiosk-mode researches
- Kiosk session generation uses MySQL transaction with `FOR UPDATE` to prevent race conditions between simultaneous tablets
- Validates research is active and configured in kiosk mode before generating session IDs
- No changes needed to `saveParticipantResponses()` — existing validation accepts kiosk IDs natively

---

## v0.20.3 — Research Configuration quality fixes (2026-03-11)

### research-frontend
- Debounced backlink URL validation (300ms) to avoid per-keystroke validation overhead
- Participant limit input now shows warning toast on invalid values instead of silently falling back to 50
- Replaced fragile `||` chain in quota conversion with `DEMOGRAPHIC_QUOTA_FIELD` lookup map
- Converted demographic row from `<div onClick>` to native `<button>` for keyboard accessibility
- Removed redundant `handleLabelClick` handler (parent button handles the same logic)
- Extracted `demographicLabel` variable to eliminate nested ternary in JSX
- Added `aria-label` attributes to all section toggles, demographic checkboxes, and link config checkboxes
- Removed duplicate `{/* QR Code Modal */}` comment
- Wrapped `backlinks` derivation in `useMemo` to stabilize `useCallback` dependencies
- Used `Number.parseInt` / `Number.isNaN` over global equivalents

---

## v0.20.2 — Navigation Flow UX improvements (2026-03-09)

- Changed cursor from crosshair to pointer for better click affordance
- Last image in flow now treats entire image as hitzone — any click completes the flow
- Reduced advance delay from 500ms to 200ms for snappier image progression
- Removed incorrect click red dots ("christmas tree" effect) — only correct clicks show green feedback
- Incorrect clicks still tracked in analytics data (clickSequence) for research purposes
- Deployed via CI/CD (GitHub Actions → cPanel)

---

## Deploy — v0.17.0 → v0.20.1 shipped to production (2026-03-09)

- Full production deploy of backend, research-frontend, and participant-frontend to cPanel
- All versions from v0.17.0 through v0.20.1 deployed in a single batch
- All 3 endpoints verified healthy (HTTP 200)
- Documented repeatable construction patterns in `/patterns/` (frontend, backend, devops, fullstack)

---

## v0.20.1 — Participant SmartVOC auto-advance fix (2026-03-06)

- Fixed `participant-frontend` SmartVOC scale flow where selecting a number sometimes did not advance to the next step
- Root cause: the internal `autoAdvanceFired` guard in `SmartVOCRenderer` was not resetting when the module changed, so after one scale question advanced, the next one could get stuck
- Fix: reset the auto-advance guard on `module.id` change so each SmartVOC scale module (`CSAT`, `NPS`, `CES`, `CV`) can advance independently after selection
- NEV now enforces the number of selectable emotions based on the instruction/description text coming from backend
- Supported instruction semantics: exact selection (`Selecciona 3`, `Selecciona tres`) vs maximum selection (`Hasta 3`, `Máximo 3`, `No más de 3`)
- Added parser support for numeric digits and number words in Spanish/English, plus participant-side validation for exact/max NEV emotion rules
- Unified the cPanel SSH alias in the local connection helper script to `cpanel-emotio` so it matches the deploy scripts used for frontend deployments

## v0.20.0 — Real-time SmartVOC Results (2026-03-06)

- SmartVOC results now update in real-time via Server-Sent Events (SSE) — no polling
- Backend broadcasts fresh SmartVOC analytics via SSE immediately after a participant submits a SmartVOC response (CSAT, NPS, CES, CV, NEV, VOC)
- `useSmartVOCAnalytics` hook connects to existing SSE endpoint (`/monitor/events/:researchId`) and listens for `smartvoc-update` events
- Initial data still fetched via REST on mount; subsequent updates are pure push from database save → SSE broadcast → UI render
- Added `isLive` state to hook for real-time connection status indicator
- Flow: participant submits → backend COMMIT → `getSmartVOCResults()` → `broadcastToResearch('smartvoc-update', results)` → research-frontend `setData()`
- Fixed preview mode storing previous responses: `clearAllResponses()` now called on preview entry so researchers always see a clean survey
- Fixed Navigation Flow hitzone misalignment on Safari: `object-contain` letterboxing caused `getBoundingClientRect()` to return the element rect instead of the rendered image area; added `getRenderedImageRect()` to compute the actual visible image bounds and used it for both click detection and overlay positioning

## v0.19.6 — Fullscreen Navigation Flow (2026-03-05)

- Navigation Flow now renders fullscreen (fixed, inset-0) with black background — image takes 100% of viewport on both PC and mobile
- Title, description, and progress bar float as a gradient overlay at the top
- Language selector and preview banner remain visible (already fixed/z-50)
- Removed image filename from progress overlay (only shows "Image X of Y")
- Completion overlay adapted to dark theme

## v0.19.5 — SmartVOC auto-advance & Research URL fix (2026-03-05)

- SmartVOC scale modules (CSAT, NPS, CES, CV) now auto-advance 500ms after selection — no button shown (quick-response UX)
- Cognitive task modules (Single Choice, Multiple Choice, Linear Scale, Preference Test) keep the blue "Guardar y continuar" footer button (take-your-time UX)
- NEV and VOC keep the footer button (require explicit confirmation)
- Removed all remaining internal purple "Continue" buttons from LinearScaleQuestion, ChoiceQuestion, PreferenceTest, and SmartVOCRenderer
- Cleaned up unused `onComplete` prop from ChoiceQuestion, LinearScaleQuestion, and PreferenceTest interfaces
- Fixed Research URL in Research Configuration: field, copy button, and QR code now show the public participant URL (without `?preview=true`); only the "Link Preview" button adds the preview parameter

## v0.19.4 — Unified footer button, custom dropdowns & lightbox UX (2026-03-05)

- Removed ALL internal purple "Continue" buttons — Single Choice, Multiple Choice, Linear Scale, NEV, VOC, Preference Test now use the parent "Guardar y continuar" footer button exclusively
- Removed "Seleccionado: filename" text from PreferenceTest (redundant with visual checkmark on selected image)
- Added `CustomSelect` component to participant-frontend (ported from research-frontend) — replaces native `<select>` in Demographics to avoid dark OS popover on iOS/Safari
- PreferenceTest lightbox closes on backdrop click (without drag) and Escape key
- Fixed mobile hamburger menu overlapping with preview mode banner

## v0.19.2 — PreferenceTest & CognitiveTaskRenderer cleanup (2026-03-05)

- PreferenceTest now renders title and description from module config
- Replaced auto-advance (`setTimeout 500ms`) with explicit "Continue" button in PreferenceTest
- Added "Select this image" button inside PreferenceTest zoom lightbox
- Extracted 5 hardcoded Spanish strings to i18n (`preferenceTest.*` keys in es.json + en.json)
- Removed debug/mock text visible in production
- Removed 3 redundant hardcoded hint texts from CognitiveTaskRenderer (LinearScale, SingleChoice, PreferenceTest)
- ChoiceQuestion now receives `onComplete` for both single and multiple choice

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
