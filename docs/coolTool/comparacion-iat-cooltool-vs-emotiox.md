# Implicit Association: CoolTool vs EmotioX — Comparacion

Fecha: 2026-04-12

Fuente CoolTool: capturas en `docs/coolTool/evidencia-1..4.png`
Fuente EmotioX: codebase actual (backend, database, research-frontend)

---

## 1. Paradigmas soportados

| Paradigma | CoolTool | EmotioX | Notas |
|-----------|----------|---------|-------|
| Attribute Testing (Implicit Priming Test) | Si (evidencia-1) | Si | Ambos: 2 targets + criteria asignados a un target |
| Comparing Attribute (Reaction Time Test) | Si (evidencia-4) | Si | Ambos: objects + dimensions (Yes/No) + criteria |
| Objects Comparing (IAT clasico) | Si (evidencia-3) | Si | Ambos: multiple targets + 2 categorias (Positive/Negative) + criteria |

**Paridad completa en paradigmas.** Los 3 tipos existen en ambas plataformas.

---

## 2. Attribute Testing — Detalle

| Aspecto | CoolTool (evidencia-1) | EmotioX |
|---------|------------------------|---------|
| Targets | 2 (Object A, Object B) | 2 (Target 1, Target 2) |
| Criteria max | Sin limite visible | 5 (maxItems en template) |
| Criteria con imagen | Si ("Add image OR Add text") | Si (hasImage en settings, file-upload disponible) |
| Opcion "Hide option" por criteria | Si (toggle visible por cada criteria) | No existe. Solo se puede eliminar el criteria |
| Titulo del test | Si (campo "Title of your neuro test", hidden al participante) | No. El modulo usa el nombre del template |
| Priming time configurable | No visible en captura | Si (select: 300/400/500 ms) |
| Diagrama de flujo visual | Si (sidebar izquierdo con flowchart del test) | No. Sidebar muestra stages/modulos, no flowchart |
| Target assignment por criteria | Implicito (no visible en UI) | Explicito (selector "Target 1" / "Target 2" por cada criteria) |
| Instrucciones editables | No visible en captura | Si (Exercise instructions + Test instructions, textarea) |
| Show results toggle | No visible | Si (checkbox "Show results to respondents") |

### Diferencias clave
- **CoolTool tiene "Hide option"** por criteria — permite ocultar criteria individuales sin eliminarlos. EmotioX no tiene esto.
- **CoolTool muestra flowchart** del test en el sidebar izquierdo. EmotioX no tiene representacion visual del flujo.
- **EmotioX tiene target assignment explicito** en el builder. CoolTool parece no mostrarlo en la UI del builder (puede ser automatico o en otro paso).
- **EmotioX tiene priming time configurable** visible. CoolTool no lo muestra en la captura (puede estar en otra seccion).

---

## 3. Comparing Attribute (Reaction Time Test) — Detalle

| Aspecto | CoolTool (evidencia-4) | EmotioX |
|---------|------------------------|---------|
| Objects | 1 visible + "Add object" | Hasta 3 (object-1/2/3-name/image en template) |
| Dimensions | 2 fijas: No / Yes | 2 editables: dimension-1 (default "YES"), dimension-2 (default "NO") |
| Criteria max | Sin limite visible, 3 en captura | 15 (maxItems en template) |
| Criteria con imagen | No visible en captura | Si (hasImage en settings) |
| Titulo del test | Si (campo editable) | No |
| Diagrama de flujo | Si (sidebar con Object + Criteria + Yes/No) | No |

### Diferencias clave
- **CoolTool empieza con 1 object** y permite agregar mas. EmotioX tiene slots fijos para 3 objects en el template.
- **Dimensions en EmotioX son editables** (el investigador puede cambiar "YES"/"NO" por otros textos). CoolTool muestra "No" / "Yes" fijos.
- **EmotioX soporta mas criteria** (15 vs lo que se ve en CoolTool).

---

## 4. Objects Comparing (IAT clasico) — Detalle

| Aspecto | CoolTool (evidencia-3) | EmotioX |
|---------|------------------------|---------|
| Targets max | 3 visibles + "Add object" | 5 (target-1..5-name/image en template) |
| Categorias | 2: Positive / Negative | 2: criteria-1 (default "Positive"), criteria-2 (default "Negative"), editables |
| Criteria | No visible en captura (seccion colapsada) | Hasta 15 items (ranking-list) |
| Criteria con imagen | Probable (misma UI base) | Si |
| Multi-step visual | Si (sidebar muestra 2 bloques "Implicit priming test" encadenados) | No visual. Participant-frontend ejecuta 3 pasos internamente |
| Titulo del test | Si | No |

### Diferencias clave
- **CoolTool visualiza los multi-steps** en el sidebar (2 bloques encadenados visibles al investigador). EmotioX ejecuta los 3 pasos (clasificar criteria, clasificar targets, combinado) internamente sin mostrarlo en el builder.
- **EmotioX permite hasta 5 targets**, CoolTool muestra 3 con opcion de agregar.
- **Categorias editables** en EmotioX. CoolTool muestra Positive/Negative fijos.

---

## 5. UI/UX del builder

| Aspecto | CoolTool | EmotioX |
|---------|----------|---------|
| Editor mode | Simple editor / Advanced editor (tabs) | Un solo modo (ModuleContentEditor) |
| Preview | Boton "Preview" visible | No hay preview inline del test IAT |
| Flowchart visual | Si, sidebar izquierdo con diagrama del flujo completo | No |
| Tabs | English / Customize / Design (3 tabs) | No hay tabs de idioma/design |
| Navegacion | Sidebar con Welcome → Tests → Thank you | Sidebar con stages: Welcome → Research Config → Implicit Association → ... → Thank You |
| Selector de tipo IAT | Implicito (se elige al crear) | Explicito (drawer con 3 botones al agregar stage) |
| Grid de targets | No visible (lista vertical) | Si, grid responsive (1-5 columnas segun cantidad) |
| Criteria editor | Tabla simple (nombre + acciones) | Tabla con columnas: Order, Attribute Name, Target, Actions |

### Ventajas CoolTool
- Flowchart visual del test
- Preview del test desde el builder
- Multi-idioma (tabs English/Customize/Design)
- Hide option por criteria

### Ventajas EmotioX
- Target assignment explicito en criteria (mas claro para el investigador)
- Grid visual de targets/objects
- Priming time configurable desde el builder
- Instrucciones editables (exercise + test)
- Dimensions editables en Comparing Attribute
- Mas targets (5 vs 3) y mas criteria (15 vs indeterminado)

---

## 6. Backend y datos

| Aspecto | CoolTool | EmotioX |
|---------|----------|---------|
| Almacenamiento | Desconocido | MySQL, config como JSON en `modules.config` |
| Responses | Desconocido | `component_id = 'iat-trials'`, value = array de trials `{ targetId, criterionId, rt, correct, phase }` |
| Scoring | Desconocido | D-score: `(overallMean - meanRT) / overallSD`, escalado a -100..100 |
| Analytics endpoint | Desconocido | `GET /analytics/research/:id/implicit-association` |
| Deteccion de tipo | Desconocido | Por nombre del modulo (`detectIATTestType`). Nota: hay swap de nombres entre Comparing Attribute y Objects Comparing en backend |

---

## 7. Results / Analytics

| Aspecto | CoolTool | EmotioX |
|---------|----------|---------|
| Visualizacion | No capturado (no hay evidencia de results) | 3 charts: RadarChart (Attribute Testing), BarChart agrupado (Comparing Attribute), BarChart horizontal divergente (Objects Comparing) |
| D-scores | Probable | Si, computados en backend |
| Export | Desconocido | No hay export especifico para IAT |

---

## 8. Gaps identificados en EmotioX vs CoolTool

Actualizado: 2026-05-13

| # | Gap | Estado | Como se cerro |
|---|-----|--------|---------------|
| 1 | **Sin flowchart visual** del test en el builder | ✅ Cerrado | Flowchart reactivo en builder IAT |
| 2 | **Sin preview** del test IAT desde el builder | ✅ Cerrado | `IATPreviewModal` con trial phases + stimulus images (v0.71.2) |
| 3 | **Sin "Hide option"** por criteria | ✅ Cerrado | Eye/EyeOff toggle por criterio, `hidden: true` en config |
| 4 | **Sin titulo interno** del test | ✅ Cerrado | Campo `test-title` (oculto al participante, visible en results) |
| 5 | **Sin multi-idioma** en el builder | ✅ Cerrado | Instrucciones EN/ES JSON editables |
| 6 | **Swap de nombres** en `detectIATTestType` | ✅ Cerrado | Fix: mapeo correcto Comparing Attribute → `comparing_attribute`, Objects Comparing → `objects_comparing` |
| 7 | **Targets fijos en template** | ✅ Cerrado | Targets dinamicos (agregar/quitar desde builder) |
| 8 | **Sin Simple/Advanced editor mode** | ❌ Backlog | Pendiente — dos vistas del mismo config para investigadores novatos vs expertos |

---

## 9. Resumen

EmotioX tiene **paridad funcional completa** en los 3 paradigmas IAT y ha cerrado **7 de 8 gaps** identificados contra CoolTool. El unico gap pendiente es el dual editor mode (simple/advanced), que queda como backlog.

EmotioX mantiene ventajas en **transparencia del config** (target assignment explicito, priming time visible, dimensions editables), **capacidad** (mas targets, mas criteria, instrucciones editables), y ahora tambien en **UX del builder** (flowchart, preview modal, hide criteria, test title).
