## v0.61.2 — Fix CES sentiment zones inverted in results (2026-04-24)

### backend
- **CES zones corrected.** `cesPercentage`, `calculateCESPercentage`, and `generateMonthlyMetricsData` now treat high scores as positive (easy) and low scores as negative (hard). Previously inverted — scores 4-5 were counted as negative.

### research-frontend
- **CES zones aligned with participant-frontend.** `getCESZones()` now returns `positive: [4, 5]`, `negative: [1, 2]` for scale 1-5 (and equivalent for 1-7, 1-10). Fixes results bars showing green for hard experiences and red for easy ones. CPV corrected in cascade.

---

## v0.61.1 — Phase 3 polish: Insights upload in view, benchmark editor, CSV export, configurable LLM (2026-04-21)

### backend
- **Configurable LLM model.** `OPENAI_MODEL` env var controls which model is used for text analysis (default `gpt-4o`).

### research-frontend
- **Insights Finding upload in view.** File upload button ("Add files") in `InsightsFindingView` header. Empty state shows upload CTA. Uses `documentParser` for client-side CSV/TXT/XLSX/DOCX/PDF parsing + `mediaService.uploadFile()`. Auto-triggers LLM analysis.
- **Benchmark research selector.** "Edit selection" button in `ClientsBenchmarkView` opens inline editor with checkboxes for all researches with Eye Tracking. Add/remove researches live — comparative table refreshes immediately.
- **Benchmark CSV export.** "Export CSV" button on comparative table downloads Research/Module/AOI/Attention/Fixations/Participants.

---

## v0.61.0 — Phase 3 analytics: LLM text analysis, ET heatmap settings, video prediction, sentiment filter (2026-04-21)

### backend
- **Text analysis service.** New `POST/GET /analytics/research/:id/text-analysis/:moduleId` endpoints. Reuses GPT-4o pipeline from Insights Finding to generate themes, keywords, and sentiment summaries for any text responses (VOC, Short/Long Text). Results cached in `research.config.textAnalysis.<moduleId>`. Fire-and-forget with polling.

### research-frontend
- **VOCComments themes & keywords.** Replaced placeholder tabs with real content: theme cards with magnitude bars and sentiment badges, keyword tag cloud with frequency table. "Analyze with AI" button triggers LLM analysis; cached results load on mount. Applied to SmartVOC VOC and Cognitive Short/Long Text.
- **ET heatmap settings modal.** New `HeatmapSettingsModal` with detail presets (Smooth/Balanced/Detailed), blur/opacity/threshold sliders, and live preview. Gear button in `StimulusCard` when heatmap tab is active.
- **Video prediction.** `AttentionPredictionView` now accepts video uploads (mp4/webm/mov). Client-side frame extraction via `<video>` + `<canvas>`, sequential upload and TranSalNet prediction per frame. `VideoFrameScrubber` shows side-by-side original/heatmap with frame scrubber synced to video timestamp.
- **Sentiment filter.** New checkbox group (Positive/Negative/Neutral/Indeterminate) in Filters sidebar. Applied to SmartVOC VOC comments and Cognitive text responses.
- **`mediaService.uploadFile()`.** Convenience method for programmatic file uploads (presigned URL → PUT → save metadata).

### participant-frontend
- **Fix: IAT modules stuck after completion.** IAT structure components (`target-*-name`, `criteria`) are researcher config with `required: true`, but participants only save `iat-trials`. Validation now bypasses generic required-field check for IAT modules, allowing auto-advance after completion.

---

## v0.60.7 — Fix choice results bars empty when completion filter active (2026-04-20)

### backend
- **`rawKey` in choice counts.** `getChoiceResponses` now includes `rawKey` (the raw option ID) alongside the display label in each `choiceCounts` entry. Enables frontend to correctly match filtered responses to their choice labels.

### research-frontend
- **Choice bar fix.** `ChoiceResultsWrapper` filter recalculation now uses `rawKey` to look up counts instead of the display label. Previously, responses stored option IDs (`"choice-1"`) but the lookup used labels (`"Muy satisfecho"`), causing all bars to render at 0% when any filter was active.

---

## v0.60.6 — Eye tracking calibration improvements, results coordinate fix (2026-04-19)

### participant-frontend
- **16-point calibration grid.** Expanded from 9 (3×3) to 16 (4×4) points for denser IDW correction field.
- **Stricter validation.** RMSE threshold lowered from 120px to 100px — poor calibrations prompt re-calibration.
- **Micro-recalibration every 15s** (was 20s), weight increased to 0.85 (was 0.75) — drift corrected faster.
- **I-DT tighter dispersion.** Fixation detection threshold lowered from 85px to 70px — more precise fixation centroids.
- **Blink-to-open filter reset.** One-Euro filter resets on closed→open transition so post-blink frames aren't pulled toward drifted position.
- **Hybrid lab gaze dot.** Live red dot on stimulus via direct DOM manipulation (no React re-render). Reads `gazePosRef` from blaze hook (frame-rate updates).

### research-frontend
- **ET coordinate coherence.** `HeatmapRenderer` gains `coordSystem` prop (`pixel`/`percent`/`normalized`) — ET fixations now correctly mapped as image pixels instead of auto-detected as percentage. `ScanpathOverlay` uses image `naturalWidth`/`naturalHeight` for viewBox. `FirstLookOverlay` also passes `coordSystem="pixel"`.
- **CustomSelect scroll fix.** Dropdown no longer closes when scrolling inside its option list (`onWheel` stopPropagation + `data-custom-select-dropdown` scroll exclusion).
- **ClientsPage.** Replaced empty scatter chart with real stacked bar chart (researches by month/status). Removed emoji icons, placeholder sections, and fake progress bars. Added client stats card.
- **ResearchHistoryPage.** Replaced empty line chart with stacked bar chart. Added client stats with status counts and research type badges.

---

## v0.60.5 — Attention Prediction: synchronous predict, AOI persistence, settings cleanup (2026-04-19)

Renumbered from v0.60.4.

---

## v0.60.4 — Attention Prediction: synchronous predict, AOI persistence, settings cleanup (2026-04-17)

### backend
- **Synchronous prediction endpoint.** `POST /attention-prediction/research/:id/predict/:mediaId` now awaits TranSalNet inference and returns result directly instead of fire-and-forget + polling. Status endpoint removed.
- **Error state persistence.** `runPredictionAsync` saves `predictionError`/`predictionErrorAt` to the stimulus config on failure (previously only logged to console). Module prediction already had this — now both paths are consistent.
- **Threshold default unified.** Service, controller, and postprocess all default to `0.3` (was inconsistent: 0.5/0.3/0.3).
- **Console.logs removed.** 10 debug/trace logs removed from controller and service.

### research-frontend
- **Polling removed.** `AttentionPredictionView` uses simple `await` instead of `setInterval` polling. Error state displayed in red banner with Retry button.
- **Upload always visible.** File upload component shown below the analysis card (was hidden when a stimulus existed). Label changes to "Add more images" when stimuli exist.
- **AOI persistence.** Areas of Interest now saved to `stimulus.aois` in research settings. Loaded on mount, persisted on add/remove. Survives tab switches and page reloads.
- **Settings modal cleaned up.** Removed non-functional Composition tab (analysisWindow, framesInFixation, dispersion, mergeRange controls were UI-only). Renamed misleading "Prediction model" selector to "Detail preset" with Smooth/Balanced/Detailed buttons. Individual slider changes mark preset as "Custom".
- **Debug console.log removed** from `ResearchBuilderSidebar`.

---

## v0.60.3 — face-api.js emotion recognition for Eye Tracking (2026-04-17)

### participant-frontend
- **face-api.js integration.** Replaced manual FACS heuristics (AU extraction → threshold-based classification) with face-api.js neural model (TinyFaceDetector + FaceExpressionNet). Detects 7 Ekman emotions (joy, sadness, surprise, anger, disgust, fear, neutral) with trained model confidence scores.
- **New hook `useFaceApiEmotions`.** Loads models from `/models/` (~511KB), samples expressions via RAF at 20fps during viewing phase. Produces `EmotionSample[]` identical to previous format — backend and research-frontend unchanged.
- **Models served statically.** `tiny_face_detector` + `face_expression_model` in `public/models/`.

---

## v0.60.2 — IAT analytics fixes and builder improvements (2026-04-17)

### backend
- **Skip D-score for Comparing Attribute.** `comparing_attribute` is pure RT — no correct/incorrect concept. `participantData`, `dScore`, and `errorAnalysis` now return `undefined` for this paradigm.
- **Type safety: `IATAttribute.targetId`.** Added `targetId?: string` to `IATAttribute` interface. Removed `(attr as any).targetId` cast and dead `imageUrl` field.

### research-frontend
- **Conditional analytics cards.** D-score, Effect Size, and Error Analysis cards hidden for `comparing_attribute` results (only RT chart shown).
- **Error combinations table.** Removed top-5 limit — all combinations shown with scrollable container.
- **IATPreviewModal light theme.** Converted from dark gray-900 to light theme matching design system (white bg, gray-50 header, slate-50 preview area).
- **Builder validation.** Amber warning in `IATCriteriaEditor` when Attribute Testing criteria have no target assigned.
- **Frontend `IATAttribute` aligned.** Replaced dead `imageUrl` with `targetId` in frontend type definition.

---

## v0.60.1 — Fix Share Research drawer not showing invite input (2026-04-17)

### backend
- **Fix: `created_by` missing from research queries.** `getById` and `list` SELECTs did not include `r.created_by`. The frontend's `isOwner` check always evaluated to `false`, hiding the email input in the Share Research drawer. Added `r.created_by` to both queries.

---

## v0.60.0 — Research collaborators, completion filter, eye tracking improvements (2026-04-16)

### backend
- **Research collaborators:** `POST/GET/DELETE /research/:id/collaborators` — share a specific research with another user by email. `buildOwnershipClause` now includes collaborator access (`OR id IN (SELECT research_id FROM research_collaborators WHERE user_id = ?)`).
- **Completion filter support:** Existing `GET /research/:id/participants/status` endpoint already returns per-participant `progress` (0-100%). Results pages now consume this data for filtering.
- **Soft AOI intersection:** AOI metrics use Gaussian contribution instead of binary point-in-rect. Fixations near AOI borders contribute proportionally (σ = 35% of AOI's larger dimension). Inside = 1.0, near edge outside = 0.3-0.8, far = excluded.
- **Eye tracking quality gate:** Participants classified as `good`, `fair`, or `low` based on `calibrationRmsePx` (>200px = low), `integrityScore` (<0.4 = low), and `fixationCount` (<3 = low). Low-quality participants excluded from aggregate heatmap, zone mass, and AOI calculations. `qualitySummary` added to ET response.

### research-frontend
- **Share Research drawer:** `ShareResearchDrawer` component — add collaborators by email, list existing collaborators with remove button. "Share Research" button in builder sidebar.
- **Completion % filter:** Slider "Min. completion" (0-100%, step 5%) added to Filters sidebar across all 5 result tabs (SmartVOC, Cognitive Tasks, Screener, IAT, Eye Tracking). Combines with demographic and user ID filters.
- **Redundant header removed:** Removed duplicate "Cognitive Tasks Results" gray card in Cognitive Task results (tab already provides context).
- **Triple scroll fix:** Removed nested `max-h overflow-y-auto` from CognitiveTaskResults and SmartVOCResults. Single page-level scroll only. Filter sidebar uses `max-h-[calc(100vh-8rem)]` instead of fixed `700px`.
- **ET quality indicator:** Amber banner shows quality gate summary when low-quality participants are excluded from results.

### participant-frontend
- **Micro-recalibration:** During eye tracking viewing phase, a nearly invisible dot (4px, 12% opacity) appears every 45s at edge/corner positions. System captures ~8 gaze samples over 600ms, computes drift vs known position, and updates IDW correction field with weighted residual. Corrects calibration drift without participant awareness.

### database
- Migration 024: `research_collaborators` table with `research_id`, `user_id`, `permission` (viewer/editor), `invited_by`, unique constraint, cascade deletes.

---

## v0.59.9 — Invited viewers list in Invite Viewer drawer (2026-04-15)

### backend
- **Viewers endpoint:** `GET /users/viewers` lists users with role `viewer`, including email, name, and invitation date.

### research-frontend
- **Invited viewers section:** The Invite Viewer drawer now shows a list of previously invited viewers with email and date. Refreshes automatically after sending new invitations.

---

## v0.59.8 — Research detail drawer with tabs (2026-04-15)

### backend
- **Detail endpoint:** `GET /research/:id/detail` returns research info, stages, modules, response stats, and chronological timeline via 4 parallel queries.

### research-frontend
- **Detail Drawer tabs:** Overview (info + stats), Stages (accordion with nested modules), Timeline (chronological events with icons).
- Rows in Research Tracking are clickable to open the detail drawer.

---

## v0.59.6 — Fix research activity JOIN column (2026-04-15)

### backend
- **Activity query fix:** Changed `r.user_id` → `r.created_by` in both `listAllResearchActivity` and `listResearchActivity` queries. The `researches` table uses `created_by`, not `user_id`.

---

## v0.59.5 — Research activity derived from existing tables (2026-04-15)

### backend
- **Activity service rewrite:** Research tracking now derives data from existing tables (`researches`, `stages`, `modules`, `responses`, `users`) instead of requiring a dedicated `research_activity_logs` table.
- **Controller cleanup:** Removed all `logResearchActivity()` write calls — activity is read-only, computed on demand.
- **Deploy workflow:** Added Passenger restart step (`touch tmp/restart.txt`) so new code takes effect after deploy.

### database
- Removed migration 014 (`research_activity_logs`) — no longer needed.

---

## v0.59.4 — Research activity endpoint registration fix (2026-04-15)

### backend
- **Config endpoints:** Added `activity` and `getAllActivity` routes to the dynamic config so the frontend can resolve them through service discovery.

### research-frontend
- **Service discovery for activity endpoints:** `getActivity()` and `getAllActivity()` now use `configService.getEndpoint()` instead of hardcoded paths.

---

## v0.59.3 — Research tracking and viewer invite workflow (2026-04-15)

### research-frontend
- **Global Tracking page:** New `/research-tracking` view with column-level filters for research, technique, researcher, action, and summary.
- **Scoped loading/error states:** Skeleton/error rendering limited to the data panel only.
- **Invite Viewer drawer:** Accepts multiple emails, keeps failed invitations for retry.
- **Research list actions:** Invite Viewer and Create Research on the same row as cards/table toggle.

---

## v0.59.2 — Backend deploy workflow hardening (2026-04-15)

### docs
- **Backend deploy workflow:** `deploy-backend-cpanel.yml` now validates `CPANEL_SSH_HOST`, retries `ssh-keyscan` up to 3 times, and prints a clearer failure message when the cPanel host key cannot be fetched.

---

## v0.59.1 — Public progress resilience, Open link action, SSE CORS fix (2026-04-15)

### backend
- **SSE CORS fix:** `server-cpanel` now allows `Cache-Control` in CORS preflight and responds explicitly to `OPTIONS /api/monitor/events/:researchId`. Fixes blocked monitoring connections from `http://localhost:12800`.
- **cPanel runtime aligned:** The compiled `server-cpanel.js` was updated alongside the TypeScript source so the deployed cPanel server uses the same CORS headers.

### research-frontend
- **Public progress response normalization:** `PublicProgressPage` now accepts wrapped or serialized payload shapes before reading `metrics` and `participants`.
- **Open link action:** View Progress now includes an `Open link` button to open the public progress page directly in a new tab.
- **Print-ready public progress:** The public progress page supports `?print=1` and waits for data/fonts before calling `window.print()`.

---

## v0.59.0 — Scalability, Nav Flow fix, Share Progress, Results optimization (2026-04-15)

### backend
- **Batch INSERT responses:** `saveParticipantResponses` now uses a single batch INSERT instead of N individual INSERTs + N SELECTs. Reduces queries per submission from ~47 to ~5.
- **Composite DB index:** `idx_responses_research_module_component` on `(research_id, module_id, component_id)` for all analytics queries.
- **Cache hot paths:** `getResearchConfiguration` (60s TTL) and `getParticipantCount` (10s TTL) cached to avoid repeated queries during submission bursts.
- **Connection pool:** Raised from 10 to 20 connections per pool.
- **Cognitive tasks payload optimization:** Modules with dedicated endpoints (Nav Flow, Preference Test, Choice, Scale, Ranking) return COUNT only — no full response data. Reduces payload ~70%.
- **Nav Flow analytics:** Strip `clickSequence` from per-participant responses (data lives in `heatmapData` with `participantId`). Reduces Nav Flow payload ~70%.
- **Batch COUNT:** `/cognitive-tasks` uses single grouped COUNT query instead of N individual queries.
- **Share progress endpoint:** `POST /research/:id/share-progress` sends branded email with progress link to multiple recipients.
- **Public progress endpoint:** `GET /public/research/:id/progress` returns metrics + participants without auth.
- **Share progress URL fix:** Fallback share links now point to `https://emotio.cx/research/progress/:id`, matching the production `research-frontend` base path.
- **Progress research name:** Public progress metrics now include the research name for the public header.

### participant-frontend
- **Nav Flow save fix:** Single-image modules now correctly include the triggering click in saved response. Previously, React state batching caused `clickSequence: []` because `setAllClicks` hadn't committed when `saveNavigationResponse` ran.

### research-frontend
- **Results request dedup:** `NavigationFlowResultsWrapper` and `PreferenceTestResultsWrapper` use `useResearch()` (React Query) instead of individual `getById` calls. 10 calls → 1.
- **Media URL cache:** `getMediaUrlByS3Key` caches results in-memory for 5 minutes.
- **Nav Flow AOI computation:** Uses `heatmapData` (with `participantId`) instead of per-response `clickSequence`.
- **Participant count fix:** Cognitive Tasks header shows unique participant count instead of total response rows (was showing ~864 instead of ~52).
- **Progress filter:** ParticipantsTable has minimum progress slider (0-100%) to filter by completion level.
- **Share Progress:** "Send Link" button opens Drawer to add email recipients. "Copy link" copies public URL. Public page at `/progress/:id` shows read-only progress.
- **Progress share link fix:** The copied public link now includes the `/research` prefix in production, avoiding invalid root-level URLs.
- **Public progress header:** The title now appends the research name after "Research Progress".

### docs
- `scalability-audit-results-page.md` — Results page scalability analysis and fixes.
- `scalability-audit-participant.md` — Participant submission capacity analysis.

### database
- Migration 022: composite index on responses table.

---

## v0.58.0 — Phase 3: FACS Emotion Recognition, Attention Prediction, Advanced Analytics (2026-04-14)

### participant-frontend
- **FACS Emotion Recognition:** Parallel MediaPipe FaceLandmarker (`useFaceLandmarks`) runs alongside BlazeGaze during viewing phase. Extracts 9 Action Units from 468 landmarks, classifies Ekman emotions (joy, sadness, surprise, anger, disgust, fear, neutral). Emotion samples stored in response alongside gaze data. Client-side only — zero images transmitted.
- **Video stimulus support:** `EyeTrackingRenderer` detects video files, renders `<video>` with muted autoplay, tracks gaze with `videoTime` sync. Natural dimensions from `videoWidth/Height`.
- **New files:** `facsClassifier.ts` (AU extraction + emotion mapping + aggregation), `useFaceLandmarks.ts` (parallel FaceLandmarker hook).

### backend
- **FACS emotion aggregation:** `computeEmotionMetrics()` — distribution, dominant emotion, per-participant breakdown, 1s-bucket timeline. Returned in Eye Tracking results when emotion recognition enabled.
- **Greenwald D-score (IAT):** `computeGreenwaldDScore()` — proper algorithm (filter >10s, pooled SD). Per-participant D-scores + aggregate with 95% CI. Effect classification: none/slight/moderate/strong.
- **IAT error analysis:** `computeIATErrorAnalysis()` — error rates by phase (practice/test) and by target×attribute combination.
- **Attention prediction for modules:** New endpoints `POST/GET /attention-prediction/research/:id/module/:moduleId/predict|status`. Supports single image (Eye Tracking) and multi-image with `imageIndex` (Navigation Flow). Stores `predictionHeatmap` or `predictionHeatmaps` in module config.
- **Eye Tracking AOI enhancements:** TTFF (Time To First Fixation), notice rate (% who looked), dominant emotion per AOI (temporal join with emotion samples ±100ms).
- **Sequence analysis:** Per-participant AOI visit order, transition probability matrix, included when ≥2 AOIs exist.
- **Video gaze timeline:** Aggregates `gazeTimeline` with `videoTime` from video stimulus responses.

### research-frontend
- **Eye Tracking results tabs:** Heat map, Scan Path (numbered fixations with cool→warm gradient, per-participant selector), First Look (first N fixations heatmap, configurable), Transparency (blur/reveal canvas mask), Emotions (distribution bars, timeline strip, per-participant table), Prediction (TranSalNet saliency, run/re-run button with polling), Video Gaze (synced gaze overlay on video playback), Sequence (transition matrix heatmap, per-participant sequences, most common patterns).
- **AOI row metrics:** TTFF (purple), notice rate (green), dominant emotion badge (color-coded).
- **IAT D-score card:** Aggregate D-score with effect badge, scale bar (-1.5 to +1.5), CI, expandable per-participant table sorted by |D|.
- **IAT effect size histogram:** D-score distribution across 7 buckets (Strong- to Strong+).
- **IAT error analysis card:** Expandable — phase error rates (color-coded), top 5 highest error combinations table.
- **Navigation Flow prediction tab:** "Prediction" tab per step with `HeatmapRenderer` saliency overlay. Per-image predictions from `predictionHeatmaps` in module config.
- **Advanced filters on all results:** `useResultsFilter` shared hook extracts duplicated demographic filtering. Filters sidebar added to Eye Tracking, Implicit Association, and Screener results (SmartVOC and Cognitive Tasks already had them).
- **New files:** `useResultsFilter.ts` (shared demographic filter hook).

### docs
- `PHASE_3_PLAN.md` — 5-feature plan (FACS, Attention Prediction ET/Nav Flow, Video, Filters).
- `COOLTOOL_GAPS.md` — 10 CoolTool parity gaps documented and implemented.

---

## v0.57.2 — Eye Tracking zone heatmap, research table improvements (2026-04-14)

### research-frontend
- **Research list:** Cards show creator name and last update. Table adds Researcher and Updated columns, responsive with `overflow-x-auto`.
- **Eye Tracking Results:** 3x3 zone heatmap overlay (green→yellow→red), responsive image (`max-h-[60vh]`), removed hardcoded header. Supports `zoneMass` from backend and falls back to point-based heatmap.
- **HeatmapRenderer:** Supports absolute image pixel coordinates alongside percentage and normalized formats.
- **Results page scroll fix.** TrustFlowChart height fix. SSE closes on error instead of retrying.

### participant-frontend
- **Eye Tracking gaze pipeline:** Aligned with `/eye-tracking-hybrid` — RAF loop (not setInterval), `gazePosRef` cache, `Date.now()` timestamps, `expandGazeWithMinimumJerkGapFill` with synthetic point penalty. Produces accurate zone-based results.
- **Eye Tracking calibration:** Blurred stimulus image (blur 12px, opacity 0.6) during calibration/validation. Click anywhere to advance (user looks at dot, not cursor). Uses `hybridImagePercentToBlazeNorm` for correct BlazeGaze coordinates.
- **Eye Tracking onComplete fix:** Timer uses ref to survive re-renders. Viewing rect snapshotted before complete phase for accurate coordinate mapping.
- **Eye Tracking preview:** Skips validation phase (no webcam data).
- **Eye Tracking viewing background:** Light gradient instead of black, so the image blends naturally without visual cut.
- **NavigationFlow background:** Light gradient instead of black. Text and progress bar adjusted for light theme.
- **Welcome Screen:** `whitespace-pre-line` for line breaks in message text.
- **Checkbox labels:** Shortened for uniform visual alignment.

### backend
- **CORS:** `Cache-Control` added to allowed headers.
- **Eye Tracking analytics:** `stimulusUrl` parsed from JSON array. `zoneMass` aggregated from responses.

---

## v0.57.1 — Configurable language switcher (2026-04-13)

### research-frontend
- **Language switch toggle:** New checkbox in Link Configuration — "Allow respondents to switch survey language." Disabled by default.

### participant-frontend
- **Conditional language selector:** The ES/EN language button is now hidden unless the researcher enables it. Fixes mobile overlap where the button covered instruction text.
- **NavigationFlow preview hint hidden on mobile:** "Press Esc or click dark area to skip" only shows on desktop — irrelevant on touch devices.

---

## v0.57.0 — Conditionality overhaul, Navigation Flow fix, question numbering (2026-04-13)

### research-frontend
- **Screening question toggle:** `ScreenerQuestionDrawer` uses green/orange toggle (Qualify/Disqualify) instead of dropdown, matching demographic drawer pattern.
- **Screening option padding fix:** Editing existing questions no longer pads to 3 options — shows exactly the saved options.
- **Conditionality: renamed demographics:** Modal reads `questionLabel` from config, so renamed questions display correctly.
- **Conditionality: custom screening questions:** `customQuestion_*` entries show their `questionLabel` instead of raw key ID.
- **Conditionality: study question detection:** Also matches by component type (`radio`, `checkbox-list`, `option-list`). Parses JSON choice values to show readable labels.
- **Conditionality: "Link with module":** New third condition source. Links visibility between modules — "show this question only if the linked module is also shown." Dropdown lists all study modules (excluding Welcome/ThankYou/ResearchConfig) with global numbering.
- **Global order index:** `studyModulesWithOptions` and `linkableModules` use global ordering (`stage.order_index × 10000 + mod.order_index`) for correct cross-stage filtering.
- **Question numbering in builder:** Module cards display ordinal number matching the conditionality dropdown and results page.
- **Reorder guard:** `handleMoveModule` blocks reordering when unsaved modules (local- prefix) exist, showing "Save all modules before reordering."

### participant-frontend
- **Navigation Flow stacking fix:** Consecutive Navigation Flows no longer overlap. All renderers in `DynamicStep` receive `key={module.id}`, forcing full re-mount and state reset when switching modules.
- **Eye Tracking fullscreen:** Calibration, validation, and viewing phases render fullscreen with black background (`fixed inset-0 bg-black`), matching NavigationFlow pattern.
- **Linked module evaluation:** `useNavigation` evaluates linked module conditions recursively with cycle protection.

---

## v0.56.9 — IAT per-participant analytics, XLSX export, preference intensity (2026-04-12)

### backend
- **IAT participant data:** `getImplicitAssociationResults` now returns per-participant data: mean RT by criterion×target combination, accuracy, quality flag (`good`/`fast_responses`/`low_accuracy`/`insufficient_data`), and respondent segmentation (fastest target per criterion).
- **Quality heuristics:** RT < 300ms = fast trial. >30% fast trials = `fast_responses`. Accuracy < 60% = `low_accuracy`. < 5 test trials = `insufficient_data`.

### research-frontend
- **XLSX export enriched:** Export now includes IAT columns per participant: Quality, Accuracy, RT per criterion×target combination (ms), and Segmentation (strongest associated target per criterion).

### participant-frontend
- **Preference intensity:** After selecting an image in Preference Test, participant chooses intensity: "Slight" or "Strong". Saved as `preferenceIntensity` in response data. Backward compatible (defaults to `strong` if not set).

---

## v0.56.8 — NavigationFlow crash fix, ErrorBoundary, Screener validation, AOI persistence (2026-04-12)

### participant-frontend
- **NavigationFlow crash fix:** `currentImage` could be undefined when index exceeded array length, crashing on `.hitZones` access. Now falls back to last image with optional chaining.
- **Blue continue button:** "Tap to continue" on NavigationFlow completion overlay is now a styled blue button consistent with the design system, instead of faint text.
- **ErrorBoundary:** Global error boundary wraps `<App />` in `main.tsx`. Catches render crashes and shows a friendly error screen with "Reload page" button instead of a white screen.
- **Screener validation fix:** Added dedicated Screener handling in `useValidation.ts` and `validation.ts`. Screener saves response as `componentId='choice'` which was not matched by the generic component validation loop.
- **NavigationFlow completion status fix:** Removed `useEffect` that overwrote `completed: false` with `true` for failed flows (3 misses).

### research-frontend
- **AOI persistence fix:** Eye Tracking modules created before migration 020 lacked the `aois` component in their config. AOIs are now injected as virtual components during save (same pattern as `test-title`).
- **Screening binary validation:** `ScreenerQuestionDrawer` now allows 1 qualifying option (was 2), enabling binary Yes/No screening questions.

---

## v0.56.7 — Research page: table/cards toggle, inline rename, duplicate, explicit Open (2026-04-12)

### research-frontend
- **View toggle on /research:** Cards (default) and Table views with switcher. Table shows Name, Status, Type, Created, Technique, and Actions columns.
- **No auto-navigate:** Cards and table rows no longer navigate on click. Explicit "Open" button in actions.
- **Inline rename:** Double-click research name in cards or table to edit inline. Enter/blur saves, Escape cancels.
- **Duplicate with name:** Duplicate button opens modal with editable name pre-filled as "{original} - Copy". Available in both views.

---

## v0.56.6 — Rename research on duplicate and inline in builder (2026-04-12)

### research-frontend
- **Duplicate with custom name:** Clicking Duplicate in Dashboard now opens a modal with the name pre-filled as "{original} - Copy". Researcher can edit before confirming. Enter to confirm, Escape to cancel.
- **Inline rename in builder:** Click the research name in the sidebar to edit inline. Enter or blur saves, Escape cancels. Uses `PUT /research/:id` with `{ name }`.

### backend
- **Duplicate accepts custom name:** `POST /research/:id/duplicate` now accepts optional `{ name }` in body. Falls back to `"{original} - Copy"` if omitted.

---

## v0.56.5 — Fix screening binary validation, Navigation Flow stuck overlay (2026-04-12)

### research-frontend
- **Screening binary validation fix:** `ScreenerQuestionDrawer` now allows saving with 1 qualifying option (was 2). Enables binary questions like "Yes (Qualify) / No (Disqualify)".

### participant-frontend
- **Navigation Flow completion overlay fix:** Overlay now clickable as safety net ("Tap to continue" label). Prevents participants from getting stuck if `onComplete` doesn't unmount the component.
- **i18n:** Added `tapToContinue` key to EN/ES locales.

---

## v0.56.4 — Implicit Association Phase 3: flowchart visual, multi-lang instructions (2026-04-12)

### research-frontend
- **IAT flowchart:** Reactive visual diagram replaces static notes in the builder sidebar. Shows test phases, target/criteria counts, timing, and response branches using live config data. Different layout per paradigm (Attribute Testing, Comparing Attribute, Objects Comparing).
- **Multi-lang instructions:** `MultiLangInput` component with EN/ES tabs for `exercise-instructions` and `test-instructions` fields. Value stored as JSON `{"en":"...","es":"..."}`. Green dot indicator when both languages have content. Backward compatible with plain strings.
- **New files:** `IATFlowchart.tsx`, `MultiLangInput.tsx`.

### participant-frontend
- **Multi-lang resolution:** `resolveMultiLang()` utility picks the correct language string from multi-lang JSON values using `i18n.language`. Falls back to EN → ES → raw string for backward compatibility.
- **New file:** `utils/multiLang.ts`.

---

## v0.56.3 — Implicit Association Phase 2: IAT preview modal (2026-04-12)

### research-frontend
- **IAT preview modal:** New "Preview" button in the IAT module card header. Opens a dark-themed modal simulating the test flow using the researcher's live config (targets, criteria, priming time, dimensions, instructions). Two modes: "Step through" (manual) and "Auto play" (timed). Progress dots in footer. Builds trial sequence per paradigm.
- **New file:** `IATPreviewModal.tsx` — standalone preview component with trial builder logic for all 3 IAT paradigms.

---

## v0.56.2 — Implicit Association Phase 2: dynamic targets (2026-04-12)

### research-frontend
- **Dynamic targets/objects:** Researchers can now add and remove targets (or objects in Comparing Attribute) from the IAT builder. "Add target/object" button below the grid, trash icon per card. Limits per paradigm: Attribute Testing 2-5, Comparing Attribute 1-5, Objects Comparing 2-7. New components are created with sequential IDs (`target-N-name`, `target-N-image`).

### backend
- **Dynamic target extraction:** `extractIATConfig` loops scan up to index 20 with `continue` instead of hardcoded 5. Supports any number of researcher-added targets.

### participant-frontend
- **Dynamic target extraction:** All 3 `extractConfig` loops (Attribute Testing, Comparing Attribute, Objects Comparing) scan up to index 20 with `continue`.

---

## v0.56.1 — Implicit Association Phase 1: hide criteria, test title, fix testType swap (2026-04-12)

### research-frontend
- **Hide criteria toggle:** Each criterion in the IAT builder now has an Eye/EyeOff button. Hidden criteria stay in the config but are excluded from the participant test and analytics. Row renders with reduced opacity when hidden.
- **Internal test title:** New "Test title" input at the top of IAT modules. Internal only (not shown to participants), appears as a label above the chart in results. Saved as a virtual `test-title` component with `hidden: true` in root (excluded from `visibleComponents`, read from `componentValues` directly).
- **Results testTitle:** `IATModuleCard` renders the test title as a subtle uppercase label above the chart when present.

### backend
- **Fix `detectIATTestType` swap:** "Comparing Attribute" now correctly returns `comparing_attribute` (was `objects_comparing`) and "Objects Comparing" returns `objects_comparing` (was `comparing_attribute`). `extractIATConfig` branches updated to match. Results charts now map to the correct paradigm.
- **Hidden criteria filter:** `extractIATConfig` skips criteria with `hidden: true` when building the attributes list.
- **Test title in analytics:** `getImplicitAssociationResults` extracts the `test-title` component and includes it as `testTitle` in the response.

### participant-frontend
- **Hidden criteria filter:** `parseCriteriaRankingList` skips criteria items with `hidden: true` so they never appear in the participant test.

---

## v0.56.0 — Duplicate research from Dashboard (2026-04-12)

### backend
- **Duplicate endpoint:** `POST /research/:id/duplicate` clones a research with all its stages, modules, questions, demographic quotas, and media files. The clone is created as `draft` with name `"{original} - Copy"`. Responses and participants are NOT copied. Quota counters reset to 0.
- **Media filesystem copy:** Cloned media files are copied on disk (`fs.copyFileSync`) with new paths under the new research ID. Non-fatal on failure (record still created).
- **Conditionality remap:** `sourceModuleId` references in `conditionalityConfig` are remapped from old to new module IDs.
- **Stimuli mediaId remap:** For Attention Prediction / Insights Finding, `mediaId` references in `config.stimuli` are updated to point to the cloned media records.

### research-frontend
- **Duplicate button:** Copy icon (lucide `Copy`) in Dashboard table Actions column, next to Delete. Blue hover state. Calls `POST /research/:id/duplicate`, invalidates list cache, shows success/error toast.
- **New files:** None. Changes in `research.service.ts` (method), `useResearchQuery.ts` (hook), `DashboardPage.tsx` (button + handler).

---

## v0.55.1 — Fix custom screening questions persistence (2026-04-12)

### research-frontend
- **Custom screening questions round-trip fix:** `transformResearchConfigComponentValues` had a hardcoded list of demographic keys and silently dropped `customQuestion_*` entries. Added `key.startsWith('customQuestion_')` check so custom screening questions survive the flatten→reconstruct cycle used during save and reload.
- **Screener drawer: include all options on save:** `ScreenerQuestionDrawer.handleSave` was only passing qualifying options to the parent. Disqualifying options were lost from `validValues`, breaking the backend disqualification check. Now passes all options (qualifying + disqualifying) with correct `isQualified` flag.

---

## v0.55.0 — Draft persistence, unsaved changes indicator, i18n cleanup (2026-04-11)

### research-frontend
- **Draft persistence:** Unsaved module edits are now preserved when switching between stages. Zustand session-scoped store (`useModuleDraftStore`) captures `componentValues` and `components` per moduleId. `useModuleComponents` saves draft on navigate-away and restores on return. Only creates drafts when values actually differ from server data (no false "unsaved" markers from visiting a stage).
- **Pending drafts dropdown:** New `PendingDraftsDropdown` component in builder header, next to "Save Changes". Shows amber badge with count of modules with unsaved edits. Dropdown lists each module (name, stage, time ago) with individual Save buttons and "Save all". Saves directly to backend without navigating to the module.
- **Unsaved dot indicator:** Sidebar shows amber dot next to stages with pending drafts.
- **Draft cleanup:** Drafts are cleared after successful save (all three save paths: SmartVOC, collection, single module). All drafts cleared when switching to a different research.
- **Dashboard technique cards:** Replaced dynamic ResearchTypeCard with static technique cards (Eye Tracking, Attention Prediction, Implicit Priming Test, Cognitive Analysis) using icons from `src/assets/`. Cards use full table height with `flex-1`.
- **i18n: all demographic drawers in English.** Translated OptionsTab, QuotasTab, DemographicConfigModalBase, AgeConfigModal, CountryConfigModal, GenderConfigModal, EducationConfigModal, EmploymentStatusConfigModal, HouseholdIncomeConfigModal, DailyHoursOnlineConfigModal, TechnicalProficiencyConfigModal. Clasifica→Qualify, Desclasifica→Disqualify, etc.
- **Screening question drawer cleanup:** Removed Dynamic Quotas tab (irrelevant for screening questions) via `hideQuotasTab` prop. Validation changed to "at least two qualifying options". Removed all quota-related code from `CustomScreeningQuestionConfigModal`.
- **NaN fix:** `OptionsTab` percentage shows `0%` instead of `NaN%` when no options exist.
- **Insights Finding:** Comment column narrowed to `w-2/5`, analysis panel uses `flex-1` for responsive width. Mood column shows literal value (`indeterminate`) instead of `—`.

---

## v0.54.1 — Screener flow fix, DevSidebar & ResearchPage cleanup (2026-04-11)

### participant-frontend
- **Screener step ordering fix:** Demographics was hardcoded as second step, before Screener. Participants got disqualified at demographics without ever reaching the Screener. Now: `welcome → screener → demographics → rest → thank-you`. Screener is a special step like welcome and thank-you.
- **Screener real-time disqualification:** `ScreenerChoiceOption` now preserves `eligibility` field from module config. When participant selects a "Disqualify" choice, they are blocked immediately (backlink redirect or restriction screen). Previously, Screener choices were passive — only categorized in analytics.
- **DevSidebar rewrite:** Extracted SVG icons as components, moved helpers outside render (`formatDuration`, `getDisplayName`, `getModuleGroup`). Replaced mutable `globalIndex` with `useMemo`+`flatItems`. Replaced `document.querySelector` with `useRef`. Removed dead `MOCK_MODULES` import and unreachable `'screener'` group.
- **ResearchPage extraction:** Moved 9 utility functions (400+ lines) to `utils/researchPageHelpers.ts`. DRY'd `isModuleConfigured` with shared `hasValidFileUpload()`. Moved `normalizeModule` from inside useEffect to standalone function. Removed 12 dead "Removed excessive logging" comments. File reduced from 1425 → 990 lines.

### backend
- **Disqualification logging:** `checkDisqualifications` now logs the exact demographic key, participant answer, and matching disqualification value on block.

---

## v0.54.0 — Design system alignment & dashboard table fix (2026-04-11)

### research-frontend
- **Login aligned to design system:** AuthLayout background → `#F1F5F9` (surface-app). Card: removed decorative shadow, border → semi-transparent `black/[0.08]`. Text colors → slate palette (slate-900 heading, slate-500 subtitle). Error alert → red-800 text, red-300 border per spec. Google button border → semi-transparent with proper hover state.
- **Font import:** Added Plus Jakarta Sans (Google Fonts) in `index.css` to match tailwind config and design system spec.
- **Dashboard table overlap fix:** On 13" screens, ACTIONS column overlapped RESEARCHER. Researcher column now hidden below `xl` breakpoint (was `lg`). Column widths redistribute dynamically: Name 35%, Status/Created/Updated 15% each at `<xl`. Researcher cell content truncated at 180px for long names.

---

## v0.53.1 — Eye Tracking hybrid: upgrade to 3×3 grid (2026-04-11)

### participant-frontend
- **Grid upgrade:** `HYBRID_GRID_SIZE` from 2×2 (4 zones) to 3×3 (9 zones). New zones: center column and center row.
- **Retuned stretch/nudge parameters:** All values halved to prevent the center band from being compressed. Stretch X 1.12→1.06, Y 1.22→1.10, nudge factors ~50%, biases reduced proportionally.
- **Noise threshold:** Lowered from 10% to 5% (uniform distribution is ~11% per zone in 3×3).
- **UI:** Grid overlays and results breakdown updated to `grid-cols-3 grid-rows-3`.

---

## v0.53.0 — Custom screening questions & editable demographic labels (2026-04-11)

### research-frontend
- **Custom screening questions:** Researchers can add single-choice filtering questions in the Demographics section. Each question opens the same Drawer as predefined demographics (options with Qualify/Disqualify + quotas). Stored as `demographics.customQuestion_<id>` in Research Configuration.
- **Editable demographic labels:** All demographic config drawers now include a "Question label" field. Researchers can rename any question (e.g. "Ingresos Familiares" → "Ingresos Mensuales"). Label shows in parentheses next to the default name in the builder row.
- **New files:** `CustomScreeningQuestionConfigModal.tsx`.
- **Modified:** `DemographicConfigModalBase` (new `headerContent` prop), all 6 generic config modals (forward `headerContent`), `ResearchConfigurationModule` (custom questions section, label editor, label flush), `demographicsMapper` (handles `customQuestion_*` keys, `questionLabel` field).

### participant-frontend
- **Render custom screening questions:** `DemographicsStep` discovers `customQuestion_*` keys and renders them as selects using `questionLabel` as label.
- **Editable label override:** Predefined demographics also use `questionLabel` when set by the researcher.
- **Validation fix:** `ResearchPage` demographics validation now uses `Object.keys(demoConfig)` instead of hardcoded `DEMO_KEYS`, so custom questions are required before advancing.

### backend
- No changes needed. `checkDisqualifications` and `tryIncrementQuota` already iterate all demographics keys dynamically. Tables use `VARCHAR(50)`, not enums.

---

## v0.52.1 — Fix: Navigation Flow stuck on letterbox clicks (2026-04-11)

### participant-frontend
- **Fix:** Clicks on letterboxing bars (black areas around the image in `object-contain` mode) were silently ignored — no failed attempt counted, so the participant could never trigger the 3-miss auto-advance. Now clicks outside the rendered image area count as failed attempts when hitzones are defined.

---

## v0.42.6 — Lint cleanup: zero warnings across both frontends (2026-04-10)

### participant-frontend
- **Fix:** Replaced static EMA `smoothAlpha` option with `queryClient` export split (`queryClient.ts` separate from `QueryProvider.tsx`) to resolve `react-refresh/only-export-components` warning.
- **Fix:** Added `redirectTo` to 3 dependency arrays in `ResearchPage` (safe — stable `useCallback`).
- **Fix:** Suppressed `trackingEnabled` dep in `useLocationCollector` (derived from `config` already in deps).

### research-frontend
- **Fix:** Added `isFileBasedResearch` to Welcome/ThankYou auto-add effect deps in `ResearchBuilderSidebar`.
- **Fix:** Wrapped `stimuli` / `files` in `useMemo` in `AttentionPredictionView` and `InsightsFindingView` to stabilize logical expressions in callback deps.
- **Fix:** Replaced 3 `any` types with `RechartsLabelProps` interface in `ImplicitAssociationResults`.
- **Fix:** Removed unused `_onViewDetails` destructuring in `ParticipantsTable`.
- **Fix:** Added `options.length` to dropdown positioning effect in `CustomSelect`.
- **Fix:** Suppressed mount-only effects in `CreateResearchForm`, `ModuleTemplateSelectionModal`, `ClientsPage`, `ResearchHistoryPage` with documented `eslint-disable-next-line`.

---

## v0.42.5 — Eye Tracking: One-Euro filter, I-DT fixations, 9-point calibration (2026-04-10)

### participant-frontend
- **One-Euro adaptive filter** replaces static EMA in `useBlazeGaze`. Smooth during fixations, responsive during saccades. Configurable via `oneEuroMinCutoff` / `oneEuroBeta`.
- **I-DT fixation detection** (`fixationDetector.ts`): groups raw gaze samples into proper fixations with centroid, duration, and point count. Dispersion threshold 85px, min duration 120ms.
- **`EyeTrackingRenderer`** now saves detected fixations (I-DT) instead of raw gaze points. Response includes `fixationMethod`, `fixationCount`, pipeline `hybrid-idw-idt`.
- **Calibration expanded from 4 to 9 points** (3×3 grid covering corners, edges, and center) for a denser IDW residual field.
- **Post-calibration validation**: new `validating` phase shows an off-grid yellow dot. If gaze error exceeds 120px, offers "Re-calibrate" (up to 2 retries) or "Continue anyway".
- **i18n**: new keys for validation, re-calibration, desktop intro, and mobile check labels (ES/EN).

---

## v0.42.4 — Builder fixes: multi-upload and hitzone persistence (2026-04-10)

### research-frontend
- **Fix: File upload `multiple` default.** Navigation Flow and Preference Test templates were missing `multiple: true` in their `fileUpload` config, limiting uploads to a single image. Default changed from `false` to `true` for all `file-upload` components.
- **Fix: Hitzones lost on modal reopen.** `FileUploadAdvanced` sync key only compared `id`, `url`, and `s3Key` — it ignored `hitZones`. After drawing and saving hitzones, reopening the editor showed an empty canvas. Added hitzone count to the sync key so parent updates propagate correctly.

---

## v0.42.3 — Eye Tracking survey: hybrid IDW calibration (2026-04-10)

### participant-frontend
- **`EyeTrackingRenderer`:** Replaced 9-point viewport calibration with the same 4-point image-relative flow as `/eye-tracking-hybrid` (`HYBRID_IMAGE_CALIBRATION_POINTS`), IDW residual field (`hybridApplyCalibrationField` + `HYBRID_CALIBRATION_FIELD_STRENGTH`), and `hybridImagePercentToBlazeNorm` for `blaze.calibrate()`. BlazeGaze runs during calibration (for residuals) and viewing; `smoothAlpha` 0.38 aligned with hybrid lab.
- **Response payload:** `gazePipeline: 'hybrid-idw'` on desktop, optional `calibrationRmsePx` (viewport RMSE of residuals).

---

## v0.42.2 — Eye Tracking hybrid: zone pipeline, webcam, diagnostics (2026-04-10)

### participant-frontend
- **Lab `/eye-tracking-hybrid`:** Simplified stacked corrections (removed extra EMA on zone mapping; IDW field stays central). `hybridZoneGrid` retuned: half-plane nudges, row/column bias, optional left-half vertical stretch for clearer top/bottom on the left column; corner boosts removed earlier. Related tweaks to calibration field strength and gap-fill synthetic weight.
- **BlazeGaze:** Shared `BLAZE_GAZE_MEDIA_STREAM_CONSTRAINTS` (ideal 1280×720) for hybrid page and `EyeTrackingRenderer`. `BlazeGazeFrameStats` adds last capture width/height; soft warning on hybrid results if capture short edge is below 480px.
- **Cleanup:** Removed unused Ridge/MediaPipe `useEyeTracking` hooks and aligned `lib/eyeTracking` exports.

### docs
- `docs/eye-tracking-heatmap.md`: short notes on resolution, frames, model role, camera constraints, and the low-res hint.

---

## v0.42.1 — Eye Tracking hybrid: 4×4 grid, calibration & countdown fixes (2026-04-08)

### participant-frontend
- **Fix: Countdown never finished.** `finishStimulus` in useEffect dependencies caused the interval to restart on every render. Solved with a stable ref.
- **Fix: Zone mapping used window bounds instead of image bounds.** Gaze points are now mapped relative to the stimulus image's `getBoundingClientRect()`, so zones align with what the participant actually sees.
- **Improvement: 4×4 grid (16 zones) replaces 3×3 (9 zones).** Each zone covers 25% per axis — better resolution without exceeding BlazeGaze's accuracy.
- **Improvement: Stronger calibration.** `calibrate()` now captures 3 frames and runs explicit `adapt()` with 5 gradient steps (was lazy `handleClick` only). Runs fire-and-forget so UI stays instant.
- **Improvement: Less aggressive smoothing.** Alpha raised from 0.10–0.45 to 0.25–0.55 for more responsive zone-level tracking.
- **Cleanup: Removed legacy `/eye-tracking-test` route** and `EyeTrackingTestPage.tsx`. Only `/eye-tracking-hybrid` remains.

---

## v0.42.0 — Eye Tracking: BlazeGaze in survey flow, AOI drawing, canonical IDs (2026-04-08)

### participant-frontend
- Feat: **BlazeGaze integrated into EyeTrackingRenderer** — desktop participants get real webcam gaze tracking inside the survey flow (not just the standalone test page). Tablet/mobile keeps click-proxy as fallback.
- Feat: Persistent `<video>` element across all phases — camera stream no longer drops between calibration → viewing transitions.
- Feat: Response metadata now includes `trackingMethod` (blazegaze/click-proxy), `deviceType`, `gazePointCount`, and real `calibrationQuality` (e.g. `blazegaze-9pt`).
- Feat: Silent tracking during stimulus on desktop — no visible gaze indicator, gaze collected at 50ms intervals.

### research-frontend
- Feat: **AOI drawing** in Eye Tracking builder — when a stimulus is uploaded, an "Areas of Interest" section appears below the config. Researcher draws rectangular AOIs on the image, stored as JSON in the `aois` component.
- Feat: New reusable `AOIDrawer` component — click-drag drawing, SVG overlay, thumbnail list with remove.
- Feat: **User and Enterprise** shown in builder sidebar before Research Type.
- Fix: `getById` query now JOINs `enterprises` table so `enterprise_name` is available in research detail.
- Fix: Exported `resolveMediaUrl` from media service for use outside the service.

### backend
- Feat: Eye Tracking module template (migration 020) — 10 canonical components: `task-instructions`, `stimuli`, `emotion-recognition`, `attention-measurement`, `priming-time`, `display-mode`, `randomize-stimuli`, `shelf-count`, `shelf-items`, `aois`.
- Fix: `extractEyeTrackingConfig` in analytics now prioritizes canonical IDs (`stimuli`, `task-instructions`, `display-mode`) with fallback to legacy IDs.
- Fix: `getById` includes `enterprise_name` via LEFT JOIN.

### alignment
- All 3 layers (builder, renderer, analytics) now use the same canonical component IDs for Eye Tracking configuration.
- Template linked to stage template in production — new Eye Tracking stages auto-create a module with all components.

---

## v0.41.1 — Hybrid Eye Tracking with zone heatmap (2026-04-07)

### participant-frontend
- Feat: New `/eye-tracking-hybrid` route — device-adaptive eye tracking test page.
  - **Desktop**: BlazeGaze webcam gaze tracking with 9-point calibration (instant click, no blocking). Silent tracking during stimulus — no visible gaze dot.
  - **Tablet/mobile**: Touch + viewport attention proxy. No webcam needed.
- Feat: Zone-based attention heatmap (3x3 grid) over stimulus image as result, replacing imprecise pixel-level gaze dot. Color scale: blue (low) → green → yellow → red (peak). Percentage per zone.
- Feat: Instruction step before stimulus — researcher defines what the participant should look for.
- Feat: `useBlazeGaze` hook — `maxPoints: 100`, `clickTTL: 24h`, instant `handleClick` calibration (no frame capture blocking), `refinementCalibrate()` for continuous improvement during tracking.

---

## v0.41.0 — Research History, Clients, Study Logo, Demographics & CES fixes (2026-04-07)

### research-frontend
- Feat: New **Research's History** page — lists all researches by enterprise with chart, "Who is" panel, and full table. Accessible from sidebar.
- Feat: New **Clients** page — Affordances & Signifiers' Benchmark (scatter chart), explanatory panel, best option highlight, latest projects cards, and research table. Accessible from sidebar.
- Feat: **Study Logo** section in Research Configuration — toggle to show/hide logo in participant survey, upload client logo (max 2MB), preview with remove. Stored as `config.studyLogo: { enabled, s3Key }`.
- Fix: Unchecking the "country" demographic now also disables the associated "city" demographic automatically.
- Fix: "Descontento" emotion was already correctly classified as negative (`#fecaca`) in SmartVOCPreview — deployed to production.

### participant-frontend
- Feat: **Study logo** displayed in top-left corner of survey. Shows client logo if configured, EmotioCX default if not, hidden if toggle is off.
- Fix: City field no longer shows a free-text input to participants. Only displays a dropdown when the researcher has configured specific cities.
- Fix: `showCity` now checks `isEnabled('country')` before evaluating granularity — city never appears if country is disabled.
- Fix: CES sentiment zone colors (red/amber/green) and dynamic scale support deployed to production.
- Fix: NEV "Descontento" emotion color correction deployed to production.

### backend
- Feat: New endpoint `GET /enterprises/:id/researches` — returns researches filtered by enterprise with creator info.
- Feat: `listByEnterprise()` in research service with ownership clause + enterprise filter.

---

## v0.40.2 — City-country association in demographics config (2026-04-01)

### research-frontend
- Feat: When adding a city in the Country + City granularity config, the researcher can now select which qualifying country the city belongs to via a dropdown selector next to the city input.
- Feat: Each city chip displays the associated country (e.g. "CDMX — México") for visual clarity.
- Feat: Country selection persists between city additions for quick multi-city entry per country.
- Data: `CityEntry` now carries an optional `country` field. Stored as `{ name, country? }` objects in `demographics.country.cities` for round-trip. Backward-compatible with legacy `string[]` format.
- No participant-frontend or backend changes — `validValues` remains `string[]` of city names.

---

## v0.40.1 — View Progress: orphan modules fix (2026-04-01)

### backend
- Fix: `getVisibleModuleIdsForProgress` now uses `INNER JOIN stages` instead of just checking `stage_id IS NOT NULL`. Modules referencing a deleted stage were counted in the denominator, inflating it (e.g. 8/14 = 57% instead of 8/8 = 100%).
- Fix: Added `isModuleConfiguredForProgress` check — mirrors participant-frontend's `isModuleConfigured` logic so unconfigured template modules (no title, no images, no items) are excluded from the denominator.

---

## v0.40.0 — Eye Tracking System + City demographic (2026-03-28 / 2026-04-01)

### research-frontend
- Feat: When geographic granularity is "País + Ciudad", a new **Cities** section appears in the Country config drawer. The researcher adds cities as free-text chips (type + Enter/Add).
- Feat: Each city has a Clasifica/Desclasifica toggle — disqualifying cities block participants at demographics validation, qualifying cities are shown normally.
- Feat: Quotas tab switches to **per-city quotas** (%) when cities are configured; reverts to per-country quotas when granularity is "Solo país".
- Feat: City list and disqualification state persist across modal open/close via `demographics.country.cities` + `demographics.city.disqualifications`.
- New `/labs/eye-tracking` page — BlazeGaze CNN gaze prediction from webcam
- 17-point guided calibration → live gaze tracking (red dot)
- BlazeGaze model (670KB, webeyetrack) uses eye image patches + head pose
- Adaptive smoothing with deadzone, blink filtering (ignores closed-eye frames)
- MediaPipe face mesh library: 478 landmarks, iris detection, head pose, ridge regression
- Face detection overlay: wireframe volume lines, eye contours, iris circles (debug tool)
- Live telemetry panel: model status, eyes open/closed, gaze coordinates
- CSP updated for cdn.jsdelivr.net (WebEyeTrack's internal MediaPipe WASM)

### participant-frontend
- Feat: When the researcher configured specific cities, the participant sees a **dropdown select** instead of a free-text input for the city field. All cities (qualifying + disqualifying) appear in the dropdown; the backend enforces disqualification.
- No change for researches without configured cities — text input remains as before.
- Refactored eyeTracking lib into modular structure (`lib/eyeTracking/`)

### backend
- No code changes. Existing `checkDisqualifications` and `tryIncrementQuota` in `quota.service.ts` already handle `demographic_type = 'city'` via exact string match and disqualification list iteration.

### docs
- Technical assessment: what works, what doesn't, options evaluated (docs/eye-tracking-assessment.md)

---

## v0.39.3 — CES dynamic analytics, View Progress completion (2026-03-31)

### backend
- Fix: CES analytics now reads the configured scale (1-5, 1-7, 1-10) from the module config. Previously hardcoded to 1-5, discarding responses outside that range.
- Fix: `scaleConfigs` included in SmartVOC analytics response so the frontend can compute sentiment zones dynamically.
- Fix: View Progress — participants with `status = 'responded'` now show 100% progress and "Completado". Previously, conditional modules the participant never saw inflated the denominator, capping progress below 100%.
- Fix: View Progress detail view includes `panel_status` via LEFT JOIN with `participants` table.

### research-frontend
- Fix: CES results dashboard (QuestionCard, MetricCard, CPV, chart data) uses dynamic sentiment zones from backend `scaleConfigs` instead of hardcoded 1-5 ranges.

---

## v0.39.2 — Redirect @id, CES scale fix, NEV emotion fix (2026-03-30)

### participant-frontend
- Fix: Backlink redirects (complete, overquota, disqualified) now replace `@id` placeholder with the real participant ID.
- Fix: Backlink URLs without `https://` protocol are now treated as absolute URLs instead of relative paths (caused blank page).
- Fix: CES scale ignored researcher's selection — always showed 1-7 regardless of config. Root cause: `selectRange.predefined` (template default) was read before `comp.value` (researcher's choice). Priority inverted.
- Fix: CES buttons now display sentiment colors: red (negative/high effort), amber (neutral), green (positive/low effort). Zones per scale: 1-5 → 1-2/3/4-5, 1-7 → 1-3/4/5-7, 1-10 → 1-3/4-7/8-10.
- Fix: NEV emotion "Descontento" moved from attention row (green) to negative row (red). Aligns with backend and results dashboard classification.

### research-frontend
- Fix: Saving a SmartVOC module now syncs `selectRange.predefined` with the value selected by the researcher. Previously only `comp.value` was saved, leaving `selectRange.predefined` stuck at the template default.
- Fix: NEV preview emotion "Descontento" color corrected from green to red.

---

## v0.52.0 — Insights Finding: document analysis + LLM analysis (2026-04-07)

### research-frontend

- **Insights Finding.** Nuevo tipo de research sin stages/módulos. El investigador sube documentos (.csv, .txt, .xlsx, .docx, .pdf) desde un Drawer al crear. Parseo client-side + sentimiento léxico (ES/EN).
- **Document parser** (`documentParser.ts`). 5 formatos: SheetJS (.csv/.xlsx), Mammoth (.docx), PDF.js (.pdf), TextDecoder (.txt). Límite 200 entries × 300 chars para body size.
- **`InsightsFindingView`.** Panel izquierdo: tabla de entries con mood badges. Panel derecho: tabs Sentiment (resumen + accionables LLM), Themes (tabla con magnitude + sentiment score), Keywords (tags con sentimiento). Auto-trigger de análisis LLM con polling.
- **`isFileBasedResearch` flag.** Unifica Attention Prediction e Insights Finding en 4 archivos clave.
- **Delete optimista.** `useDeleteResearch` remueve inmediatamente de la lista con rollback en error.

### backend

- **Insights analysis service** (`insights.service.ts`). GPT-4o vía OpenAI SDK. Genera: sentiment summary + actionables, themes con magnitude/sentimentScore, keywords con sentimiento. Prompt bilingüe ES/EN, response_format JSON.
- **Insights controller.** `POST /insights/research/:id/analyze/:fileMediaId` (202 fire-and-forget) + `GET .../status/:fileMediaId`. Resultado se persiste en `config.stimuli[].analysis`.
- **`skip_default_modules` flag.** Research types file-based no crean stages/módulos default.
- **`express.json({ limit: '10mb' })`** en ambos servers.

---

## v0.51.2 — Attention Prediction: settings funcionales + Attention Video (2026-04-06)

### research-frontend

- **Settings modal funcional.** Blur, Opacity y Threshold ahora controlan el heatmap en tiempo real (debounce 150ms). Prediction Model (Simple/Advanced/Deep Learning) aplica presets automáticos. `CustomSelect` reemplaza `<select>` nativo. Modal renderiza via portal.
- **`AttentionVideoPlayer`.** Animación progresiva del scanpath predicho (5s). Puntos ordenados por saliencia — los más calientes aparecen primero. Controles: Play/Pause, Reset, barra de progreso, timer. Círculo indicador de fijación actual.

---

## v0.51.1 — Attention Prediction: saliency rendering basado en OGAMA (2026-04-06)

### research-frontend

- **`HeatmapRenderer` — dual renderer.** Saliencia usa colormap directo pixel a pixel (enfoque OGAMA/OpenCV) en vez de simpleheat. Cada valor mapea a color vía LUT de 256 entradas con alpha cuadrático. simpleheat se mantiene solo para datos de clicks/fijaciones sparse.
- **Separación real de hotspots.** Threshold 0.4, alpha cuadrático (`val² × 140`), overlay 45%. Las zonas de atención se distinguen sin tapar la imagen subyacente.

### backend

- **Attention Prediction service.** TranSalNet ONNX con normalización relativa min/max, step=3, threshold configurable. Endpoint fire-and-forget para evitar timeout de LiteSpeed.
- **Attention Prediction controller.** `POST /attention-prediction/research/:id/predict/:mediaId` (202 async) + `GET .../status/:mediaId`. Resultado se persiste en `researches.config.stimuli[].heatmapData`.

---

## v0.51.0 — Attention Prediction: builder completo + settings modal (2026-04-05)

### research-frontend

- **Fix: stimulus upload usaba `apiClient.put()` en vez de `fetch()`.** Reemplazado por `fetch()` con body raw, alineado al patrón de `FileUploadAdvanced`. Los stimuli ahora se persisten correctamente en `research.config`.
- **`AttentionPredictionCard`.** Componente dedicado para análisis de stimuli. Tabs: Prediction (heatmap + AOI drawing), Attention Video (placeholder), Image (original). Settings abre modal.
- **Settings modal.** Preview en tiempo real con 3 modos: Heat map, Opacity map, Composición. Controles: Blur (slider), Opacity (slider), Threshold (slider), Prediction model (select). Composición agrega: Analysis window, Frames in fixation (min/max), Dispersion, Merge range. Cambios se aplican solo al confirmar.
- **`HeatmapRenderer` — props `blur`, `opacity`, `threshold`.** Acepta parámetros de renderizado configurables desde el modal de settings.
- **Builder guard para Attention Prediction.** SmartVOC, Cognitive Tasks, módulos regulares y Research Config no se renderizan cuando el research es Attention Prediction.

---

## v0.50.0 — Implicit Association: 3 paradigmas diferenciados + Notes panel + criteria target selector (2026-04-03)

### research-frontend

- **Notes panel por tipo IAT.** Cada tipo de Implicit Association muestra un panel informativo en columna derecha (280px) con instrucciones para el investigador:
  - Attribute Testing: Target Objects (ejemplo Object A/B) + Criteria (hasta 5).
  - Comparing Attribute: Objects (hasta 3) + Dimensions + Criteria (hasta 15).
  - Objects Comparing: Target Objects (hasta 5) + Criteria con ejemplo Satisfaction/Dissatisfaction.
- **Criteria target selector.** La columna "Image" (file upload) en la tabla de criteria fue reemplazada por un selector de target (CustomSelect). El investigador asigna cada criteria a un target (Target 1, Target 2, etc.) para definir la respuesta correcta del participante.

### participant-frontend

- **3 paradigmas IAT diferenciados.** El renderer único fue reemplazado por lógica específica por tipo:
  - **Attribute Testing (Implicit Priming Test, 2 pasos):** Step 1 practica clasificar targets. Step 2 muestra criteria como estímulo; la respuesta correcta es el target asignado por el investigador.
  - **Comparing Attribute (Reaction Time Test, 1 paso):** Muestra Object + Criteria juntos. Botones = dimension labels (ej: Extravagente/Convencional). Sin feedback correcto/incorrecto — solo mide RT.
  - **Objects Comparing (IAT clásico, 3 pasos):** Step 1 clasifica criteria (botones = categorías Positive/Negative). Step 2 clasifica targets. Step 3 combinado.
- **Sin swap de testType.** Cada tipo se mapea a su nombre real, eliminando el swap confuso entre Comparing Attribute ↔ Objects Comparing.
- **Priming contextual.** El priming muestra contenido real (criteria o target según tipo) en vez del símbolo `+` genérico. Comparing Attribute no usa priming — estímulo directo.
- **Traducciones IAT (ES/EN).** 22 claves i18n agregadas. Instrucciones fallback usan traducciones en vez de placeholders en inglés del template.
- **Total de bloques dinámico.** Ya no hardcoded a 3 — se calcula según tipo y datos del test.

---

## v0.49.0 — IAT builder completo, Screener builder UX, participant renderers (2026-04-03)

### research-frontend

- **IAT stage type selector.** Al agregar un stage "Implicit Association" desde el drawer, se muestra un selector con los 3 tipos de test (Attribute Testing, Comparing Attribute, Objects Comparing). El backend crea el módulo correcto según la selección.
- **IAT builder grid layout.** Los targets/objects de cada tipo IAT se renderizan en columnas responsivas (2-5 cols según cantidad). Utility `implicitAssociationBuilder.ts` detecta módulos IAT y particiona componentes por `groupLabel`.
- **Technique-based stage filtering.** El drawer "Add Stage" filtra los stages disponibles según los `default_stages` de la técnica del research. Solo muestra stages que la técnica define.
- **Screener builder UX.** Headers por tipo de componente (choice, checkbox, ranking). Toggle visual para checkboxes. `RadioChoicesEditor` en grid. Hooks `useScreenerSingleChoiceTrim` y `useScreenerMultipleChoiceGroupPad` para mantener choices consistentes.
- **FileUpload single mode.** Respeta `component.fileUpload.multiple` (default `false`) — un solo archivo por target IAT. Fix overflow en `FileUploadAdvanced` para contenedores grid (`min-w-0`).

### backend

- **`defaultModuleName` en createStage.** Permite crear un stage Implicit Association con un tipo de módulo específico en vez de siempre Attribute Testing.
- **`technique_default_stages` en research detail.** El endpoint de detalle ahora incluye los `default_stages` de la técnica para que el frontend filtre stages.

### participant-frontend

- **ImplicitAssociationRenderer reescrito.** Motor IAT mejorado: extracción robusta de config (4 formatos de criteria), resolución async de imágenes S3, bloques estándar (atributos → targets → combinado), priming configurable.
- **EyeTrackingRenderer mejorado.** Resolución de estímulos S3, countdown timer, feedback visual de clicks.
- **ScreenerRenderer mejorado.** Integración con utils de screener participant.
- **DynamicStep simplificado.** Detección de módulos IAT/ET/Screener por nombre, delegación directa a renderers.

### database

- **Migración 018:** Fix de templates IAT — Attribute Testing (2 targets + criteria max 5), Comparing Attribute (3 objects + 2 dimensions + criteria max 15), Objects Comparing (5 targets + criteria-1/criteria-2 + criteria max 15).
- **Migración 019:** Fix de asociaciones `stage_templates_module_templates` — los 3 tipos IAT correctamente asociados al stage template "Implicit Association".

---

## v0.48.0 — Technique stage creation fix, backend deploy (2026-04-01)

### backend
- **Fix: Research creation with technique `default_stages`.** `stageTemplateNames` now includes `"Research Configuration"` — previously it fell through to `individualModules`, creating a spurious stage named after the research type.
- **Fix: Stage ordering for techniques.** When a technique's `default_stages` already includes "Research Configuration", `addDefaultStage` is skipped so stages respect the technique's defined order instead of always placing Research Configuration first.

### database
- **Fix: `default_stages` for "Biometric, Cognitive and Predictive".** Added "Research Configuration" at order 3. Full order: Screener → Welcome Screen → Research Configuration → Implicit Association → Cognitive Tasks → Eye Tracking → Thank You Screen.

### deploy
- Backend deployed to cPanel (v0.42.0 → v0.48.0). Includes all changes from v0.41.0–v0.47.0.

---

## v0.47.0 — Design system, skeletons, dashboard responsive, auth fix (2026-03-29)

### research-frontend

- **Complete EmotioX light color system.** Paleta propia basada en principios Vambe AI, adaptada 100% a light. Tokens en Tailwind config + CSS variables:
  - Surfaces: 5 niveles (`surface-app`, `primary`, `secondary`, `tertiary`, `sunken`).
  - Text: 5 niveles semanticos (`heading`, `body`, `muted`, `faint`, `inverse`).
  - Accent: 6 variantes (`DEFAULT`, `hover`, `pressed`, `light`, `muted`, `subtle`). Hover va mas oscuro (`#0058D4`).
  - Semantic: success, warning, error, info — cada uno con bg, solid, text, border.
  - Chart: 8 colores + auxiliares (grid, axis, reference). NPS: promoter, passive, detractor.
  - Borders semi-transparentes (`rgba(0,0,0,N)`). Sombras solo funcionales (dropdown, modal).
  - Referencia: `docs/design-system/emotiox-palette.md`.
- **Accent color migration.** ~50 componentes migrados de `blue-*` hardcoded a tokens `accent`. Incluye: Button, Sidebar, toggles, checkboxes, inputs (focus rings), file uploads, tabs, links, info boxes, modals, stepper, badges.
- **Loading states: full skeleton.** Eliminados todos los spinners de carga de datos. Nuevo `Skeleton.tsx` con 7 componentes reutilizables. Skeletons en: sidebar, builder, research list, modules grid, drawer, research types/techniques, stage selector modal. App shell skeleton para auth bootstrap y Suspense. Solo quedan spinners en Button (accion) y FileUpload (progreso).
- **Dashboard responsive para desktop.** Tabla con `table-fixed` + `colgroup` porcentual (30/10/14/14/24/8). Name y Researcher con `truncate`. Sidebar derecho y bottom section en `xl+`. Filter pills `rounded-full`. Cards bottom en `flex` single-row.
- **Dashboard filter fix.** Comparacion `String()` para `research_type_id` vs `type.id` (MySQL number vs frontend string).
- **Auth bootstrap fix.** `bootstrapSession` no llama a `/auth/me` si no hay token almacenado.

### backend

- **Auth 400→401 fix.** El catch generico en `auth.controller.ts` sobreescribia `AuthError.statusCode=401` a 400 cuando el mensaje contenia "Invalid". Ahora `isAuthError` tiene prioridad con `else if`.

---

## v0.46.0 ��� Google-only auth + design system foundation (2026-03-28)

### research-frontend
- **Auth simplified to Google OAuth only.** Removed manual login form (email/password), register page, and all related code:
  - Deleted `RegisterPage.tsx`.
  - Removed `login()`, `register()` from `auth.store.ts`.
  - Removed `login()`, `register()` from `auth.service.ts`.
  - Removed `LoginCredentials`, `LoginRequest`, `RegisterCredentials`, `LoginResponse`, `RegisterResponse` from `types/auth.ts`.
  - Removed `/register` route from `routes.tsx`.
- **Design system foundation applied (light theme):**
  - Added Plus Jakarta Sans (400, 600) via Google Fonts.
  - Tailwind config: new `font-sans` (Plus Jakarta Sans), `accent` color tokens (`#006aff`, `#3b82f6`).
  - `AuthLayout`: clean light background (`bg-slate-50`).
  - `LoginPage`: white card with subtle border, "Emotiox" heading + "UX Research Platform" subtitle, single Google button.
- Copied Vambe AI design system reference docs to `docs/design-system/`.

---

## v0.45.0 — Participant rendering: Screener, Implicit Association, Eye Tracking (2026-03-28)

### participant-frontend
- New `ScreenerRenderer` — renders Screener filtering question with Qualify/Disqualify choices. Reuses existing `ChoiceQuestion` component. Response: `component_id = 'choice'`, value = selected choice ID.
- New `ImplicitAssociationRenderer` — full IAT trial engine with:
  - Instructions screen with category labels and keyboard shortcuts (E/I or arrow keys).
  - Priming phase (fixation point, configurable duration from module config).
  - Trial phase: shows target (text or image), participant classifies via buttons or keyboard.
  - Practice trials (1 per target) then test trials (target × attribute, shuffled).
  - Visual feedback (correct/incorrect) between trials.
  - Response: `component_id = 'iat-trials'`, value = `[{ targetId, criterionId, rt, correct, phase }]`.
  - Supports all 3 test types: Attribute Testing, Comparing Attribute, Objects Comparing.
- New `EyeTrackingRenderer` — click/tap tracking as proxy for gaze data:
  - Instructions screen with task description and viewing duration.
  - Stimulus display with countdown timer and crosshair cursor.
  - Click/tap positions recorded as fixations in natural image coordinates.
  - Visual feedback dots on recorded positions.
  - Auto-completes after configurable duration (default 10s).
  - Response: `component_id = 'eye-tracking-data'`, value = `{ fixations: [...], calibrationQuality: 'click-proxy', integrityScore: 1.0 }`.
  - S3 stimulus URL resolution via `mediaService`.
- `DynamicStep`: delegates to new renderers based on module name detection.
- `useNavigation`: `DEFAULT_STEPS_ORDER` includes `screener`, `attribute-testing`, `comparing-attribute`, `objects-comparing`, `eye-tracking`.
- `ResearchPage`:
  - `getStepIdFromModuleName()`: explicit mappings for Screener, IAT module types, Eye Tracking.
  - `isModuleConfigured()`: validation rules for Screener (has choices), IAT (has targets), Eye Tracking (has stimulus).
  - `shouldShowButton()`: hides footer button for IAT and Eye Tracking (internal auto-advance).
- `renderers/index.ts`: exports new renderers.

---

## v0.44.0 — Eye Tracking results analytics (2026-03-28)

### backend
- New endpoint `GET /analytics/research/:id/eye-tracking`.
- Extracts stimulus config per module (image URL, modality, task description, AOIs).
- Computes heatmap data, fixation metrics, and AOI stats from gaze responses (`component_id = 'eye-tracking-data'`).

### research-frontend
- New `EyeTrackingResults` component — per-stimulus cards with:
  - Metrics bar (participants, responses, avg dwell time, avg fixations).
  - Heatmap / Image view toggle (reuses `HeatmapRenderer`).
  - AOI list with dwell %, fixation count, duration, viewer count.
  - Download image button.
- New "Eye Tracking" tab in `ResearchResultsPage`.

---

## v0.43.0 — Implicit Association results analytics (2026-03-28)

### backend
- New endpoint `GET /analytics/research/:id/implicit-association` — finds Implicit Association stage modules, extracts config (targets, attributes, priming time), queries trial responses, and computes D-scores per (attribute, target) pair.
- `analytics.service.ts`: `getImplicitAssociationResults()` detects test type from module name (Attribute Testing, Comparing Attribute, Objects Comparing), parses criteria from ranking-list component, and normalizes reaction times to -100..100 score range.

### research-frontend
- New component `ImplicitAssociationResults` with 3 chart types matching the reference designs:
  - **Attribute Testing** → Recharts RadarChart (2 targets as filled polygons, attributes on axes, -100 to 100 range).
  - **Comparing Attribute** → Grouped BarChart (targets side-by-side per attribute, 0-120 range, average reference line).
  - **Objects Comparing** → Horizontal divergent BarChart (objects on Y axis, 2 dimensions as left/right bars, -100 to 100 range).
- `ResearchResultsPage`: new "Implicit Association" tab (Zap icon), visible only when the research contains an Implicit Association stage.
- `analytics.service.ts` (frontend): new types `IATModuleResult`, `ImplicitAssociationResults` and `getImplicitAssociationResults()` function.

---

## v0.42.0 — Screener results analytics (2026-03-28)

### backend
- New endpoint `GET /analytics/research/:id/screener` — aggregates Screener responses.
- `analytics.service.ts`: `getScreenerResults()` returns choice distribution (Qualify/Disqualify), participant status counts (overquota, disqualified, complete), daily distribution with per-choice breakdown, best/slowest day, and weekly time series.

### research-frontend
- New component `ScreenerResults` — stacked bar chart (distribution by choice/route), 3 status cards, best/slowest day, weekly line chart.
- `ResearchResultsPage`: tab system refactored to data-driven (`TAB_DEFS`); Screener tab appears only when the research contains a Screener stage; auto-selects first available tab on load.
- `analytics.service.ts` (frontend): new types and `getScreenerResults()` function.

---

## v0.41.0 — Technique default stages + generic collection rendering (2026-03-28)

### database
- New column `research_techniques.default_stages` (JSON): permite a cada técnica definir sus propios stages default.
- "Biometric, Cognitive and Predictive" configurada con: Screener → Welcome Screen → Implicit Association → Cognitive Tasks → Eye Tracking → Thank You Screen.

### backend
- `research.service.ts`: `stageTemplateNames` incluye Screener, Implicit Association, Eye Tracking. `create()` prioriza `default_stages` de la técnica sobre `default_modules` del research type.
- `research-techniques.service.ts`: queries incluyen y parsean `default_stages`.
- `research-types.service.ts`: `getTechniquesByType` retorna `default_stages` de cada técnica.

### research-frontend
- `ResearchTechnique` type incluye campo `default_stages`.
- `useResearchForm`: `handleSubmit` envía los stages de la técnica cuando existen.
- `ResearchFormStep2`: muestra la lista de stages de la técnica seleccionada.
- `ResearchBuilderPage`: lógica de `module_collection` generalizada — cualquier stage collection (Cognitive Tasks, Implicit Association, etc.) se renderiza con `CognitiveTaskModuleCard` automáticamente.
- `ResearchBuilderHeader` y `StageEmptyState`: props genéricas para cualquier collection stage.

---

## v0.40.0 — New stages: Screener, Implicit Association, Eye Tracking (2026-03-28)

### database
- New stage **Screener** (`single_module`): pregunta de filtrado con choices Qualify/Disqualify.
- New stage **Implicit Association** (`module_collection`): Attribute Testing, Comparing Attribute, Objects Comparing.
- New stage **Eye Tracking** (`single_module`): stimuli, task config, Stand Alone y Shelf.
- Total stage templates: 8. Total module templates: 22.

---

## v0.39.1 — Participant limit + percentage quotas (2026-03-25)

### backend
- Fix: `getEffectiveParticipantLimitCap` — el límite global (*Limit number of participants*) se aplica tanto si `participantLimit` está guardado como **número** (legacy, igual que en research-frontend) como si es `{ enabled, value }`. Antes solo el objeto se interpretaba; con número, el backend ignoraba el límite y la conversión `% →` cupos absolutos en `tryIncrementQuota` no usaba **N**.
- `validateDemographics`, `checkQuotaPreAvailability` y `saveParticipantResponses` usan la misma resolución.

### deploy
- Backend desplegado en cPanel (emotio.cx) con este cambio.

---

## v0.39.0 — Quota save + pre-check + participant flow (2026-03-25)

### backend
- `checkQuotaPreAvailability`: solo investigación activa y límite global de participantes; ya no usa agotamiento por buckets demográficos en el GET (evita falsos bloqueos y redirecciones antes de demografía).
- `getParticipantStatus`: cuenta solo respuestas con `module_id != 'demographics'` (alineado con el límite global).
- `checkAllQuotasFull` marcado como deprecated (lógica de “todos los buckets llenos” no aplicable si las opciones no cubren el 100% del espacio).

### participant-frontend
- Carga con `ECX`/panel: `getParticipantStatus` antes de quitar loading; reset de `thank-you` persistido sin respuestas reales; evita carrera con redirección a `complete`.

### research-frontend
- Guardado de cuotas de **edad**: `quotas` entra en el mismo `mapModalConfigToBackend` vía `onSave` (cuarto argumento); ya no depende solo del flush `onQuotasSave` + `useEffect`.
- `handleSaveDemographicConfig`: no pisa cuotas con `[]` truthy; solo preserva cuotas antiguas si el payload no trae la clave `quotas`.
- `DemographicConfigModalBase`: siempre llama `onQuotasSave` (vacío si cuotas desactivadas).
- Copy en modales demográficos: cupo lleno = sobre cuota, no “descalificación” por perfil.

### scripts
- Tests de quota-availability / redirect ajustados al nuevo criterio de pre-check.

---

## v0.38.0 — Quotas always percentage, simplified UI (2026-03-25)

### backend
- Fix: Demographic quotas now store `quota_type` column — percentage values persist correctly instead of being lost on reload.
- Fix: `tryIncrementQuota` and `checkAllQuotasFull` resolve percentage quotas to absolute limits using the research's `participantLimit` (e.g., 30% of 100 participants = 30 slots).
- Fix: All quotas enforce immediately after demographics submission — removed unused `post_collection` enforcement path.
- Migration 013: Adds `quota_type` column to `demographic_quotas`, migrates existing rows to `percentage` + `immediate`.

### research-frontend
- Fix: Quota type selector removed — quotas are always percentage (%). Previously saved as "percentage" but always displayed as "Número" on reload due to hardcoded `'absolute'` in `mapBackendQuotasToModal`.
- Fix: Application mode selector removed — quotas always apply immediately after demographics. The "Filtro posterior" option never blocked participants and caused confusion.
- UI: Quota row simplified from 4 columns (option, type, value, application) to 2 columns (option, percentage).
- UI: Info text in all 8 demographic config modals updated to reflect percentage-only behavior.

---

## v0.37.1 — Participant count fix, redirect screen (2026-03-24)

### backend
- Fix: `getParticipantCount` now excludes `module_id = 'demographics'` — participants who only submitted demographics no longer count against the participant limit. Previously ghost entries (`@id`, abandoned participants) consumed limit slots.

### participant-frontend
- Feat: Redirect screen with EmotioCX logo and spinner shown for 1.5s before navigating to backlink URLs (overquota, disqualified, complete).
- i18n: Added `redirecting` key — "Redirigiendo..." / "Redirecting..."

---

## v0.37.0 — Research closed blocking, overquota/disqualified badges (2026-03-24)

### backend
- Fix: `validateDemographics` checks research status before processing — returns `RESEARCH_CLOSED` if not active.
- Fix: `checkQuotaPreAvailability` verifies research is active and participant limit not reached (in addition to quotas).
- Fix: `saveParticipantResponses` returns HTTP 410 instead of 500 for inactive research or participant limit reached.
- Feat: View Progress LEFT JOINs `participants` table — overquota/disqualified status overrides progress-based status.

### participant-frontend
- Fix: Demographics validation handles `RESEARCH_CLOSED` — shows blocking screen instead of generic error.
- Fix: Response save errors for inactive research or participant limit show blocking screen instead of alert.
- Fix: `loadResearch` catch detects "not active" errors → "research closed" screen.
- i18n: Added `errors.researchClosed`.

### research-frontend
- Feat: View Progress badges "Sobre cuota" (orange) and "Descalificado" (red).

### scripts
- New: `test-quota-redirect-scenarios.ts` — 8 scenarios, 20 assertions.

---

## v0.36.0 — Quota fix for non-numeric age, AOI reactive filters (2026-03-22)

### backend
- Fix: `matchesQuotaValue` returned false for non-numeric age options (e.g., "Menor 18") because `parseInt` fails on strings starting with letters. Now falls back to exact string comparison when `parseInt` returns NaN. Previously these participants passed validation as valid.
- Fix: `connect()` dev table prefix list was missing `demographic_quotas` and `participant_demographics` — queries from `tryIncrementQuota` in dev mode now correctly use `dev_` prefixed tables.

### research-frontend
- Fix: AOI stats (percentage, participant count) now recalculate reactively when demographic filters change. Previously stats were computed once at draw time and never updated.
- UI: Navigation Flow result images capped at `max-h-[700px]` (was `max-w-[400px]`).

---

## v0.35.0 — Duplicate modules fix, age reorder, UX polish (2026-03-21)

### participant-frontend
- Fix: Duplicate modules (Navigation Flow, Preference Test, Ranking, etc.) now coexist — uses module UUID as step key instead of name-based key. Previously the second module overwrote the first.
- Fix: Ranking modules not appearing — `isModuleConfigured` now handles `{items: [...]}` object format in addition to direct arrays.
- Fix: Age range options now preserve the order defined by the researcher (removed numeric sort).
- Fix: Demographic question order matches research-frontend (`age, country, gender, ...` instead of `age, gender, country, ...`).
- Fix: Demographic labels aligned with research-frontend — "Age Range", "Country & Geography", "Annual Income" (EN); "Rango de Edad", "País y Geografía", "Ingreso Anual" (ES).
- UI: Emotion selector uses flat 4-column grid (mobile) / 7-column (desktop) instead of separated 3-row layout.
- UI: Ranking items — removed drag handle icon (hamburger), participants reorder with arrow buttons only.
- UI: NavigationFlow in preview mode — Esc key or click on dark area to skip step.
- UI: DevSidebar updated to support UUID-based step keys with proper grouping and ordering.

### research-frontend
- Feat: Age Range options reorderable with up/down arrows in config modal. Order preserved through save → backend → participant.
- Feat: Filters column in SmartVOC and Cognitive Task Results is now sticky with `max-h-700px` scrollable.
- Feat: SmartVOC Results layout restructured — filters column is outside the scrollable content area so it stays visible.
- Feat: AOI labels simplified to `AOI #1`, `AOI #2`, etc. instead of "Area of Interest (AOI)".
- UI: AOI overlay text shows only label and percentage (removed participant count from overlay).

---

## v0.34.0 — Sentiment analysis, heatmap overhaul, UI cleanup (2026-03-21)

### backend
- Feat: Lexicon-based sentiment analysis (`sentiment.service.ts`) — bilingual ES/EN dictionaries with negation and intensifier support. Classifies text as `positive`, `negative`, `neutral`, or `indeterminate`.
- Feat: Sentiment auto-computed on save for text responses (Short/Long Text, VOC) and stored in `metadata.sentiment`.
- Feat: `getModuleResponses` computes sentiment on-the-fly for existing text responses without stored sentiment.
- Feat: Analytics endpoints (`getTextResponses`, `getSmartVOCResults`) return `sentiment` per response.

### research-frontend
- Feat: VOCComments displays sentiment as colored badges (green/red/gray/yellow).
- Feat: VOCComments "Sentiment Analysis" tab shows real distribution bars (positive/negative/neutral/indeterminate) instead of hardcoded placeholder text.
- Feat: Cognitive Task Short/Long Text reads `metadata.sentiment` for mood column.
- Feat: Heatmap rewritten with `simpleheat` library — dark overlay + green→yellow→red gradient, Hotjar-style. Replaces custom pixel-by-pixel renderer.
- UI: Removed duplicate research title from builder sidebar.
- UI: Removed "Update graph" banner from Navigation Flow results.
- UI: Removed non-functional action buttons (three-dots) from Choice and Preference Test cards.
- UI: Removed non-functional filter icon from AOI cards.
- UI: Navigation Flow images capped at 400px width.

---

## v0.33.0 — Filters fix, SmartVOC polish, time ranges, participant drawer (2026-03-20)

### backend
- Fix: `getModuleResponses` returned raw snake_case columns (`participant_id`) — frontend filters failed silently. Now maps to camelCase (`participantId`).
- Fix: `getCognitiveTaskResults` excludes orphan modules (`stage_id IS NULL`).
- Fix: `participant_demographics` collation mismatch (`utf8mb4_general_ci` vs `utf8mb4_unicode_ci`) — unified to `utf8mb4_unicode_ci`.
- Feat: `getSmartVOCResults` returns `questionTexts` per metric type (csat, ces, nps, cv, nev, voc) extracted from module config. Looks for `{type}-title` component with fallback to `placeholder.text`.

### research-frontend
- Fix: Demographic filters now apply to all SmartVOC charts — Trust Flow, MetricCard sparklines, and NPS stacked bars were using pre-aggregated backend data without `participantId`. All charts now compute from filtered individual scores.
- Fix: CES calculation was inverted — treated scores 4-5 as positive (much effort). Now: 1-2 = little effort (positive), 4-5 = much effort (negative).
- Fix: CES breakdown labels corrected: "Little effort" (green) / "Much effort" (red).
- Fix: MetricCard tooltip labels now match card context (CES shows "Little effort/Much effort", not generic "Satisfied/Dissatisfied").
- Fix: NPS Ratio line rendered behind stacked bars. Changed from `Area` to `Line` so it draws on top.
- Feat: Time range selector extended with 6M and 12M options alongside Today/Week/Month.
- Feat: SmartVOC question cards show real questions from backend config instead of hardcoded English text. Title simplified (e.g. "CSAT" instead of "Customer Satisfaction Score (CSAT)").
- Feat: Participant details Drawer — eye button in View Progress table opens slide-in panel with status, progress, duration, and full response list.
- UI: Removed "Acceso a Tests" button and modal from View Progress.
- UI: Removed "Acceso directo" column from participants table.
- UI: Trust Flow chart unified to LineChart for all time ranges (was BarChart for Week).
- UI: Removed duplicate select from Trust Flow chart (uses parent time range selector).
- UI: Participants table has internal scroll (`max-h-[60vh]`, sticky header) instead of page-level scrollbar.
- UI: Sidebar scroll hidden (`scrollbar-hide`) in both Standard and ResearchBuilder sidebars.
- UI: Tooltips added to all Cognitive Task result metrics explaining what each number means.
- UI: Ranking card — wider label column, "—" for mean when no responses, position labels only in header.

---

## v0.32.0 — Dashboard cleanup, progress fix, review mode (2026-03-20)

### backend
- Fix: Participant progress counted orphan modules (no stage) and non-visible module_ids like `demographics`. Now uses `getVisibleModuleIdsForProgress` — only modules with `stage_id`, excluding Welcome/ThankYou/ResearchConfig/hidden.
- Feat: Overview metrics response includes `totalModules` (visible modules configured).
- Feat: Research list query joins `users` table to return `creator_first_name`, `creator_last_name`, `creator_email`.
- Feat: Public endpoint `GET /public/research/:id/participant/:pid/responses` for read-only review mode.

### research-frontend
- Dashboard table: removed fake Progress column, removed Copy ID button, added Created/Updated date columns, Researcher column shows real user name or email.
- View Progress: removed note banner, title/subtitle, "Actualizar datos" bar, "Generar Participantes" tab. Cards compacted (no icons, smaller text). Added "Módulos" card showing total configured.
- View Progress: search bar and status filter removed from participants table.
- View Progress: "Acceso directo" buttons now open review mode URL (`?review=participantId`).

### participant-frontend
- Feat: Review mode (`?review=participantId`) — loads participant responses from backend, shows sidebar + green "Review Mode" banner, no action buttons. Read-only view of what the participant answered.
- Fix: Demographics step initializes local state from store (supports review mode pre-loaded responses).
- Fix: DevSidebar now includes Demographics step in navigation.

---

## v0.31.1 — Template drawer filtering, SmartVOC unique metrics (2026-03-19)

### research-frontend
- Fix: Template drawer showed Cognitive Task modules when opened from SmartVOC stage. Now filters by stage name instead of `stage_type` (both were `module_collection`).
- Feat: SmartVOC metrics are unique — drawer hides metrics already present in the stage.
- Cognitive Tasks still allows repeated module types.

---

## v0.31.0 — Demographics overhaul, Drawer UI, Linear Scale selector, module creation fix (2026-03-19)

### backend
- Fix: `buildOwnershipClause` generated `r.created_by` on queries without table alias → 500 on status change, activate, delete, stage/module operations. Now accepts empty alias for unaliased queries.
- Fix: `modules.create` now includes `stage_id` in INSERT. Previously modules were created without stage association and disappeared on refetch.
- Feat: `getScaleResponses` reads `scale-range` component (new format) with fallback to legacy `scale-start-value`/`scale-end-value`.

### research-frontend
- Feat: Demographic config modals replaced with slide-in Drawer component (right side, overlay close, ESC).
- Fix: Demographics round-trip data loss — mapper now preserves modal-format fields (`validAges`, `options`, `disqualified`) alongside backend format so reopening a modal restores saved state.
- Fix: Disabling a demographic preserves config (`{ ...config, enabled: false }`) instead of destroying all data.
- Fix: Re-enabling a demographic restores existing config instead of overwriting with defaults.
- Fix: Quota flush useEffect used stale closure — now uses refs for fresh reads.
- Feat: Unified all demographic option UIs to match Age pattern: green "Clasifica" / orange "Desclasifica" toggles, icon-only edit/delete.
- Feat: All demographic drawers use consistent blue "Guardar configuración" button.
- Feat: Linear Scale template changed from start/end inputs to select dropdown (1-3, 1-5, 1-7, 1-10, 0-10).
- Fix: `CustomSelect` dropdown used `window.scrollY` with `position:fixed` → drifted on scroll. Now uses viewport-only coords and closes on scroll.
- Fix: Nested `<button>` hydration error in demographic rows — changed wrapper to `<div>`.
- Fix: Participant limit input always disabled — `onChange` serialized `{enabled,value}` object as `"[object Object]"`. Now uses `JSON.stringify` for objects.
- Fix: New modules from template drawer now persist on Save (local modules POST with `stage_id` instead of PUT to nonexistent ID).
- Fix: Template structure parsed from JSON string when MySQL returns it as text.
- Feat: Research URL shows `?ECX=@id` format for panel mode.

### participant-frontend
- Fix: Demographics `getOptionsForDemographic` prefers `validValues` (all options) over `validAges`/`validCountries` (only qualifying) so participants see full range including disqualifying options.
- Fix: Age ranges sorted by leading number in dropdown.
- Feat: `usePreviewMode` and `ResearchPage` read `?ECX=` / `?ecx=` as participantId (new EmotioCX standard param).
- Fix: `trackLocation` now works — removed dead `enableLocationCapture` dependency that blocked it.
- Feat: Auto-redirect on thank-you via `backlinks.complete` useEffect (old code in handleNext never fired because currentStep was stale in closure).
- Fix: Linear Scale renderer reads `scale-range` component first, falls back to legacy `start-value`/`end-value`.

---

## v0.30.0 — Cognitive Results overhaul, admin role, duplicate responses fix (2026-03-19)

### backend
- Feat: Admin role — users with `role: 'admin'` bypass ownership filter and see all studies. `buildOwnershipClause` helper used across all research service queries.
- Fix: Duplicate responses — added `UNIQUE INDEX (research_id, participant_id, module_id, component_id)` on `responses` table. Cleaned 233 duplicate rows. `ON DUPLICATE KEY UPDATE` now works correctly.
- Fix: `getScaleResponses` deduplicates by participant (keeps latest response) as safety net.
- Feat: All analytics endpoints (`getScaleResponses`, `getChoiceResponses`, `getRankingResponses`) now return `questionText` extracted from module config `question-title` component.
- Feat: `getCognitiveTaskResults` includes `questionText` per module so all result types show the configured question.
- Feat: `getRankingResponses` returns configured items even with 0 responses (parses `value` JSON string from `ranking-list` component).
- Feat: `getChoiceResponses` returns configured choice options with labels even with 0 responses.
- Feat: `getScaleResponses` returns full configured range (start–end) even for values with 0 responses.

### research-frontend
- Fix: Linear Scale results — percentage always outside bar (black text), removed `minWidth: 16px` distortion, removed hardcoded "26s" and placeholder question text.
- Fix: All Cognitive Task Results show the real configured question in the header, not the module type name. Fallback to module name if no question configured.
- Fix: Removed duplicate "Question" card that repeated the same text shown in the header (Scale, Choice, Ranking).
- Fix: Removed "Question:" prefix from Short/Long Text headers (VOCComments).
- Fix: Ranking — removed hardcoded "76s" and "Secs" column, removed "Question:" prefix. Column headers aligned with row content.
- Fix: Choice — removed hardcoded placeholder question and "26s".
- Fix: Navigation Flow results — step thumbnails show actual image miniature instead of blue "Step N" placeholder. All steps collapsed by default.
- Fix: Navigation Flow — all tabs (Click Map, Quantity Mapper, Scan Path, Image) use `w-full` for consistent image sizing matching Heat Click Map.
- Fix: Linear Scale "Option 01" labels use `whitespace-nowrap` to prevent line wrapping.

---

## v0.29.1 — Progress fix, filters, demographics sync, image sizing, SW cleanup (2026-03-18)

### backend
- Fix: View Progress — progress calculated by modules answered (`module_id`) instead of sub-components (`component_id`). Excludes Welcome/Thank You/Research Config from total. Participants who answered all questions now show 100% and "Completado".
- Feat: `GET /public/research/:id/participant/:participantId/status` — check if participant already responded.

### research-frontend
- Fix: Cognitive Task Results filters now apply to all module types (Scale, Ranking, Choice, NavigationFlow, PreferenceTest). Previously only Short/Long Text responded to demographic filters.
- Fix: Cognitive Task Results show modules even with 0 responses (previously hidden).
- Fix: Navigation Flow results — images use `w-fit max-w-full` containers so vertical images maintain proportions and SVG overlays align correctly.
- Fix: Linear Scale results — percentage text moved outside bar (always black, always readable).
- Feat: Navigation Flow results — "Download image" button per tab (captures heatmap/clicks/scan path as PNG).
- Fix: Logo path uses `import.meta.env.BASE_URL` for cPanel `/research/` base path compatibility.

### participant-frontend
- Fix: Demographics — values persist to store immediately on change (not just via useEffect), preventing "validation error" on fast clicks.
- Feat: Dynamic step order from backend `order_index` instead of hardcoded `STEPS_ORDER`. Module reorder in research-frontend now reflects in participant flow.
- Feat: Block already-responded participants with "already responded" screen.
- Fix: Choice question (Single/Multiple) — purple color scheme changed to blue.
- Fix: Force unregister stale service workers and clear caches on load (fixes users seeing old "AWS backend" error).

---

## v0.29.0 — Linear Scale controlled ranges, module reorder, Ranking UX, logo (2026-03-18)

### research-frontend
- Feat: Linear Scale — replaced free-form min/max inputs with controlled dropdown: 1-3, 1-5, 1-7, 1-10, 0-10. Start/End labels now always visible.
- Feat: Module reorder — up/down arrows on each SmartVOC and Cognitive Task module card. Persists via `PUT /stages/:stageId/modules/reorder`.
- Feat: Auto-scroll to newly created module after adding from template drawer.
- Fix: Ranking results — display item names instead of UUIDs (backend now returns `label` from module structure).
- Fix: Module creation used stale stage data for `order_index` calculation; now reads fresh stage from query cache.
- Feat: EmotioCX logo (`EmotioCX-logo.svg`) in both StandardSidebar and ResearchBuilderSidebar, replacing BrainCircuit icon.

### participant-frontend
- Fix: Ranking — purple color scheme changed to blue (consistent with rest of UI).
- Fix: Ranking — drag handle icon changed from block to classic 3-line grip icon.

### backend
- Feat: `getRankingResponses` now reads module structure to return `label` for each ranking item (fallback to ID).

---

## v0.28.5 — Translate module templates to English (2026-03-18)

### backend (production database)
- Fix: 8 Cognitive Task module templates had Spanish labels/placeholders. Updated to English: Short Text, Long Text, Linear Scale, Single Choice, Multiple Choice, Navigation Flow, Preference Test, NPS.

---

## v0.28.4 — NavigationFlow 3-attempt limit, demographics validation (2026-03-18)

### participant-frontend
- Fix: `img.decode()` timeout (1s) prevents indefinite hang in Opera/Linux that blocked hitzone detection.
- Feat: NavigationFlow — 3 attempts per image. Correct click advances; 3rd miss ends the flow and moves to the next question.
- Fix: Demographics — ENTER or "Guardar y continuar" now requires all enabled fields answered, not just one.

---

## v0.28.3 — Ranking participant fix, module template drawer (2026-03-18)

### participant-frontend
- Fix: Ranking parser now handles the new `{ items, randomize }` object format.
- Feat: `randomize` flag support — items shuffled on first load when enabled.

### research-frontend
- Feat: Module template selector converted from modal to slide-in drawer. Filters templates by stage type (SmartVOC metrics vs Cognitive Task questions).
- Feat: "Add another question/metric" button at the bottom of both Cognitive Tasks and SmartVOC stages.
- Fix: Removed stale "ultra basico" template from production database.

---

## v0.28.2 — Ranking module: database fix (2026-03-18)

### backend (production database)
- Fix: 4 Ranking modules had legacy structure (input+textarea+select slider) instead of correct `question-title` + `items` (ranking-list). Migrated in-place preserving existing titles.
- Fix: `module_templates.Ranking` still had legacy slider structure — updated to `["input", "ranking-list"]` so new Ranking modules are created correctly.

---

## v0.28.1 — Heatmap, AOI, Ranking redesign, hitzone fix, module delete (2026-03-18)

### research-frontend
- Feat: Heatmap — intensity-based color gradient (blue→purple→red→yellow→white) with 50% alpha overlay, replacing per-click green/red dots.
- Feat: AOI (Areas of Interest) — draw rectangles over heatmap, shows % of participants and count per AOI, with thumbnail and Remove button.
- Feat: Ranking results — redesigned to match Figma: per-option histogram showing vote distribution by position, sorted by mean.
- Feat: Ranking builder — added Qualify/Disqualify selector per option, "Add another choice" button, "Randomize the order of questions" checkbox.
- Feat: Module delete — trash icon on SmartVOC and Cognitive Task module cards with confirmation modal; calls `DELETE /research/:id/modules/:moduleId`.
- Fix: Hitzone overlay in results — converted pixel coordinates to percent before rendering in SVG viewBox; hitzones now align with the image.
- Fix: Hitzone editor — enlarged container (max-w-48rem, h-700px) so drawn areas are proportional to the actual image.
- Fix: VOC download — uses pre-filtered data instead of nonexistent `/responses/.../smart-voc` endpoint.
- Fix: NPS — removed duplicate time-range dropdown (top bar already controls this).

### participant-frontend
- Fix: NavigationFlow — removed container fallback when hitzones exist; clicks now only use rendered image rect, preventing coordinate mismatch that made all clicks incorrect.
- Removed temporary debug overlay.

---

## v0.28.0 — Results UI polish, SmartVOC filters & NavigationFlow fixes (2026-03-17)

### backend
- Feat: SmartVOC scores (CSAT, CES, CV, NPS, NEV) now include `participantId` for frontend demographic filtering.

### research-frontend
- Feat: SmartVOC Results — Filters panel now functional (same as Cognitive Tasks): demographic checkboxes and User ID filter all metrics in real time.
- Feat: MetricCard charts (CSAT, CES, CV) react to Today/Week/Month toggle — previously always showed monthly data.
- Fix: Removed "New data obtained" banner from Filters.
- Fix: Removed duplicate "Copiar todos" / "Descargar CSV" buttons from VOCComments table (kept "Descargar comentarios").
- Fix: Short/Long Text no longer shows hardcoded "Positive" mood.
- Fix: Navigation Flow results — all steps expanded by default (not just step 1).

### participant-frontend
- Fix: Demographics now persist for participants without `?participantId` in URL — previously treated as preview, skipping `validateDemographics` entirely.
- Fix: NavigationFlow — keep imageUrls array aligned with propImages to prevent index mismatch.
- Fix: NavigationFlow — polling safety net for cached images where `onLoad` fires before React ref is ready.
- Fix: NavigationFlow — show red dot feedback for clicks outside hitzone (previously silent).

---

## v0.27.6 — Cognitive Tasks: demographic filters panel (2026-03-17)

### research-frontend
- Feat: Filters sidebar — checkbox filters per demographic type with counts, Show more/less, User ID field, "Update study" banner, Descargar CSV.
- Feat: Cognitive Task Results — main content filters by selected demographics and User ID (responses scoped to matching participants).

---

## v0.27.5 — Cognitive results: demographics, CSV exports, NPS bars (2026-03-17)

### backend
- Feat: GET `/analytics/research/:id/demographics` — returns participant demographic responses for Cognitive Tasks results sidebar and CSV export.

### research-frontend
- Feat: Cognitive Task Results — Navigation Flow shows one step per image with heatmap filtered by imageId; CSV export per question via 3-dot menu.
- Feat: Cognitive Task Results — Linear Scale (3.5) CSV export via 3-dot menu; shared `utils/csvDownload.ts`.
- Feat: Filters (right column) — demographic responses table with max-height 500px scroll and "Descargar CSV" for demographics.
- Feat: VOCComments (Long/Short Text) — table max-height 500px overflow-y-auto; Mood column: "Copiar todos" and "Descargar CSV" buttons.
- Fix: SmartVOC NPS — removed border radius from green/red bars (Progress and Recharts stacked bars) for block-style appearance.

---

## v0.27.4 — Navigation Flow production hardening (2026-03-17)

### participant-frontend
- Fix: Navigation Flow — use `img.decode()` before setting dimensions so hitzones work reliably when images load from cache or cross-origin (avoids 0x0 in some browsers).
- Fix: Navigation Flow — store `containerRect` in state and use it for overlay/click positioning instead of reading `getBoundingClientRect()` during render (avoids layout thrashing and stale values in production).
- Fix: Navigation Flow — add `onError` handler to clear dimensions and show error message when image fails to load, preventing stale hitzone data from previous image.
- i18n: Added `navigationFlow.imageLoadError` (ES/EN) for image load failure message.

---

## v0.27.3 — Quota enforcement stress test (2026-03-17)

### scripts
- New: `scripts/stress-test-quotas.ts` — E2E stress test for atomic quota enforcement. Creates a kiosk research with demographic quotas, fires 10 concurrent participants, and verifies no quota is ever exceeded. Self-registers a temporary user, cleans up after itself.

---

## v0.27.2 — Atomic quota enforcement (2026-03-17)

### backend
- Fix: Replaced two-step quota flow (check → increment) with atomic `tryIncrementQuota` that uses `UPDATE ... WHERE current_count < quota_limit` inside a transaction, eliminating the race condition where concurrent participants could exceed quota limits.
- `checkQuotaAvailability` and `incrementQuota` marked as `@deprecated`.

### participant-frontend
- Chore: `validateDemographics` now sends `participantId` so the backend can perform the atomic check-and-increment in a single transaction.

---

## v0.27.1 — Navigation Flow hitzone fix & CPV display (2026-03-17)

### participant-frontend
- Fix: Navigation Flow — replaced LazyImage with a plain `<img>` since the component is fullscreen and IntersectionObserver caused a race condition where hitzones never activated in Opera and DuckDuckGo.
- Fix: Navigation Flow — added fallback hitzone computation from the img ref when React state hasn't caught up, preventing clicks from being silently ignored.
- Fix: Navigation Flow — replaced fragile heuristic (`looksLikePercent` / `looksLikeRatio`) with direct pixel→percent conversion for hitzone coordinates.
- Fix: CognitiveTaskRenderer — use `??` instead of `||` for hitzone coordinates so a value of `0` is preserved.

### research-frontend
- Fix: CPV card no longer shows `%` — CPV is a ratio (CSAT% / CES%), not a percentage.

---

## v0.27.0 — Module-to-module conditionality (2026-03-16)

### research-frontend
- Feat: Conditionality now supports two sources — demographic response (existing) or study question (new). Researchers can show/hide any module based on a participant's answer to a previous Single Choice or Multiple Choice question.
- `ConditionalityConfig` is a union type with guards `isDemographicCondition()` / `isModuleCondition()`.

### participant-frontend
- Feat: `useNavigation` evaluates module-based conditions reactively. Unanswered source modules default to showing the conditional module.

---

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
