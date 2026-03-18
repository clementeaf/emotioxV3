# Bitácora de desarrollo — EmotioxV3

> Documento vivo actualizado al final de cada sesión de trabajo con Claude.
> Al iniciar una nueva conversación, el agente debe leer este archivo y `CHANGELOG.md` para entender el estado actual del proyecto.

---

## Última actualización: 2026-03-18 (sesión 17)

---

## Sesión 17: 18 de marzo de 2026 — Builder UX polish, module reorder, logo (v0.29.0)

### Linear Scale: selector controlado
- Eliminada la opción "Custom" que permitía números arbitrarios como min/max.
- Ahora solo opciones predefinidas: 1-3, 1-5, 1-7, 1-10, 0-10.
- Labels (Start/End) visibles para todas las opciones.
- Backward compatible: datos existentes con `type: 'custom'` siguen funcionando en participant-frontend.

### Module reorder
- Flechas arriba/abajo al costado de cada card de módulo (SmartVOC y Cognitive Tasks).
- Usa endpoint existente `PUT /stages/:stageId/modules/reorder` + `modulesService.updateModulesOrder()`.
- Solo visible cuando hay más de 1 módulo en el stage.

### Ranking UX (participant-frontend)
- Color púrpura → azul (border, badge, hover).
- Drag handle: bloque gris reemplazado por ícono de 3 líneas (grip clásico).

### Ranking results: nombres en vez de IDs
- Backend `getRankingResponses` ahora lee `modules.structure` para extraer `rankingConfig.items` y devuelve `label` por cada item.
- Frontend usa `ranking.label || ranking.item`.

### Auto-scroll al crear módulo
- Después de agregar un módulo desde el drawer, la vista hace scroll suave al módulo recién creado.
- Fix: `selectedStage` stale — ahora se lee el stage fresco de `typedResearch` para calcular `order_index`.

### Logo EmotioCX
- `docs/EmotioCX-logo.svg` copiado a `research-frontend/public/`.
- StandardSidebar: reemplazado BrainCircuit icon por logo SVG.
- ResearchBuilderSidebar: agregado logo arriba del "Back to List".

---

## Sesión 16: 18 de marzo de 2026 — Templates a inglés, revisión auth Google (v0.28.5)

### Module templates: traducción ES → EN en BD producción
- 8 templates de Cognitive Tasks tenían labels y placeholders en español ("Título de la pregunta", "Escribe la pregunta aquí...", etc.).
- Actualizados directamente en `module_templates.structure` vía SQL en producción.
- Templates afectados: Short Text, Long Text, Linear Scale, Single Choice, Multiple Choice, Navigation Flow, Preference Test, NPS.
- Los estudios ya creados no se afectan (los módulos se clonan del template al momento de creación).

### Auth Google OAuth: revisión de persistencia de sesión
- Se revisó el flujo completo de autenticación (login email, Google OAuth, bootstrap, refresh, logout).
- No se encontraron bugs. La sesión con Google depende de cookies httpOnly en producción y de localStorage en localhost.
- El comportamiento reportado (perder sesión al copiar URL de incógnito a normal) es esperado: los contextos de navegador son independientes.

---

## Sesión 15: 18 de marzo de 2026 — NavigationFlow 3 intentos, validación demographics (v0.28.4)

### NavigationFlow: Opera/Linux fix + 3 intentos por imagen
- **Problema**: en Opera/Ubuntu, `img.decode()` se colgaba → clicks ignorados silenciosamente.
- **Fix**: timeout de 1s en `img.decode()`. Si no resuelve, aplica dimensiones directamente.
- **3 intentos por imagen**: click correcto avanza a la siguiente imagen. Al 3er click fuera del hitzone, el flujo termina (`completed: false`) y pasa a la siguiente pregunta del estudio.
- La "barra amarilla con coordenadas" no es nuestra — es herramienta de Opera o extensión del navegador.

### Demographics: validación completa antes de avanzar
- **Bug**: ENTER o click en "Guardar y continuar" avanzaba con solo 1 campo respondido. La validación solo verificaba `length > 0`.
- **Fix**: ahora se extraen las keys habilitadas del config del módulo y se valida que todas tengan respuesta.

---

## Sesión 14: 18 de marzo de 2026 — Ranking fix participant, drawer de templates (v0.28.3)

### Ranking: fix parsing en participant
- `CognitiveTaskRenderer.tsx`: parsing del formato `{ items, randomize }` (third try y fourth try).
- `RankingQuestion.tsx`: prop `randomize` con Fisher-Yates shuffle en carga inicial.

### Drawer de selección de templates
- `ModuleTemplateSelectionModal.tsx`: convertido de modal centrado a drawer lateral derecho. Filtra por `stageType` — SmartVOC solo muestra métricas, Cognitive Tasks solo muestra preguntas. Grid 2 columnas con click directo.
- `ResearchBuilderPage.tsx`: botón "Add another question/metric" al final de ambos stages.
- Eliminado template "ultra basico" de la BD de producción.

---

## Sesión 13: 18 de marzo de 2026 — Ranking: fix en BD producción (v0.28.2)

### Problema
4 módulos Ranking en producción tenían estructura legacy (título + descripción + slider tipo select con rango 1-5). No mostraban los inputs para agregar items ni el editor de ranking-list. Además, el `module_templates.Ranking` seguía con esa misma estructura legacy, así que cualquier Ranking nuevo se creaba roto.

### Corrección
- Migrados los 4 módulos directamente en MySQL de producción: reemplazada la estructura por `question-title` (input) + `items` (ranking-list). Títulos existentes preservados.
- Actualizado `module_templates.Ranking` a la estructura correcta.
- Verificación: 0 módulos Ranking rotos, 31/31 con estructura correcta.

---

## Sesión 12: 18 de marzo de 2026 — Heatmap, AOI, Ranking, hitzone fix (v0.28.1)

### Cambios realizados

#### Heatmap con gradiente de intensidad
Canvas offscreen con círculos aditivos → colorización blue→purple→red→yellow→white con alpha 50%.

#### AOI (Areas of Interest)
Botón "+ Add AOI" en tab Heat click map. Dibuja rectángulos sobre el heatmap, calcula % de participantes únicos dentro del área. Fila con miniatura, label, %, count, filtro, Remove.

#### Ranking rediseñado
- **Builder**: inputs con selector Qualify/Disqualify, botón "Add another choice", checkbox "Randomize the order of questions".
- **Results**: histograma de barras verticales por posición para cada opción, ordenado por mean.

#### Hitzone: root cause encontrado y corregido
- **Resultados**: hitzones se pasaban en píxeles al SVG con viewBox 0-100 → ahora se convierten a % usando dimensiones naturales de la imagen.
- **Participant**: `getClickableRect()` tenía fallback al container fullscreen cuando la imagen no estaba lista → coordenadas de click desfasadas → todos los clicks incorrectos. Eliminado el fallback cuando hay hitzones.
- **Editor**: contenedor ampliado a 700px de alto para que las áreas dibujadas sean proporcionales.

#### Eliminar módulo
Botón basurero en SmartVOC y Cognitive Task cards con modal de confirmación. Llama `DELETE /research/:id/modules/:moduleId`.

---

## Sesión 11: 17 de marzo de 2026 — Results UI polish & NavigationFlow (v0.28.0)

### Cambios realizados

#### SmartVOC: filtros demográficos funcionales
- Backend ahora incluye `participantId` en todos los score arrays (CSAT, CES, CV, NPS, NEV).
- SmartVOC Results usa los mismos filtros demográficos que Cognitive Tasks: checkboxes + User ID filtran todas las métricas.
- MetricCard charts (CSAT, CES, CV) cambian con Today/Week/Month — antes siempre mostraban datos mensuales.

#### Fix: demographics no se guardaban en `participant_demographics`
- Root cause: `usePreviewMode` trataba participantes sin `?participantId` como preview → `validateDemographics` se saltaba → datos demográficos nunca se persistían.
- Fix: solo se salta para `?preview=true` explícito; siempre se envía un participantId al backend.

#### Limpieza UI de resultados
- Quitado banner "New data obtained" del panel Filters.
- Quitados botones duplicados "Copiar todos" / "Descargar CSV" de la tabla de comentarios (queda "Descargar comentarios").
- Short/Long Text ya no muestra "Positive" hardcodeado en columna Mood.
- Navigation Flow Results: todos los steps expandidos por defecto.

#### NavigationFlow (participant): mejoras de confiabilidad
- URLs de imágenes ya no se filtran — se mantiene la alineación de índices con `propImages`.
- Polling de 100ms como safety net para imágenes cacheadas donde `onLoad` dispara antes de que el ref esté listo.
- Clicks fuera del hitzone ahora muestran punto rojo (antes eran silenciosos).

### Deploy
Commits `48cf249`, `0a2821d`, `19b5113` — CI/CD auto-desplegó backend, research-frontend y participant-frontend.

---

## Sesión 10: 17 de marzo de 2026 — Stress test de cuotas (v0.27.3)

### Cambios realizados

#### Script: stress-test-quotas.ts
Script E2E standalone (`npx tsx scripts/stress-test-quotas.ts`) que valida el enforcement atómico de cuotas demográficas:

1. Registra un usuario temporal, crea una investigación kiosk con cuotas ajustadas (gender limit 3, age limit 2 por bucket)
2. Lanza 10 participantes concurrentes contra `validate-demographics` (que usa `tryIncrementQuota`)
3. Verifica que ningún bucket excede su límite y reporta PASS/FAIL
4. Archiva la research al terminar

Ejecutado 2 veces en producción — **PASS** en ambas. Las cuotas atómicas funcionan correctamente bajo concurrencia real.

### Archivos creados
- `scripts/stress-test-quotas.ts`

### Observación
Todos los participantes concurrentes obtienen `kiosk-1` como participantId (race condition en el contador de sesiones kiosk). No afecta la validación de cuotas pero es un detalle a considerar.

---

## Sesión 9: 17 de marzo de 2026 — Cuotas atómicas (v0.27.2)

### Cambios realizados

#### Fix: Race condition en cuotas demográficas
**Problema:** `checkQuotaAvailability` (validación) e `incrementQuota` (incremento) eran operaciones separadas. Bajo concurrencia, dos participantes podían pasar la validación simultáneamente antes de que se incrementara el contador, excediendo el límite.

**Solución:** Nueva función `tryIncrementQuota` que dentro de una transacción con `FOR UPDATE`:
1. Valida disqualifications (JS puro)
2. Guarda `participant_demographics`
3. Incrementa con `UPDATE ... WHERE current_count < quota_limit` — si `rowCount = 0`, la cuota está llena
4. Si alguna cuota falla, revierte los incrementos previos y retorna `QUOTA_FULL`

`validateDemographics` en `public.service.ts` ahora abre la transacción y llama `tryIncrementQuota`. El bloque de `incrementQuota` en `saveParticipantResponses` fue eliminado.

### Archivos modificados
- `backend/src/modules/quotas/quota.service.ts` — nueva `tryIncrementQuota`, deprecated en las antiguas
- `backend/src/modules/public/public.service.ts` — `validateDemographics` con transacción atómica, eliminado incremento en `saveParticipantResponses`
- `backend/src/modules/public/public.controller.ts` — pasa `participantId` al servicio
- `participant-frontend/src/services/public.service.ts` — envía `participantId` en el body
- `participant-frontend/src/pages/ResearchPage.tsx` — pasa `participantId` a `validateDemographics`

---

## Sesión 7: 16 de marzo de 2026 — Module-to-module conditionality (v0.27.0)

### Cambios realizados

#### Feat: Condicionalidad entre preguntas del estudio
**Contexto:** Hasta ahora la condicionalidad solo permitía mostrar/ocultar un módulo según una respuesta demográfica. Se necesitaba poder condicionar según la respuesta a otra pregunta (Single/Multiple Choice).

**Implementación:**
1. **Tipos** (`moduleRequired.ts`) — `ConditionalityConfig` es ahora union de `DemographicConditionality` y `ModuleConditionality`. Type guards para distinguirlas.
2. **ConditionalityModal** — Selector "Condition source" (Demographic / Study question). Al elegir study question: lista módulos choice anteriores por `orderIndex`, checkboxes para seleccionar opciones.
3. **ResearchBuilderPage** — Computa `studyModulesWithOptions` desde los módulos Single/Multiple Choice, lo pasa a ambos ModuleCards.
4. **ModuleCards** — Forwarded al modal, display del resumen de condición adaptado a ambos tipos.
5. **useNavigation** (participant) — Evalúa condiciones de módulo comparando respuesta almacenada vs `selectedValues`. Single=match directo, Multiple=any match.
6. **ResearchPage** (participant) — Construye `moduleResponses` reactivo desde el store y lo pasa a `useNavigation`.

### Archivos modificados
- `research-frontend/src/utils/moduleRequired.ts`
- `research-frontend/src/components/research/ConditionalityModal.tsx`
- `research-frontend/src/components/research/SmartVOCModuleCard.tsx`
- `research-frontend/src/components/research/CognitiveTaskModuleCard.tsx`
- `research-frontend/src/pages/research/ResearchBuilderPage.tsx`
- `participant-frontend/src/hooks/useNavigation.ts`
- `participant-frontend/src/pages/ResearchPage.tsx`

### Verificación E2E (sesión 8, 16 de marzo)
Se trazó el flujo completo de condicionalidad módulo-a-módulo desde el builder hasta el participante:
- **Persistencia:** `conditionalityConfig` se guarda íntegro en la columna `config` (JSON) del módulo. Sin transformaciones ni stripping.
- **Entrega:** La API pública (`GET /public/research/:id`) devuelve el config completo, incluyendo `conditionalityConfig`.
- **Alineación de IDs:** Builder, modal y renderer usan el mismo `c.id` de los componentes choice. No hay desalineación.
- **Evaluación:** `useNavigation` compara correctamente `response.value` contra `selectedValues`.
- **Cache:** El endpoint público cachea 1 minuto (preview lo bypasea, no afecta testing del investigador).

Resultado: flujo sólido, listo para verificar en producción post-deploy.

---

## Última actualización previa: 2026-03-09 (sesión 6)

---

## Sesión 6: 9 de marzo de 2026 — Navigation Flow UX fixes (v0.20.2)

### Cambios realizados

#### Fix: Mejoras UX en Navigation Flow del participant-frontend
**Problema:** El cliente reportó 5 issues en el flujo de Navigation Flow:
1. Cursor de cruz poco intuitivo
2. Última imagen requería click preciso en hitzone
3. Delay de 500ms se sentía lento
4. Puntos rojos por clicks incorrectos confundían ("árbol de navidad")

**Solución (4 cambios en `NavigationFlow.tsx`):**
1. **Cursor** — `cursor-crosshair` → `cursor-pointer` (manito)
2. **Última imagen** — Si `isLastImage`, cualquier click en la imagen cuenta como correcto (toda la imagen es hitzone)
3. **Avance rápido** — Delay reducido de 500ms a 200ms entre imágenes; última imagen avanza de inmediato
4. **Sin puntos rojos** — `clickPoints` solo recibe clicks correctos; clicks incorrectos solo van a `allClicks` para analytics

### Archivos modificados
- `participant-frontend/src/components/ui/NavigationFlow.tsx`
- `CHANGELOG.md`
- `BITACORA.md`

### Deploy
- Push a main → CI/CD despliega participant-frontend automáticamente

### Pendientes
- Verificar compatibilidad cross-browser (Opera vs Chrome) — requiere testing manual en producción
- SmartVOC participantId investigation
- Migración BD pendiente (sesión 2)

---

## Sesión 5: 9 de marzo de 2026 — Deploy masivo v0.17.0 → v0.20.1

### Deploy a producción

Deploy completo de los 3 componentes a cPanel. Incluye todo el trabajo acumulado desde la Sesión 4 (4 de marzo) que no había sido desplegado.

**Componentes desplegados:**
| # | Componente | Estado | URL |
|---|------------|--------|-----|
| 1 | Backend | ✅ 200 | `emotio.cx/api/health` |
| 2 | Research Frontend | ✅ 200 | `emotio.cx/research/` |
| 3 | Participant Frontend | ✅ 200 | `emotio.cx/participant/` |

**Versiones incluidas en este deploy:**
- **v0.17.0** — Location Granularity (countryOnly / countryCity)
- **v0.18.0** — Participant i18n (react-i18next)
- **v0.18.1** — Participant vendor chunk fix
- **v0.19.0** — Explicit Continue buttons
- **v0.19.2** — PreferenceTest & CognitiveTaskRenderer cleanup
- **v0.19.4** — Unified footer button, custom dropdowns & lightbox UX
- **v0.19.5** — SmartVOC auto-advance & Research URL fix
- **v0.19.6** — Fullscreen Navigation Flow
- **v0.20.0** — Real-time SmartVOC Results (SSE)
- **v0.20.1** — SmartVOC auto-advance fix + NEV emotion rules

### Pendientes
- Ninguno

---

## Sesión 4: 4 de marzo de 2026 — Location Granularity (v0.17.0)

### Cambios realizados

#### Feature: Granularidad geográfica configurable por investigación
**Problema:** La estructura de ubicación estaba hardcodeada — Chile tenía 3 niveles (país→región→comuna) y todos los demás países solo 1 nivel. El investigador no podía elegir qué nivel de detalle geográfico pedir.

**Solución (5 fases + simplificación, 5 commits):**

1. **Tipos** — Creado `LocationGranularity` (`countryOnly | countryCity`) en los 3 sub-proyectos:
   - `research-frontend/src/utils/demographicsMapper.ts` (exportado)
   - `backend/src/modules/quotas/quota.service.ts`
   - `participant-frontend/src/components/steps/DemographicsStep.tsx`

2. **Mapper** — `mapCountryConfigToBackend` acepta y serializa `granularity` (default `countryOnly`). `mapModalConfigToBackend` lo pasa al caso country.

3. **UI Investigador** — Selector visual de granularidad (2 radio cards: "Solo país" / "País + Ciudad") en `CountryConfigModal`. Se persiste en el JSON del módulo Research Configuration. `ResearchConfigurationModule` lee/escribe `initialGranularity`.

4. **UI Participante** — `DemographicsStep` reemplazó el hardcode `=== 'Chile'` por lectura de `granularity` del config. Si `countryCity`, muestra un campo de texto libre para ciudad debajo del selector de país.

5. **Limpieza** — Eliminado `chile-geography.ts` de ambos frontends. Eliminada validación hardcodeada de regiones/comunas de Chile del backend. Verificado que el backend no rompe (usa `Object.entries` dinámico, sin validación estricta de schema).

### Archivos modificados
- `research-frontend/src/utils/demographicsMapper.ts`
- `research-frontend/src/components/research/CountryConfigModal.tsx`
- `research-frontend/src/components/research/ResearchConfigurationModule.tsx`
- `research-frontend/src/data/chile-geography.ts` (eliminado)
- `participant-frontend/src/data/chile-geography.ts` (eliminado)
- `backend/src/modules/quotas/quota.service.ts`
- `participant-frontend/src/components/steps/DemographicsStep.tsx`
- `CHANGELOG.md`

### Pendientes
- ~~Deploy a producción~~ (completado en Sesión 5)

---

## Sesión 3: 17 de febrero de 2026 — Fix preview mode (step reset + sidebar)

### Cambios realizados

#### Fix: Preview mode mostraba el último step visitado
**Problema:** Al acceder a una URL de preview (`?preview=true`), el participant-frontend mostraba el último step que el usuario había visitado previamente (ej. Thank You) en lugar del primero (Welcome). Causado por:
- `useParticipantStore` persiste `currentStep` en localStorage
- El efecto de reset de participante hace early return cuando `participantId` es null (preview mode)
- La lógica de reset solo reseteaba si el step guardado no existía en la lista de steps habilitados

**Fix:** En `ResearchPage.tsx`, agregar `isPreviewMode` a la condición de reset: cuando es preview, siempre se resetea al primer step disponible.

#### Fix: Sidebar no visible en producción para preview mode
**Problema:** El `DevSidebar` solo se renderizaba cuando `import.meta.env.DEV === true`. En producción (cPanel), los investigadores no podían navegar entre módulos al hacer preview.

**Fix:** Cambiar condición de `isDev` a `isDev || isPreviewMode` para que el sidebar sea visible para investigadores en preview.

### Deploy
- participant-frontend desplegado a producción (cPanel)

---

## Sesión 2: 17 de febrero de 2026 — Resolución de deuda técnica

### Cambios realizados

#### Fase 1: Variables no usadas + directivas ESLint obsoletas
- Eliminados catch variables no usados en `ResearchBuilderSidebar.tsx`, `StandardSidebar.tsx`, `UserManagementPage.tsx`, `modules.service.ts`
- Eliminadas props destructuradas no usadas en `DemographicConfigModalBase.tsx` (4 props) y `QuotasTab.tsx` (1 prop)
- Eliminados 2 comentarios `eslint-disable-next-line` obsoletos en `EditableComponent.tsx`

#### Fase 2: Reemplazar `any` con tipos propios
- Creada interfaz `ModuleTemplateRef` en `researchTypes.service.ts`
- Tipados `useResearchForm.ts`, `ResearchFormStep2.tsx` con `ModuleTemplateRef`
- Creadas interfaces `ModuleComponent`, `ModuleConfigStructure`, `HitzoneRegion` en `NavigationFlowResultsWrapper.tsx`
- Creadas interfaces `ModuleComponent`, `ModuleConfigStructure`, `UploadedFileData` en `PreferenceTestResultsWrapper.tsx`
- Creada interfaz `BackendQuota` en `ResearchConfigurationModule.tsx`
- Tipados `demographicsMapper.ts` (enforcementMode union)
- Tipados `DemographicsStep.tsx` y `DemographicsStep.test.tsx` en participant-frontend
- Casos donde `Record<string, any>` es genuinamente necesario (demographics config dinámico) marcados con `eslint-disable`

#### Fase 3: Sync rankingConfig.items al guardar
- Agregada función `syncRankingConfig` en `ResearchBuilderPage.tsx`
- Aplicada en los 3 handlers de save (Smart VOC, Cognitive Tasks, módulo activo)

#### Fase 4: Eliminar image-upload muerto de seeds
- Eliminado componente `image-upload` de 6 templates de Cognitive Tasks en `seed_all_module_templates_pg.ts`
- Creado script de migración `remove_image_upload_from_modules.ts` (pendiente de ejecutar en producción)

#### Fase 5: Hooks de React — exhaustive-deps
- Fix `ResearchBuilderSidebar.tsx`: condición alineada con dep array (`activeResearch?.id`)
- Fix `ResearchConfigurationModule.tsx`: inlineado `buildParticipantShareUrl` en useMemo, eliminadas funciones muertas
- Suprimido warning en useEffect de flush demográfico (agregar deps causaría loop infinito)
- Agregado `backlinks.complete` a useCallback en `ResearchPage.tsx`

### Resultado
- **research-frontend**: 0 errors, 0 warnings (lint + build)
- **participant-frontend**: 0 errors, 0 warnings (lint + build)
- **backend**: type-check OK
- Pre-commit hooks: pendiente de verificar en commit

### Pendientes
- Ejecutar migración `remove_image_upload_from_modules.ts` en producción (BD)
- Deploy a producción (opcional, no hay cambios funcionales visibles)

---

## Sesión 1: 17 de febrero de 2026

> ~5 horas (08:00 – 13:15 CLT)
> 10 commits (`eb56965`..`3b2ed0e`) · 12 archivos modificados · 2 deploys a producción · 3 migraciones en BD

### Contexto inicial

El módulo **Ranking** en Cognitive Tasks no funcionaba correctamente: mostraba un selector genérico en vez del editor de items. A partir de ahí se descubrieron y corrigieron múltiples problemas encadenados.

### Cambios realizados

#### 1. Fix del módulo Ranking en research-frontend (`eb56965`, `334a873`)

**Problema:** El seed template usaba `type: 'ranking-list'`, pero `EditableComponent.tsx` solo tenía `case 'ranking'`. El tipo caía al default y se renderizaba como select.

**Fix:**
- Agregado `'ranking-list'` a `ComponentType` en `moduleBuilder.types.ts`
- Extraído `RankingItemsEditor` como componente standalone en `EditableComponent.tsx`
- Agregado `case 'ranking-list':` al switch
- Migración en BD: 24 módulos Ranking actualizados via `fix_ranking_module_config_mysql.ts`

#### 2. Fix de módulos ocultados automáticamente al guardar (`513bb28`)

**Problema:** `ResearchBuilderPage.tsx` calculaba `finalHidden = !hasModuleConfiguredValues(...)`, marcando como hidden cualquier módulo sin datos. Navigation Flow y Preference Test quedaban en blanco.

**Fix:**
- Save ahora usa `moduleRef.getHidden()` (toggle explícito del investigador)
- Toggle Hide visible en todos los entornos (removida restricción `isLocalhost()`)
- BD: corregido `hidden: false` en módulos afectados

#### 3. Fix de resolución de URLs de media — research-frontend (`513bb28`)

**Problema:** Backend devuelve URLs relativas (`/api/media/...`). En localhost, el browser las resolvía contra `localhost:12800` → 404.

**Fix:** `resolveMediaUrl()` centralizado en `media.service.ts` convierte rutas relativas a absolutas contra el origen del backend.

#### 4. Fix de re-mount del FileUploadEditor (`513bb28`)

**Problema:** Escribir en textarea de Navigation Flow/Preference Test causaba parpadeo de imágenes. `FileUploadEditor` estaba definido inline dentro del switch case → React lo re-montaba en cada render.

**Fix:** Extraído `FileUploadEditorComponent` como componente standalone. Default case retorna `null` silenciosamente.

#### 5. Fix del participant-frontend: sync-runtime-config (`12be6c5`)

**Problema:** `npm run dev` fallaba al intentar descargar config de CloudFront (AWS ya no existe).

**Fix:** URL default cambiada a `https://emotio.cx/participant`.

#### 6. Fix del participant-frontend: config service en dev mode (`e27c51c`)

**Problema:** "Initialization failed — AWS backend" al abrir preview en localhost. Config service buscaba `/participant/runtime-config.json` pero Vite sirve `public/` en raíz.

**Fix:**
- Busca primero `/runtime-config.json`, luego `/participant/runtime-config.json`, con fallback a `https://emotio.cx/api`
- Default API URL: `https://emotio.cx/api` (no hay backend local)

#### 7. Fix del participant-frontend: resolución de URLs de media (`af65c4e`)

**Problema:** Imágenes no cargaban en participant-frontend local. Mismo problema de URLs relativas.

**Fix:** `resolveMediaUrl()` agregada a `media.service.ts` del participant-frontend.

### Deploys a producción

| # | Hora | Qué |
|---|------|-----|
| 1 | ~09:30 | research-frontend: fix Ranking + migración BD |
| 2 | ~12:25 | research-frontend: fix Hide, media URLs, FileUpload re-mount |

### Migraciones ejecutadas en BD (MySQL cPanel)

1. `fix_ranking_module_config_mysql.ts` — 24 módulos Ranking → estructura ranking-list
2. UPDATE manual — Ranking de "Clemente probando": removido image-upload, agregado question-description
3. UPDATE manual — Navigation Flow, Preference Test + 1: `hidden=false`

---

## Estado actual del proyecto (2026-02-17)

### Lo que funciona
- **research-frontend**: Dashboard, Research Builder con todos los stages, todos los módulos Smart VOC y Cognitive Tasks editables (Ranking, Single/Multiple Choice, Short/Long Text, Linear Scale, Navigation Flow, Preference Test). Save Changes preserva datos y respeta toggle Hide. Imágenes cargan en local y producción.
- **participant-frontend**: Preview mode funcional en local y producción. Imágenes de Navigation Flow y Preference Test cargan correctamente. Config se resuelve automáticamente.
- **backend**: API estable en cPanel, media serving funcional, analytics endpoints operativos.

### Problemas conocidos pendientes
- Textos en español en algunos comentarios y variables del código
- Migración BD pendiente: `remove_image_upload_from_modules.ts` (limpiar image-upload de módulos existentes)
