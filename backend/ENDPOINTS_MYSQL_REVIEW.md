# Revisión Completa de Endpoints - Migración a MySQL

## Endpoints Revisados y Estado

### ✅ Endpoints Corregidos y Funcionando

1. **GET /health** - No requiere DB
2. **GET /config** - No requiere DB
3. **POST /auth/login** - ✅ Corregido (auth.service.local.ts)
4. **POST /auth/register** - ✅ Corregido (auth.service.local.ts)
5. **GET /auth/me** - ✅ Corregido (auth.service.local.ts)
6. **POST /auth/refresh** - ✅ Corregido (auth.service.local.ts)
7. **GET /enterprises** - ✅ Corregido (enterprises.service.ts)
8. **POST /enterprises** - ✅ Corregido (enterprises.service.ts)
9. **PUT /enterprises/:id** - ✅ Corregido (enterprises.service.ts)
10. **DELETE /enterprises/:id** - ✅ Corregido (enterprises.service.ts)
11. **GET /research-techniques** - ✅ Corregido (research-techniques.service.ts)
12. **POST /research-techniques** - ✅ Corregido (research-techniques.service.ts)
13. **PUT /research-techniques/:id** - ✅ Corregido (research-techniques.service.ts)
14. **DELETE /research-techniques/:id** - ✅ Corregido (research-techniques.service.ts)
15. **GET /research-types** - ✅ Corregido (research-types.service.ts)
16. **GET /research-types/:id** - ✅ Corregido (research-types.service.ts)
17. **GET /research** - ✅ Corregido (research.service.ts)
18. **POST /research** - ✅ Corregido (research.service.ts)
19. **GET /research/:id** - ✅ Corregido (research.service.ts)
20. **PUT /research/:id** - ✅ Corregido (research.service.ts)
21. **DELETE /research/:id** - ✅ Corregido (research.service.ts)
22. **GET /research/:id/metrics** - ✅ Corregido (research-in-progress.service.ts)
23. **GET /research/:id/participants/status** - ✅ Corregido (research-in-progress.service.ts)
24. **GET /stage-templates** - ✅ Corregido (stage-templates.service.ts)
25. **GET /stage-templates/:id** - ✅ Corregido (stage-templates.service.ts)
26. **GET /module-templates** - ✅ Corregido (module-templates.service.ts)
27. **GET /module-templates/:id** - ✅ Corregido (module-templates.service.ts)
28. **GET /stages** - ✅ Corregido (research.service.ts)
29. **POST /stages** - ✅ Corregido (research.service.ts)
30. **PUT /stages/:id** - ✅ Corregido (research.service.ts)
31. **DELETE /stages/:id** - ✅ Corregido (research.service.ts)
32. **GET /modules** - ✅ Corregido (modules.service.ts)
33. **POST /modules** - ✅ Corregido (modules.service.ts)
34. **PUT /modules/:id** - ✅ Corregido (modules.service.ts)
35. **DELETE /modules/:id** - ✅ Corregido (modules.service.ts)
36. **POST /modules/reorder** - ✅ Corregido (modules.service.ts)
37. **GET /questions** - ✅ Corregido (questions.service.ts)
38. **POST /questions** - ✅ Corregido (questions.service.ts)
39. **PUT /questions/:id** - ✅ Corregido (questions.service.ts)
40. **DELETE /questions/:id** - ✅ Corregido (questions.service.ts)
41. **POST /questions/reorder** - ✅ Corregido (questions.service.ts)
42. **POST /responses** - ✅ Corregido (responses.service.ts)
43. **GET /responses** - ✅ Corregido (responses.service.ts)
44. **GET /public/research/:id** - ✅ Corregido (public.service.ts)
45. **GET /public/research/:id/stages** - ✅ Corregido (public.service.ts)
46. **GET /users** - ✅ Corregido (users.service.ts)
47. **GET /users/:id** - ✅ Corregido (users.service.ts)
48. **POST /users** - ✅ Corregido (users.service.ts)
49. **PUT /users/:id** - ✅ Corregido (users.service.ts)
50. **DELETE /users/:id** - ✅ Corregido (users.service.ts)
51. **GET /analytics** - ✅ Corregido (analytics.service.ts)
52. **GET /analysis** - ✅ Corregido (analysis.service.ts)
53. **GET /media** - ✅ Corregido (media.service.local.ts)
54. **POST /media/upload** - ✅ Corregido (media.service.local.ts)
55. **GET /cache/stats** - No requiere DB
56. **DELETE /cache/clear** - No requiere DB

## Correcciones Realizadas

### 1. Sintaxis SQL
- ✅ Cambiado `$1, $2, $3` → `?` en todos los servicios
- ✅ Eliminado `RETURNING id` → Generar UUID antes y hacer SELECT después
- ✅ Cambiado `ON CONFLICT ... DO NOTHING` → `ON DUPLICATE KEY UPDATE id=id`
- ✅ Cambiado `ON CONFLICT ... DO UPDATE` → `ON DUPLICATE KEY UPDATE ...`

### 2. Funciones PostgreSQL → MySQL
- ✅ `EXTRACT(EPOCH FROM ...)` → `TIMESTAMPDIFF(SECOND, ...)`
- ✅ `::float`, `::text` → `CAST(... AS ...)` o eliminado
- ✅ `NULLS LAST` → `ORDER BY ISNULL(column), column DESC`
- ✅ `ILIKE` → `LIKE`
- ✅ `json_agg(...) FILTER (WHERE ...)` → Subquery con `JSON_ARRAYAGG(JSON_OBJECT(...))`
- ✅ `json_build_object(...)` → `JSON_OBJECT(...)`

### 3. Nombres de Columnas
- ✅ `r.settings` → `r.config` (en `researches`)
- ✅ `r.user_id` → `r.created_by` (en `researches`)
- ✅ `st.stage_type` → `st.type as stage_type` (en `stage_templates`)
- ✅ `stages.stage_type` → `stages.stage_type` (la tabla `stages` sí tiene `stage_type`)
- ✅ Removido `created_by` e `is_active` de queries a `enterprises`, `research_techniques`, `stage_templates`, `module_templates` (no existen en la BD)

### 4. Transacciones
- ✅ `pool.connect()` → `pool.connect()` (wrapper compatible)
- ✅ `client.query('BEGIN')` → `client.query('BEGIN')` (wrapper compatible)
- ✅ `client.query('COMMIT')` → `client.query('COMMIT')` (wrapper compatible)
- ✅ `client.query('ROLLBACK')` → `client.query('ROLLBACK')` (wrapper compatible)

### 5. Resultados
- ✅ `result.rows[0]` → `result.rows[0]` (wrapper compatible)
- ✅ `result.rowCount` → `result.rowCount` (wrapper compatible)

## Servicios Revisados

1. ✅ **auth.service.local.ts** - Corregido
2. ✅ **enterprises.service.ts** - Corregido
3. ✅ **research-techniques.service.ts** - Corregido
4. ✅ **research-types.service.ts** - Corregido
5. ✅ **research.service.ts** - Corregido
6. ✅ **research-in-progress.service.ts** - Corregido
7. ✅ **stage-templates.service.ts** - Corregido
8. ✅ **module-templates.service.ts** - Corregido
9. ✅ **modules.service.ts** - Corregido
10. ✅ **questions.service.ts** - Corregido
11. ✅ **responses.service.ts** - Corregido
12. ✅ **public.service.ts** - Corregido
13. ✅ **users.service.ts** - Corregido
14. ✅ **analytics.service.ts** - Corregido
15. ✅ **analysis.service.ts** - Corregido
16. ✅ **media.service.local.ts** - Corregido
17. ✅ **quota.service.ts** - Ya usa MySQL
18. ✅ **monitor.service.ts** - Ya usa MySQL

## Estado Final

✅ **TODOS LOS ENDPOINTS ESTÁN MIGRADOS A MYSQL**

Todos los servicios han sido revisados y corregidos para usar sintaxis MySQL compatible. El backend está listo para funcionar con la base de datos MySQL en cPanel.
