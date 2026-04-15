# Scalability Audit: Participant Frontend → Backend → DB

**Fecha:** 2026-04-15
**Infraestructura:** cPanel shared hosting (emotio.cx), Passenger + Node.js, MySQL (MariaDB)

## Infraestructura del servidor

| Recurso | Valor |
|---|---|
| CPU | 22 cores (x86_64, compartido) |
| RAM | 68 GB (35 GB disponible) |
| File descriptors | 1024 (ulimit -n) |
| MySQL `max_connections` | 500 (servidor completo) |
| MySQL `max_user_connections` | **50** (por usuario MySQL) |
| MySQL `Threads_connected` (actual) | 106 |
| MySQL `Max_used_connections` (histórico) | 501 (ha tocado el límite) |
| MySQL `Connection_errors_max_connections` | **65** (65 veces se rechazó conexión) |
| MySQL `Aborted_connects` | **495,995** (conexiones abortadas) |
| Node.js connection pool | `connectionLimit: 10`, `queueLimit: 0` (sin límite de cola) |
| Passenger | 1 proceso Node.js (event loop), sin cluster |

## Flujo crítico: participante envía respuestas

`POST /public/research/:id/responses` → `saveParticipantResponses()`

### Queries por submission (dentro de transacción):

| # | Query | Tipo |
|---|---|---|
| 1 | `SELECT id FROM researches WHERE id = ? AND status = 'active'` | Validación |
| 2 | `SELECT config FROM researches WHERE id = ?` (getResearchConfiguration) | Config |
| 3 | `SELECT COUNT(DISTINCT participant_id) FROM responses WHERE research_id = ?` (getParticipantCount) | Límite |
| 4 | `SELECT id, name FROM modules WHERE id IN (...)` | Lookup nombres |
| 5 | `BEGIN` | Transacción |
| 6-N | `INSERT INTO responses ... ON DUPLICATE KEY UPDATE` × cada response | **1 por módulo respondido** |
| 6-N | `SELECT id FROM responses WHERE research_id = ? AND participant_id = ? AND module_id = ? AND component_id = ?` × cada response | Confirmación post-insert |
| N+1 | `COMMIT` | Cierre transacción |
| N+2 | `UPDATE participants SET status = 'responded'` (best-effort) | Tracking |

**Para un estudio con 21 módulos:** ~4 queries iniciales + 42 queries en transacción (21 INSERT + 21 SELECT) + COMMIT = **~47 queries por participante**.

### Queries adicionales ANTES de enviar respuestas:

| Momento | Endpoint | Queries |
|---|---|---|
| Carga inicial | `GET /public/research/:id` | ~5 (research + stages + modules + questions + config) |
| Pre-check cuota | `GET /public/research/:id/quota-check` | ~3 |
| Validar demographics | `POST /public/research/:id/demographics` | ~5 (validate + tryIncrementQuota) |

**Total por participante completo: ~60 queries**

## Análisis de capacidad

### Conexiones MySQL

```
Pool size:           10 conexiones
max_user_connections: 50 (límite por usuario MySQL)
```

Con pool de 10 conexiones:
- **10 participantes simultáneos** pueden ejecutar queries en paralelo
- El resto espera en cola (queueLimit: 0 = cola infinita)
- `connectTimeout: 20000` (20s) — si la cola tarda más, falla

**ADVERTENCIA:** Hay 2 pools creados en `database.ts` (líneas 43-58 y 204-216), ambos con `connectionLimit: 10`. Si ambos se inicializan, son 20 conexiones. Sumado a otros servicios del mismo usuario MySQL → riesgo de tocar el límite de 50.

### Throughput estimado

| Escenario | Participantes simultáneos | Queries/seg | Pool suficiente? | Tiempo respuesta |
|---|---|---|---|---|
| Normal (goteo) | 1-5 | ~60-300/s | Sí | <200ms |
| Moderado | 10-20 | ~600-1200/s | Sí (con cola) | 200ms-2s |
| Alto | 50 | ~3000/s | Límite pool | 2-10s |
| Pico | 100+ | ~6000/s | **Cola larga** | 10-30s+ |
| Fallo | 200+ | - | **Timeout/rechazo** | Error 500 |

### Escenarios de fallo

#### 1. Fallo suave (~100 participantes simultáneos)
- Pool saturado, cola crece
- Respuestas lentas (10-30s)
- Participant-frontend muestra loading largo
- **Datos NO se pierden** — la cola eventualmente procesa

#### 2. Fallo duro (~200+ participantes simultáneos)
- `connectTimeout` (20s) excedido
- Transactions abortadas
- HTTP 500 al guardar respuestas
- **Datos SE PIERDEN** para esos participantes
- Participant-frontend muestra error

#### 3. Fallo de conexiones MySQL
- `max_user_connections` (50) alcanzado
- Nuevas conexiones rechazadas (ya ocurrió 65 veces)
- **TODOS los participantes fallan** hasta que se liberen conexiones
- Includes: research load, demographics, response save — todo falla

## Conclusión

| Pregunta | Respuesta |
|---|---|
| **Cuántos participantes soporta sin problemas?** | **~50 simultáneos** (cola < 2s) |
| **Cuántos con degradación aceptable?** | **~100** (respuestas lentas pero se guardan) |
| **Cuántos para fallo?** | **~200+ simultáneos** (timeouts, datos perdidos) |
| **Cuántos TOTALES puede manejar?** | Sin límite si llegan escalonados (~1-5/seg). El problema es ráfagas. |

**Nota:** "simultáneos" = enviando respuestas al mismo tiempo (botón Submit). Si 1000 participantes hacen el estudio en 1 hora, solo ~5-10 envían al mismo tiempo → sin problema. Si los 1000 abren el link al mismo tiempo (ej: email blast), ~50 cargan la research simultáneamente → cola pero funciona. El riesgo real es demographics + submit en ráfaga.

## Recomendaciones (si se necesita escalar a 1000+ simultáneos)

### Corto plazo (cPanel)
1. **Reducir queries por submission**: el SELECT de confirmación post-INSERT es innecesario — MySQL's `LAST_INSERT_ID()` o return del UUID generado
2. **Batch INSERTs**: un solo `INSERT INTO responses VALUES (...), (...), (...)` en vez de N individuales
3. **Subir `connectionLimit` a 20-25** y monitorear `max_user_connections`
4. **Eliminar el pool duplicado** en database.ts (líneas 43-58 nunca se usa si ensurePool siempre gana)

### Medio plazo (migración)
5. **VPS o cloud** con MySQL dedicado (`max_user_connections` sin límite compartido)
6. **Node.js cluster** (PM2 o similar) para usar múltiples cores
7. **Connection pooler** (ProxySQL o PgBouncer si migran a PostgreSQL)

### Largo plazo
8. **Queue para response saving** (Redis/BullMQ) — acepta rápido, procesa después
9. **Read replicas** para analytics (separar lectura de escritura)
