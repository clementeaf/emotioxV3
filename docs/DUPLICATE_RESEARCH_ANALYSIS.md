# Análisis: Duplicar estudio desde Home

## Contexto

Evaluar la viabilidad y complejidad de agregar un botón "Duplicar" en la vista Home (DashboardPage) que clone un research existente con todos sus stages, módulos, preguntas y media.

## Estado actual

- **No existe** endpoint, botón ni infraestructura de duplicación.
- Dashboard tiene 2 acciones por research: click → builder, trash → delete.
- Backend `create()` usa transacciones — sirve como template para `duplicate()`.

---

## Entidades a clonar

| Entidad | Tabla | Acción | Complejidad |
|---------|-------|--------|-------------|
| Research | `researches` | INSERT nuevo UUID, nombre + " - Copy", status `draft` | Baja |
| Stages | `stages` | Clonar todos, nuevos UUIDs, remap `research_id` | Baja |
| Modules | `modules` | Clonar todos, nuevos UUIDs, remap `stage_id` + `research_id` | Media |
| Questions | `questions` | Clonar todos, nuevos UUIDs, remap `module_id` | Baja |
| Config JSON | `researches.config` | Deep copy (demographics, quotas, linkConfig, studyLogo, stimuli) | Media |
| Media | `media` + S3 | Copiar objetos S3 + INSERT registros con nuevos UUIDs | **Alta** |

### NO se copia

- `responses` — datos de participantes del estudio original
- `participants` — emails/status del panel original
- `created_by`, `created_at`, `updated_at` — timestamps frescos
- `status` — siempre `'draft'` en el clon

---

## Cambios necesarios

### Backend (~150-200 líneas)

1. **`research.service.ts`** — nueva función `duplicate(researchId, userId)`:
   - Fetch research completo con `getById()` (ya existe)
   - BEGIN transaction
   - INSERT `researches` (nuevo UUID, nombre " - Copy", status draft)
   - Loop stages → INSERT cada uno con nuevo UUID, guardar mapa oldId→newId
   - Loop modules → INSERT cada uno, remap `stage_id` y `research_id`
   - Loop questions → INSERT cada uno, remap `module_id`
   - Media: INSERT registros + `CopyObject` en S3 (o reusar keys)
   - COMMIT / ROLLBACK on error
   - Return research clonado

2. **`research.controller.ts`** — nuevo handler:
   - `POST /research/:id/duplicate`
   - Ownership check con `buildOwnershipClause`

### Frontend (~30-50 líneas)

1. **`research.service.ts`** — método `duplicate(id: string)`
2. **`useResearchQuery.ts`** — mutation `useDuplicateResearch()`
3. **`DashboardPage.tsx`** — botón Copy en columna Actions (junto al trash)

---

## Riesgos y puntos críticos

### Media S3
- Videos/imágenes grandes (eye tracking, attention prediction) pueden hacer lento el `CopyObject`.
- **Alternativa**: reusar mismas S3 keys sin copiar archivos (read-only, ambos researches comparten media). Riesgo: si se borra el original, el clon pierde media.

### Config JSON profundo
- Demographics con keys `customQuestion_*` — deep clone directo, sin remap.
- Stimuli de Attention Prediction con `heatmapData` y `mediaId` — necesita remap de mediaId al nuevo registro.
- `studyLogo.s3Key` — copiar o reusar.

### Conditionality (remap de IDs)
- `ConditionalityConfig` referencia `module_id` de otros módulos del mismo research.
- Al clonar, los IDs cambian → hay que recorrer configs y reemplazar oldModuleId→newModuleId.
- Aplica a: `ModuleConditionality` (condición por pregunta del estudio).
- `DemographicConditionality` no tiene IDs, solo keys demográficos — no necesita remap.

### Quotas demográficas
- Tabla `demographic_quotas` con `research_id` — clonar registros con nuevos UUIDs.
- Porcentajes se copian tal cual (sin contadores).

---

## Complejidad general

**Media-baja.** ~1 sesión de trabajo.

| Componente | Esfuerzo |
|------------|----------|
| Backend endpoint + service | 60% del trabajo |
| S3 media handling | 25% del trabajo |
| Frontend (botón + hook) | 15% del trabajo |

### Dependencias
- Ninguna migración de BD necesaria (tablas existentes son suficientes).
- S3 SDK ya configurado en backend (`media` module).
- `buildOwnershipClause` ya maneja permisos.

---

## Decisiones pendientes

1. **Media**: ¿Copiar archivos S3 o reusar keys?
2. **Nombre**: ¿"Nombre - Copy" o prompt al usuario para renombrar?
3. **Post-duplicate**: ¿Navegar al builder del clon o quedarse en Dashboard?
4. **Confirmación**: ¿Modal de confirmación o acción directa?
5. **Scope**: ¿Solo desde Home o también desde el builder?
