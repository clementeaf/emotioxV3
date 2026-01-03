# Problemas Identificados en el Sistema de Tokens y Refresh Tokens

## 🔴 Problemas Críticos

### 1. **El Backend NO Devuelve RefreshToken en el Refresh**
**Ubicación**: `backend/src/modules/auth/auth.service.ts:339-367`

**Problema**: 
- Cuando se hace refresh, Cognito **NO devuelve un nuevo refresh token**
- Cognito solo devuelve: `accessToken`, `idToken`, `expiresIn`
- El refresh token original **sigue siendo válido** hasta que expire o se revoque
- El backend solo devuelve `token` y `expiresIn` en la respuesta del refresh

**Código actual**:
```typescript
// backend/src/modules/auth/auth.service.ts
return {
    accessToken: authResult.AuthenticationResult.AccessToken,
    idToken: authResult.AuthenticationResult.IdToken,
    expiresIn: authResult.AuthenticationResult.ExpiresIn,
    // ❌ NO hay refreshToken aquí
};
```

**Impacto**: El frontend espera recibir un `refreshToken` pero nunca lo recibe.

---

### 2. **El Frontend Intenta Guardar un RefreshToken que No Existe**
**Ubicación**: `research-frontend/src/services/api/client.ts:128-140`

**Problema**:
- El frontend intenta guardar `newRefreshToken` si viene en la respuesta
- Pero el backend nunca envía `refreshToken` en el refresh
- Esto causa código muerto y confusión

**Código actual**:
```typescript
// research-frontend/src/services/api/client.ts
const newRefreshToken = refreshResponse.data?.refreshToken; // ❌ Siempre undefined

if (newRefreshToken && typeof newRefreshToken === 'string') {
    // ❌ Este código NUNCA se ejecuta
    // ...
}
```

---

### 3. **Inconsistencia en el Tipo RefreshTokenResponse**
**Ubicación**: `research-frontend/src/types/auth.ts`

**Problema**:
- El tipo `RefreshTokenResponse` incluye `refreshToken?: string`
- Pero el backend nunca envía este campo
- Esto genera expectativas incorrectas

**Código actual**:
```typescript
export interface RefreshTokenResponse {
    message: string;
    token?: string;
    refreshToken?: string; // ❌ Nunca se envía
    expiresIn?: number;
}
```

---

### 4. **El Refresh Token No Se Actualiza en Cookies**
**Ubicación**: `backend/src/modules/auth/auth.controller.ts:187-196`

**Problema**:
- En el refresh, el backend solo actualiza la cookie de `accessToken`
- NO actualiza la cookie de `refreshToken` (porque no hay uno nuevo)
- Esto está correcto, pero puede ser confuso

**Código actual**:
```typescript
// Solo actualiza accessToken cookie
cookies.push(createCookie('accessToken', tokens.accessToken, {...}));
// ❌ No actualiza refreshToken cookie (correcto, pero puede ser confuso)
```

---

### 5. **Doble Almacenamiento Puede Causar Desincronización**
**Ubicación**: `research-frontend/src/stores/auth.store.ts`

**Problema**:
- Los tokens se guardan en **cookies httpOnly** (preferido)
- También se guardan en **localStorage/sessionStorage** (fallback)
- Si hay un refresh, el token en storage puede quedar desactualizado
- El interceptor usa el token del store, que puede no estar sincronizado con las cookies

**Flujo problemático**:
1. Token expira
2. Interceptor hace refresh
3. Nuevo token se guarda en cookies (backend)
4. Nuevo token se guarda en store (frontend)
5. Pero si el store no se actualiza correctamente, puede usar un token viejo

---

### 6. **El Interceptor No Sincroniza el Token del Store con el Request**
**Ubicación**: `research-frontend/src/services/api/client.ts:45-55`

**Problema**:
- El request interceptor lee el token del store
- Si el token se actualiza durante un refresh, el interceptor puede no ver el cambio inmediatamente
- El token se actualiza en el store DESPUÉS del refresh, pero el request original ya tiene el token viejo

**Código actual**:
```typescript
this.client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const state = useAuthStore.getState();
        if (state.token && config.headers) {
            config.headers.Authorization = `Bearer ${state.token}`;
        }
        // ⚠️ Si el token se actualizó en otro lugar, este interceptor no lo ve
        return config;
    }
);
```

---

## ✅ Comportamiento Correcto de Cognito

**Cognito Refresh Token Flow**:
1. Al hacer login, Cognito devuelve: `accessToken`, `idToken`, `refreshToken`
2. Al hacer refresh, Cognito devuelve: `accessToken`, `idToken` (NO devuelve nuevo refreshToken)
3. El refresh token original sigue siendo válido hasta que:
   - Expire (típicamente 30 días)
   - Se revoque explícitamente
   - El usuario cambie su contraseña

**Conclusión**: El refresh token NO se renueva, solo se usa para obtener nuevos access tokens.

---

## 🔧 Soluciones Aplicadas

### ✅ Solución 1: Eliminar Expectativa de RefreshToken en Refresh
**Estado**: ✅ COMPLETADO

**Cambios**:
- ✅ Actualizado `RefreshTokenResponse` para documentar que Cognito NO devuelve refreshToken
- ✅ Eliminado código muerto que intentaba guardar `newRefreshToken` en el interceptor
- ✅ Agregado comentario explicando que el refresh token original se mantiene

**Archivos modificados**:
- `research-frontend/src/types/auth.ts`
- `research-frontend/src/services/api/client.ts`

### ✅ Solución 2: Mejorar Sincronización del Token
**Estado**: ✅ COMPLETADO

**Cambios**:
- ✅ Agregada verificación de sincronización después del refresh
- ✅ Si hay desincronización entre el token refrescado y el del store, se fuerza actualización
- ✅ Mejorado el comentario en el request interceptor para clarificar que siempre lee el token más reciente

**Archivos modificados**:
- `research-frontend/src/services/api/client.ts`

### ⚠️ Solución 3: Simplificar Almacenamiento
**Estado**: ⚠️ PENDIENTE (Requiere decisión arquitectónica)

**Opciones**:
1. **Solo cookies httpOnly** (más seguro, pero requiere que API Gateway pase cookies correctamente)
2. **Solo localStorage/sessionStorage** (menos seguro, pero funciona con API Gateway actual)
3. **Híbrido** (actual): cookies como preferido, storage como fallback (puede causar desincronización)

**Recomendación**: Mantener híbrido hasta que API Gateway pase cookies correctamente, luego migrar a solo cookies.

### 📝 Solución 4: Documentación
**Estado**: ✅ COMPLETADO

**Cambios**:
- ✅ Creado documento `docs/TOKEN_REFRESH_ISSUES.md` con análisis completo
- ✅ Documentado comportamiento correcto de Cognito
- ✅ Agregados comentarios en el código explicando el flujo

---

## 📋 Checklist de Verificación

- [ ] El backend NO envía refreshToken en refresh (correcto)
- [ ] El frontend NO espera refreshToken en refresh (necesita corrección)
- [ ] El tipo RefreshTokenResponse refleja la realidad (necesita corrección)
- [ ] El token se sincroniza correctamente después de refresh (verificar)
- [ ] No hay desincronización entre cookies y storage (verificar)
- [ ] El interceptor actualiza el header correctamente (verificar)

