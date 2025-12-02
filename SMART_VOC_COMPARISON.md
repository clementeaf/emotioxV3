# Comparación: Smart VOC Frontend vs Research-Frontend

## Resumen
Los módulos Smart VOC en `research-frontend` deben coincidir exactamente con la configuración en `frontend/src/components/research/SmartVOC/config.ts`.

## Estructura de Campos por Tipo

### CSAT
**Frontend:**
1. `title` - "Título de la pregunta" - FormInput - "Introduzca el título de la pregunta" ✅
2. `description` - "Descripción (opcional)" - FormTextarea - "Introduzca una descripción opcional para la pregunta" ✅
3. `instructions` - "Instrucciones (opcional)" - FormTextarea - "Añada instrucciones o información adicional para los participantes" ✅
4. `config.type` - "Tipo de visualización" - CustomSelect - opciones: Estrellas, Números ✅

**Backend Seed:**
1. `csat-title` - "Título de la pregunta" - input ✅
2. `csat-description` - "Descripción (opcional)" - textarea ✅
3. `csat-instructions` - "Instrucciones (opcional)" - textarea ✅
4. `csat-display-type` - "Tipo de visualización" - select - opciones: Estrellas, Números ✅

**Estado:** ✅ COINCIDE

---

### CES
**Frontend:**
1. `title` - "Título de la pregunta" - FormInput ✅
2. `description` - "Descripción (opcional)" - FormTextarea ✅
3. `instructions` - "Instrucciones (opcional)" - FormTextarea ✅
4. `config.scaleRange` - "Escala" - CustomSelect - opciones: 1-5, 1-7, 1-10 ✅
5. `config.startLabel` - "Etiqueta inicial (opcional)" - FormInput - "Ej: Muy difícil" ✅
6. `config.endLabel` - "Etiqueta final (opcional)" - FormInput - "Ej: Muy fácil" ✅

**Backend Seed:**
1. `ces-title` - "Título de la pregunta" - input ✅
2. `ces-description` - "Descripción (opcional)" - textarea ✅
3. `ces-instructions` - "Instrucciones (opcional)" - textarea ✅
4. `ces-scale-range` - "Escala" - select - opciones: 1-5, 1-7, 1-10 ✅
5. `ces-start-label` - "Etiqueta inicial (opcional)" - input - "Ej: Muy difícil" ✅
6. `ces-end-label` - "Etiqueta final (opcional)" - input - "Ej: Muy fácil" ✅

**Estado:** ✅ COINCIDE

---

### CV
**Frontend:**
1. `title` - "Título de la pregunta" - FormInput ✅
2. `description` - "Descripción (opcional)" - FormTextarea ✅
3. `instructions` - "Instrucciones (opcional)" - FormTextarea ✅
4. `config.scaleRange` - "Escala" - CustomSelect - opciones: 1-5, 1-7, 1-10 ✅
5. `config.startLabel` - "Etiqueta inicial (opcional)" - FormInput - "Ej: No en absoluto" ✅
6. `config.endLabel` - "Etiqueta final (opcional)" - FormInput - "Ej: Totalmente" ✅

**Backend Seed:**
1. `cv-title` - "Título de la pregunta" - input ✅
2. `cv-description` - "Descripción (opcional)" - textarea ✅
3. `cv-instructions` - "Instrucciones (opcional)" - textarea ✅
4. `cv-scale-range` - "Escala" - select - opciones: 1-5, 1-7, 1-10 ✅
5. `cv-start-label` - "Etiqueta inicial (opcional)" - input - "Ej: No en absoluto" ✅
6. `cv-end-label` - "Etiqueta final (opcional)" - input - "Ej: Totalmente" ✅

**Estado:** ✅ COINCIDE

---

### NEV
**Frontend:**
1. `title` - "Título de la pregunta" - FormInput ✅
2. `description` - "Descripción (opcional)" - FormTextarea ✅
3. `instructions` - "Instrucciones (opcional)" - FormTextarea ✅

**Backend Seed:**
1. `nev-title` - "Título de la pregunta" - input ✅
2. `nev-description` - "Descripción (opcional)" - textarea ✅
3. `nev-instructions` - "Instrucciones (opcional)" - textarea ✅

**Estado:** ✅ COINCIDE

---

### NPS
**Frontend:**
1. `title` - "Título de la pregunta" - FormInput ✅
2. `description` - "Descripción (opcional)" - FormTextarea ✅
3. `instructions` - "Instrucciones (opcional)" - FormTextarea ✅
4. `config.scaleRange` - "Escala" - CustomSelect - opciones: 0-10, 1-10 ⚠️

**Backend Seed:**
1. `nps-title` - "Título de la pregunta" - input ✅
2. `nps-description` - "Descripción (opcional)" - textarea ✅
3. `nps-instructions` - "Instrucciones (opcional)" - textarea ✅
4. `nps-scale-range` - "Rango" - input (readonly) - valor fijo "0-10" ✅

**Nota:** En NPS, el rango ahora es fijo "0-10" (readonly) en lugar de selector, según solicitud del usuario.

**Estado:** ✅ COINCIDE (con modificación solicitada)

---

### VOC
**Frontend:**
1. `title` - "Título de la pregunta" - FormInput ✅
2. `description` - "Descripción (opcional)" - FormTextarea ✅
3. `instructions` - "Instrucciones (opcional)" - FormTextarea ✅

**Backend Seed:**
1. `voc-title` - "Título de la pregunta" - input ✅
2. `voc-description` - "Descripción (opcional)" - textarea ✅
3. `voc-instructions` - "Instrucciones (opcional)" - textarea ✅

**Estado:** ✅ COINCIDE

---

## Problema Identificado

En la imagen proporcionada, se ve un campo "Pregunta" con placeholder "Escribe la pregunta aquí..." que **NO debería estar** en los módulos Smart VOC.

**Posibles causas:**
1. Módulos antiguos en la base de datos con estructura incorrecta
2. Confusión con módulos de Cognitive Tasks (que sí usan ese placeholder)
3. Componente adicional renderizándose incorrectamente

**Solución:**
- Verificar los módulos en la base de datos
- Ejecutar los seed scripts para actualizar la estructura
- Asegurar que no haya componentes adicionales renderizándose

## Conclusión

Los seed scripts están correctamente alineados con la configuración de frontend. Si se ve un campo "Pregunta" adicional, es un problema de datos en la base de datos o de renderizado, no de configuración.

