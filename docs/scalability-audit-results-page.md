# Scalability Audit: Cognitive Task Results Page

**Fecha:** 2026-04-15
**Research de referencia:** `daa74a08` (Simulador de Pensión Mobile) — 10 Nav Flow, 5 Linear Scale, 4 Long Text, 2 Single Choice, ~50 participantes.

## Estado actual

| Métrica | ~50 participantes | ~150 (3x) | ~1000 |
|---|---|---|---|
| Responses en BD | 1,177 | ~3,500 | ~24,000 |
| Payload `/cognitive-tasks` | 517 KB → **161 KB** (optimizado) | ~480 KB | ~3 MB (solo textos) |
| Payload `/navigation-flow/:moduleId` × 10 | ~50 KB c/u | ~150 KB c/u | ~500 KB c/u (**5 MB total**) |
| Requests concurrentes al abrir results | ~46 | ~46 | ~46 |
| Tiempo `/cognitive-tasks` | 118 ms | ~350 ms | ~2s+ |

## Problemas identificados

### P1: `/navigation-flow/:moduleId` retorna data redundante (ALTO)

**Impacto a 1000 participantes:** ~500KB por módulo × 10 = 5MB transferidos.

El endpoint retorna:
- `heatmapData[]` — todos los clicks flattened (usado para heatmap/clickmap)
- `responses[]` — cada participante con `clickSequence` completo (duplicado)

El frontend usa `responses[]` solo para la tabla de Navigation tab (participantId, completed, totalClicks, correctClicks, totalDuration). No necesita `clickSequence` por participante.

**Fix:** Strip `clickSequence` de cada response en el array. Solo mantenerlo en `heatmapData`.

```
// Antes: responses[i] = { participantId, completed, totalClicks, ..., clickSequence: [{x,y,ts,correct,imageId}, ...] }
// Después: responses[i] = { participantId, completed, totalClicks, correctClicks, incorrectClicks, totalDuration, imagesNavigated, totalImages }
```

**Reducción estimada:** ~70% del payload de Nav Flow.

---

### P2: No hay índice compuesto en `responses` (ALTO)

**Query más frecuente:**
```sql
WHERE r.research_id = ? AND r.module_id = ? AND r.component_id = ?
```

**Índices actuales:** Solo individuales (`idx_responses_research_id`, `idx_responses_module_id`, `idx_responses_component_id`). MySQL elige uno y filtra el resto secuencialmente.

**Índice compuesto `uq_responses_participant_module_component`** existe pero es `(research_id, participant_id, module_id, component_id)` — `participant_id` en posición 2 rompe el prefix matching para queries sin `participant_id`.

**Fix:** Agregar índice compuesto.
```sql
CREATE INDEX idx_responses_research_module_component
ON responses (research_id, module_id, component_id);
```

**Impacto:** Queries pasan de scan ~1000 filas a lookup directo. Afecta TODOS los endpoints de analytics.

---

### P3: N+1 queries en `/cognitive-tasks` (MEDIO)

`getCognitiveTaskResults` hace 1 query para listar módulos + 1 query por módulo (COUNT o full fetch). Total: 25 queries.

**Fix:** Reemplazar con una query agrupada:
```sql
SELECT module_id, COUNT(*) as cnt
FROM responses
WHERE research_id = ? AND module_id IN (?, ?, ...)
GROUP BY module_id
```

**Reducción:** 25 queries → 3 (módulos + counts batch + text responses).

---

### P4: Frontend SVG con miles de puntos (BAJO)

`NavigationTestCard` renderiza:
- **Click Map tab:** 1 SVG circle por click. A 1000 participantes × 3 clicks = 3000 `<circle>` elements.
- **Scan Path tab:** 1 línea + círculo numerado por click. 3000 flechas numeradas.

`HeatmapRenderer` (simpleheat) maneja bien miles de puntos — no necesita cambio.

**Fix futuro:** Paginar o limitar clicks visibles en Click Map y Scan Path. O virtualizar SVG.

---

### P5: Preference Test retorna `responses[]` completo (BAJO)

Similar a P1 pero con menos data por response. A 1000 participantes es ~200KB por módulo.

**Fix:** Solo retornar summary stats por participante, no el `viewHistory[]` completo.

---

## Fixes ya aplicados (2026-04-15)

| Fix | Archivo | Descripción |
|---|---|---|
| React Query dedup | `NavigationFlowResultsWrapper.tsx`, `PreferenceTestResultsWrapper.tsx` | 10 `getById` calls → 1 (React Query cache) |
| Media URL cache | `media.service.ts` | Cache in-memory 5min para `/media/by-key` |
| COUNT para módulos con endpoint propio | `analytics.service.ts` (backend) | `/cognitive-tasks` no trae `value` de Nav Flow, Preference, Choice, Scale, Ranking |
| Race condition Nav Flow save | `NavigationFlow.tsx` (participant) | `pendingClick` param evita state batching bug en módulos single-image |

## Prioridad de implementación

1. **P2** — Índice compuesto (1 migración SQL, impacto inmediato en todas las queries)
2. **P1** — Strip clickSequence de responses en Nav Flow (cambio backend, mayor reducción de payload)
3. **P3** — Batch COUNT queries (refactor backend, reduce latencia)
4. **P5** — Strip viewHistory de Preference Test
5. **P4** — Limitar SVG points (frontend, UX)
