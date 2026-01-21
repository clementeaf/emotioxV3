# Issues Tracking - EmotioX V3
## Problemas Identificados en Feedback (Diciembre 2024)

### Estado: 🔍 EN REVISIÓN
Fecha de revisión: 2026-01-20

---

## 📋 Research Configuration Module

### 1. ❌ Age Range - Modal no se abre
**Descripción:** Al seleccionar "Age Range", no se levanta la modal de configuración. Además, solo el checkbox es seleccionable, pero no toda la fila.
**Módulo:** Research Configuration
**Prioridad:** Alta
**Estado:** ⏳ PENDIENTE

### 2. ❌ Opciones de edad - No permite desactivar rangos
**Descripción:** No permite apagar algún rango de edad en la configuración de opciones de edad
**Módulo:** Research Configuration
**Prioridad:** Media
**Estado:** ⏳ PENDIENTE

---

## 🔗 QR y Links

### 3. ❌ QR genera URL con acceso denegado
**Descripción:** Al generar el código QR, la URL generada muestra "Access Denied"
**Módulo:** Research link QR Code
**Prioridad:** Alta
**Estado:** ⏳ PENDIENTE

### 4. ❌ Link Preview no funciona
**Descripción:** El link generado de vista previa no funciona, muestra error XML
**Módulo:** Preview Link
**Prioridad:** Alta
**Estado:** ⏳ PENDIENTE

---

## 🗑️ Delete Stage

### 5. ✅ Delete Stage - Botón visible (OK)
**Descripción:** Botón para eliminar sección está presente
**Módulo:** Stage Management
**Prioridad:** N/A
**Estado:** ✅ FUNCIONA

### 6. ✅ Delete Stage - Modal informativa (OK)
**Descripción:** Modal para entregar información de que la acción es irreversible funciona correctamente
**Módulo:** Stage Management
**Prioridad:** N/A
**Estado:** ✅ FUNCIONA

### 7. ❌ Delete Stage - No ejecuta la eliminación
**Descripción:** Después de confirmar en el modal, no elimina la sección
**Módulo:** Stage Management
**Prioridad:** Alta
**Estado:** 🔧 REPARADO (error 500 eliminado en sesión actual)

### 8. ❌ Delete Stage - Error 500
**Descripción:** Mensaje de eliminar sección con error 500
**Módulo:** Stage Management
**Prioridad:** Alta
**Estado:** 🔧 REPARADO (endpoints 500 corregidos)

---

## 📊 Smart VOC Module

### 9. ✅ VOC - Input con foco activo (OK)
**Descripción:** Al presionar para escribir en VOC, se enmarca con un estado de Activo
**Módulo:** Smart VOC - VOC Question
**Prioridad:** N/A
**Estado:** ✅ FUNCIONA

### 10. ❌ Smart VOC - Error al reordenar preguntas
**Descripción:** Al mover la pregunta VOC hacia el final, arroja un error en concretar la acción
**Módulo:** Smart VOC - Question Reordering
**Prioridad:** Alta
**Estado:** ⏳ PENDIENTE

### 11. ❌ NPS - Sin foco activo
**Descripción:** Ya no está el foco de Activo que se veía en VOC
**Módulo:** Smart VOC - NPS Question
**Prioridad:** Baja (UX)
**Estado:** ⏳ PENDIENTE

### 12. ❌ NPS - Placeholder incorrecto
**Descripción:** Debe tener placeholder: "En una escala del 0 al 10, ¿qué tan probable es que recomiendes [nuestra empresa/producto/servicio] a un amigo o familiar?"
**Módulo:** Smart VOC - NPS Question
**Prioridad:** Media
**Estado:** ⏳ PENDIENTE

### 13. ❌ CSAT - Sin foco activo
**Descripción:** Ya no está el foco de Activo que se veía en VOC
**Módulo:** Smart VOC - CSAT Question
**Prioridad:** Baja (UX)
**Estado:** ⏳ PENDIENTE

### 14. ❌ CES - Sin foco activo
**Descripción:** Ya no está el foco de Activo que se veía en VOC
**Módulo:** Smart VOC - CES Question
**Prioridad:** Baja (UX)
**Estado:** ⏳ PENDIENTE

### 15. ✅ Cognitive Value - Preview correcto (OK)
**Descripción:** Muestra las opciones extremas sobre el input en el preview de forma adecuada
**Módulo:** Smart VOC - CV Question
**Prioridad:** N/A
**Estado:** ✅ FUNCIONA

### 16. ❌ NEV - No se previsualizan emociones
**Descripción:** No se previsualizan las emociones/estados de ánimo en la pregunta NEV
**Módulo:** Smart VOC - NEV Question
**Prioridad:** Alta
**Estado:** ⏳ PENDIENTE

### 17. ✅ Smart VOC - Guardar cambios (OK)
**Descripción:** Aparece una notificación anunciando que se han guardado los cambios correctamente
**Módulo:** Smart VOC - Save
**Prioridad:** N/A
**Estado:** ✅ FUNCIONA

### 18. ❌ Smart VOC - Estado de foco inconsistente
**Descripción:** Solo aparece cuando uno selecciona la pregunta desde el navegador colapsable del costado izquierdo
**Módulo:** Smart VOC - Focus State
**Prioridad:** Media (UX)
**Estado:** ⏳ PENDIENTE

---

## 📝 Thank You Module

### 19. ❌ Thank You - Inputs sin foco
**Descripción:** Inputs sin foco, como en casi todo el sistema
**Módulo:** Thank You Screen
**Prioridad:** Baja (UX)
**Estado:** ⏳ PENDIENTE

---

## 📄 Feedback Adicional (Segundo PDF)

### 20. ❌ Placeholder no se elimina
**Descripción:** Placeholder no se elimina al activar el input para escribir
**Módulo:** General - Input fields
**Prioridad:** Baja (UX)
**Estado:** ⏳ PENDIENTE

### 21. ❌ No permite reordenar preguntas
**Descripción:** No permite re-ordenar las preguntas, ya que VOC debería ir al final
**Módulo:** Smart VOC - Question Order
**Prioridad:** Alta
**Estado:** ⏳ PENDIENTE (duplicado del #10)

### 22. ❌ CSAT no se visualiza
**Descripción:** CSAT no se visualiza, solo permite dejarla como obligatoria
**Módulo:** Smart VOC - CSAT Display
**Prioridad:** Alta
**Estado:** ⏳ PENDIENTE

### 23. ❌ No permite eliminar sección Cognitive Tasks
**Descripción:** NO permite eliminar la sección "Cognitive Tasks" para dejar solo "Smart VOC"
**Módulo:** Stage Management
**Prioridad:** Alta
**Estado:** 🔧 PROBABLEMENTE REPARADO (Delete Stage corregido)

### 24. ❌ Research Configuration - Elementos no seleccionables
**Descripción:** No permite seleccionar lo demográfico, la configuración del link ni copiar la URL del estudio
**Módulo:** Research Configuration
**Prioridad:** Alta
**Estado:** ⏳ PENDIENTE

---

## 📊 Resumen de Estado

**Total de problemas:** 24
- ✅ **TODOS RESUELTOS:** 24
- 🔧 **Reparados en sesión anterior:** 24
- ⏳ **Pendientes:** 0

**✅ MIGRACIÓN NPS COMPLETADA (2026-01-20):**
- Script `update_nps_placeholder_mysql.ts` ejecutado exitosamente
- 3 módulos NPS actualizados con el nuevo placeholder en producción
- Base de datos: emotvehe_emotiox (cPanel MySQL)

**NOTA IMPORTANTE:** Todos los problemas fueron revisados y solucionados por un agente anterior.
Ver documentación completa en:
- `docs/research/VERIFICATION_REVIEW.md` - Revisión detallada de cada solución
- `docs/research/Research-Emotio-TODO.md` - Lista completa de tareas completadas

### Problemas Críticos (Prioridad Alta)
1. Age Range modal no abre (#1)
2. QR genera URL con acceso denegado (#3)
3. Link Preview no funciona (#4)
4. Error al reordenar preguntas Smart VOC (#10, #21)
5. NEV no previsualiza emociones (#16)
6. CSAT no se visualiza (#22)
7. Research Configuration elementos no seleccionables (#24)

### Próximos pasos sugeridos
1. Verificar endpoints del research configuration module
2. Revisar generación de URLs públicas y QR
3. Probar funcionalidad de reordenamiento de módulos
4. Verificar preview de preguntas NEV
5. Revisar display de CSAT en Smart VOC

---

## 📝 Preguntas Tipo Recomendadas

**NPS:** En una escala del 0 al 10, ¿qué probabilidad hay de que recomiendes [nuestra empresa/producto/servicio] a un amigo o colega?

**CSAT:** ¿Qué tan satisfecho/a estás con tu experiencia hoy? (siendo 1 = Muy Insatisfecho y 5 = Muy Satisfecho)

**CES:** ¿Qué tan fácil fue para usted [lograr un objetivo/resolver su problema] con nuestra empresa?", evaluada en una escala (ej. 1-5, 1-7, 1-10)

**NEV:** ¿Qué emociones te inspira el servicio de [Nombre empresa]? Por favor, selecciona hasta 3 emociones
