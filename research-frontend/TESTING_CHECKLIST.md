# Checklist de Testing - Modales Demográficos

**Fecha:** _______________  
**Tester:** _______________  
**Ambiente:** Local Development (http://localhost:12800)

---

## ✅ Modales Simples (Gender, Education, Employment, Income, Hours, Technical)

### Funcionalidades Básicas

- [ ] Modal se abre correctamente
- [ ] Modal se cierra correctamente
- [ ] Tabs se cambian correctamente (Opciones ↔ Cuotas)
- [ ] Botones de acción funcionan (Guardar, Cancelar)

### Pestaña Opciones

- [ ] Opciones iniciales se muestran correctamente
- [ ] Toggle de calificación funciona
- [ ] Editar opción funciona
- [ ] Agregar opción personalizada funciona
- [ ] Eliminar opción funciona
- [ ] Estadísticas se actualizan correctamente
- [ ] Validación funciona (no guardar sin opciones calificadas)

### Pestaña Cuotas

- [ ] Toggle "Habilitar cuotas" funciona
- [ ] Agregar cuota funciona
- [ ] Editar cuota funciona (género, tipo, valor)
- [ ] Activar/desactivar cuota individual funciona
- [ ] Eliminar cuota funciona
- [ ] Información de ayuda se muestra correctamente

### Guardado y Persistencia

- [ ] Guardar funciona sin errores
- [ ] Datos se persisten correctamente
- [ ] Al reabrir, datos se cargan correctamente

---

## ✅ AgeConfigModal (Caso Especial)

### Pestaña Opciones (Tab Personalizado)

- [ ] Rangos predefinidos se muestran
- [ ] Agregar rango funciona
- [ ] Editar rango funciona
- [ ] Toggle "Activar/Desactivar" funciona
- [ ] Toggle "Clasifica/Desclasifica" funciona
- [ ] Eliminar rango funciona
- [ ] Nota informativa se muestra

### Pestaña Cuotas

- [ ] Funciona igual que otros modales
- [ ] Solo muestra rangos activados y clasificantes

### Guardado

- [ ] Rangos válidos se guardan
- [ ] Rangos descalificantes se guardan
- [ ] Datos se persisten

---

## ✅ CountryConfigModal (Caso Especial)

### Pestaña Opciones (Lógica Compleja)

- [ ] Continentes se muestran correctamente
- [ ] Búsqueda de países funciona
- [ ] Seleccionar países funciona
- [ ] Marcar como descalificante funciona
- [ ] Marcar como prioritario funciona (estrella)
- [ ] Colapsar/expandir continentes funciona

### Pestaña Cuotas

- [ ] Mensaje cuando no hay países prioritarios
- [ ] Solo muestra países prioritarios
- [ ] Agregar cuotas funciona
- [ ] Eliminar prioridad elimina cuota automáticamente

### Guardado

- [ ] Países válidos se guardan
- [ ] Países descalificantes se guardan
- [ ] Países prioritarios se guardan
- [ ] Cuotas se guardan

---

## 🔍 Testing de Integración

- [ ] Todos los modales se abren desde ResearchConfigurationModule
- [ ] No hay errores en consola al abrir modales
- [ ] Datos se guardan en el estado del módulo
- [ ] Datos se mapean correctamente al backend
- [ ] Cambios se reflejan en la configuración

---

## 🐛 Casos Edge

- [ ] Modal sin datos iniciales funciona
- [ ] Modal con muchos datos (20+ opciones) funciona
- [ ] Cuotas complejas (10+ cuotas) funcionan
- [ ] Guardado y recarga funciona

---

## 📊 Resumen

**Modales probados:** ___ / 8  
**Errores encontrados:** ___  
**Warnings encontrados:** ___  
**Tiempo total:** ___ minutos

---

## 🚨 Errores Encontrados

### Error 1
- **Modal:** _______________
- **Descripción:** _______________
- **Pasos para reproducir:** _______________

### Error 2
- **Modal:** _______________
- **Descripción:** _______________
- **Pasos para reproducir:** _______________

---

## 💡 Sugerencias de Mejora

1. _______________
2. _______________
3. _______________

---

**Estado Final:** ⬜ Completado ⬜ Parcial ⬜ Con errores críticos
