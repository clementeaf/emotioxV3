# Fase 2 — Neuro: Plan de Completitud

> Objetivo: llevar los 3 sub-items de Fase 2 (Eye Tracking, Emociones, IAT) de amarillo a verde en el roadmap.

---

## Estado actual vs gaps

### 1. Eye Tracking Desk/Mob

| Feature | Estado | Gap |
|---------|--------|-----|
| BlazeGaze CNN desktop | OK | webeyetrack v0.0.2, accuracy ~60-120px |
| 9-point calibration on stimulus | OK | — |
| Validation + micro-recalibration | OK | recalibration counter never incremented (bug) |
| One-Euro smoothing | OK | — |
| IDW correction field | OK | — |
| Stand Alone mode | OK | — |
| Shelf mode | OK | overflow-auto puede desalinear coords si grid > 75vh |
| Video stimulus | OK | no handler `ended` — gaze contra frame congelado |
| Mobile eye tracking | PARCIAL | Solo click/tap proxy. `integrityScore` hardcoded 1.0, calibración cosmética |
| Quality gate | OK | mobile siempre `good` (inflated) |
| Low-res camera warning | FALTA | `isBlazeGazeCaptureResolutionLow()` existe pero nunca se muestra |
| AOI soft Gaussian | OK | secuencia usa hard binary (inconsistencia menor) |

### 2. Emociones (Facial Coding System)

| Feature | Estado | Gap |
|---------|--------|-----|
| face-api.js 7 Ekman emotions | OK | TinyFaceDetector + FaceExpressionNet |
| 20fps sampling | OK | RAF + throttle 50ms |
| Backend emotion analytics | OK | distribution, timeline 1s, per-participant |
| Results EmotionPanel | OK | bars + timeline + per-participant table |
| FACS Action Units (AU) | DEAD CODE | `facsClassifier.ts` completo (9 AUs con MediaPipe landmarks) pero nunca llamado; AUs hardcoded a 0 |
| Micro-expresiones | FALTA | No hay detección temporal <500ms |
| Standalone emotion module | FALTA | Solo funciona dentro de Eye Tracking |
| Mobile emotion recognition | FALTA | Deshabilitado por guard `isDesktop` |

### 3. IAT (OpenIAT)

| Feature | Estado | Gap |
|---------|--------|-----|
| 3 paradigmas | OK | Attribute Testing, Comparing Attribute, Objects Comparing |
| Greenwald D-score | OK | pooled SD, CI 95%, per-participant, effect classification |
| Builder configuración completa | OK | targets, criteria, response keys, preview, flowchart |
| Results visualization | OK | radar/bar charts, D-score card, histogram, error analysis |
| Trial <300ms exclusion | PARCIAL | Flag a nivel participante, no excluye trials individuales del D-score |
| Objects Comparing block structure | SIMPLIFICADO | 3 bloques vs 7 estándar (sin reversed practice) |
| Split-half reliability | FALTA | No se computa |

---

## Plan de implementación

### Sprint 1: Bugs y calidad (Eye Tracking)

#### 1.1 Fix recalibration counter
**Archivo:** `participant-frontend/src/components/renderers/EyeTrackingRenderer.tsx`
**Cambio:** Incrementar `recalibrationCountRef.current++` en el handler de auto-recalibración para que el límite de 2 re-intentos funcione.

#### 1.2 Fix mobile quality grade
**Archivo:** `participant-frontend/src/components/renderers/EyeTrackingRenderer.tsx`
**Cambio:**
- `integrityScore` para mobile = `Math.min(tapCount / 5, 0.8)` (cap 0.8, no 1.0)
- `calibrationQuality` = `'click-proxy'` (ya lo hace)
- Backend: `classifyQuality()` debe tratar `calibrationQuality === 'click-proxy'` como máximo `fair`, nunca `good`

#### 1.3 Fix video stimulus `ended` handler
**Archivo:** `participant-frontend/src/components/renderers/eye-tracking/ViewingPhase.tsx`
**Cambio:** `onEnded={() => video.currentTime = video.duration}` — freeze en last frame y marcar `videoEnded=true` en metadata.

#### 1.4 Fix shelf overflow scroll
**Archivo:** `participant-frontend/src/components/renderers/eye-tracking/ShelfGrid.tsx`
**Cambio:** Reemplazar `overflow-auto` por `overflow-hidden` y escalar grid para caber en `75vh` sin scroll.

#### 1.5 Low-res camera warning
**Archivo:** `participant-frontend/src/components/renderers/EyeTrackingRenderer.tsx`
**Cambio:** Llamar `isBlazeGazeCaptureResolutionLow()` después de iniciar webcam. Si `true`, mostrar banner amarillo "Low camera resolution may reduce accuracy".

**Tests Sprint 1:**
```typescript
// test/eye-tracking-quality.test.ts

describe('Eye Tracking Quality Gate', () => {
  it('should cap mobile integrityScore at 0.8', () => {
    const score = computeMobileIntegrityScore(5); // 5 taps
    expect(score).toBe(0.8); // not 1.0
  });

  it('should classify click-proxy as max fair', () => {
    const grade = classifyQuality({
      calibrationRmsePx: null,
      integrityScore: 0.8,
      fixationCount: 10,
      calibrationQuality: 'click-proxy',
    });
    expect(grade).toBe('fair'); // not 'good'
  });

  it('should increment recalibration counter on auto-retry', () => {
    const counter = { current: 0 };
    handleAutoRecalibration(counter);
    expect(counter.current).toBe(1);
  });

  it('should not offer recalibration after 2 auto-retries', () => {
    const counter = { current: 2 };
    const shouldOffer = shouldOfferRecalibration(150, counter);
    expect(shouldOffer).toBe(false);
  });
});

describe('Shelf Grid', () => {
  it('should not have overflow-auto on ShelfGrid container', () => {
    // Render ShelfGrid with 10 items, check no scrollbar
    const { container } = render(<ShelfGrid urls={urls} shelfCount={5} shelfItems={4} />);
    const grid = container.firstChild as HTMLElement;
    expect(grid.style.overflow).not.toBe('auto');
  });
});

describe('Video Stimulus', () => {
  it('should freeze on last frame when video ends', () => {
    const video = { currentTime: 0, duration: 10 };
    handleVideoEnded(video);
    expect(video.currentTime).toBe(10);
  });
});
```

---

### Sprint 2: Activar FACS Action Units

#### 2.1 Conectar facsClassifier.ts al pipeline
**Archivos:**
- `participant-frontend/src/hooks/useFaceApiEmotions.ts`
- `participant-frontend/src/lib/eyeTracking/facsClassifier.ts`

**Cambio:** El `facsClassifier.ts` necesita landmarks de MediaPipe. Actualmente face-api.js no genera landmarks de 468 puntos (solo 68). Dos opciones:

**Opción A (recomendada): Dual pipeline**
1. Mantener face-api.js para emotion classification (rápido, probado)
2. Agregar MediaPipe Face Mesh (468 landmarks) en paralelo para AU extraction
3. Cada sample combina: `emotion` de face-api + `actionUnits` de MediaPipe → `facsClassifier.extractActionUnits()`

**Opción B: Reemplazar face-api por MediaPipe**
1. Usar MediaPipe Face Mesh para landmarks
2. `facsClassifier.classifyEmotion(aus)` para emotions
3. Eliminar face-api.js dependency

**Recomendación:** Opción A — face-api emotion classification está validado, agregar MediaPipe solo para AUs es aditivo y no rompe nada.

#### 2.2 Pipeline MediaPipe Face Mesh
**Nuevo archivo:** `participant-frontend/src/hooks/useMediaPipeFaceMesh.ts`
**Función:**
- Load `@mediapipe/face_mesh` (CDN o npm)
- Run en paralelo con face-api.js usando el mismo video frame
- Extraer 468 landmarks → `facsClassifier.extractActionUnits(landmarks)`
- Merge AU values con el EmotionSample de face-api

#### 2.3 Actualizar EmotionSample con AUs reales
**Archivo:** `participant-frontend/src/hooks/useFaceApiEmotions.ts`
**Cambio:** Reemplazar `AU1:0, AU2:0, ...` hardcodeados con valores reales del `extractActionUnits()`.

#### 2.4 Actualizar analytics para AU data
**Archivo:** `backend/src/modules/analytics/eye-tracking.analytics.ts`
**Cambio:** Timeline buckets ya promedian AUs — una vez que llegan datos reales, se renderizan automáticamente.

#### 2.5 AU visualization en EmotionPanel
**Archivo:** `research-frontend/src/components/results/eye-tracking/EmotionPanel.tsx`
**Cambio:** Nuevo sub-tab "Action Units" con:
- Timeline de AU activación (heatmap: filas=AUs, columnas=tiempo, color=intensidad)
- Barras promedio por AU

**Tests Sprint 2:**
```typescript
// test/facs-action-units.test.ts

describe('FACS Action Units', () => {
  it('extractActionUnits should return non-zero values for smiling face', () => {
    const landmarks = mockSmilingLandmarks468(); // mock MediaPipe output
    const aus = extractActionUnits(landmarks);
    expect(aus.AU6).toBeGreaterThan(0);  // cheek raiser
    expect(aus.AU12).toBeGreaterThan(0); // lip corner puller
  });

  it('extractActionUnits should detect brow raise', () => {
    const landmarks = mockSurprisedLandmarks468();
    const aus = extractActionUnits(landmarks);
    expect(aus.AU1).toBeGreaterThan(0);  // inner brow raise
    expect(aus.AU2).toBeGreaterThan(0);  // outer brow raise
  });

  it('classifyEmotion should map AU12+AU6 to joy', () => {
    const aus = { AU1:0, AU2:0, AU4:0, AU6:0.7, AU12:0.8, AU15:0, AU20:0, AU25:0.3, AU26:0 };
    const emotion = classifyEmotion(aus);
    expect(emotion).toBe('joy');
  });

  it('EmotionSample should contain real AU values after pipeline', () => {
    const sample = createEmotionSample(faceApiResult, mediaPipeLandmarks);
    expect(sample.actionUnits.AU12).not.toBe(0);
  });

  it('backend timeline should aggregate AU values', () => {
    const samples = [
      { timestamp: 0, emotion: 'joy', confidence: 0.9, actionUnits: { AU1:0, AU6:0.5, AU12:0.8, AU4:0, AU2:0, AU15:0, AU20:0, AU25:0, AU26:0 } },
      { timestamp: 50, emotion: 'joy', confidence: 0.85, actionUnits: { AU1:0, AU6:0.6, AU12:0.7, AU4:0, AU2:0, AU15:0, AU20:0, AU25:0, AU26:0 } },
    ];
    const timeline = computeEmotionTimeline(samples, 1000);
    expect(timeline[0].avgActionUnits.AU6).toBeCloseTo(0.55);
    expect(timeline[0].avgActionUnits.AU12).toBeCloseTo(0.75);
  });
});
```

---

### Sprint 3: Micro-expresiones

#### 3.1 Detector de micro-expresiones
**Nuevo archivo:** `participant-frontend/src/lib/eyeTracking/microExpressionDetector.ts`
**Lógica:**
- Mantener sliding window de últimos N EmotionSamples (N=20, ~1s a 20fps)
- Detectar cambio de emoción que dura < 500ms y vuelve a la emoción base
- Clasificar: `brief` (<200ms), `micro` (200-500ms)
- Registrar: `{ emotion, duration_ms, startTimestamp, endTimestamp, peakConfidence, category }`

#### 3.2 Almacenar en response
**Archivo:** `participant-frontend/src/components/renderers/EyeTrackingRenderer.tsx`
**Cambio:** Agregar campo `microExpressions: MicroExpression[]` al response value.

#### 3.3 Analytics de micro-expresiones
**Archivo:** `backend/src/modules/analytics/eye-tracking.analytics.ts`
**Cambio:** Extraer `microExpressions` del response, computar:
- Frecuencia total y por emoción
- Distribución temporal (en qué segundo del viewing)
- Correlación con AOI (¿en qué estaba mirando?)

#### 3.4 UI micro-expresiones
**Archivo:** `research-frontend/src/components/results/eye-tracking/EmotionPanel.tsx`
**Cambio:** Nuevo sub-tab "Micro-expressions":
- Timeline markers sobre el timeline de emociones
- Tabla de micro-expresiones detectadas con timestamp + duración + emoción
- Badge count en el tab header

**Tests Sprint 3:**
```typescript
// test/micro-expressions.test.ts

describe('Micro-Expression Detection', () => {
  it('should detect a brief expression (<200ms)', () => {
    const samples = [
      { timestamp: 0, emotion: 'neutral', confidence: 0.9 },
      { timestamp: 50, emotion: 'surprise', confidence: 0.7 },  // flash
      { timestamp: 100, emotion: 'surprise', confidence: 0.8 },
      { timestamp: 150, emotion: 'neutral', confidence: 0.85 },  // back to base
    ];
    const micros = detectMicroExpressions(samples);
    expect(micros).toHaveLength(1);
    expect(micros[0].emotion).toBe('surprise');
    expect(micros[0].duration_ms).toBe(100);
    expect(micros[0].category).toBe('brief');
  });

  it('should detect a micro-expression (200-500ms)', () => {
    const samples = [
      { timestamp: 0, emotion: 'neutral', confidence: 0.9 },
      { timestamp: 100, emotion: 'disgust', confidence: 0.6 },
      { timestamp: 200, emotion: 'disgust', confidence: 0.65 },
      { timestamp: 300, emotion: 'disgust', confidence: 0.55 },
      { timestamp: 350, emotion: 'neutral', confidence: 0.8 },
    ];
    const micros = detectMicroExpressions(samples);
    expect(micros).toHaveLength(1);
    expect(micros[0].duration_ms).toBe(250);
    expect(micros[0].category).toBe('micro');
  });

  it('should NOT flag sustained emotions as micro', () => {
    const samples = Array.from({ length: 20 }, (_, i) => ({
      timestamp: i * 50,
      emotion: 'joy',
      confidence: 0.9,
    }));
    const micros = detectMicroExpressions(samples);
    expect(micros).toHaveLength(0);
  });

  it('should ignore low-confidence transients', () => {
    const samples = [
      { timestamp: 0, emotion: 'neutral', confidence: 0.9 },
      { timestamp: 50, emotion: 'fear', confidence: 0.2 },  // low confidence
      { timestamp: 100, emotion: 'neutral', confidence: 0.85 },
    ];
    const micros = detectMicroExpressions(samples, { minConfidence: 0.4 });
    expect(micros).toHaveLength(0);
  });
});
```

---

### Sprint 4: IAT refinamiento

#### 4.1 Trial-level <300ms exclusion
**Archivo:** `backend/src/modules/analytics/iat.analytics.ts`
**Cambio:** En `computeGreenwaldDScore()`, filtrar trials con RT < 300ms antes de calcular means (además del >10s ya existente).

#### 4.2 Split-half reliability
**Archivo:** `backend/src/modules/analytics/iat.analytics.ts`
**Cambio:** Computar correlación split-half (odd/even trials) → Spearman-Brown correction → reportar como `reliability` en el D-score card.

**Tests Sprint 4:**
```typescript
// test/iat-dscore.test.ts

describe('IAT D-score Refinement', () => {
  it('should exclude trials <300ms from D-score computation', () => {
    const trials = [
      { rt: 150, block: 'compatible' },   // excluded
      { rt: 500, block: 'compatible' },
      { rt: 600, block: 'compatible' },
      { rt: 400, block: 'incompatible' },
      { rt: 700, block: 'incompatible' },
      { rt: 800, block: 'incompatible' },
    ];
    const d = computeGreenwaldDScore(trials);
    // Should only use 5 trials (not the 150ms one)
    expect(d).toBeDefined();
    // Mean compatible = (500+600)/2 = 550
    // Mean incompatible = (400+700+800)/3 = 633
    // D should be based on these filtered means
  });

  it('should exclude trials >10000ms', () => {
    const trials = [
      { rt: 500, block: 'compatible' },
      { rt: 15000, block: 'compatible' },  // excluded
      { rt: 600, block: 'incompatible' },
    ];
    const d = computeGreenwaldDScore(trials);
    // 15000ms trial should be removed
  });

  it('should compute split-half reliability', () => {
    const trials = Array.from({ length: 40 }, (_, i) => ({
      rt: 500 + Math.random() * 300,
      block: i % 2 === 0 ? 'compatible' : 'incompatible',
    }));
    const reliability = computeSplitHalfReliability(trials);
    expect(reliability).toBeGreaterThan(0);
    expect(reliability).toBeLessThanOrEqual(1);
  });

  it('should return null reliability with <10 trials', () => {
    const trials = [
      { rt: 500, block: 'compatible' },
      { rt: 600, block: 'incompatible' },
    ];
    const reliability = computeSplitHalfReliability(trials);
    expect(reliability).toBeNull();
  });
});
```

---

## Criterios de aceptación para "verde"

| Sub-item | Criterio | Test |
|----------|----------|------|
| Eye Tracking Desktop | Calibración 9pts + validación + micro-recalib funciona, RMSE < 150px | Manual: completar sesión ET, verificar heatmap coherente |
| Eye Tracking Mobile | Click proxy con quality max `fair`, warning de cámara baja | Unit: `classifyQuality('click-proxy')` === `'fair'` |
| Eye Tracking Video | Video se congela al terminar, metadata `videoEnded` presente | Unit: `handleVideoEnded` test |
| Eye Tracking Shelf | Sin scroll en grid, coordenadas alineadas | Visual: shelf 5x4 sin scrollbar |
| FACS Action Units | 9 AUs con valores reales (no zeros) en EmotionSample | Unit: `extractActionUnits(landmarks)` con mocks |
| Micro-expresiones | Detectar transients <500ms, ignorar sustained | Unit: sliding window detector |
| Emotion Results | EmotionPanel con tabs: Distribution, Timeline, AUs, Micro-expressions | Visual: verificar 4 tabs renderizados |
| IAT D-score | Trials <300ms excluidos, >10s excluidos | Unit: `computeGreenwaldDScore` con edge cases |
| IAT Reliability | Split-half + Spearman-Brown en D-score card | Unit: `computeSplitHalfReliability` |

---

## Orden de prioridad

1. **Sprint 1** — Bugs y calidad ET (impacto directo en datos, bajo esfuerzo)
2. **Sprint 4** — IAT refinamiento (bajo esfuerzo, alto impacto en rigurosidad)
3. **Sprint 2** — FACS AUs (esfuerzo medio, diferenciador vs competencia)
4. **Sprint 3** — Micro-expresiones (esfuerzo medio, feature premium)

## Dependencias

```
Sprint 1 (ET bugs)     → sin dependencias
Sprint 4 (IAT)         → sin dependencias
Sprint 2 (FACS AUs)    → MediaPipe Face Mesh npm/CDN
Sprint 3 (Micro-expr)  → Sprint 2 (necesita AU data real para mejor detección)
```

## Estimación de archivos a modificar/crear

| Sprint | Archivos modificados | Archivos nuevos |
|--------|---------------------|-----------------|
| 1 | 4 (EyeTrackingRenderer, ShelfGrid, ViewingPhase, eye-tracking.analytics) | 0 |
| 2 | 3 (useFaceApiEmotions, EyeTrackingRenderer, EmotionPanel) | 1 (useMediaPipeFaceMesh) |
| 3 | 3 (EyeTrackingRenderer, eye-tracking.analytics, EmotionPanel) | 1 (microExpressionDetector) |
| 4 | 1 (iat.analytics) | 0 |
