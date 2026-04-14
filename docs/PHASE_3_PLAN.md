# Phase 3 — Advanced Analytics & Predictions

## Overview
Phase 3 extends the platform with FACS Emotion Recognition in Eye Tracking (CoolTool parity), integrated attention prediction in Eye Tracking and Navigation Flow, video support, and advanced filtering.

---

## 1. FACS Emotion Recognition (CoolTool parity)

**Current state:** Eye Tracking template has `emotion-recognition` checkbox toggle but no processing behind it. BlazeGaze uses MediaPipe internally for face detection — facial landmarks are already available in the pipeline but discarded after gaze prediction.

**Competitive context:** CoolTool captures webcam video, processes with computer vision to extract face + pupil vectors, classifies emotions via FACS Action Units, and stores the temporal array. Single input (webcam) → dual output (gaze + emotions). We need the same.

**What to build:**
- Extract MediaPipe facial landmarks during viewing phase (already computed inside BlazeGaze pipeline, need to expose them)
- Classify FACS Action Units from landmarks per frame:
  - AU1 (inner brow raise), AU2 (outer brow raise), AU4 (brow lowerer)
  - AU6 (cheek raiser), AU12 (lip corner puller), AU15 (lip corner depressor)
  - AU20 (lip stretcher), AU25 (lips part), AU26 (jaw drop)
- Map AU combinations to Ekman basic emotions: joy, sadness, surprise, anger, disgust, fear, neutral
- Store temporal array alongside gaze data in response:
  ```json
  {
    "emotions": [
      { "timestamp": 1200, "emotion": "surprise", "confidence": 0.82, "actionUnits": { "AU1": 0.7, "AU2": 0.6, "AU5": 0.8 } },
      { "timestamp": 1250, "emotion": "joy", "confidence": 0.91, "actionUnits": { "AU6": 0.9, "AU12": 0.85 } }
    ]
  }
  ```
- All processing client-side — zero images/video transmitted to server (GDPR compliant)
- Frontend results: emotion timeline synchronized with heatmap, dominant emotion per stimulus, emotion distribution chart

**Task-based rendering:** The webcam captures a single temporal vector (gaze + landmarks per frame). The builder toggles (`attention-measurement`, `emotion-recognition`) control which parts of the vector are collected and how results are visualized:

| Builder config | Participant collects | Results renders |
|---|---|---|
| Only `attention-measurement` | Gaze coordinates | Zone heatmap |
| Only `emotion-recognition` | Facial landmarks → AUs → emotions | Emotion timeline + distribution |
| Both enabled | Gaze + emotions (same webcam, same timeline) | Heatmap + synchronized emotion timeline |

The response stores both datasets in the same object — the frontend reads the module config and renders only the relevant visualization.

**Architecture:**
- `participant-frontend/src/lib/eyeTracking/facsClassifier.ts` — AU extraction from MediaPipe landmarks + emotion mapping
- Expose landmarks from `useBlazeGaze` hook (currently internal to WebEyeTrack)
- If WebEyeTrack doesn't expose landmarks: run a parallel lightweight MediaPipe FaceMesh (468 landmarks) on the same video feed — minimal overhead since face is already detected
- Collect emotion samples at same rate as gaze (50ms intervals)
- `emotion-recognition` toggle in builder controls whether emotion data is collected
- `attention-measurement` toggle controls whether gaze data is collected
- Both read from the same webcam stream — no duplicate camera access

**Affected files:**
- `participant-frontend/src/lib/eyeTracking/facsClassifier.ts` — new: AU detection + emotion classification
- `participant-frontend/src/hooks/useBlazeGaze.ts` — expose facial landmarks or add parallel FaceMesh
- `participant-frontend/src/components/renderers/EyeTrackingRenderer.tsx` — collect emotion samples during viewing, include in response
- `backend/src/modules/analytics/analytics.service.ts` — aggregate emotion data from responses
- `research-frontend/src/components/results/eye-tracking/EyeTrackingResults.tsx` — emotion timeline, distribution chart, dominant emotion per stimulus

---

## 2. Attention Prediction in Eye Tracking

**Current state:** TranSalNet runs as standalone research type (`AttentionPredictionView`). Eye Tracking results show only participant gaze data.

**What to build:**
- Backend: auto-run TranSalNet on each Eye Tracking stimulus after upload (same fire-and-forget pattern as Attention Prediction)
- Store `heatmapData` (saliency) in module config per stimulus
- Frontend: new "Prediction" tab in `EyeTrackingResults` alongside "Heat map" and "Image"
- Side-by-side or overlay toggle: predicted attention vs actual gaze
- Reuse `HeatmapRenderer` in saliency mode (already supports both)

**Affected files:**
- `backend/src/modules/attention-prediction/attention-prediction.controller.ts` — generalize to accept Eye Tracking module stimuli
- `research-frontend/src/components/results/eye-tracking/EyeTrackingResults.tsx` — add Prediction tab

---

## 3. Attention Prediction in Navigation Flow

**Current state:** Navigation Flow records click hitzones per image. No predictive analysis.

**What to build:**
- Backend: run TranSalNet on each Navigation Flow image after upload
- Store saliency data in module config per image
- Frontend: "Prediction" overlay in Navigation Flow results (CognitiveTaskResults)
- Compare predicted attention vs actual click distribution per image

**Affected files:**
- `backend/src/modules/attention-prediction/attention-prediction.controller.ts` — support Navigation Flow stimuli
- `research-frontend/src/components/results/cognitive-task/CognitiveTaskResults.tsx` — prediction overlay for Navigation Flow modules

---

## 4. Video Support

**Current state:** Eye Tracking template accepts `video/mp4` in file upload but no processing exists. Only images are rendered.

**What to build:**
- Backend: frame extraction from uploaded video (ffmpeg or browser-side)
- TranSalNet prediction per extracted frame (batch processing)
- Temporal heatmap: fixation data mapped to video timeline
- Frontend: video player with gaze overlay timeline in results
- Scrubber showing attention intensity per frame
- Participant-frontend: video stimulus display with gaze tracking during playback

**Affected files:**
- `backend/src/modules/media/` — video frame extraction service
- `backend/src/modules/attention-prediction/` — batch frame prediction
- `participant-frontend/src/components/renderers/EyeTrackingRenderer.tsx` — video playback with gaze collection
- `research-frontend/src/components/results/eye-tracking/EyeTrackingResults.tsx` — video player with heatmap timeline

---

## 5. Advanced Filters

**Current state:** SmartVOC has basic demographic filters. Other result types have no filtering.

**What to build:**
- Shared `FilterBar` component for all result types
- Filter dimensions: demographics (age, gender, country, city, custom screening), time range, participant segment, module
- Backend: all analytics endpoints accept optional filter params (already return `participantId` per response)
- Frontend: `FilterBar` in `ResearchResultsPage` (applies across tabs), or per-tab filters
- Filter state in URL params for shareability

**Affected files:**
- `research-frontend/src/components/results/shared/FilterBar.tsx` — new shared component
- `research-frontend/src/pages/research/ResearchResultsPage.tsx` — filter state management
- `backend/src/modules/analytics/analytics.service.ts` — filter params on all endpoints

---

## Priority Suggestion

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | FACS Emotion Recognition | Medium-High | CoolTool parity, key differentiator |
| 2 | Attention Prediction in Eye Tracking | Medium | Differentiator |
| 3 | Advanced Filters | Medium | Usability |
| 4 | Attention Prediction in Navigation Flow | Low | Extension of #2 |
| 5 | Video Support | High | New capability |
