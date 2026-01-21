# Reporte: Problema con Generación de URL y QR

**Fecha:** 2026-01-20  
**Reportado por:** Usuario  
**Problema:** "No me genera URL para probar el estudio ni registrar datos. El QR tampoco funciona"

---

## 🔍 Diagnóstico

### Problema Principal
El research-frontend **NO puede generar URLs** para el participant-frontend porque falta configuración en producción.

### Causa Raíz
El archivo `runtime-config.json` del research-frontend en cPanel **no tiene el campo `participantBaseUrl`**.

---

## 📊 Estado Actual en Producción

### 1. Research Frontend (`~/public_html/research/runtime-config.json`)
```json
{
  "apiBaseUrl": "https://emotio.cx/api"
}
```

**❌ FALTA:** `participantBaseUrl`

### 2. Participant Frontend (`~/public_html/participant/runtime-config.json`)
```json
{
  "apiBaseUrl": "https://emotio.cx/api"
}
```

**✅ CORRECTO:** Solo necesita apiBaseUrl

---

## 🔧 Cómo Funciona el Código

### Flujo de Generación de URL (ResearchConfigurationModule.tsx)

1. **Carga runtime-config.json** (líneas 76-119)
   ```typescript
   useEffect(() => {
       const response = await fetch('/runtime-config.json');
       const data = await response.json();
       if (data.participantBaseUrl) {
           setRuntimeParticipantBaseUrl(data.participantBaseUrl);
       }
   }, []);
   ```

2. **Resuelve URL del participant-frontend** (líneas 127-163)
   ```typescript
   const resolveParticipantBaseUrl = (): string => {
       // Prioridad 1: runtimeParticipantBaseUrl (desde runtime-config.json)
       if (runtimeParticipantBaseUrl) {
           return runtimeParticipantBaseUrl;
       }
       
       // Prioridad 2: VITE_PARTICIPANT_FRONTEND_URL (env variable)
       const envUrl = import.meta.env.VITE_PARTICIPANT_FRONTEND_URL;
       if (envUrl) {
           return envUrl;
       }
       
       // Prioridad 3: Fallback para emotiox.org
       if (host.includes('emotiox.org')) {
           return 'https://participant.emotiox.org';
       }
       
       // ❌ Si ninguno está configurado, retorna string vacío
       return '';
   }
   ```

3. **Genera URL del participant** (líneas 170-196)
   ```typescript
   const buildParticipantShareUrl = (): string => {
       const baseUrl = resolveParticipantBaseUrl();
       if (!baseUrl) {
           console.warn('No participant base URL available');
           return ''; // ❌ RETORNA VACÍO
       }
       return `${baseUrl}/research/${researchId}`;
   }
   ```

4. **Botón Generate QR** (líneas 565-579)
   ```typescript
   onClick={() => {
       const url = buildParticipantShareUrl();
       if (!url || url.trim().length === 0) {
           toast.error('No se pudo generar la URL...');
           return; // ❌ MUESTRA ERROR Y NO ABRE MODAL
       }
       setShowQRModal(true);
   }}
   ```

---

## 🚨 Por Qué Falla en Producción

### Evaluación de Prioridades:

1. **❌ Prioridad 1:** `runtimeParticipantBaseUrl` desde runtime-config.json
   - **Archivo actual:** `{"apiBaseUrl":"https://emotio.cx/api"}`
   - **Campo faltante:** `participantBaseUrl`
   - **Resultado:** `null` → No funciona

2. **❌ Prioridad 2:** `VITE_PARTICIPANT_FRONTEND_URL` (env variable)
   - **En build time:** No está configurado en `.env` del research-frontend
   - **En runtime:** Variables VITE_ solo están disponibles en build time
   - **Resultado:** `undefined` → No funciona

3. **❌ Prioridad 3:** Fallback para `emotiox.org`
   - **Hostname actual:** `emotio.cx` (no contiene "emotiox.org")
   - **Condición:** `host.includes('emotiox.org')` → `false`
   - **Resultado:** No aplica → No funciona

4. **❌ Resultado final:** `resolveParticipantBaseUrl()` retorna `''` (string vacío)

### Consecuencias:
- `buildParticipantShareUrl()` retorna `''`
- El input de URL muestra vacío
- El botón "Copy" no copia nada
- El botón "Generate QR" muestra error y no abre modal
- El botón "Link Preview" muestra error y no abre ventana

---

## ✅ Solución

### Opción 1: Actualizar runtime-config.json (RECOMENDADO)

**Archivo:** `~/public_html/research/runtime-config.json`

```json
{
  "apiBaseUrl": "https://emotio.cx/api",
  "participantBaseUrl": "https://emotio.cx/participant"
}
```

**Ventaja:** No requiere rebuild ni redeploy del frontend

### Opción 2: Actualizar Script de Despliegue

**Archivo:** `scripts/deploy-research-frontend-cpanel.sh`

Actualizar líneas 50-53:
```bash
cat > public/runtime-config.json << 'EOF'
{
  "apiBaseUrl": "https://emotio.cx/api",
  "participantBaseUrl": "https://emotio.cx/participant"
}
EOF
```

**Ventaja:** Futuros despliegues incluirán la configuración correcta

### Opción 3: Agregar Fallback para emotio.cx

**Archivo:** `research-frontend/src/components/research/ResearchConfigurationModule.tsx`

Línea 156-158, actualizar:
```typescript
// Priority 3: Fallback para emotio.cx o emotiox.org
if (host === 'emotio.cx') {
    return 'https://emotio.cx/participant';
}
if (host === 'research.emotiox.org' || host.includes('emotiox.org')) {
    return 'https://participant.emotiox.org';
}
```

**Ventaja:** El código funciona sin configuración adicional en emotio.cx

---

## 📋 URLs Correctas Según Configuración Actual

### Producción (emotio.cx)
- **Research Frontend:** https://emotio.cx/research
- **Participant Frontend:** https://emotio.cx/participant
- **Backend API:** https://emotio.cx/api

### URL que DEBE generarse:
```
https://emotio.cx/participant/research/{researchId}
```

Ejemplo con researchId `123e4567-e89b-12d3-a456-426614174000`:
```
https://emotio.cx/participant/research/123e4567-e89b-12d3-a456-426614174000
```

---

## 🔍 Verificación en Producción

### Estado actual del runtime-config.json:
```bash
ssh cpanel-emotio "cat ~/public_html/research/runtime-config.json"
```
**Resultado:**
```json
{
  "apiBaseUrl": "https://emotio.cx/api"
}
```

### Logs del navegador esperados:
```
[ResearchConfigurationModule] runtime-config.json does not contain valid participantBaseUrl
[ResearchConfigurationModule] No participant base URL available for QR generation
```

---

## 🎯 Recomendación Inmediata

**Ejecutar en servidor cPanel:**

```bash
ssh cpanel-emotio

cat > ~/public_html/research/runtime-config.json << 'EOF'
{
  "apiBaseUrl": "https://emotio.cx/api",
  "participantBaseUrl": "https://emotio.cx/participant"
}
EOF

# Verificar
cat ~/public_html/research/runtime-config.json
```

**Resultado esperado:**
- ✅ URL se genera correctamente
- ✅ Botón "Copy" copia la URL
- ✅ Botón "Generate QR" abre modal con QR funcional
- ✅ Botón "Link Preview" abre participant-frontend

---

## 📝 Próximos Pasos

1. ✅ **Inmediato:** Actualizar runtime-config.json en producción
2. ✅ **Corto plazo:** Actualizar script de despliegue para incluir participantBaseUrl
3. ⚠️ **Opcional:** Agregar fallback en código para emotio.cx (mayor resiliencia)
4. ✅ **Testing:** Verificar generación de URL y QR después del fix

---

## 🐛 Issues Relacionados

- ✅ Delete Stage error 500 - RESUELTO
- ✅ QR genera URL con acceso denegado - IDENTIFICADO (mismo problema)
- ✅ Link Preview no funciona - IDENTIFICADO (mismo problema)

**Nota:** Los 3 problemas tienen la misma causa raíz: falta `participantBaseUrl` en runtime-config.json
