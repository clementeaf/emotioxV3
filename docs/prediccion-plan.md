# Attention Prediction — Plan de producto (AOI-first)

> Documento de decisiones bloqueantes para el rediseño del flujo de Predicción de Atención.
> Origen: feedback en `docs/prediccion.md` + revisión backend/frontend (jun 2026).

---

## Contexto

### Problema actual

1. Al subir una imagen, el frontend dispara **AI Analysis automáticamente** (upload + bulk on mount).
2. **`POST /predict` (TranSalNet)** nunca se llama para imágenes — solo existe para video.
3. Tras el análisis IA, el frontend **sintetiza el heatmap visual desde `autoAois`**, no desde TranSalNet. Un AOI mal ubicado por la IA genera una nube de calor encima de ese recuadro.
4. El usuario no puede **nombrar ni mover** AOIs; el tab inicial es Original, no AOI Editor.
5. El campo de prompt se llama "Prompt" en UI; no hay guía de estructura ideal.

### Flujo objetivo

```
Upload → AOI Editor (+ criterio opcional) → Generar heatmap (predict) → AI Analysis (manual)
```

El heatmap mostrado siempre proviene de `heatmapData` del backend (TranSalNet + fusión híbrida). Los `autoAois` de la IA son overlay informativo, no fuente del heatmap.

---

## Decisiones bloqueantes (LOCKED)

| ID | Decisión | Resolución | Estado |
|----|----------|------------|--------|
| **D-01** | ¿Predict obligatorio antes de analyze? | **Sí.** `AI Analysis` deshabilitado hasta que exista `heatmapData` en el stimulus. | LOCKED |
| **D-02** | ¿Auto-analyze al upload o al montar la vista? | **No.** Eliminar bulk on mount y analyze en upload. Solo manual o botón explícito. | LOCKED |
| **D-03** | ¿Heatmap visual post-analyze? | **Siempre TranSalNet** (`settings.stimuli[].heatmapData`). Eliminar síntesis desde `autoAois`. Overlay dashed de zonas IA opcional (toggle). | LOCKED |
| **D-04** | ¿AOIs manuales alimentan predict/analyze? | **Analyze (v0.77):** AOIs manuales al LLM. **Predict (v0.78):** boost semántico + espacial en hybrid grid. | LOCKED |
| **D-05** | Renombrar "Prompt" en UI | **Sí.** ES: "Criterio de análisis". EN: "Analysis criteria". Campo backend sigue siendo `attentionPrompt`. | LOCKED |
| **D-06** | Tab inicial tras upload de imagen | **`aoi-editor`** para estímulos nuevos (sin `processedAt` ni `aiAnalysis`). Estudios existentes respetan último tab o default según tengan datos. | LOCKED |
| **D-07** | Gate mínimo antes de predict/analyze | **≥ 1 AOI manual** O confirmación explícita **"Continuar sin zonas"** (persistir `stimulus.aoiSkipped: true`). | LOCKED |

### Validación stakeholder

| Item | Responsable | Fecha | Notas |
|------|-------------|-------|-------|
| D-07 gate de AOIs | Alexis / equipo UX | Pendiente | Confirmar que "Omitir zonas" es aceptable para estudios rápidos |
| D-05 rename UI | Alexis | Pendiente | Aprobar copy "Criterio de análisis" vs alternativas |

---

## Alcance por versión

### v0.77.0 — AOI-first (MVP)

- Fase 1: Eliminar heatmap sintético desde `autoAois`
- Fase 2: Conectar `predictAttention` en flujo de imágenes
- Fase 3: Tab inicial AOI Editor + gate D-07 + rename criterio (D-05)
- Fase 4: Editor AOI — nombrar, mover, redimensionar
- Fase 5: Plantilla y presets de criterio
- Fase 6: Backend — AOIs manuales como input al analyze
- Fase 8: Panel IA con estados vacíos y prereqs
- Fase 9: Banner migración estudios sin heatmap

### v0.78.0 — Manual AOI boost en predict (Fase 7)

- AOIs manuales en `POST /predict` (body o `stimulus.aois`)
- Semantic grid prompt + `boostSemanticGridForManualAois` + `applyManualAoiBoost`
- Frontend envía `liveAois` al generar heatmap

---

## Especificación funcional resumida

### Upload imagen

1. Persistir stimulus en `settings.stimuli[]`.
2. **No** llamar analyze.
3. Abrir tab `aoi-editor`.
4. Mostrar stepper: `Definir zonas → Criterio → Generar heatmap`.

### AOI Editor

| Acción | Comportamiento |
|--------|----------------|
| Crear zona | Dibujar rect → modal nombre → persistir en `stimulus.aois[]` |
| Renombrar | Double-click en chip → inline edit → debounce persist |
| Mover / resize | Drag en rect + 8 handles; min 2% ancho/alto |
| Eliminar | Botón × en chip o tecla Delete con AOI seleccionado |
| Importar IA | Manual desde panel derecho; marcar `source: 'imported-ai'` |
| Importar grid | Botón si hay `griddedAOIs` y no hay AOIs manuales |
| Omitir zonas | Set `aoiSkipped: true`; habilita predict |

### Criterio de análisis

- Drawer accesible desde header ("Criterio").
- Guardado en `settings.attentionPrompt` (vacío = default del sistema).
- Presets en `localStorage` key `emotiox-criteria-presets`.
- Plantilla recomendada con secciones: Rol, Contexto, Preguntas, Formato JSON, Idioma.

**FAQ incorporada:**

- ¿Debe estar en inglés? **No.** Responder en el idioma del contenido visible en la imagen.
- ¿Estructura ideal? Ver plantilla en drawer y sección abajo.

### Generar heatmap (predict)

- Botón "Generar heatmap" → `POST /attention-prediction/research/:id/predict/:mediaId`.
- Requiere gate D-07 cumplido.
- Envía `stimulus.aois[]` al backend si existen (boost híbrido en zonas manuales).
- Resultado en `stimulus.heatmapData`, `autoPresets`, `griddedAOIs`, `processedAt`.
- Tab Heatmap habilitado con datos reales TranSalNet.

### AI Analysis

- Botón "AI Analysis" / "Re-analyze" → `POST .../analyze/:mediaId`.
- Requiere `heatmapData.length > 0` + gate D-07.
- Envía `stimulus.aois[]` al backend si existen.
- Panel derecho visible antes del análisis (empty state con checklist).
- `autoAois` del LLM = overlay dashed; **no** modifican `HeatmapRenderer.data`.

### Video

- Sin cambios en v0.77: upload → extract frames → video-predict → SSE.
- AOI Editor sigue oculto para video.

---

## Plantilla recomendada — Criterio de análisis

```text
## Rol
Eres un experto en análisis de atención visual, diseño UX y neurodesign (Gestalt, carga cognitiva, jerarquía visual).

## Contexto del estímulo
[Tipo: packaging / web / shelf / publicidad / otro]
[Descripción breve del material y objetivo del estudio]

## Zonas definidas por el investigador
Las siguientes AOIs fueron marcadas manualmente y deben usarse como referencia principal:
[Se completan automáticamente al analizar si hay AOIs guardadas]

## Preguntas a responder
1. ¿Qué elementos capturan la atención primero?
2. ¿El flujo visual guía hacia el mensaje clave?
3. ¿Hay áreas de fuga de atención?
4. [Agregar preguntas específicas del estudio]

## Formato de salida
Responde SOLO con JSON válido según el schema del sistema.
Coordenadas en porcentaje (0-100) relativas a las dimensiones de la imagen.

## Idioma
Responde en el mismo idioma que el texto visible en la imagen (español si el contenido es en español).
```

---

## Modelo de datos (frontend → backend)

### `stimulus.aois[]` (manual)

```typescript
interface ManualAOI {
  id: string;
  label: string;
  x: number;       // 0-100, top-left
  y: number;
  width: number;
  height: number;
  source?: 'manual' | 'imported-ai' | 'imported-grid';
}
```

### `stimulus.aoiSkipped`

```typescript
aoiSkipped?: boolean;  // true si usuario confirmó "Continuar sin zonas"
```

### Campos existentes (sin cambio de nombre)

| Campo | Origen |
|-------|--------|
| `heatmapData` | POST predict |
| `autoPresets`, `griddedAOIs` | POST predict |
| `aiAnalysis`, `aiAnalysisStatus` | POST analyze |
| `attentionPrompt` | settings research (UI: Criterio) |

---

## Migración estudios existentes

| Condición | Acción |
|-----------|--------|
| Tiene `aiAnalysis` pero no `heatmapData` | Banner: "Regenerar heatmap" con botón predict |
| Tiene `heatmapData` | Sin acción; heatmap real ya disponible si alguna vez corrió predict |
| AOIs importados pre-migración | Mantener; asignar `source: 'manual'` al cargar |

No re-analyze automático en migración.

---

## Criterios de aceptación (UAT)

- [ ] Upload imagen → no hay request a `/analyze` en Network tab
- [ ] Tab inicial = AOI Editor en estímulo nuevo
- [ ] Sin AOIs ni skip → botones predict/analyze disabled con tooltip explicativo
- [ ] Click "Generar heatmap" → `/predict` → heatmap visible en tab Heatmap
- [ ] Tras AI Analysis, heatmap **no** se desplaza a recuadros `autoAois` erróneos
- [ ] AOIs: crear, renombrar, mover, resize, eliminar — persisten al recargar
- [ ] Criterio guardado se aplica en siguiente analyze
- [ ] Video flow sin regresiones

---

## Referencias técnicas

| Área | Archivos clave |
|------|----------------|
| View / flujo | `research-frontend/src/components/research/AttentionPredictionView.tsx` |
| Card / AOI / heatmap | `research-frontend/src/components/research/AttentionPredictionCard.tsx` |
| API client | `research-frontend/src/services/media.service.ts` |
| Predict controller | `backend/src/modules/attention-prediction/attention-prediction.controller.ts` |
| AI analyze | `backend/src/modules/attention-prediction/ai-analysis.service.ts` |
| Feedback original | `docs/prediccion.md` |

---

## Historial

| Fecha | Cambio |
|-------|--------|
| 2026-06-06 | Creación del documento. Decisiones D-01…D-07 LOCKED con opciones recomendadas. |
