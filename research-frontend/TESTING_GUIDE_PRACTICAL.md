# Guía Práctica de Testing - Modales Demográficos

**Fecha:** 2026-01-15  
**Estado:** ✅ Listo para testing manual

---

## 🚀 Inicio Rápido

### 1. Iniciar el Servidor de Desarrollo

```bash
cd research-frontend
npm run dev
```

El servidor se iniciará en: **http://localhost:12800**

### 2. Acceder a la Configuración de Demographics

1. Abre el navegador en `http://localhost:12800`
2. Inicia sesión (si es necesario)
3. Navega a un Research existente o crea uno nuevo
4. Ve a la pestaña **"Settings"** del Research
5. En la sección **"Demographic questions"**, verás los diferentes tipos de demográficos

### 3. Abrir un Modal

Haz clic en cualquier demográfico (Age, Gender, Country, etc.) para abrir su modal de configuración.

---

## 📋 Checklist de Testing por Modal

### Modal 1: GenderConfigModal

**Cómo abrir:** Settings → Demographics → Gender

#### ✅ Pestaña "Opciones de Género"

- [ ] **Visualización inicial:**
  - [ ] Se muestran 3 géneros por defecto: Masculino, Femenino, Prefiero no especificar
  - [ ] Cada género tiene un toggle (verde = calificado, gris = descalificado)
  - [ ] Se muestra estadística: "X géneros calificados de Y total"

- [ ] **Toggle de calificación:**
  - [ ] Click en toggle de "Masculino" → se descalifica (toggle se pone gris)
  - [ ] Click nuevamente → se recalifica (toggle se pone verde)
  - [ ] La estadística se actualiza correctamente

- [ ] **Editar género:**
  - [ ] Click en icono de editar (lápiz) de "Femenino"
  - [ ] Se muestra input editable
  - [ ] Cambiar texto a "Femenina" y hacer click en guardar (✓)
  - [ ] El nombre se actualiza correctamente
  - [ ] Click en cancelar (X) durante edición → se cancela sin cambios

- [ ] **Agregar género personalizado:**
  - [ ] Click en botón "+ Agregar género personalizado"
  - [ ] Se agrega nuevo género con nombre por defecto
  - [ ] Se puede editar inmediatamente
  - [ ] Guardar el nuevo género

- [ ] **Eliminar género:**
  - [ ] Click en icono de eliminar (papelera) de un género personalizado
  - [ ] El género se elimina correctamente
  - [ ] La estadística se actualiza

- [ ] **Validación:**
  - [ ] Descalificar todos los géneros
  - [ ] Debe aparecer mensaje de error: "⚠️ Debes tener al menos un género calificado..."
  - [ ] El botón "Guardar" debe estar deshabilitado
  - [ ] Recalificar al menos uno → el mensaje desaparece y el botón se habilita

#### ✅ Pestaña "Cuotas Dinámicas"

- [ ] **Estado inicial:**
  - [ ] El toggle "Habilitar cuotas" está desactivado
  - [ ] Se muestra mensaje: "Habilita el sistema de cuotas para configurar límites por género"
  - [ ] Se muestra información sobre distribución por "caída natural"

- [ ] **Habilitar cuotas:**
  - [ ] Activar toggle "Habilitar cuotas"
  - [ ] Se muestra sección de cuotas
  - [ ] Se muestra botón "Agregar nueva cuota"

- [ ] **Agregar cuota:**
  - [ ] Click en "Agregar nueva cuota"
  - [ ] Se agrega una nueva fila de cuota
  - [ ] Seleccionar un género del dropdown
  - [ ] Seleccionar tipo: "Absoluto" o "Porcentaje"
  - [ ] Ingresar valor (ej: 10)
  - [ ] El toggle de activar está activado por defecto

- [ ] **Editar cuota:**
  - [ ] Cambiar el género seleccionado
  - [ ] Cambiar el tipo de cuota
  - [ ] Cambiar el valor
  - [ ] Los cambios se reflejan correctamente

- [ ] **Desactivar/Activar cuota:**
  - [ ] Click en toggle de una cuota específica
  - [ ] La cuota se desactiva (se pone gris)
  - [ ] Click nuevamente → se reactiva

- [ ] **Eliminar cuota:**
  - [ ] Click en icono X de una cuota
  - [ ] La cuota se elimina correctamente

- [ ] **Información de ayuda:**
  - [ ] Se muestra información sobre cómo funcionan las cuotas
  - [ ] Los puntos informativos son claros y útiles

#### ✅ Guardado

- [ ] **Guardar configuración:**
  - [ ] Configurar algunos géneros calificados
  - [ ] Agregar algunas cuotas
  - [ ] Click en "Guardar"
  - [ ] El modal se cierra
  - [ ] No hay errores en la consola del navegador

- [ ] **Verificar persistencia:**
  - [ ] Cerrar y reabrir el modal
  - [ ] Los géneros configurados se cargan correctamente
  - [ ] Las cuotas configuradas se cargan correctamente
  - [ ] Los estados (calificados/descalificados) se mantienen

---

### Modal 2: EducationConfigModal

**Cómo abrir:** Settings → Demographics → Education Level

#### ✅ Testing Similar a GenderConfigModal

- [ ] Mismas funcionalidades que GenderConfigModal
- [ ] El icono de graduación se muestra correctamente
- [ ] Los textos específicos de educación son correctos
- [ ] Las opciones predefinidas se cargan correctamente

---

### Modal 3: EmploymentStatusConfigModal

**Cómo abrir:** Settings → Demographics → Employment Status

#### ✅ Testing Similar a GenderConfigModal

- [ ] Mismas funcionalidades que GenderConfigModal
- [ ] El icono de maletín se muestra correctamente
- [ ] Los textos específicos de situación laboral son correctos

---

### Modal 4: HouseholdIncomeConfigModal

**Cómo abrir:** Settings → Demographics → Annual Income

#### ✅ Testing Similar a GenderConfigModal

- [ ] Mismas funcionalidades que GenderConfigModal
- [ ] El icono de dólar se muestra correctamente
- [ ] Los textos específicos de ingresos son correctos

---

### Modal 5: DailyHoursOnlineConfigModal

**Cómo abrir:** Settings → Demographics → Daily Hours Online

#### ✅ Testing Similar a GenderConfigModal

- [ ] Mismas funcionalidades que GenderConfigModal
- [ ] El icono de reloj se muestra correctamente
- [ ] Los textos específicos de horas online son correctos

---

### Modal 6: TechnicalProficiencyConfigModal

**Cómo abrir:** Settings → Demographics → Technical Proficiency

#### ✅ Testing Similar a GenderConfigModal

- [ ] Mismas funcionalidades que GenderConfigModal
- [ ] El icono de código se muestra correctamente
- [ ] Los textos específicos de competencia técnica son correctos

---

### Modal 7: AgeConfigModal (Caso Especial)

**Cómo abrir:** Settings → Demographics → Age

#### ✅ Pestaña "Opciones de Edad" (Tab Personalizado)

- [ ] **Visualización inicial:**
  - [ ] Se muestran rangos de edad predefinidos (18-24, 25-34, etc.)
  - [ ] Cada rango tiene dos toggles:
    - Toggle izquierdo: Activar/Desactivar
    - Toggle derecho: Clasifica/Desclasifica (solo visible si está activado)

- [ ] **Agregar rango de edad:**
  - [ ] Escribir en input: "15-17"
  - [ ] Click en botón "Agregar"
  - [ ] El nuevo rango se agrega a la lista
  - [ ] El nuevo rango está activado por defecto

- [ ] **Editar rango:**
  - [ ] Click en icono de editar de un rango
  - [ ] Se muestra input editable
  - [ ] Cambiar texto y guardar
  - [ ] El rango se actualiza

- [ ] **Toggle Activar/Desactivar:**
  - [ ] Click en toggle izquierdo de un rango
  - [ ] El rango se desactiva (se pone gris)
  - [ ] El toggle de "Clasifica/Desclasifica" desaparece
  - [ ] Click nuevamente → se reactiva

- [ ] **Toggle Clasifica/Desclasifica:**
  - [ ] Con un rango activado, click en toggle derecho
  - [ ] El rango cambia de clasificante a desclasificante
  - [ ] El color/estado visual cambia

- [ ] **Eliminar rango:**
  - [ ] Click en icono de eliminar
  - [ ] El rango se elimina

- [ ] **Nota informativa:**
  - [ ] Se muestra nota azul con información importante
  - [ ] El texto es claro y útil

#### ✅ Pestaña "Cuotas Dinámicas"

- [ ] Funciona igual que los otros modales
- [ ] Se pueden configurar cuotas por rango de edad
- [ ] Los rangos disponibles son solo los activados y clasificantes

#### ✅ Guardado

- [ ] Se guardan correctamente los rangos válidos
- [ ] Se guardan correctamente los rangos descalificantes
- [ ] Los datos se persisten correctamente

---

### Modal 8: CountryConfigModal (Caso Especial)

**Cómo abrir:** Settings → Demographics → Country

#### ✅ Pestaña "Opciones de País" (Lógica Compleja)

- [ ] **Visualización inicial:**
  - [ ] Se muestran continentes colapsables
  - [ ] Cada continente muestra países
  - [ ] Hay búsqueda de países

- [ ] **Búsqueda:**
  - [ ] Escribir "Chile" en el buscador
  - [ ] Se filtran los países correctamente
  - [ ] Limpiar búsqueda → se muestran todos

- [ ] **Seleccionar países:**
  - [ ] Click en checkbox de un país
  - [ ] El país se marca como válido
  - [ ] Click en toggle de descalificar
  - [ ] El país se marca como descalificante

- [ ] **Países prioritarios:**
  - [ ] Click en estrella de un país
  - [ ] El país se marca como prioritario
  - [ ] La estrella se llena
  - [ ] Click nuevamente → se quita la prioridad

- [ ] **Colapsar/Expandir continentes:**
  - [ ] Click en chevron de un continente
  - [ ] El continente se colapsa/expande

#### ✅ Pestaña "Cuotas Dinámicas"

- [ ] **Sin países prioritarios:**
  - [ ] Si no hay países prioritarios, se muestra mensaje informativo
  - [ ] El mensaje indica que se deben marcar países como prioritarios

- [ ] **Con países prioritarios:**
  - [ ] Marcar algunos países como prioritarios
  - [ ] Ir a pestaña "Cuotas Dinámicas"
  - [ ] Se muestran solo los países prioritarios
  - [ ] Se pueden agregar cuotas para países prioritarios

- [ ] **Eliminar prioridad:**
  - [ ] Quitar prioridad de un país desde la pestaña "Opciones"
  - [ ] Volver a pestaña "Cuotas"
  - [ ] La cuota de ese país debe haberse eliminado automáticamente

#### ✅ Guardado

- [ ] Se guardan países válidos
- [ ] Se guardan países descalificantes
- [ ] Se guardan países prioritarios
- [ ] Se guardan cuotas correctamente

---

## 🔍 Testing de Integración

### Verificación con ResearchConfigurationModule

- [ ] **Apertura de modales:**
  - [ ] Todos los modales se abren correctamente desde ResearchConfigurationModule
  - [ ] No hay errores en la consola al abrir modales

- [ ] **Guardado de datos:**
  - [ ] Los datos se guardan correctamente en el estado del módulo
  - [ ] Los datos se transforman correctamente usando `mapModalConfigToBackend`
  - [ ] Los cambios se reflejan en la configuración del research

- [ ] **Consola del navegador:**
  - [ ] Abrir DevTools (F12)
  - [ ] Ir a pestaña "Console"
  - [ ] Abrir y usar los modales
  - [ ] No debe haber errores en rojo
  - [ ] Warnings menores son aceptables

---

## 🐛 Casos Edge a Probar

### 1. Modal sin datos iniciales

- [ ] Abrir un modal en un research nuevo (sin configuración previa)
- [ ] El modal se abre correctamente
- [ ] Se pueden agregar opciones desde cero
- [ ] La validación funciona correctamente

### 2. Modal con muchos datos

- [ ] Agregar 20+ opciones en un modal
- [ ] El scroll funciona correctamente
- [ ] El rendimiento es aceptable (sin lag)

### 3. Cuotas complejas

- [ ] Agregar 10+ cuotas en un modal
- [ ] Cambiar tipos entre absoluto y porcentaje
- [ ] Activar/desactivar cuotas múltiples veces
- [ ] Todo funciona correctamente

### 4. Guardado y recarga

- [ ] Configurar un modal completamente
- [ ] Guardar
- [ ] Recargar la página (F5)
- [ ] Reabrir el modal
- [ ] Todos los datos se cargan correctamente

---

## ✅ Criterios de Éxito

### Funcionalidad
- ✅ Todos los modales abren y cierran correctamente
- ✅ Todas las operaciones CRUD funcionan
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

## 📝 Reporte de Testing

Después de completar el testing, documenta:

1. **Resultados por modal:** Qué funciona y qué no
2. **Errores encontrados:** Descripción detallada con pasos para reproducir
3. **Sugerencias de mejora:** Mejoras de UI/UX identificadas
4. **Métricas:** Tiempo de respuesta, rendimiento, etc.

---

## 🚨 Si Encuentras Errores

### Información a Documentar

1. **Descripción del error:**
   - Qué modal
   - Qué acción estabas realizando
   - Qué esperabas que pasara
   - Qué pasó realmente

2. **Pasos para reproducir:**
   - Paso 1: ...
   - Paso 2: ...
   - Paso 3: ...

3. **Capturas de pantalla:**
   - Si es posible, captura el error

4. **Información del navegador:**
   - Navegador y versión
   - Errores en la consola (F12 → Console)

---

## 🎯 Estado Actual

✅ **Código listo para testing:**
- Sin errores de TypeScript
- Build exitoso
- Linting sin errores críticos
- Todos los modales refactorizados

**Próximo paso:** Ejecutar el testing manual siguiendo esta guía.

---

**¡Buena suerte con el testing! 🚀**
