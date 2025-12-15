# Solución para ERR_BLOCKED_BY_ORB

## Problema
El error `ERR_BLOCKED_BY_ORB` (Opaque Response Blocking) ocurre cuando el navegador bloquea respuestas de recursos cross-origin que no tienen un Content-Type válido o reconocible.

## Cambios Realizados

### 1. Backend - Generación de Presigned URLs
- ✅ Agregado `ResponseContentType` al `GetObjectCommand`
- ✅ Agregado función `getContentTypeFromKey()` para determinar Content-Type desde la extensión del archivo
- ✅ Agregado `ResponseContentDisposition` para forzar el tipo correcto

### 2. CORS Configuration
- ✅ Actualizado `backend/cors.json` con `Content-Type` y `Content-Length` en `ExposeHeaders`
- ✅ Aplicado al bucket S3: `emotioxv3-media-041238861016`

### 3. Frontend
- ✅ Agregado `crossOrigin="anonymous"` a las imágenes
- ✅ Mejorado manejo de errores con logging

## Si el Error Persiste

### Paso 1: Limpiar Caché del Navegador
El navegador puede tener URLs presigned antiguas en caché. Prueba:
1. **Chrome/Edge**: Ctrl+Shift+Delete → Limpiar caché e imágenes
2. **Firefox**: Ctrl+Shift+Delete → Limpiar caché
3. **Safari**: Cmd+Option+E → Vaciar cachés
4. O usar **modo incógnito/privado**

### Paso 2: Verificar URLs Presigned Nuevas
Las URLs presigned expiran después de 1 hora. Asegúrate de:
- Recargar la página para obtener nuevas URLs
- Si estás editando un módulo existente, las URLs se regeneran automáticamente

### Paso 3: Verificar Content-Type en S3
Si el objeto en S3 no tiene el Content-Type correcto cuando se subió, puede causar problemas:

```bash
# Verificar metadata del objeto
aws s3api head-object --bucket emotioxv3-media-041238861016 --key "research/ID/archivo.jpg"
```

Si el Content-Type es incorrecto, puedes corregirlo:
```bash
aws s3api copy-object \
  --bucket emotioxv3-media-041238861016 \
  --copy-source emotioxv3-media-041238861016/research/ID/archivo.jpg \
  --key research/ID/archivo.jpg \
  --content-type "image/jpeg" \
  --metadata-directive REPLACE
```

### Paso 4: Verificar CORS en S3
Asegúrate de que la configuración CORS esté aplicada:

```bash
aws s3api get-bucket-cors --bucket emotioxv3-media-041238861016
```

Debería incluir `Content-Type` y `Content-Length` en `ExposeHeaders`.

## Debugging

### En el Navegador
1. Abre DevTools (F12)
2. Ve a la pestaña Network
3. Intenta cargar la imagen
4. Revisa:
   - El header `Content-Type` en la respuesta
   - Si hay errores de CORS
   - El status code de la respuesta

### Verificar URL Presigned
La URL presigned debería incluir `response-content-type` en los parámetros:
```
https://bucket.s3.amazonaws.com/key?X-Amz-Algorithm=...&response-content-type=image%2Fjpeg&...
```

## Solución Alternativa: Proxy
Si el problema persiste, podemos implementar un proxy en el backend que sirva las imágenes directamente, evitando el problema de CORS completamente.
