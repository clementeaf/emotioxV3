# Eye Tracking Refactor — Plan de Implementacion Incremental

> Cada fase es independiente, desplegable, y testeable. No rompe funcionalidad existente hasta Phase 7 (migration toggle).

## Estado actual

```
BlazeGaze CNN → One-Euro Filter → IDW Calibration (13pt) → I-DT Fixation
→ hybridPointToSoftZoneWeights (3x3 grid fijo) → zoneMass + fixations[]
→ saveResponse('eye-tracking-data', JSON con coords + zoneMass)
```

- **Archivos clave participant**: EyeTrackingRenderer.tsx (878 ln), useBlazeGaze.ts (287 ln), lib/eyeTracking/ (15 archivos, 2212 ln)
- **Backend analytics**: eye-tracking.analytics.ts (~700 ln) — soft Gaussian AOI, sequence, emotions
- **Results UI**: 12 componentes (~70K ln) — heatmap, scanpath, first look, transparency, sequence, emotions, video gaze
- **Datos persistidos**: fixations[{x,y,duration,timestamp}], zoneMass{r0c0..r2c2}, emotions[], gazeTimeline[]

## Arquitectura objetivo

```
BlazeGaze CNN → One-Euro Filter → Head Pose Compensation → IDW Calibration
→ Uncertainty Radius → Zone Classifier (probabilistico) → Hysteresis Engine
→ Zone Event API (onZoneEnter/Leave/onFixationStart/End)
→ Persistencia por eventos de zona (no coords)
```

---

## Phase 1 — Zone Registry

**Objetivo**: Sistema para definir, registrar y resolver zonas dinamicas sobre el stimulus.

**Que se construye**:
- `lib/eyeTracking/zoneRegistry.ts` — registro de zonas con `getBoundingClientRect` automatico
- Interfaz `Zone { id, label, element?, rect: DOMRect, priority? }`
- `ZoneRegistry` class: `register(id, element)`, `unregister(id)`, `updateAll()`, `getZones()`, `getZoneAt(x, y)`
- ResizeObserver interno que actualiza rects cuando el layout cambia
- Fallback a grid N×N configurable cuando no hay zonas definidas (equivalente al 3×3 actual)
- Hook `useZoneRegistry(stimulusRef)` que expone el registry al renderer

**Que NO se toca**: Pipeline de gaze existente. Solo se agrega infraestructura nueva.

**Archivos nuevos**:
- `participant-frontend/src/lib/eyeTracking/zoneRegistry.ts`
- `participant-frontend/src/hooks/useZoneRegistry.ts`

**Tests** (vitest):
- `zoneRegistry.test.ts`:
  - Registro/desregistro de zonas (add, remove, clear)
  - `getZoneAt(x,y)` retorna zona correcta para punto interior
  - `getZoneAt(x,y)` retorna null para punto fuera de todas las zonas
  - Zonas solapadas: retorna la de mayor prioridad
  - `updateAll()` refleja cambios de layout (mock DOMRect)
  - Fallback grid N×N genera N² zonas uniformes
  - Grid 3×3 produce mismos IDs que `HYBRID_AOI_GRID` actual (backward compat)
  - ResizeObserver callback actualiza rects
  - Edge case: zona con width/height 0 se ignora
  - Edge case: elemento removido del DOM retorna rect {0,0,0,0}

**Criterio de completitud**: Registry funciona standalone, sin wiring al pipeline.

---

## Phase 2 — Probabilistic Zone Classifier

**Objetivo**: Transformar cada muestra de gaze en distribucion de probabilidad sobre zonas.

**Que se construye**:
- `lib/eyeTracking/zoneClassifier.ts`
- Input: `(gazeX, gazeY, uncertaintyRadius, zones: Zone[])` → Output: `ZoneProbability[]`
- `ZoneProbability { zoneId, confidence: number [0-1], distance: number }`
- Algoritmo: Gaussian 2D desde el punto de gaze. Zonas dentro del radio de incertidumbre participan. Confidence = area de overlap normalizada.
- Radio configurable: `UNCERTAINTY_RADIUS_DESKTOP = 120px`, `UNCERTAINTY_RADIUS_MOBILE = 200px`
- `classifyGaze(x, y, radius, zones)` → `ZoneProbability[]` ordenado por confidence desc
- Top-1 zone con confidence > threshold (0.3) = zona asignada. Bajo threshold = `null` (mirada fuera de zonas).

**Archivos nuevos**:
- `participant-frontend/src/lib/eyeTracking/zoneClassifier.ts`

**Tests**:
- `zoneClassifier.test.ts`:
  - Punto centrado en una zona → confidence ~1.0
  - Punto en borde entre 2 zonas → ambas con confidence >0, suma ~1.0
  - Punto fuera de todas las zonas → array vacio o todas <threshold
  - Radio grande → mas zonas participan, confidences mas distribuidas
  - Radio pequeno → menos zonas, top-1 confidence mas alta
  - Zona grande vs zona pequena equidistantes → la grande tiene mas confidence
  - Punto exactamente en esquina de 4 zonas → las 4 participan
  - Performance: 1000 clasificaciones con 20 zonas < 16ms (1 frame)
  - Input con 0 zonas → array vacio
  - Zonas solapadas: ambas reciben probability proporcional

**Criterio de completitud**: Funcion pura, sin side effects, sin wiring.

---

## Phase 3 — Hysteresis Engine

**Objetivo**: Evitar saltos erraticos entre zonas. Mantener zona actual hasta que otra supere confidence durante ventana temporal.

**Que se construye**:
- `lib/eyeTracking/hysteresisEngine.ts`
- `HysteresisEngine` class con estado interno:
  - `currentZone: string | null`
  - `candidateZone: string | null`
  - `candidateStartTime: number`
  - `SWITCH_THRESHOLD_MS = 200` (configurable, 150-250ms segun spec)
- Metodo `update(zoneProbabilities: ZoneProbability[], timestamp: number)` → `{ zone: string | null, changed: boolean }`
- Logica:
  1. Top-1 de probabilities = candidata
  2. Si candidata == currentZone → reset candidate timer, no cambio
  3. Si candidata != currentZone y candidata == candidateZone → check timer
     - Si timer >= SWITCH_THRESHOLD_MS → switch (changed=true)
  4. Si candidata es nueva → iniciar candidateZone + timer
- Metodo `reset()` para limpiar estado entre stimuli
- Metodo `getCurrentZone()` → zona estable actual

**Archivos nuevos**:
- `participant-frontend/src/lib/eyeTracking/hysteresisEngine.ts`

**Tests**:
- `hysteresisEngine.test.ts`:
  - Zona estable: misma zona por 500ms → no cambio, confidence alta
  - Cambio de zona: nueva zona por 200ms → switch
  - Cambio rapido: nueva zona por 100ms luego vuelve → NO switch (hysteresis funciona)
  - Oscilacion rapida A-B-A-B cada 50ms → se queda en zona original
  - Primera muestra: sin zona previa → asigna inmediatamente (no espera threshold)
  - `reset()` limpia estado, proxima muestra es "primera"
  - Zona null (fuera de zonas) por >threshold → currentZone pasa a null
  - Timestamp no monotono → maneja gracefully (usa abs diff)
  - 3 zonas alternando: A(300ms) → B(50ms) → C(300ms) → termina en C
  - Threshold configurable: 150ms vs 250ms produce resultados distintos con mismo input

**Criterio de completitud**: Engine funciona standalone con datos sinteticos.

---

## Phase 4 — Zone Event API

**Objetivo**: API interna que emite eventos de zona. El resto de la app consume esto, nunca coords.

**Que se construye**:
- `lib/eyeTracking/zoneEventEmitter.ts`
- Eventos:
  - `onZoneEnter(zoneId, confidence, timestamp)`
  - `onZoneLeave(zoneId, dwellTime, timestamp)`
  - `onFixationStart(zoneId, confidence, timestamp)`
  - `onFixationEnd(zoneId, duration, timestamp)`
- Estado expuesto:
  - `currentZone: string | null`
  - `confidence: number`
  - `fixationTime: number`
  - `emotion: EkmanEmotion | null`
- `ZoneEventEmitter` class: integra ZoneClassifier + HysteresisEngine + I-DT
- Metodo `feed(gazeX, gazeY, timestamp, emotion?)` — llamado cada 50ms desde ViewingPhase
- Listeners via `on(event, callback)` / `off(event, callback)`
- Hook `useZoneEvents(emitter)` que expone estado reactivo (throttled 250ms para renders)

**Archivos nuevos**:
- `participant-frontend/src/lib/eyeTracking/zoneEventEmitter.ts`
- `participant-frontend/src/hooks/useZoneEvents.ts`

**Tests**:
- `zoneEventEmitter.test.ts`:
  - Feed 10 muestras en zona A → emite onZoneEnter(A) una vez
  - Feed zona A luego zona B (con hysteresis) → emite onZoneLeave(A) + onZoneEnter(B)
  - Fixation dentro de zona (>120ms, dispersion <70px) → emite onFixationStart/End
  - Multiples listeners → todos reciben el evento
  - `off` desregistra → no recibe mas eventos
  - Estado `currentZone` refleja zona estable post-hysteresis
  - Emotion se propaga al estado cuando se provee
  - Sin zonas registradas → no emite eventos, currentZone = null
  - Feed con timestamps desordenados → maneja gracefully
  - `destroy()` limpia listeners y estado
- `useZoneEvents.test.ts` (react testing):
  - Hook retorna estado inicial { currentZone: null, confidence: 0 }
  - Actualiza estado cuando emitter cambia de zona (throttled)
  - Cleanup on unmount

**Criterio de completitud**: API funcional end-to-end con datos sinteticos. No wired al pipeline real aun.

---

## Phase 5 — Head Pose Compensation

**Objetivo**: Corregir gaze basado en orientacion de cabeza antes de calibracion IDW.

**Que se construye**:
- Expandir `lib/eyeTracking/headPose.ts` (actualmente 31 lineas, solo extrae angulos)
- `compensateHeadPose(gazeX, gazeY, pitch, yaw, roll)` → `{x, y}` corregido
- Modelo: offset lineal proporcional a yaw (horizontal) y pitch (vertical)
  - `correctedX = gazeX - yaw * HEAD_POSE_GAIN_X` (gain ~2.5px/grado)
  - `correctedY = gazeY - pitch * HEAD_POSE_GAIN_Y` (gain ~3.0px/grado)
  - Roll: rotacion menor, ignorar salvo >15 grados
- Gains calibrables (constantes en `constants.ts`)
- Integrar en pipeline de `useBlazeGaze.ts` entre One-Euro y IDW

**Archivos modificados**:
- `participant-frontend/src/lib/eyeTracking/headPose.ts` (expandir)
- `participant-frontend/src/lib/eyeTracking/constants.ts` (agregar gains)
- `participant-frontend/src/hooks/useBlazeGaze.ts` (insertar en pipeline)

**Tests**:
- `headPose.test.ts`:
  - Yaw 0, pitch 0 → sin correccion (passthrough)
  - Yaw +10 grados → X corregido -25px
  - Pitch +10 grados → Y corregido -30px
  - Yaw y pitch combinados → ambas correcciones aplicadas
  - Roll <15 grados → sin correccion
  - Roll >15 grados → warning flag (no correccion, pero marca calidad)
  - Valores extremos (yaw 45+) → clamp de correccion (max 100px)
  - NaN/undefined en angulos → passthrough sin crash
  - Gains configurables → resultado proporcional al gain
  - Correccion no desplaza fuera del viewport (clamp 0..viewportW/H)

**Criterio de completitud**: Pipeline BlazeGaze → OneEuro → HeadPose → IDW. Medible en calibracion (RMSE deberia bajar).

---

## Phase 6 — Calibration Overhaul

**Objetivo**: Calibracion persistente, recalibracion parcial, deteccion de puntos deficientes.

**Que se construye**:
- `lib/eyeTracking/calibrationStore.ts` — persistencia localStorage (no sessionStorage)
  - Key: `emotiox-et-calibration-v2`
  - TTL configurable: default 30 min (vs 2 min actual)
  - Guarda: residuals[], rmse, timestamp, deviceFingerprint (resolution + userAgent hash)
  - Solo reutiliza si mismo dispositivo/resolucion
- Modificar `CalibrationPhase.tsx`:
  - Si calibracion valida en store → ofrecer "Usar calibracion anterior" o "Recalibrar"
  - Mostrar RMSE de calibracion guardada
- Modificar `ValidationPhase.tsx`:
  - Evaluar cada punto de calibracion individualmente (no solo RMSE global)
  - Marcar puntos con error >threshold como "deficientes"
  - Ofrecer recalibracion parcial: solo los puntos malos (no los 13)
  - `recalibratePartial(badPointIndices)` → reemplaza solo esos residuals
- Multi-point validation: 3 puntos de validacion (no solo 1) para mejor deteccion
- Heuristicas de calidad por punto: `pointError[i] > 1.5 * medianError` → deficiente

**Archivos nuevos**:
- `participant-frontend/src/lib/eyeTracking/calibrationStore.ts`

**Archivos modificados**:
- `participant-frontend/src/lib/eyeTracking/constants.ts` (nuevos thresholds)
- `participant-frontend/src/lib/eyeTracking/hybridCalibrationField.ts` (partial recal)
- `participant-frontend/src/components/renderers/eye-tracking/CalibrationPhase.tsx`
- `participant-frontend/src/components/renderers/eye-tracking/ValidationPhase.tsx`

**Tests**:
- `calibrationStore.test.ts`:
  - Save + load round-trip preserva datos
  - TTL expirado → retorna null
  - Device fingerprint distinto → retorna null (no reutiliza)
  - Mismo fingerprint → retorna calibracion
  - `clear()` elimina datos
  - Datos corruptos en localStorage → retorna null (no crash)
  - Multiples saves → ultimo gana
- `partialRecalibration.test.ts`:
  - 13 puntos, 2 deficientes → solo esos 2 se recalibran
  - Residuals de puntos buenos se preservan
  - RMSE post-parcial < RMSE pre-parcial (con datos sinteticos)
  - Deteccion de puntos deficientes: error > 1.5x mediana
  - 0 puntos deficientes → no ofrece recalibracion
  - Todos deficientes → recalibracion completa
  - Validacion con 3 puntos: RMSE por punto retornado
  - Edge: solo 1 residual → no puede calcular mediana, recal completa

**Criterio de completitud**: Calibracion funciona end-to-end. RMSE medible. Skip de recal verificable.

---

## Phase 7 — Pipeline Integration + Persistence Migration

**Objetivo**: Conectar Phase 1-6 al pipeline real. Cambiar formato de persistencia a eventos de zona.

**Que se construye**:
- Feature flag: `EYE_TRACKING_V2 = true/false` en config (toggle gradual)
- Modificar `EyeTrackingRenderer.tsx` → `ViewingPhase`:
  - Si V2: gazePos → HeadPose → IDW → ZoneClassifier → Hysteresis → ZoneEventEmitter
  - Emitter alimenta `zoneEventsRef[]` en vez de `gazePointsRef[]`
  - I-DT fixation detection opera sobre zonas (no coords)
- Nuevo formato de response (V2):
  ```typescript
  {
    version: 2,
    zoneEvents: [{
      type: 'enter' | 'leave' | 'fixation_start' | 'fixation_end',
      zoneId: string,
      confidence: number,
      timestamp: number,
      duration?: number,      // solo en leave/fixation_end
      emotion?: EkmanEmotion  // si disponible
    }],
    zoneMetrics: {
      [zoneId]: {
        totalDwellTime: number,
        fixationCount: number,
        avgConfidence: number,
        firstEntryTimestamp: number,
        visitCount: number
      }
    },
    zones: [{                 // definicion de zonas usadas
      id: string,
      label: string,
      rect: { x, y, width, height }  // % del stimulus
    }],
    calibration: {
      method: string,
      rmsePx: number,
      pointCount: number,
      persistent: boolean     // reutilizo calibracion guardada?
    },
    metadata: {
      trackingMethod: 'blazegaze-v2' | 'click-proxy',
      deviceType: string,
      uncertaintyRadius: number,
      hysteresisMs: number,
      gazeSampleCount: number,
      pipeline: 'zone-event-v2'
    },
    // BACKWARD COMPAT (opcional, removible en v3):
    fixations?: [...],        // generadas desde zoneEvents para analytics legacy
    zoneMass?: {...}           // generada desde zoneMetrics para analytics legacy
  }
  ```
- Adaptar `CompletePhase` para computar zoneMetrics desde zoneEvents
- Fallback fields (fixations, zoneMass) generados client-side para backward compat

**Archivos modificados**:
- `participant-frontend/src/components/renderers/EyeTrackingRenderer.tsx`
- `participant-frontend/src/components/renderers/eye-tracking/ViewingPhase.tsx`
- `participant-frontend/src/components/renderers/eye-tracking/CompletePhase.tsx`
- `participant-frontend/src/lib/eyeTracking/index.ts` (re-exports)

**Tests**:
- `pipelineV2.integration.test.ts`:
  - Pipeline completo con gaze sintetico → produce zoneEvents validos
  - zoneEvents contiene enter/leave pares balanceados
  - zoneMetrics.totalDwellTime = suma de duraciones leave
  - Fixations de backward compat generadas correctamente
  - zoneMass de backward compat coincide con zoneMetrics (normalizado)
  - Feature flag off → pipeline V1 intacto
  - Feature flag on → pipeline V2 activo
  - Mobile click-proxy → genera zoneEvents desde taps
  - Video stimulus → zoneEvents incluyen videoTime
  - Response JSON < 50KB para sesion tipica (vs ~200KB V1 con coords)
- `zoneMetrics.test.ts`:
  - Computo correcto de firstEntryTimestamp (primer enter)
  - visitCount = numero de enters
  - avgConfidence = promedio de confidences en fixations
  - Zona sin visitas → todos los valores en 0
  - Multiples visitas a misma zona → acumula correctamente

**Criterio de completitud**: Toggle V2 encendido produce datos zone-event. Toggle apagado mantiene V1. Analytics legacy sigue funcionando via fallback fields.

---

## Phase 8 — Backend Analytics Adaptation

**Objetivo**: Backend consume zoneEvents nativamente (no solo fallback fields).

**Que se construye**:
- Modificar `eye-tracking.analytics.ts`:
  - Detectar `version: 2` en response value
  - Si V2: leer `zoneEvents` + `zoneMetrics` directamente
  - Si V1: pipeline actual (fixations + zoneMass)
  - Dual-read transparente
- Nuevas metricas nativas de zona:
  - Tiempo total por zona (directo de zoneMetrics)
  - Primera zona observada (min firstEntryTimestamp)
  - Orden de exploracion (secuencia de enters)
  - Mapa de calor por zonas (zoneMetrics → heatmap proporcional)
  - Porcentaje de atencion por zona
  - Secuencia de fijaciones (zoneEvents type=fixation_start)
- AOI intersection simplificada: zona == AOI (no Gaussian soft match)
- Sequence analysis: directo desde zoneEvents (no recalcular)
- Emotion × zone: timestamp match entre zoneEvents y emotions

**Archivos modificados**:
- `backend/src/modules/analytics/eye-tracking.analytics.ts`

**Tests**:
- `eyeTrackingAnalyticsV2.test.ts`:
  - Response V2 → metricas correctas sin usar fixations
  - Response V1 → pipeline legacy funciona igual (regresion)
  - Mix V1 + V2 participants → metricas combinadas correctas
  - zoneMetrics → heatmap data generada (centroide de zona, intensidad = dwellTime)
  - Primera zona observada = zona con min firstEntryTimestamp
  - Orden de exploracion = secuencia de zoneIds unicos en zoneEvents
  - Transition matrix desde zoneEvents (enter despues de leave)
  - Emotion × zone correlation desde timestamps
  - Quality gate: V2 usa calibration.rmsePx
  - Participante sin zoneEvents (sesion vacia) → handled gracefully

**Criterio de completitud**: `GET /analytics/research/:id/eye-tracking` retorna datos correctos para V1, V2, y mix.

---

## Phase 9 — Results UI Adaptation

**Objetivo**: Results frontend consume datos V2 nativamente. Nuevas visualizaciones zone-based.

**Que se construye**:
- `ZoneHeatmapOverlay.tsx` — expandir para N zonas dinamicas (no solo 3×3)
  - Recibir `zones[]` con geometria + intensidad
  - Renderizar overlay con opacidad proporcional a atencion
  - Labels con nombre de zona + porcentaje
- `ScanpathOverlay.tsx` — modo zona:
  - Flechas entre centroides de zonas (no entre coords exactas)
  - Grosor de flecha proporcional a transiciones
  - Numeros de orden de visita
- `SequencePanel.tsx` — usar zoneEvents directamente si disponibles
- Heatmap coord-based: sigue funcionando con fallback fixations (V1 data)
- Transparency map: funciona con fallback fixations
- Nuevos indicadores:
  - "Primera zona vista" badge
  - "Tiempo medio por zona" bar chart
  - "Orden de exploracion" timeline horizontal
  - Confidence promedio badge

**Archivos modificados**:
- `research-frontend/src/components/results/eye-tracking/ZoneHeatmapOverlay.tsx`
- `research-frontend/src/components/results/eye-tracking/ScanpathOverlay.tsx`
- `research-frontend/src/components/results/eye-tracking/SequencePanel.tsx`
- `research-frontend/src/components/results/eye-tracking/StimulusCard.tsx`

**Archivos nuevos**:
- `research-frontend/src/components/results/eye-tracking/ZoneMetricsPanel.tsx`

**Tests**:
- `zoneHeatmapOverlay.test.tsx`:
  - Renderiza N zonas con opacidad correcta
  - Zona con 0% atencion → transparente
  - Zona con 100% atencion → opacidad maxima
  - Labels visibles con nombre + porcentaje
  - Responsive a cambios de tamano de imagen
- `scanpathZoneMode.test.tsx`:
  - Flechas entre centroides correctas
  - Grosor proporcional a frecuencia de transicion
  - Numeros de orden visibles
  - Sin transiciones → sin flechas
- `zoneMetricsPanel.test.tsx`:
  - Bar chart con tiempos por zona
  - Primera zona badge muestra zona correcta
  - Datos V1 (sin zoneMetrics) → panel oculto o fallback
  - Datos V2 → panel completo

**Criterio de completitud**: Results muestra datos V1 y V2 correctamente. Nuevas visualizaciones para V2.

---

## Phase 10 — Device Adaptation + Cleanup

**Objetivo**: Tuning por dispositivo. Remover codigo legacy cuando V2 sea estable.

**Que se construye**:
- `lib/eyeTracking/deviceProfile.ts`:
  - `getDeviceProfile()` → `{ uncertaintyRadius, hysteresisMs, minConfidence, calibrationStrategy }`
  - Desktop: radius 120px, hysteresis 200ms, precision horizontal prioritaria
  - Tablet: radius 160px, hysteresis 250ms, tolerancia movimiento cabeza +50%
  - Mobile: radius 200px, hysteresis 300ms, click-proxy mejorado con zonas
- Mobile click-proxy mejorado:
  - Tap genera `zoneEvent` con zona tocada (no solo coords)
  - Confidence = 1.0 para taps (touch es preciso)
  - Hysteresis no aplica (cada tap es intencional)
- Desktop head pose tolerance ajustada por perfil
- Feature flag `EYE_TRACKING_V2` removible cuando:
  - 100% de nuevos datos son V2
  - Analytics dual-read probado con datos reales
  - Fallback fields opcionales

**Archivos nuevos**:
- `participant-frontend/src/lib/eyeTracking/deviceProfile.ts`

**Archivos modificados**:
- `participant-frontend/src/components/renderers/EyeTrackingRenderer.tsx` (device profile)
- `participant-frontend/src/lib/eyeTracking/zoneClassifier.ts` (radius from profile)
- `participant-frontend/src/lib/eyeTracking/hysteresisEngine.ts` (threshold from profile)

**Tests**:
- `deviceProfile.test.ts`:
  - Desktop → radius 120, hysteresis 200
  - Tablet → radius 160, hysteresis 250
  - Mobile → radius 200, hysteresis 300
  - userAgent parsing correcto para cada tipo
  - Perfil desconocido → defaults a desktop
- `mobileZoneTap.test.ts`:
  - Tap dentro de zona → zoneEvent con confidence 1.0
  - Tap fuera de zonas → zoneEvent con zoneId null
  - Tap en borde de zona → asigna zona mas cercana
  - Multiples taps rapidos → cada uno genera evento (sin hysteresis)

**Criterio de completitud**: Sistema adaptado a cada dispositivo. Pipeline V2 es el default.

---

## Resumen de fases

| Phase | Scope | Archivos nuevos | Archivos mod | Tests | Riesgo |
|-------|-------|-----------------|-------------|-------|--------|
| 1. Zone Registry | Infra | 2 | 0 | 10 | Bajo |
| 2. Zone Classifier | Infra | 1 | 0 | 10 | Bajo |
| 3. Hysteresis Engine | Infra | 1 | 0 | 10 | Bajo |
| 4. Zone Event API | Infra | 2 | 0 | 13 | Bajo |
| 5. Head Pose Comp | Pipeline | 0 | 3 | 10 | Medio |
| 6. Calibration | UX | 1 | 4 | 15 | Medio |
| 7. Pipeline + Persist | Integration | 0 | 4 | 12 | Alto |
| 8. Backend Analytics | Backend | 0 | 1 | 10 | Medio |
| 9. Results UI | Frontend | 1 | 4 | 9 | Medio |
| 10. Device Adapt | Polish | 1 | 3 | 9 | Bajo |

**Total**: ~9 archivos nuevos, ~19 archivos modificados, ~108 tests.

## Orden recomendado

```
Phase 1 → 2 → 3 → 4 (fundaciones, sin riesgo, paralelizables 1+2)
Phase 5 → 6 (pipeline improvements, desplegables independientemente)
Phase 7 (integracion — punto critico, necesita feature flag)
Phase 8 → 9 (consumo de datos V2, paralelizables)
Phase 10 (polish + cleanup)
```

Phases 1-4 se pueden implementar y testear sin tocar el pipeline existente.
Phase 7 es el unico punto donde el sistema "cambia" — protegido por feature flag.
