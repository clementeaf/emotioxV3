# Issues & Fixes — EmotioX V3

Registro de problemas encontrados y sus soluciones. Para issues anteriores ver [ISSUES_TRACKING.md](../ISSUES_TRACKING.md).

---

### [2026-03-06] SmartVOC auto-advance se bloquea en segunda pregunta
- **Síntoma:** Después de responder la primera pregunta scale (NPS/CSAT/CES/CV), la siguiente no avanza automáticamente al seleccionar
- **Causa raíz:** `autoAdvanceFired` guard en `SmartVOCRenderer` no se reseteaba al cambiar de `module.id`
- **Solución:** Reset del guard en efecto de `module.id` change (v0.20.1)
- **Prevención:** Cada módulo SmartVOC scale ahora tiene su propio ciclo de auto-advance independiente

### [2026-03-06] Navigation Flow hitzone desalineado en Safari
- **Síntoma:** Los clicks en hitzones no coincidían con las áreas visuales en Safari
- **Causa raíz:** `object-contain` genera letterboxing; `getBoundingClientRect()` retorna el rect del elemento, no del área visible de la imagen
- **Solución:** Implementado `getRenderedImageRect()` para calcular los bounds reales de la imagen renderizada (v0.20.0)
- **Prevención:** Tanto click detection como overlay positioning usan la misma función de cálculo

### [2026-03-05] Crash React en producción por chunk splitting
- **Síntoma:** Participant frontend crashea al cargar en producción (funciona en dev)
- **Causa raíz:** `manualChunks` en Vite config: `id.includes('react')` capturaba todas las libs react-* en un chunk, mientras `scheduler` (dep de react-dom) quedaba en otro, rompiendo orden de inicialización
- **Solución:** Matching específico por biblioteca antes del match genérico de React; core React usa exact path matching (`/react/`, `/react-dom/`, `/scheduler/`) (v0.18.1)
- **Prevención:** No usar includes genéricos en manualChunks, siempre exact match para deps críticas

### [2026-03-04] Location Granularity hardcodeada para Chile
- **Síntoma:** Chile tenía 3 niveles de ubicación (país→región→comuna), todos los demás países solo 1. Investigador no podía configurar
- **Causa raíz:** Lógica hardcodeada con `=== 'Chile'` en DemographicsStep y archivo `chile-geography.ts`
- **Solución:** Tipo `LocationGranularity` (`countryOnly | countryCity`), selector en CountryConfigModal, lectura dinámica en participant (v0.17.0)
- **Prevención:** Eliminados `chile-geography.ts` de ambos frontends y validación hardcodeada del backend

### [2026-02-17] Preview mode muestra último step visitado
- **Síntoma:** URL con `?preview=true` mostraba Thank You en vez de Welcome
- **Causa raíz:** `useParticipantStore` persiste `currentStep` en localStorage; el efecto de reset hace early return cuando `participantId` es null (preview mode)
- **Solución:** Agregar `isPreviewMode` a condición de reset: siempre resetear al primer step en preview (v0.19 sesión 3)
- **Prevención:** Preview mode ahora también llama `clearAllResponses()` al entrar

### [2026-02-17] Módulo Ranking renderiza como select genérico
- **Síntoma:** El editor de Ranking muestra un dropdown en vez del editor de items arrastrables
- **Causa raíz:** Seed template usa `type: 'ranking-list'` pero `EditableComponent.tsx` solo tenía `case 'ranking'`
- **Solución:** Agregado `'ranking-list'` a `ComponentType`, extraído `RankingItemsEditor`, migración de 24 módulos en BD (sesión 1)
- **Prevención:** Tipos de componentes validados contra enum en build time

### [2026-02-17] Módulos se ocultan automáticamente al guardar
- **Síntoma:** Navigation Flow y Preference Test quedan en blanco después de guardar
- **Causa raíz:** `finalHidden = !hasModuleConfiguredValues(...)` marcaba como hidden cualquier módulo sin datos detectados
- **Solución:** Save usa `moduleRef.getHidden()` (toggle explícito del investigador) en vez de inferir de contenido (sesión 1)
- **Prevención:** Toggle Hide visible en todos los entornos

### [2026-01-20] QR y URL de participante no se generan
- **Síntoma:** Botón Generate QR muestra error, campo URL vacío, Copy no funciona
- **Causa raíz:** `runtime-config.json` del research-frontend en producción no tiene `participantBaseUrl`. Las 3 prioridades de resolución fallan (runtime-config, VITE env, fallback emotiox.org)
- **Solución:** Agregar `"participantBaseUrl": "https://emotio.cx/participant"` a `~/public_html/research/runtime-config.json`
- **Prevención:** Script de deploy actualizado para incluir el campo. Ver [reporte completo](../REPORT_URL_QR_ISSUE.md)
