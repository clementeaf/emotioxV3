# Plan: Modos de Participación — Kiosko vs Panel

> Fecha: 2026-03-11
> Estado: **Diseño aprobado, pendiente implementación**
> Referencia: [ISSUES_&_FIXES.md](ISSUES_&_FIXES.md) → entrada 2026-03-11

---

## Problema

Actualmente el sistema trata todas las investigaciones igual: el `participantId` llega como query param en la URL (`?participantId=xxx`), generado externamente. No hay distinción entre un estudio SmartVOC donde múltiples personas responden desde un mismo dispositivo y un estudio Cognitive Tasks donde cada participante recibe un link individual.

---

## Dos modos de participación

### Modo 1 — Kiosko (cliente final / SmartVOC)

| Aspecto | Detalle |
|---------|---------|
| **Caso de uso** | Tablet en tienda, totem, link público compartido |
| **Quién responde** | Clientes finales anónimos, uno tras otro |
| **ParticipantId** | Autogenerado por el backend, incremental por research (`kiosk-1`, `kiosk-2`, ...) |
| **Flujo** | Responde → submit → backend asigna ID → participant-frontend resetea a Welcome → siguiente persona |
| **Demografía** | No aplica o mínima |
| **URL** | Una sola URL/QR, reutilizable indefinidamente |

### Modo 2 — Panel (base de datos comprada / Cognitive Tasks)

| Aspecto | Detalle |
|---------|---------|
| **Caso de uso** | Base de datos de personas (emails), link individual |
| **Quién responde** | Participantes identificados, una vez cada uno |
| **ParticipantId** | Externo (proveedor del panel) o generado por el sistema al importar base |
| **Flujo** | Recibe link por email → responde → submit → fin (no reset) |
| **Demografía** | Completa, con cuotas y disqualification |
| **URL** | Un link por participante (`?participantId=ext-123`) o link genérico + registro |
| **Incógnita** | ¿El proveedor entrega IDs propios? Se diseña para soportar ambos casos |

---

## Estado actual del backend (línea base)

### Lo que ya existe y sirve
- `participant_id VARCHAR(255)` en tabla `responses` — flexible, acepta cualquier formato de ID
- `researches.config` JSON — extensible para agregar `participationMode`
- Sistema de cuotas demográficas funcional
- `participantLimit` configurable por research
- SSE broadcast post-respuesta (SmartVOC real-time)
- Preview mode (`?preview=true`) ya diferencia flujo sin guardar

### Lo que NO existe
- No hay campo `participationMode` en config
- No hay tabla de participantes (son entidades implícitas derivadas de `DISTINCT participant_id`)
- No hay auto-generación de IDs en backend
- No hay endpoint para consultar el modo de una research
- Participant-frontend no tiene lógica de reset post-submit

---

## Plan de implementación — Microtareas

### Fase 1 — Backend: soporte de modos

#### 1.1 Tipo `ParticipationMode` y lectura de config
- [x] **1.1.1** Crear tipo `ParticipationMode = 'kiosk' | 'panel'` en `backend/src/modules/public/public.service.ts`
- [x] **1.1.2** Crear método `getParticipationMode(researchId): Promise<ParticipationMode>` en `public.service.ts` — lee Research Configuration module config, extrae `participationMode`, default `'panel'`
- [x] **1.1.3** Verificar que `research.service.ts` ya persiste campos arbitrarios en `config` JSON al hacer update → Sí, el config se guarda como JSON libre en el módulo "Research Configuration"

#### 1.2 Endpoint GET modo de participación
- [x] **1.2.1** Agregar ruta `GET /public/research/:researchId/mode` en `public.controller.ts`
- [x] **1.2.2** Handler: llama `getParticipationMode()`, responde `{ mode, settings }` (settings vacío por ahora)
- [x] **1.2.3** Verificar que la ruta es pública (sin JWT, igual que otros endpoints `/public/`)

#### 1.3 Endpoint POST sesión kiosko
- [x] **1.3.1** Agregar ruta `POST /public/research/:researchId/kiosk/session` en `public.controller.ts`
- [x] **1.3.2** Crear método `generateKioskSession(researchId): Promise<{ participantId: string }>` en `public.service.ts`
- [x] **1.3.3** Implementar lógica de ID incremental: `SELECT COUNT(DISTINCT participant_id) FROM responses WHERE research_id = ? AND participant_id LIKE 'kiosk-%'` → `kiosk-(count+1)`
- [x] **1.3.4** Envolver en transacción MySQL con `FOR UPDATE` para evitar race condition entre tablets simultáneas
- [x] **1.3.5** Validar que la research existe, está activa, y tiene `participationMode === 'kiosk'` — si no, devolver 400

#### 1.4 Modificar save de respuestas para modo kiosko
- [x] **1.4.1-1.4.4** No se necesitan cambios: `saveParticipantResponses()` ya acepta cualquier `participantId` no vacío del body. Los IDs kiosko (`kiosk-N`) pasan la validación existente. `participantLimit` funciona igual porque cuenta `DISTINCT participant_id` sin filtrar por formato.

#### 1.5 Verificación Fase 1
- [ ] **1.5.1** Test manual: crear research con `config.participationMode = 'kiosk'` directo en BD
- [ ] **1.5.2** Test: `GET /public/research/:id/mode` devuelve `{ mode: 'kiosk' }`
- [ ] **1.5.3** Test: `POST /public/research/:id/kiosk/session` devuelve `{ participantId: 'kiosk-1' }`
- [ ] **1.5.4** Test: segunda llamada devuelve `kiosk-2`
- [ ] **1.5.5** Test: save responses con `participantId: 'kiosk-1'` funciona
- [ ] **1.5.6** Test: research sin modo (existente) devuelve `{ mode: 'panel' }` (retrocompatibilidad)
- [x] **1.5.7** Build + type-check 0 errors

---

### Fase 2 — Research Frontend: selector de modo

#### 2.1 Selector de modo en Research Configuration
- [x] **2.1.1** Leer el componente `ResearchConfigurationModule.tsx` completo para entender estructura actual
- [x] **2.1.2** Agregar estado local `participationMode` inicializado desde `research.config.participationMode ?? 'panel'`
- [x] **2.1.3** Crear UI de dos radio cards: "Kiosk" / "Panel" — ubicar arriba de la sección de demografía
- [x] **2.1.4** Persistir `participationMode` en el save de Research Configuration (incluir en el payload que va al backend)
- [x] **2.1.5** Bloquear cambio de modo si research está en estado `active` (solo editable en `draft`)

#### 2.2 Condicionar secciones según modo
- [x] **2.2.1** Si `mode === 'kiosk'`: ocultar sección de demografía completa
- [x] **2.2.2** Si `mode === 'kiosk'`: ocultar backlinks de disqualification y overquota
- [x] **2.2.3** Si `mode === 'kiosk'`: mantener visible `participantLimit` (cuántas respuestas máximo)
- [x] **2.2.4** Si `mode === 'panel'`: mostrar todo como está actualmente (sin cambios)

#### 2.3 URL/QR ajustado por modo
- [x] **2.3.1** Si `mode === 'kiosk'`: generar URL sin `?participantId=` (URL limpia, reutilizable)
- [x] **2.3.2** Si `mode === 'kiosk'`: QR code apunta a URL limpia
- [x] **2.3.3** Si `mode === 'panel'`: mantener URL actual con instrucción sobre participantId
- [x] **2.3.4** Actualizar tooltip/texto explicativo según modo seleccionado

#### 2.4 Verificación Fase 2
- [ ] **2.4.1** Test: selector de modo visible y funcional en Research Configuration
- [ ] **2.4.2** Test: cambiar a kiosko oculta demografía y backlinks
- [ ] **2.4.3** Test: cambiar a panel restaura todo
- [ ] **2.4.4** Test: save persiste `participationMode` en config
- [ ] **2.4.5** Test: URL y QR se ajustan según modo
- [ ] **2.4.6** Test: no se puede cambiar modo en research activa
- [x] **2.4.7** Build + lint 0 errors

---

### Fase 3 — Participant Frontend: flujo kiosko

#### 3.1 Detección de modo al cargar
- [ ] **3.1.1** Crear servicio/función `fetchParticipationMode(researchId)` que llama `GET /public/research/:id/mode`
- [ ] **3.1.2** Agregar `participationMode: 'kiosk' | 'panel' | null` al Zustand store (`participantStore.ts`)
- [ ] **3.1.3** En `ResearchPage.tsx`: llamar `fetchParticipationMode` al montar, guardar en store
- [ ] **3.1.4** Mostrar loading mientras se resuelve el modo (antes de iniciar flujo)

#### 3.2 Sesión kiosko: obtener ID al inicio
- [ ] **3.2.1** Crear servicio/función `requestKioskSession(researchId)` que llama `POST /public/research/:id/kiosk/session`
- [ ] **3.2.2** Si `mode === 'kiosk'` y no hay `participantId` en URL: llamar `requestKioskSession` automáticamente
- [ ] **3.2.3** Guardar `participantId` retornado en Zustand store (mismo campo que el actual)
- [ ] **3.2.4** Ajustar `usePreviewMode.ts`: modo kiosko NO es preview (debe guardar respuestas)

#### 3.3 Reset post-submit (flujo kiosko)
- [ ] **3.3.1** Identificar el punto exacto donde el flujo actual termina (Thank You screen mount o submit final)
- [ ] **3.3.2** Si `mode === 'kiosk'`: después de submit, mostrar pantalla de transición ("Gracias, preparando siguiente...")
- [ ] **3.3.3** Llamar `clearAllResponses()` del store
- [ ] **3.3.4** Llamar `requestKioskSession()` para obtener nuevo `participantId`
- [ ] **3.3.5** Navegar a Welcome screen (primer step) — SPA reset sin recarga de página
- [ ] **3.3.6** Timer configurable en transición (3-5 segundos) antes de reset automático

#### 3.4 Modo panel: sin cambios
- [ ] **3.4.1** Verificar que `mode === 'panel'` (o `null` para researches existentes) mantiene flujo actual exacto
- [ ] **3.4.2** Verificar que Thank You screen NO resetea en modo panel

#### 3.5 Verificación Fase 3
- [ ] **3.5.1** Test: URL kiosko sin `?participantId` carga correctamente
- [ ] **3.5.2** Test: se asigna `kiosk-1` automáticamente al cargar
- [ ] **3.5.3** Test: respuestas se guardan con `participant_id = 'kiosk-1'`
- [ ] **3.5.4** Test: al terminar, se resetea y obtiene `kiosk-2`
- [ ] **3.5.5** Test: segundo participante puede responder completo
- [ ] **3.5.6** Test: URL panel con `?participantId=xxx` sigue funcionando igual
- [ ] **3.5.7** Test: preview mode sigue funcionando igual
- [ ] **3.5.8** Build + lint 0 errors

---

### Fase 4 — Panel: refinamientos (posterior, no prioridad)

- [ ] **4.1** Diseñar schema de importación de participantes (CSV: email, nombre, ID externo opcional)
- [ ] **4.2** Endpoint backend: `POST /research/:id/participants/import` (parseo CSV + generación de IDs)
- [ ] **4.3** UI research-frontend: botón importar + preview de datos + confirmación
- [ ] **4.4** Generación de links individuales por participante
- [ ] **4.5** Tracking de estado por participante (pendiente / respondido / descalificado)
- [ ] **4.6** Integración de envío por email (Resend, SendGrid, o similar)

---

## Decisiones de diseño

| Decisión | Justificación |
|----------|---------------|
| `participationMode` en `researches.config` JSON | No requiere migración de BD, extensible |
| Default `'panel'` | Retrocompatible con investigaciones existentes |
| IDs kiosko como `kiosk-N` | Distinguibles de IDs externos, legibles en analytics |
| Contador en config vs MAX query | Pendiente de decidir — MAX query es más simple pero potencial race condition |
| Sin tabla de participantes | No se necesita por ahora; `responses.participant_id` es suficiente para ambos modos |
| Fase 4 separada | El modo panel ya funciona (es el actual); los refinamientos (import, email) son features nuevas independientes |

---

## Orden de ejecución recomendado

1. **Fase 1** (backend) — ~1 sesión
2. **Fase 3** (participant-frontend) — ~1 sesión (depende de Fase 1)
3. **Fase 2** (research-frontend) — ~1 sesión (puede ir en paralelo con Fase 3)
4. **Fase 4** (panel refinamientos) — futuro, según necesidad del negocio

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Race condition en IDs kiosko (dos tablets simultáneas) | Usar transacción MySQL con `FOR UPDATE` o counter atómico |
| Investigaciones existentes sin modo definido | Default `'panel'`, no rompe nada |
| Kiosko sin internet momentáneo | Participant-frontend ya funciona offline-first con Zustand; el submit se retiene hasta reconexión |
| Modo incorrecto seleccionado por investigador | Permitir cambiar modo solo en estado `draft`, no en `active` |
