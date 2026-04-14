# CoolTool Parity — Remaining Gaps

Comparison of CoolTool features vs EmotioX current state after Phase 3 completion.

---

## Eye Tracking Gaps

### 1. Gaze Plot (Scanpath Visualization)
**Priority: High**

**What CoolTool has:** Numbered circles connected by lines showing the order in which a participant explored the stimulus. Each circle = fixation, size = duration, number = order.

**Current state:** EmotioX has zone heatmap and fixation-based heatmap but no sequential scanpath visualization.

**What to build:**
- SVG overlay on stimulus image: circles at fixation positions, numbered, connected by lines
- Circle radius proportional to fixation duration
- Color gradient from cool (first) to warm (last) fixation
- Per-participant selector (dropdown) to view individual paths
- Aggregated mode: show all participants' first N fixations as density

**Affected files:**
- `research-frontend/src/components/results/eye-tracking/EyeTrackingResults.tsx` — new "Scan Path" ViewMode tab
- Data already available: `stimulus.fixations[]` has `x, y, duration, participantId, timestamp`

**Effort: Low** — data exists, only visualization needed.

---

### 2. Time to First Fixation (TTFF) per AOI
**Priority: High**

**What CoolTool has:** For each AOI, shows the average time (ms) until a participant's gaze first enters the AOI. Key metric for ad/packaging research.

**Current state:** AOI metrics exist (dwell %, fixation count, avg duration, participant count) but no TTFF.

**What to build:**
- Backend: for each AOI, compute min timestamp of fixations inside AOI per participant, then average
- Frontend: add TTFF column to AOI row in results
- Also compute "% who noticed" (participants who had at least 1 fixation in AOI)

**Affected files:**
- `backend/src/modules/analytics/analytics.service.ts` — extend `computeEyeTrackingMetrics` AOI computation
- `research-frontend/src/components/results/eye-tracking/EyeTrackingResults.tsx` — AOIRow display

**Effort: Low** — fixation timestamps + AOI geometry already in backend.

---

### 3. First Fixation Map
**Priority: Medium**

**What CoolTool has:** Heatmap showing only where each participant looked FIRST. Answers "what grabs attention immediately?"

**Current state:** Heatmap uses all fixations weighted by duration. No way to isolate first fixation.

**What to build:**
- Backend: extract first fixation per participant (lowest timestamp)
- Frontend: "First Look" tab showing heatmap of only first fixations
- Alternative: use first N fixations (configurable: first 1, first 3, first 5)

**Affected files:**
- `backend/src/modules/analytics/analytics.service.ts` — new field `firstFixations` in metrics
- `research-frontend/src/components/results/eye-tracking/EyeTrackingResults.tsx` — new tab

**Effort: Low** — subset of existing fixation data.

---

### 4. Transparency / Opacity Map
**Priority: Medium**

**What CoolTool has:** The stimulus image is fully blurred/darkened. Only areas where participants looked are revealed (sharp/bright). Shows what was "seen" vs "unseen."

**Current state:** Zone heatmap overlay (green→red) exists. No blur/reveal mode.

**What to build:**
- Apply CSS/canvas blur to the entire image
- Overlay a mask that reveals (unblurs) circular areas around fixation points
- Radius proportional to fixation duration
- Cumulative: more fixations = more revealed
- Settings: blur intensity, reveal radius

**Affected files:**
- `research-frontend/src/components/results/eye-tracking/EyeTrackingResults.tsx` — new "Transparency" ViewMode
- May reuse canvas approach from `HeatmapRenderer`

**Effort: Medium** — custom canvas rendering with blur mask.

---

### 5. Emotion × AOI Correlation
**Priority: Medium**

**What CoolTool has:** Shows which emotion was dominant while the participant was looking at each AOI. Answers "how does this area make people feel?"

**Current state:** Emotions are collected per-frame with timestamps. AOI fixations have timestamps. Data exists but not cross-referenced.

**What to build:**
- Backend: for each AOI, find emotion samples that overlap temporally with fixations inside the AOI
- Compute dominant emotion per AOI
- Frontend: color-coded emotion badge on each AOI row
- Optional: emotion mini-distribution bar per AOI

**Affected files:**
- `backend/src/modules/analytics/analytics.service.ts` — cross-reference emotion timeline with AOI fixations
- `research-frontend/src/components/results/eye-tracking/EyeTrackingResults.tsx` — AOIRow emotion badge

**Effort: Medium** — requires temporal join between emotion samples and fixation timestamps.

---

### 6. Sequence Comparison
**Priority: Low**

**What CoolTool has:** Compare exploration order between participant groups or stimuli. Shows whether different demographics explore in different order.

**Current state:** No sequence analysis.

**What to build:**
- Backend: encode fixation sequence as AOI visit order per participant
- Compute similarity metrics (Levenshtein distance on AOI sequences)
- Frontend: sequence alignment visualization, heatmap matrix of transition probabilities
- Filter by demographic group to compare

**Effort: High** — new analysis paradigm.

---

## Implicit Association Gaps

### 7. D-score (Greenwald Algorithm)
**Priority: Critical**

**What CoolTool has:** Standard IAT D-score (Greenwald et al., 2003). THE metric for IAT research. Without it, IAT results are not publishable.

**Current state:** EmotioX shows mean RT per condition and radar/bar charts. No D-score computation.

**What to build:**
- Backend: implement Greenwald's improved scoring algorithm:
  1. Remove trials > 10,000ms
  2. Remove participants with >10% trials < 300ms
  3. Compute mean RT for compatible vs incompatible blocks
  4. Pool SD across both blocks
  5. D = (mean_incompatible - mean_compatible) / pooled_SD
- Per-participant D-score + aggregate
- Confidence interval (bootstrapped or analytical)
- Effect interpretation: slight (0.15-0.35), moderate (0.35-0.65), strong (>0.65)

**Affected files:**
- `backend/src/modules/analytics/analytics.service.ts` — new `computeDScore()` function
- `research-frontend/src/components/results/implicit-association/ImplicitAssociationResults.tsx` — D-score card, effect size bar

**Effort: Medium** — well-documented algorithm, data exists.

---

### 8. Error Rate Analysis
**Priority: Medium**

**What CoolTool has:** Detailed error breakdown — wrong responses per block, per condition, per stimulus. Identifies problematic stimuli.

**Current state:** Aggregate `accuracy` percentage per participant exists. No per-block or per-stimulus breakdown.

**What to build:**
- Backend: compute error rate per block (practice vs test), per target-attribute combination
- Identify stimuli with highest error rates (ambiguous stimuli)
- Frontend: error rate table by block/condition

**Affected files:**
- `backend/src/modules/analytics/analytics.service.ts` — extend IAT analytics
- `research-frontend/src/components/results/implicit-association/ImplicitAssociationResults.tsx` — error breakdown tab

**Effort: Low-Medium** — data available in participant responses.

---

### 9. Individual D-score + Confidence Intervals
**Priority: Medium**

**What CoolTool has:** D-score per participant in a table, sortable/filterable. Aggregate D-score with 95% CI error bars.

**Current state:** Per-participant RT data exists but no individual D-scores computed.

**What to build:**
- Backend: D-score per participant (from gap #7)
- Frontend: participant table with individual D-scores, sortable
- Aggregate D-score with 95% CI (bootstrap 1000 resamples or t-distribution)
- Histogram of D-score distribution

**Affected files:**
- Same as gap #7, extended
- `research-frontend/src/components/results/implicit-association/ImplicitAssociationResults.tsx` — participant D-score table

**Effort: Low** — builds on gap #7.

---

### 10. Effect Size Visualization
**Priority: Low**

**What CoolTool has:** Bar chart comparing D-scores across conditions/targets. Visual representation of implicit bias strength.

**Current state:** Radar chart and bar chart show mean RT. No D-score bars.

**What to build:**
- Frontend: horizontal bar chart of D-scores per target/condition
- Color-coded by effect magnitude (slight/moderate/strong)
- Reference lines at 0 (no bias), ±0.35 (moderate), ±0.65 (strong)

**Affected files:**
- `research-frontend/src/components/results/implicit-association/ImplicitAssociationResults.tsx`

**Effort: Low** — visualization only, depends on gap #7.

---

## Priority Matrix

| # | Feature | Domain | Effort | Impact | Priority |
|---|---------|--------|--------|--------|----------|
| 7 | D-score (Greenwald) | IAT | Medium | Critical | **1** |
| 1 | Gaze Plot / Scanpath | ET | Low | High | **2** |
| 2 | TTFF per AOI | ET | Low | High | **3** |
| 3 | First Fixation Map | ET | Low | Medium | **4** |
| 9 | Individual D-score + CI | IAT | Low | Medium | **5** |
| 5 | Emotion × AOI | ET | Medium | Medium | **6** |
| 4 | Transparency Map | ET | Medium | Medium | **7** |
| 8 | Error Rate Analysis | IAT | Low-Med | Medium | **8** |
| 10 | Effect Size Viz | IAT | Low | Low | **9** |
| 6 | Sequence Comparison | ET | High | Low | **10** |
