# MySQL Compatibility Fixes - Backend

## Problemas Críticos Corregidos

### 1. ✅ Status Constraint en DELETE Research
**Problema**: El constraint CHECK en MySQL solo permite: 'draft','active','paused','completed','archived', pero el código intentaba usar 'deleted'.

**Solución**: Cambiado `status = 'deleted'` a `status = 'archived'` en `deleteResearch()`. El campo `deleted_at` es el indicador real de eliminación.

**Archivo**: `backend/src/modules/research/research.service.ts:951-970`

### 2. ✅ CURRENT_TIMESTAMP → NOW()
**Problema**: Aunque CURRENT_TIMESTAMP funciona en MySQL, NOW() es más estándar y explícito.

**Solución**: Reemplazado `CURRENT_TIMESTAMP` por `NOW()` en UPDATE statements.

**Archivos corregidos**:
- `backend/src/modules/research/research.service.ts` (activate, deleteResearch)

**Archivos pendientes** (no críticos, pero recomendados):
- `backend/src/modules/auth/auth.service.local.ts`
- `backend/src/modules/research-techniques/research-techniques.service.ts`
- `backend/src/modules/enterprises/enterprises.service.ts`
- `backend/src/modules/users/users.service.ts`
- `backend/src/modules/quotas/quota.service.ts`

## Problemas Identificados (No Críticos)

### 3. ⚠️ RETURNING Clauses en Comentarios
**Estado**: Falsos positivos - son solo comentarios explicativos, no código ejecutable.

**Archivos**: Múltiples archivos con comentarios como "MySQL doesn't support RETURNING"

### 4. ⚠️ Parámetros PostgreSQL ($1, $2) en database.ts
**Estado**: Falsos positivos - son parte del wrapper de compatibilidad que convierte automáticamente.

**Archivo**: `backend/src/config/database.ts` - Este archivo es el wrapper que maneja la conversión.

### 5. ⚠️ uuid_generate_v4() en database.ts
**Estado**: Falsos positivos - es parte del wrapper que convierte automáticamente a UUID().

**Archivo**: `backend/src/config/database.ts:76` - Conversión automática implementada.

## Verificaciones Realizadas

### ✅ rowCount
El wrapper en `database.ts` ya maneja correctamente la conversión de `affectedRows` (MySQL) a `rowCount` (PostgreSQL).

### ✅ Transacciones
`BEGIN`, `COMMIT`, `ROLLBACK` funcionan correctamente en MySQL.

### ✅ UUID Generation
Ya se usa `crypto.randomUUID()` en lugar de funciones de base de datos.

### ✅ JSON Handling
Ya se parsea correctamente JSON desde strings (MySQL almacena JSON como TEXT).

## Próximos Pasos Recomendados

1. **Revisar otros CURRENT_TIMESTAMP**: Cambiar a NOW() en los archivos pendientes (no crítico, pero mejora consistencia).

2. **Verificar constraints de otras tablas**: Revisar si hay otros CHECK constraints que puedan causar problemas similares.

3. **Testing exhaustivo**: Probar todas las operaciones CRUD en producción para identificar otros problemas.

## Script de Análisis

Se creó un script de análisis en `backend/scripts/fix-mysql-compatibility.ts` que puede ejecutarse periódicamente para identificar nuevos problemas:

```bash
cd backend
npx tsx scripts/fix-mysql-compatibility.ts
```

El script genera un reporte en `mysql-compatibility-report.json`.
