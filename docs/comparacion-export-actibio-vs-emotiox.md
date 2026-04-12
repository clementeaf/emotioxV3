# Export de datos: ActiBIO (CoolTool) vs EmotioX — Comparacion

Fecha: 2026-04-12
Fuente: `docs/ActiBIO_2 389371355 22 Dec 2023.xlsx` (90 participantes, 263 columnas)

---

## 1. Estructura del estudio ActiBIO

El XLSX contiene un estudio completo de producto (yogurt ActiBIO) con:
- Screener demografico (genero, edad, ciudad, consumo)
- Eye Tracking en gondola (shelf) + packaging (front/back/plano abierto)
- Emotion Recognition timeline por estimulo
- IPT (Implicit Priming Test) con 2 objetos y 5 criteria
- Preguntas de escala 1-5 (likert)
- Preguntas abiertas (texto libre)
- Preference Test con intensidad
- Grupos de estimulos (Grupo 1 / Grupo 2 / Grupo 3)

---

## 2. Datos por modulo

### Eye Tracking

| Dato | ActiBIO | EmotioX | Gap |
|------|---------|---------|-----|
| Heatmap JSON (coordenadas X/Y) | `_EyeTracking` = JSON `{format: ["t","zero","x","y","pupil_left","pupil_right"]}` | Guardamos fixations `{x, y, duration, timestamp}` | Formato diferente pero equivalente en datos |
| Timeline de coordenadas por segundo | Array indexado por segundo `[x1, y1, x2, y2, ...]` | No exportamos como timeline | **GAP** |
| Pupil dilation (left/right) | Incluido en el JSON de ET | No medimos pupil dilation | **GAP** (requiere hardware) |
| Multiples estimulos por participante | Si (gondola + front + back + plano) con columnas separadas | Si (multiples stimuli por modulo) | Paridad |
| Grupos de estimulos | Gr1, Gr2, Gr3 (randomizacion por grupo) | No tenemos grupos de estimulos | **GAP** |

### Emotion Recognition

| Dato | ActiBIO | EmotioX | Gap |
|------|---------|---------|-----|
| Emociones detectadas | 8: Negative, Disgust, Fear, Sadness, Skepticism, Neutral, Surprise, Delight | Toggle on/off, sin desglose de emociones por webcam | **GAP CRITICO** |
| Timeline por segundo | `_Negative_Timeline_(by_seconds)` = array de valores por segundo | No tenemos | **GAP CRITICO** |
| Emotions JSON compuesto | `_Emotions` = JSON con todas las emociones en timeline multi-part | No tenemos | **GAP** |
| Por estimulo | Columnas separadas por estimulo (gondola, front, back, etc.) | No tenemos | **GAP** |

### IAT / IPT (Implicit Priming Test)

| Dato | ActiBIO | EmotioX | Gap |
|------|---------|---------|-----|
| D-scores | No directamente en export (calculado aparte) | Si, computados en backend | Ventaja EmotioX |
| Recognition Time crudo (ms) | `o1_oa1_c1-Recognition time` = RT por object x criteria | Guardamos en trials pero no exportamos por combinacion | **GAP** |
| Respondent Segmentation | `_c1 Respondent Segmentation` = texto categorico por criteria | No tenemos | **GAP** |
| Suitable for analysis flag | `Suitable for analysis` = flag booleano por participante | No tenemos filtro de calidad IAT | **GAP** |
| Preference con intensidad | `NoPreference`, `SlightPreferenceForLeft`, `StrongPreferenceForRight` | No tenemos escala de intensidad de preferencia | **GAP** |

### Preguntas / Encuestas

| Dato | ActiBIO | EmotioX | Gap |
|------|---------|---------|-----|
| Escala Likert 1-5 | `q4_1__1` etc. = valor numerico | Si (Linear Scale, CSAT, NPS) | Paridad |
| Texto abierto | `q_6_3__1` = texto libre | Si (Short/Long Text, VOC) | Paridad |
| Opcion unica | `q_6_6` = valor numerico de opcion | Si (Single Choice) | Paridad |
| Preguntas condicionales por grupo | Si (Gr1, Gr2 tienen preguntas diferentes) | Si (conditionality) | Paridad |

### Metadata del participante

| Dato | ActiBIO | EmotioX | Gap |
|------|---------|---------|-----|
| ID respuesta | `respId` (numerico) | UUID o kiosk-N / panel-N | Paridad |
| Status | `Completed` / otros | `pending/responded/disqualified/overquota` | Paridad |
| Collector / Panel | `SamplingFy - Grupo 2 - Opcion 2` | No tenemos grupos de muestreo | **GAP** |
| Panel ID | `respPanelId` (UUID) | `participantId` | Paridad |
| Quality overall | `Excellent` / etc. | No tenemos | **GAP** |
| Quality speed | `Excellent` / etc. | No tenemos | **GAP** |
| Quality open answers | `Excellent` / etc. | No tenemos | **GAP** |
| Quality matrix patterns | `n/a` / etc. | No tenemos | **GAP** |
| Quality location | `Excellent` / etc. | No tenemos (tenemos trackLocation pero no scoring) | **GAP** |
| Location code | `PE` (pais ISO) | Tenemos GPS si trackLocation habilitado | Parcial |
| Start/End date | Timestamps completos | Tenemos `created_at` en responses | Parcial |
| Duration | `00:45:37` (HH:MM:SS) | Tenemos duration en metadata de responses, no exportamos formateado | Parcial |

---

## 3. Gaps priorizados por impacto

### Criticos (diferenciador competitivo)

| # | Gap | Que falta | Complejidad |
|---|-----|-----------|-------------|
| 1 | **Emotion Recognition timeline** | 8 emociones por segundo por estimulo via webcam (FaceAPI/MediaPipe) | Alta — requiere modelo de deteccion facial + pipeline de emociones en tiempo real |
| 2 | **Export tabular de resultados** | XLSX con una fila por participante y columnas por metrica/estimulo, como el archivo ActiBIO | Media — requiere servicio de export que aplane responses |

### Importantes (paridad competitiva)

| # | Gap | Que falta | Complejidad |
|---|-----|-----------|-------------|
| 3 | **RT crudo por combinacion** en IAT export | Tabla object x criteria con RT en ms | Baja — datos ya estan en trials, falta endpoint/export |
| 4 | **Grupos de estimulos** (stimulus groups / collectors) | Randomizar participantes en grupos, preguntas diferentes por grupo | Media — requiere config en builder + routing en participant |
| 5 | **Quality scoring** por participante | Velocidad, respuestas abiertas, patrones, ubicacion | Media — requiere heuristicas de calidad |
| 6 | **IAT quality flag** (suitable for analysis) | Filtrar participantes con RT demasiado rapido o patron aleatorio | Baja — heuristica sobre trials existentes |
| 7 | **Preference con intensidad** | Escala None/Slight/Strong en vez de binario | Baja — UI nueva en participant + backend |

### Parciales (ya tenemos datos, falta presentacion)

| # | Gap | Que falta | Complejidad |
|---|-----|-----------|-------------|
| 8 | **Duration formateado** en export | `HH:MM:SS` en vez de ms crudo | Trivial |
| 9 | **Timeline de coordenadas ET** en export | Array de X/Y por segundo aplanado | Baja — transformar fixations a timeline |
| 10 | **Start/End timestamps** en export | Columnas separadas formateadas | Trivial |

---

## 4. Lo que EmotioX tiene y ActiBIO no muestra

| Ventaja EmotioX | Detalle |
|-----------------|---------|
| D-scores computados | Backend calcula D-scores automaticamente, ActiBIO solo exporta RT crudo |
| Heatmap rendering | Visualizacion en research-frontend con saliency y simpleheat |
| AOI analytics | Interseccion fixations x AOI, percentage y participantCount |
| Screener con disqualification en tiempo real | Blocking instantaneo al seleccionar Disqualify |
| Cuotas demograficas atomicas | Porcentaje con aplicacion inmediata |
| Multi-paradigma IAT | 3 tipos (AT, CA, OC) con builder unificado |
| Preview del test IAT | Modal interactivo con simulacion del flujo |

---

## 5. Recomendacion de roadmap

**Fase 1 — Export tabular (cierra el gap mas visible)**
- Endpoint `GET /analytics/research/:id/export` → XLSX
- Una fila por participante, columnas por: demographics, ET metrics por estimulo, IAT RT por combinacion, respuestas de preguntas, duration, quality flags
- Formato compatible con lo que esperan los investigadores (como el XLSX de ActiBIO)

**Fase 2 — Emotion Recognition real**
- Pipeline webcam: MediaPipe Face Mesh → clasificacion de emociones (8 categorias)
- Timeline por segundo almacenado en responses
- Visualizacion en results: grafico de emociones por estimulo

**Fase 3 — Stimulus groups + quality scoring**
- Config de grupos en builder (participante se asigna a grupo al entrar)
- Heuristicas de calidad: speed checks, pattern detection, location validation
