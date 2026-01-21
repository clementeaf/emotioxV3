# Script de Prueba de Endpoints - cPanel

Este script prueba **TODOS** los endpoints del backend desplegado en cPanel.

## Características

- ✅ **Crea automáticamente un usuario de prueba** si no existe
- ✅ Prueba todos los endpoints públicos y autenticados
- ✅ Obtiene IDs reales de la base de datos para pruebas más realistas
- ✅ Genera un reporte detallado por categoría
- ✅ Maneja errores y omite endpoints que requieren datos específicos

## Uso

### Opción 1: Usando npm script

```bash
cd backend
npm run test:endpoints:cpanel
```

### Opción 2: Ejecutar directamente con tsx

```bash
cd backend
npx tsx scripts/test-all-endpoints-cpanel.ts
```

## Configuración

El script usa variables de entorno del archivo `.env`:

```env
# URL base del API (requerido)
API_BASE_URL=https://emotio.cx/api

# Credenciales del usuario de prueba (opcional, tiene valores por defecto)
TEST_USER_EMAIL=test@emotiox.test
TEST_USER_PASSWORD=TestPassword123!
TEST_USER_FIRST_NAME=Test
TEST_USER_LAST_NAME=User
```

### Valores por defecto

Si no se configuran las variables de entorno, el script usa:
- **Email**: `test@emotiox.test`
- **Password**: `TestPassword123!`
- **Nombre**: `Test User`

## Endpoints Probados

El script prueba los siguientes grupos de endpoints:

### System
- `GET /health` - Health check
- `GET /config` - Configuración de la API
- `GET /debug-headers` - Debug de headers

### Auth
- `POST /auth/register` - Registro de usuario
- `POST /auth/login` - Login
- `GET /auth/me` - Información del usuario actual
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout

### Research Types
- `GET /research-types` - Listar tipos de investigación
- `GET /research-types/:id` - Obtener tipo de investigación
- `GET /research-types/:id/techniques` - Técnicas del tipo
- `GET /research-types/:id/module-assignments` - Asignaciones de módulos

### Research Techniques
- `GET /research-techniques` - Listar técnicas
- `GET /research-techniques/:id` - Obtener técnica

### Enterprises
- `GET /enterprises` - Listar empresas
- `GET /enterprises/:id` - Obtener empresa

### Research
- `GET /research` - Listar investigaciones
- `GET /research/:id` - Obtener investigación
- `GET /research/:id/metrics` - Métricas
- `GET /research/:id/participants/status` - Estado de participantes
- `GET /research/:id/stages` - Stages de la investigación
- `GET /research/:id/modules` - Módulos de la investigación

### Stage Templates
- `GET /stage-templates` - Listar templates de stages
- `GET /stage-templates/:id` - Obtener template

### Module Templates
- `GET /module-templates` - Listar templates de módulos
- `GET /module-templates/:id` - Obtener template
- `GET /module-templates/:id/usage` - Uso del template

### Analytics
- `GET /analytics/research/:id/smartvoc` - Analytics SmartVOC
- `GET /analytics/research/:id/cognitive-tasks` - Analytics de tareas cognitivas
- `GET /analytics/research/:id/navigation-flow/:moduleId` - Analytics de navegación
- `GET /analytics/research/:id/preference-test/:moduleId` - Analytics de preferencias
- `GET /analytics/research/:id/text-responses/:moduleId` - Analytics de respuestas de texto
- `GET /analytics/research/:id/choice-responses/:moduleId` - Analytics de respuestas de opción
- `GET /analytics/research/:id/scale-responses/:moduleId` - Analytics de respuestas de escala
- `GET /analytics/research/:id/ranking-responses/:moduleId` - Analytics de respuestas de ranking

### Analysis
- `GET /analysis/modules` - Listar módulos de análisis

### Responses
- `GET /responses/research/:id` - Respuestas de investigación
- `GET /responses/research/:id/participant/:participantId` - Respuestas de participante

### Cache
- `GET /cache/stats` - Estadísticas de cache

### Public
- `GET /public/research/:id` - Investigación pública
- `GET /public/media/by-key` - Media pública

### Users
- `GET /users` - Listar usuarios

## Reporte

El script genera un reporte detallado que incluye:

1. **Resumen general**:
   - Total de endpoints probados
   - Cantidad de exitosos
   - Cantidad de errores
   - Cantidad de omitidos

2. **Lista de errores**: Detalles de cada endpoint que falló

3. **Resumen por categoría**: Estadísticas agrupadas por módulo

## Ejemplo de Salida

```
🚀 Iniciando pruebas de TODOS los endpoints del backend en cPanel

📍 API Base URL: https://emotio.cx/api

🔍 Verificando si existe usuario de prueba...
✅ Usuario de prueba ya existe
✅ Autenticación exitosa con usuario de prueba

📋 IDs de prueba obtenidos:
   Research Type ID: abc-123-def
   Research ID: xyz-789-ghi
   Enterprise ID: mno-456-pqr

📊 Total de endpoints a probar: 45

================================================================================

✅ Health Check [200] (45ms)
✅ Config [200] (123ms)
✅ Auth Login [200] (234ms)
...

================================================================================
📊 REPORTE FINAL

✅ Exitosos: 42
❌ Errores: 2
⏭️  Omitidos: 1
📊 Total: 45

📋 RESUMEN POR CATEGORÍA:

   ✅ System: 3/3 exitosos (0 errores, 0 omitidos)
   ✅ Auth: 5/5 exitosos (0 errores, 0 omitidos)
   ⚠️  Research: 4/6 exitosos (2 errores, 0 omitidos)
   ...
```

## Notas

- El script crea un usuario de prueba si no existe. Este usuario se puede usar para pruebas manuales también.
- Los endpoints que requieren IDs específicos usan IDs reales de la base de datos cuando están disponibles.
- El script espera 100ms entre cada request para no sobrecargar el servidor.
- Los endpoints que requieren datos específicos (como keys de media) se omiten automáticamente.

## Troubleshooting

### Error: "No se pudo obtener token de autenticación"

- Verifica que `API_BASE_URL` esté correctamente configurado
- Verifica que el endpoint `/auth/login` esté funcionando
- Verifica que las credenciales del usuario de prueba sean correctas

### Error: "Connection refused" o "ECONNREFUSED"

- Verifica que el backend esté desplegado y funcionando en cPanel
- Verifica que la URL en `API_BASE_URL` sea correcta
- Verifica la conectividad de red

### Muchos endpoints retornan 404

- Esto es normal si no hay datos en la base de datos
- El script marca como éxito los 404 cuando se esperan (endpoints que requieren IDs específicos)
- Para pruebas más completas, asegúrate de tener datos de prueba en la base de datos
