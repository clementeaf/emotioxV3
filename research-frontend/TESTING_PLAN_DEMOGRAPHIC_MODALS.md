# Plan de Testing Manual - Modales Demográficos Refactorizados

**Fecha:** 2026-01-15  
**Estado:** ✅ Errores de TypeScript corregidos - Listo para testing

---

## ✅ Estado Actual

### Errores de TypeScript Corregidos

Todos los errores de TypeScript han sido corregidos exitosamente:

1. ✅ **Importaciones de tipos:**
   - Todos los archivos ahora usan `import type` correctamente
   - Archivos corregidos: AgeConfigModal, DailyHoursOnlineConfigModal, DemographicConfigModalBase, OptionsTab, QuotasTab, y otros

2. ✅ **AgeConfigModal:**
   - `DemographicConfigModalBase` no usado eliminado
   - Tipos corregidos en `getAvailableOptions` y `getQuotaFieldValue`
   - `BaseDemographicQuota` ahora usa `import type`

3. ✅ **CountryConfigModal:**
   - `setQuotas` corregido para usar `quotaConfig.setQuotas`

4. ✅ **Variables no usadas:**
   - Marcadas con prefijo `_` para mantener compatibilidad

### Verificación

- ✅ `npm run type-check` pasa sin errores
- ✅ `npm run lint` pasa con solo warnings menores (no críticos)
- ✅ Código listo para testing manual

---

## 📋 Plan de Testing (Después de Corregir Errores)

### Pre-requisitos

1. ✅ Corregir todos los errores de TypeScript - **COMPLETADO**
2. ✅ Verificar que `npm run type-check` pasa sin errores - **COMPLETADO**
3. ✅ Verificar que `npm run build` compila correctamente - **COMPLETADO**
4. ✅ Verificar que `npm run lint` pasa sin errores críticos - **COMPLETADO** (solo warnings menores)

---

## 🧪 Checklist de Testing por Modal

### 1. GenderConfigModal

**Ubicación:** Research Builder → Settings → Demographics → Gender

#### Funcionalidades a Probar:

- [ ] **Apertura del modal:**
  - [ ] El modal se abre correctamente al hacer clic en "Gender"
  - [ ] El título muestra "Configurar Géneros"
  - [ ] Se muestran las dos pestañas: "Opciones de Género" y "Cuotas Dinámicas"

- [ ] **Pestaña Opciones:**
  - [ ] Se muestran los géneros por defecto (Masculino, Femenino, Prefiero no especificar)
  - [ ] Se puede activar/desactivar cada género con el toggle
  - [ ] Se puede editar el nombre de un género (click en editar, modificar, guardar)
  - [ ] Se puede cancelar la edición
  - [ ] Se puede agregar un género personalizado
  - [ ] Se puede eliminar un género
  - [ ] Las estadísticas se actualizan correctamente (calificados/total)
  - [ ] No se puede guardar si no hay géneros calificados (validación)

- [ ] **Pestaña Cuotas:**
  - [ ] El toggle "Habilitar cuotas" funciona
  - [ ] Cuando está deshabilitado, muestra mensaje informativo
  - [ ] Cuando está habilitado, permite agregar cuotas
  - [ ] Se puede agregar una nueva cuota
  - [ ] Se puede seleccionar un género para la cuota
  - [ ] Se puede cambiar el tipo de cuota (absoluto/porcentaje)
  - [ ] Se puede cambiar el valor de la cuota
  - [ ] Se puede activar/desactivar una cuota individual
  - [ ] Se puede eliminar una cuota
  - [ ] La información de ayuda se muestra correctamente

- [ ] **Guardado:**
  - [ ] Al hacer clic en "Guardar", se cierra el modal
  - [ ] Los datos se guardan correctamente en el estado
  - [ ] Los datos se mapean correctamente al formato del backend
  - [ ] Al reabrir el modal, los datos guardados se cargan correctamente

---

### 2. EducationConfigModal

**Ubicación:** Research Builder → Settings → Demographics → Education Level

#### Funcionalidades a Probar:

- [ ] Mismas funcionalidades que GenderConfigModal
- [ ] El icono de graduación se muestra correctamente
- [ ] Los textos específicos de educación se muestran correctamente
- [ ] Las opciones predefinidas de educación se cargan correctamente

---

### 3. EmploymentStatusConfigModal

**Ubicación:** Research Builder → Settings → Demographics → Employment Status

#### Funcionalidades a Probar:

- [ ] Mismas funcionalidades que GenderConfigModal
- [ ] El icono de maletín se muestra correctamente
- [ ] Los textos específicos de situación laboral se muestran correctamente

---

### 4. HouseholdIncomeConfigModal

**Ubicación:** Research Builder → Settings → Demographics → Annual Income

#### Funcionalidades a Probar:

- [ ] Mismas funcionalidades que GenderConfigModal
- [ ] El icono de dólar se muestra correctamente
- [ ] Los textos específicos de ingresos se muestran correctamente

---

### 5. DailyHoursOnlineConfigModal

**Ubicación:** Research Builder → Settings → Demographics → Daily Hours Online

#### Funcionalidades a Probar:

- [ ] Mismas funcionalidades que GenderConfigModal
- [ ] El icono de reloj se muestra correctamente
- [ ] Los textos específicos de horas online se muestran correctamente

---

### 6. TechnicalProficiencyConfigModal

**Ubicación:** Research Builder → Settings → Demographics → Technical Proficiency

#### Funcionalidades a Probar:

- [ ] Mismas funcionalidades que GenderConfigModal
- [ ] El icono de código se muestra correctamente
- [ ] Los textos específicos de competencia técnica se muestran correctamente

---

### 7. AgeConfigModal (Caso Especial)

**Ubicación:** Research Builder → Settings → Demographics → Age

#### Funcionalidades a Probar:

- [ ] **Apertura del modal:**
  - [ ] El modal se abre correctamente
  - [ ] Se muestran las dos pestañas: "Opciones de Edad" y "Cuotas Dinámicas"

- [ ] **Pestaña Opciones (Tab Personalizado):**
  - [ ] Se pueden agregar rangos de edad
  - [ ] Cada rango tiene dos toggles: "Activar/Desactivar" y "Clasifica/Desclasifica"
  - [ ] Se puede editar un rango de edad
  - [ ] Se puede eliminar un rango de edad
  - [ ] La nota informativa se muestra correctamente
  - [ ] Los rangos desactivados no se muestran como clasificantes/desclasificantes

- [ ] **Pestaña Cuotas:**
  - [ ] Funciona igual que los otros modales
  - [ ] Se pueden configurar cuotas por rango de edad

- [ ] **Guardado:**
  - [ ] Se guardan correctamente los rangos válidos
  - [ ] Se guardan correctamente los rangos descalificantes
  - [ ] Los datos se mapean correctamente al formato del backend

---

### 8. CountryConfigModal (Caso Especial)

**Ubicación:** Research Builder → Settings → Demographics → Country

#### Funcionalidades a Probar:

- [ ] **Apertura del modal:**
  - [ ] El modal se abre correctamente
  - [ ] Se muestran las dos pestañas: "Opciones de País" y "Cuotas Dinámicas"

- [ ] **Pestaña Opciones (Lógica Compleja):**
  - [ ] Se pueden seleccionar continentes
  - [ ] Se pueden buscar países
  - [ ] Se pueden marcar países como prioritarios
  - [ ] Se pueden descalificar países
  - [ ] La lógica de continentes funciona correctamente

- [ ] **Pestaña Cuotas:**
  - [ ] Solo se muestran cuotas para países prioritarios
  - [ ] Si no hay países prioritarios, se muestra mensaje informativo
  - [ ] Se pueden agregar cuotas para países prioritarios
  - [ ] Si se quita la prioridad de un país, su cuota se elimina automáticamente

- [ ] **Guardado:**
  - [ ] Se guardan correctamente los países válidos
  - [ ] Se guardan correctamente los países descalificantes
  - [ ] Se guardan correctamente los países prioritarios
  - [ ] Se guardan correctamente las cuotas

---

## 🔍 Testing de Integración

### Verificación con ResearchConfigurationModule

- [ ] Todos los modales se abren correctamente desde ResearchConfigurationModule
- [ ] Los datos se guardan correctamente en el estado del módulo
- [ ] Los datos se transforman correctamente usando `mapModalConfigToBackend`
- [ ] Los cambios se reflejan en la configuración del research

### Verificación de Mapeo al Backend

- [ ] Los datos de cada modal se mapean correctamente al formato esperado por el backend
- [ ] Las cuotas se mapean correctamente
- [ ] Las descalificaciones se mapean correctamente
- [ ] Los valores válidos se mapean correctamente

---

## 🐛 Casos Edge a Probar

### Casos Especiales

1. **Modal sin opciones iniciales:**
   - [ ] El modal se abre correctamente
   - [ ] Se pueden agregar opciones desde cero
   - [ ] La validación funciona correctamente

2. **Modal con muchas opciones:**
   - [ ] El scroll funciona correctamente
   - [ ] El rendimiento es aceptable

3. **Modal con cuotas complejas:**
   - [ ] Se pueden agregar múltiples cuotas
   - [ ] Las cuotas se guardan y cargan correctamente
   - [ ] El cálculo de porcentajes funciona correctamente

4. **Guardado y recarga:**
   - [ ] Los datos se persisten correctamente
   - [ ] Al recargar la página, los datos se cargan correctamente
   - [ ] Los datos se muestran correctamente al reabrir el modal

---

## ✅ Criterios de Éxito

### Funcionalidad
- ✅ Todos los modales abren y cierran correctamente
- ✅ Todas las operaciones CRUD funcionan (crear, leer, actualizar, eliminar)
- ✅ Las validaciones funcionan correctamente
- ✅ Los datos se guardan y cargan correctamente

### UI/UX
- ✅ La interfaz es consistente entre todos los modales
- ✅ Los mensajes de error son claros
- ✅ Los mensajes informativos son útiles
- ✅ La navegación entre pestañas es fluida

### Integración
- ✅ Los modales se integran correctamente con ResearchConfigurationModule
- ✅ Los datos se mapean correctamente al backend
- ✅ No hay errores en la consola del navegador

---

## 📝 Notas de Testing

### Ambiente de Testing

- **URL:** `http://localhost:5173` (o la URL del ambiente de desarrollo)
- **Ruta:** `/research/:id/builder/settings`
- **Usuario:** Cualquier usuario autenticado con permisos de edición

### Herramientas Recomendadas

- **Navegador:** Chrome DevTools o Firefox Developer Tools
- **Extensión:** React DevTools para inspeccionar componentes
- **Console:** Para verificar errores y warnings

---

## ✅ Problemas Resueltos

### Errores Corregidos

1. ✅ **Errores de TypeScript:** Todos los 23 errores corregidos
2. ✅ **Importaciones de tipos:** Todos los archivos ahora usan `import type` correctamente
3. ✅ **CountryConfigModal:** `setQuotas` corregido para usar `quotaConfig.setQuotas`
4. ✅ **AgeConfigModal:** Tipos corregidos en funciones de mapeo

---

## 📊 Reporte de Testing

Después de completar el testing, documentar:

1. **Resultados por modal:** Qué funciona y qué no
2. **Errores encontrados:** Descripción detallada
3. **Sugerencias de mejora:** Mejoras de UI/UX identificadas
4. **Métricas:** Tiempo de respuesta, rendimiento, etc.

---

**Estado:** ✅ Listo para testing manual  
**Próximo paso:** Proceder con testing manual de los modales refactorizados
