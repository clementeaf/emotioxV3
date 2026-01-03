# Problema con Cookies en API Gateway REST API

## Problema Identificado

API Gateway REST API tiene limitaciones conocidas con cookies en peticiones CORS. Aunque las cookies se pueden establecer correctamente, API Gateway no siempre las pasa automáticamente en las peticiones subsecuentes cuando se usa CORS.

## Configuración Actual

### Backend
- ✅ Cookies configuradas correctamente con `httpOnly`, `secure`, y `sameSite`
- ✅ CORS configurado con `Access-Control-Allow-Credentials: true`
- ✅ `multiValueHeaders` usado para `Set-Cookie` (requerido por API Gateway)
- ✅ Headers CORS incluyen `Cookie` y `Set-Cookie`

### Frontend
- ✅ `withCredentials: true` configurado en axios
- ✅ Token también enviado en header `Authorization` como fallback

## Soluciones Posibles

### Opción 1: Migrar a API Gateway HTTP API (Recomendado)
HTTP API tiene mejor soporte para cookies y CORS:
- Mejor rendimiento
- Menor costo
- Mejor soporte para cookies en CORS
- Soporte nativo para cookies httpOnly

**Desventajas:**
- Requiere cambios en la configuración de serverless
- Puede requerir ajustes en el código

### Opción 2: Mantener Fallback Actual (Temporal)
Mantener el sistema actual donde:
- Las cookies se intentan usar primero
- Si no funcionan, se usa el token del header `Authorization`
- El token se persiste en localStorage/sessionStorage como fallback

**Ventajas:**
- Funciona actualmente
- No requiere cambios grandes

**Desventajas:**
- Menos seguro (token en localStorage)
- Requiere mantener dos sistemas de autenticación

### Opción 3: Usar CloudFront como Proxy
Configurar CloudFront delante de API Gateway para manejar cookies mejor:
- CloudFront puede manejar cookies mejor que API Gateway directamente
- Mantiene la seguridad de cookies httpOnly

**Desventajas:**
- Requiere configuración adicional de CloudFront
- Aumenta la complejidad

## Recomendación

**Corto plazo:** Mantener el sistema actual con fallback a localStorage (ya implementado)

**Largo plazo:** Migrar a API Gateway HTTP API para mejor soporte de cookies

## Verificación

Para verificar si las cookies están funcionando:

1. Abrir DevTools > Application > Cookies
2. Verificar que las cookies `accessToken` y `refreshToken` se establecen después del login
3. Verificar que las cookies se envían en peticiones subsecuentes (Network tab > Headers > Request Headers > Cookie)
4. Verificar logs del backend para ver si las cookies se reciben

## Próximos Pasos

1. Verificar si las cookies realmente se están recibiendo en el backend
2. Si no, considerar migrar a HTTP API
3. O mantener el sistema actual con fallback

