# Feature Conventions (extracted from CLAUDE.md)

Reference for version-specific feature implementation details. CLAUDE.md links here.

## Results & Analytics

- **Completion filter**: "Min. completion %" slider in all results Filters sidebars. `useResultsFilter` hook fetches participant progress and combines with demographic filters. Applied across SmartVOC, Cognitive Tasks, Screener, IAT, Eye Tracking. Value persists in `localStorage` per research (`completionMin-{researchId}`). All 5 result tabs use `useResultsFilter` (no duplicated logic). Filter also applied to Executive Summary, Export XLSX, and Report PDF via `filteredParticipantIds`.
- **Sentiment filter**: Checkboxes (Positive/Negative/Neutral/Indeterminate) in Filters sidebar. Applied to SmartVOC VOC comments and Cognitive Short/Long Text. State in `useResultsFilter` (`sentimentFilter` + `filterBySentiment`).
- **Text analysis (LLM)**: `POST/GET /analytics/research/:id/text-analysis/:moduleId`. GPT-4o themes/keywords/sentiment for VOC and Cognitive text. Cached in `config.textAnalysis.<moduleId>`. `VOCComments` loads cache on mount, "Analyze with AI" button triggers, "Refresh analysis" re-runs with filtered participants. POST accepts optional `participantIds` or `selectedTexts` array in body. `moduleId="voc"` for SmartVOC VOC. Themes include `supportingQuotes` (exact verbatims). Comment checkboxes select which texts to analyze.
- **Theme verbatim drawer**: Clicking a theme opens a slide-in drawer showing `supportingQuotes` — exact participant quotes backing the theme. Requires analysis regeneration for existing cached results.
- **Funnel Comparison (v0.71.0)**: "Comparison" sub-tab in Funnels. Table ranked by conversion rate: visitors, conversion bars, avg drop-off, best/worst step. Requires >=2 custom funnels. `useQueries` for parallel dropoff fetch.
- **Executive Summary (v0.71.0)**: Prompt in Spanish. Gathers all module types (SmartVOC, Screener, Cognitive, Ranking, IAT, verbatims). Demographics as context only. `POST /executive-summary` accepts `participantIds` for completion filtering. Cached in `config.executiveSummary`. Rendered in slide-in Drawer (520px), triggered by "Summary" button in top bar. PDF download via `html2pdf.js`.
- **Results studio layout (v0.71.1)**: `ResearchResultsPage` uses `flex flex-col h-full overflow-hidden`. Top bar (tabs + export buttons) fixed. Content fills remaining height with internal scroll. No page-level scroll.
- **AlertsBar popover (v0.71.1)**: Bell icon with severity dot in top bar. Click opens dropdown with alerts. Replaces full-width cards.
- **PPTX export (v0.71.1)**: `pptx-export.service.ts` generates Google Slides-compatible `.pptx` from SmartVOC + Cognitive data + Executive Summary + text analysis themes. Uses `pptxgenjs` (lazy import). "Slides" button in top bar.
- **Cognitive module selector (v0.71.1)**: Checkbox dropdown in `CognitiveTaskResults` to show/hide module cards. `selectedModuleIds` state, null = all visible.
- **Research page filters (v0.72.0)**: `ResearchPage` and `DashboardPage` both have filter bar: search (name/author/enterprise), technique dropdown, enterprise dropdown, date range, archived toggle, clear button.

## IAT (Implicit Association)

- **IAT validation bypass**: IAT modules skip generic required-field validation in participant flow — structure components are researcher config, not participant input. `validation.ts` returns `isValid: true` for IAT modules.
- **IAT response keys**: Configurable via `response-keys` component (`"letters"` or `"arrows"`, default `"letters"`). Builder shows segmented control in IAT module header. Participant labels adapt (`A/L` vs `<-/->`). Keyboard handler always accepts both A/ArrowLeft and L/ArrowRight.
- **IAT Attribute Testing no-bias (v0.71.2)**: Criteria editor hides "Target" column for Attribute Testing — attributes iterate all targets without pre-assignment. `IATCriteriaEditor` accepts `hideTargetSelector` prop. Comparing Attribute and Objects Comparing retain target selectors.
- **IAT association strength (v0.71.2)**: Results charts show per-item badges: Fuerte (>=70%), Media (40-69%), Baja (15-39%), Sin asociacion (<15%). `classifyAssociation()` + `AssociationBadge` in `ImplicitAssociationResults`.
- **IAT Preview images (v0.71.2)**: `IATPreviewModal` trial phase renders `stimulusImage` via `resolveMediaUrl` when targets have images (Objects Comparing).
- **IAT RT distribution (v0.72.0)**: `computeRTDistribution` box-plot stats per target (whiskers 1.5xIQR). `RTDistributionCard` SVG in `ImplicitAssociationResults`. Applies to all 3 paradigms.
- **IAT raw trial export (v0.72.0)**: `GET /analytics/research/:id/implicit-association/raw-trials`. "IAT Raw Trials" sheet in XLSX. "Export XLSX" button in IAT results header.
- **IAT Attribute Testing inverted semantics (v0.72.0)**: Trial data has `criterionId` = target chosen, `targetId` = criterion shown. `computeIATScores` uses inverted lookup `rtMap[target.id][attr.id]` for attribute_testing. `computeRTDistribution` groups by `criterionId` for attribute_testing. `computeIATParticipantData` includes `block-*` phases.
- **IAT PPTX slides (v0.72.0)**: `addIATSlide` in `pptx-export.service.ts` — overview (metric cards + scores table) + D-score detail (individual table). `ExportContext.iat` wired in `ResearchResultsPage`.
- **IAT error analysis readable (v0.72.1)**: `computeIATErrorAnalysis` resolves criterion UUIDs to names, uses `PHASE_LABELS` (Practice/Test A/Test B), aggregates combos by resolved name, filters 0-error rows, caps at top 10. Frontend columns: Stimulus/Response/Error %/Errors Total.
- **IAT completion advance**: `onComplete` stored in ref (`onCompleteRef`) to avoid unstable callback reference cancelling the 800ms advance timer via effect cleanup. Never put `onComplete` in the dependency array of the save/advance effect.

## IAT Analytics

- **Greenwald D-score:** `computeGreenwaldDScore()` — filter >10s, pooled SD, D = (mean_incompat - mean_compat) / pooled_SD
- **Per-participant D-scores:** Individual D + effect classification (none/slight/moderate/strong)
- **Aggregate D-score:** Mean + 95% CI (t-distribution)
- **Error analysis:** Per-phase (practice/test) y per-combination (target x attribute) error rates
- **Effect size visualization:** D-score distribution histogram (7 buckets)
- **Advanced filters:** Demographic sidebar en todos los result tabs (Screener, SmartVOC, Cognitive, IAT, Eye Tracking)
- **Module filter:** Analytics query filters by module name (`Attribute`/`Comparing`/`Objects`), excluding non-IAT modules (e.g. Linear Scale) that may share the stage.
- **Trial phases:** `computeIATScores` includes `block-1`/`block-2`/`block-3` trials (not just `phase === 'test'`).
- **Compound targetId:** Comparing Attribute trials use `"object-N__criterion-UUID"` — base ID extracted for RT grouping.
- **Objects Comparing scores:** Always uses `criteria-1`/`criteria-2` as chart dimensions. Per-target association derived from block-2 vs block-3 RT differences.

## Insights Finding

- **Insights Finding upload in view**: `InsightsFindingView` has "Add files" + "Prompt" buttons. Uses `documentParser.ts` (client-side) + `mediaService.uploadFile()`. Auto-triggers LLM on upload.
- **CSV column selector (v0.73.4)**: Multi-column CSV/Excel -> `detectCsvColumns` detects headers + preview. `CsvColumnSelector` shows interactive table. `parseDocument(file, columnIndex)` passes selection. Column count = max row width (sparse XLSX safe). Single-column files skip selector.
- **Mojibake repair (v0.73.4)**: `repairMojibake()` in `documentParser.ts` re-encodes Latin-1->UTF-8 at parse time. Fixes diseno->diseno. Keyword matching also normalizes diacritics + repairs mojibake for legacy data.
- **Insights Finding custom prompt (v0.73.4)**: "Prompt" button opens Drawer with editable textarea. Default = neuromarketing/FMCG specialist. Saved to `config.insightsPrompt`. Backend `analyzeInsights(entries, fileName, customPrompt?)`. "Custom" badge when modified.
- **Themes tab (v0.73.4)**: Percentage bar + count per theme. Click expands `supportingQuotes` verbatims (smooth grid-rows accordion). `InsightsAnalysis` type includes `supportingQuotes`.
- **Keywords tab (v0.73.4)**: Click keyword chip -> filtered comments table below. Accent-insensitive + mojibake-aware matching.

## Attention Prediction & Saliency

- **Navigation Prediction trigger (v0.71.1)**: "Run Attention Prediction" button in `NavigationTestCard` Prediction tab when `predictionHeatmap` is empty. Calls `POST /attention-prediction/.../predict` with `imageIndex`.
- **Video prediction**: `AttentionPredictionView` accepts video (mp4/webm/mov). Client-side frame extraction (`extractVideoFrames.ts`), sequential upload + TranSalNet per frame. Stored in `stimulus.frames[]`. `VideoFrameScrubber` in AttentionPredictionCard shows side-by-side original/heatmap with frame scrubber.
- **ET heatmap settings**: `HeatmapSettingsModal` (shared) with presets Smooth/Balanced/Detailed + blur/opacity/threshold sliders. Used in `StimulusCard` (ET results) and `AttentionPredictionCard`.
- **Attention Prediction tabs**: `AttentionPredictionCard` has 4 tabs over the image: Original, Heatmap, Gaze Paths (dark alpha overlay), AOI Editor (colored rects, 7 rotating colors). Right panel (`AiAnalysisPanel`) remains.
- **Prediction pipeline v2 (v0.68.0)**: `predictAttention` runs 3 augmentations (original, h-flip, crop 90%), averages directly (no logit fusion). Post-process: mild center bias (sigma=0.5, floor 60%), blur, stochastic jitter (0.15), normalize. Returns `{ points, autoPresets, griddedAOIs }`. `autoPresets` recommends blur/opacity/threshold from map distribution. `griddedAOIs` detects AOIs via 4x4 grid + flood-fill clustering.
- **Hybrid saliency fusion (v0.68.0)**: `POST /attention-prediction/research/:id/module/:mediaId/hybrid-predict`. Pipeline: 3x TranSalNet averaged -> Gemini semantic grid (10x8, 3 iterations) -> weighted fusion (alpha=0.65 + beta=0.35) -> focal equalization (peripheral boost x semantic boost x center attenuation) -> stochastic jitter (0.12). Produces eye-tracking-like distribution. Uses Gemini primary, GPT-4o fallback.
- **3 gaze path routes (v0.67.1)**: AI analysis returns `gazePathRoutes` — 3 viewing strategies (Typical Scan, Group Scan, Novelty Search). Frontend renders each with unique color (blue/green/amber), toggleable. `GazePathOverlay` accepts `routeColor` + `markerId` for multi-route rendering.
- **Configurable saliency model (v0.67.2)**: `SALIENCY_MODEL` env var (default `transalnet_res.onnx`). `SALIENCY_WIDTH`/`SALIENCY_HEIGHT` for different architectures. Conversion scripts: `scripts/convert-transalnet-to-onnx.py` (Dense/Res), `scripts/convert-sum-to-onnx.py` (SUM, WACV 2025). To swap: convert -> upload `.onnx` to `backend/models/` -> set env var -> restart.
- **Analysis profiles (v0.69.1)**: `AnalysisProfile` type in `ai-analysis.service.ts`. Context-aware beta: shelf/packaging=0.50, ad=0.45, web=0.40, general=0.35. Profile injected into both semantic grid prompt (heatmap) and AI analysis prompt (textual analysis). ViT bottom-up ensemble (70% semantic + 30% feature-integration). `AnalysisProfilePanel` in `AttentionPredictionView`, persisted in `research.settings.analysisProfile`. Controller reads profile from `settings.analysisProfile` for `/analyze/:mediaId`.
- **Brand attention (v0.69.0)**: AI analysis prompt auto-detects logos -> `brandAttention` in `AiAnalysisResult` (logos[], brandAttentionScore, recommendation). `Brand Attention` section in `AiAnalysisPanel`.
- **Attention Prediction custom prompt (v0.73.4)**: "Prompt" button in `AttentionPredictionView` opens Drawer. Saved to `config.attentionPrompt`. Backend `analyzeAttentionWithAI(imagePath, heatmapData, fileName, profile, customPrompt?)`.
- **AOI drawing fixes (v0.73.4)**: `getMousePercent` clamps coordinates 0-100%. Document-level mouseMove/mouseUp handlers prevent stuck drawing on mouse escape. `preventDefault` on mouseDown avoids image drag. `overflow-hidden` removed from AOI container to prevent image clipping.

## Eye Tracking

- **Motor:** BlazeGaze CNN (670KB, `webeyetrack`) — imagen de ojos + head pose
- **Pipeline:** WebEyeTrack con MediaPipe interno, sin duplicacion
- **Calibracion:** 9 puntos sobre stimulus + validacion RMSE + IDW correction field
- **Smoothing:** One-Euro filter (cutoff 0.8, beta 0.005), blink filtering
- **Video stimulus:** `EyeTrackingRenderer` detecta mp4/webm, renderiza `<video>` con gaze tracking sincronizado a `videoTime`
- **Emotion Recognition:** face-api.js (vladmandic fork) — TinyFaceDetector + FaceExpressionNet. 7 Ekman emotions via trained neural model. `useFaceApiEmotions` hook, parallel to BlazeGaze. Models in `public/models/` (~511KB). Client-side, GDPR compliant.
- **Builder toggles:** `attention-measurement` y `emotion-recognition` controlan que datos se recolectan
- **Results tabs:** Heat map, Scan Path, First Look, Transparency, Emotions, Prediction (TranSalNet), Video Gaze, Sequence
- **AOI metrics:** dwell %, fixation count, avg duration, TTFF, notice rate, dominant emotion. Soft Gaussian intersection (not binary point-in-rect).
- **Micro-recalibration:** Every 45s during viewing, invisible dot probes gaze drift and updates IDW correction field. Constants in `hybridCalibrationField.ts` (`MICRO_RECALIB_*`).
- **Quality gate:** Participants classified `good`/`fair`/`low` by calibration RMSE, integrity score, fixation count. Low excluded from aggregates. `qualitySummary` in ET response.
- **Calibration click isolation:** WebEyeTrack registers a global `click` listener that feeds mouse coords as calibration. `CalibrationPhase` and `ValidationPhase` use `onClickCapture` + `stopImmediatePropagation()` so only our explicit `blaze.calibrate()` feeds the model. Validation RMSE threshold: 150px (`HYBRID_RECALIBRATION_RMSE_THRESHOLD_PX`).
- **Attention Prediction:** `POST /attention-prediction/research/:id/module/:moduleId/predict` — TranSalNet sobre stimulus, soporta `imageIndex` para multi-imagen (Nav Flow).
- **AI Analysis (v0.70.4):** `POST /attention-prediction/research/:id/analyze/:mediaId` — fire-and-forget (202). GPT-4o runs in background, saves to `stimulus.aiAnalysisStatus`. `GET .../status` returns result. Frontend polls 3x at 15s intervals. Cacheado en `stimulus.aiAnalysis`.
- **Eye Tracking Shelf grid:** `ShelfGrid` uses `shelfItems` as column count (not `Math.max(shelfItems, urls.length)`).

## Website Tracking (inline conventions)

- **Website Tracking coordinates (v0.70.0)**: Snippet stores raw pixels (`pageX`, `pageY`). Backend normalizes at query time: `x / viewport_width * 100`. Frontend renders: `(pct/100) * renderWidth`. Never normalize in the client snippet.
- **Website Tracking snippet v3.3**: Visibility-aware (pauses on tab hidden, resumes on focus). Sync XHR on unload (no sendBeacon — 64KB limit drops rrweb snapshots). Active duration tracking (`activeMs`). Mousemove throttle 500ms. rrweb 5-min cap uses active time. Session retry on failure.
- **Visit grouping (v0.73.3)**: `getVisitorJourneys` groups sessions by visit (30-min gap = new visit), not by visitor. Same visitor on different days = separate entries.
- **Duration priority**: `rrweb_duration_ms` > `active_duration_ms` > wall-clock. Table duration matches replay modal. `rrweb_duration_ms` computed in `appendRrwebEvents` from first/last event timestamps.
- **URL normalization**: `createSession` strips `www.` prefix so all URL variants share the same `tracking_pages` entry and screenshots.
- **Font proxy**: `proxy-page` rewrites font URLs to `/tracking/:id/proxy-asset?url=`. Binary responses via `isBase64Encoded` in both `server-cpanel.js` and `server-cpanel.ts`.
- **Scroll depth query**: `MAX(scroll_depth_pct)` per session before bucketing. Cumulative reach = sessions whose max depth >= X%.
- **Tracking pages upsert**: `INSERT IGNORE` + UNIQUE index `(research_id, page_url)`. No SELECT->INSERT race.
- **Website Tracking results layout (v0.70.0)**: Heatmap renders inline (no modal). `Tip` component (portal-based, viewport-clamped) for all tooltips. Sessions tab = Visitor accordion only (no "All Sessions" table).
- **Website Tracking PDF report (v0.70.1)**: `WebTrackingReportButton` with section picker (grouped by tab/subtab). AI Analysis option calls `POST /tracking/:id/report` with `{ sections }` — prompt contextual, only analyzes selected data. Cached in `config.trackingReport`.
- **Configurable funnels**: `config.trackingConfig.funnels` — array of `{id, name, steps: [{url, label}]}`. `computeFunnelDropoff` checks sequential visitor reach. Endpoint: `GET /tracking/:id/funnels/:funnelId`.
- **Session replay modal**: `SessionReplayPlayer` renders as fixed overlay, not inline. Uses DOM snapshot (iframe) for background, not screenshots.
- **Status modal contextual**: `StatusModal` adapts descriptions per `researchTypeName` — Website Tracking, Attention Prediction, Insights Finding have specific texts.
- **Live tab SSE**: `GET /tracking/:id/live/stream?token=xxx` — SSE endpoint in `server-cpanel.js` (Passenger entry point). Frontend uses `EventSource`, no polling. Route registered with both `/api/` and `/` prefixes for Passenger compatibility.
- **Passenger dual entry points**: `server-cpanel.js` (JS, Passenger entry) and `src/server-cpanel.ts` (TS, compiled to `dist/`). New Express routes must be added to **both** files — Passenger executes the JS wrapper, not the compiled TS.
- **CORS: open for tracking (v0.70.10)**: `server-cpanel.js` CORS accepts any origin. Domain validation is in `createSession` (`allowedDomains`), not at CORS level. Required for snippet to work on external sites (Joomla, WordPress, etc.).
- **Apache timeout (v0.70.3)**: `~/public_html/api/.htaccess` has `TimeOut 120` + `RequestReadTimeout body=120`. Required for GPT-4o endpoints that take 30-60s. Default 30s causes connection drops reported as `ERR_NETWORK_CHANGED`.
- **Session replay unified timeline**: `SessionReplayPlayer` loads ALL sessions of the same visitor via `visitorId`, merges events into one sorted timeline. DOM snapshot changes dynamically per active page. Clicks rendered as simpleheat heatmap overlay (no cursor dot).
- **Attention heatmap**: `GET /tracking/:id/attention` — scroll-based dwell time per page band (viewport visibility x time). Flushes tail of each session using `ended_at`.

## Other Features

- **Benchmark research editor**: `ClientsBenchmarkView` has "Edit selection" panel — checkboxes for all ET researches. Saves to `config.stimuli[].researchId`. Live refresh.
- **Benchmark CSV export**: "Export CSV" button on comparative table.
- **LLM model configurable**: `OPENAI_MODEL` env var (default `gpt-4o`). Used by `insights.service.ts`.
- **Drawer transition (v0.73.4)**: Drawer component has 300ms slide + overlay fade. Mount/visible state separation for exit animation. Global.
- **FACS Action Units (v0.69.0)**: `extractActionUnitsFrom68()` in `facsClassifier.ts` — 9 AUs from face-api 68 landmarks. `face_landmark_68` model in `public/models/`. `ActionUnitsPanel` + `MicroExpressionsPanel` in `EmotionPanel`.
- **Standalone modules (v0.69.0)**: `Emotion Analysis` (webcam only, no ET), `EEG Recording` (Web Bluetooth), `Biometric Wearable` (BLE HR 0x180D). DynamicStep dispatches by module name. Module templates in migrations 028-029.
- **Cerulean Ledger (v0.69.0)**: `backend/src/modules/cerulean/` — client + integration service + controller. Routes under `/cerulean/`. `CERULEAN_ENABLED=true` to activate. Auto-triggers on study close (integrity hash + credential + audit). `BlockchainCertification` component in results.
- **Dashboard (v0.69.0)**: `GET /research/dashboard-summary` returns stats, trends, top researches. `useDashboardSummary` hook. Search + archive toggle + activity chart + metrics trends in `DashboardPage`.
- **Automation (v0.69.0)**: Auto-trigger LLM on close + every 10 participants. Executive summary (`/analytics/research/:id/executive-summary`). Alerts (`/analytics/research/:id/alerts`). PDF report via `ReportGeneratorButton`.
- **Research tags (v0.69.0)**: `research_tags` table (migration 027). `GET /research/tags`, `POST/DELETE /research/:id/tags/:tag`. `archived_at` column, `POST /research/:id/archive|unarchive`.
