# Plan de Refactorización - Modales de Configuración Demográfica

**Fecha:** 2026-01-15  
**Prioridad:** Alta  
**Impacto:** Reducción de ~5,000 líneas duplicadas a ~500-800 líneas base + configuraciones

---

## 📊 Análisis de la Situación Actual

### Archivos Afectados (9 modales)
1. `AgeConfigModal.tsx` - 671 líneas
2. `CountryConfigModal.tsx` - 901 líneas (caso especial con continentes)
3. `DailyHoursOnlineConfigModal.tsx` - 571 líneas
4. `EducationConfigModal.tsx` - 563 líneas
5. `EmploymentStatusConfigModal.tsx` - 570 líneas
6. `GenderConfigModal.tsx` - 580 líneas
7. `HouseholdIncomeConfigModal.tsx` - 571 líneas
8. `TechnicalProficiencyConfigModal.tsx` - 570 líneas
9. `DemographicConfigModal.tsx` - 664 líneas

**Total actual:** ~5,661 líneas  
**Estimado después:** ~1,200 líneas (base + configuraciones)  
**Reducción:** ~4,461 líneas (78.7% de reducción)

### Patrones Identificados

#### 1. Estructura Común (100% duplicada)
- Sistema de tabs (options/quotas)
- Header con título y botón cerrar
- Footer con botones Cancelar/Guardar
- Validación de opciones calificadas

#### 2. Lógica de Opciones (90% duplicada)
- Estado de opciones (id, name/label, isQualified, isCustom)
- Agregar opción personalizada
- Editar opción (inline)
- Eliminar opción
- Toggle de calificación/descalificación
- Inicialización con opciones predefinidas

#### 3. Lógica de Cuotas (100% duplicada)
- Estado de cuotas (id, [field], quota, quotaType, isActive)
- Agregar cuota
- Actualizar cuota
- Eliminar cuota
- Toggle de habilitación de cuotas
- Validación de cuotas (porcentaje vs absoluto)
- Mensajes informativos sobre cuotas

#### 4. Diferencias Específicas
- **AgeConfigModal**: Usa `label` en lugar de `name`, tiene `isDisqualifying` y `isEnabled` separados
- **CountryConfigModal**: Estructura compleja con continentes, búsqueda, prioridades
- **Otros modales**: Usan `name` y `isQualified` (más simple)

---

## 🎯 Estrategia de Refactorización

### Fase 1: Crear Componente Base Genérico
**Objetivo:** Extraer toda la lógica común a un componente base reutilizable

#### Archivos a Crear:
1. `DemographicConfigModalBase.tsx` - Componente base genérico
2. `useDemographicConfig.ts` - Hook para lógica de opciones
3. `useQuotaManagement.ts` - Hook para lógica de cuotas
4. `types/demographic.ts` - Tipos compartidos

#### Características del Base:
- Props genéricas con tipos parametrizables
- Sistema de tabs reutilizable
- Lógica de opciones abstracta
- Lógica de cuotas abstracta
- Renderizado configurable mediante render props o slots

### Fase 2: Refactorizar Modales Simples
**Objetivo:** Convertir modales simples a usar el componente base

#### Modales Simples (7):
- GenderConfigModal
- EducationConfigModal
- EmploymentStatusConfigModal
- HouseholdIncomeConfigModal
- DailyHoursOnlineConfigModal
- TechnicalProficiencyConfigModal
- DemographicConfigModal

#### Estrategia:
- Mantener el mismo nombre de componente y props públicas
- Internamente usar `DemographicConfigModalBase`
- Configurar opciones predefinidas y textos específicos
- Mantener compatibilidad 100% con código existente

### Fase 3: Refactorizar Modales Especiales
**Objetivo:** Adaptar modales con lógica específica

#### Modales Especiales (2):
- **AgeConfigModal**: Adaptar sistema de `isDisqualifying`/`isEnabled`
- **CountryConfigModal**: Mantener lógica de continentes, usar base para cuotas

#### Estrategia:
- AgeConfigModal: Crear adaptador que mapee a formato genérico
- CountryConfigModal: Usar base solo para cuotas, mantener lógica de continentes

### Fase 4: Actualizar Importaciones
**Objetivo:** Verificar que todo sigue funcionando

- Verificar `ResearchConfigurationModule.tsx`
- Verificar que no hay breaking changes
- Ejecutar tests si existen

---

## 📐 Diseño de la Solución

### Estructura de Archivos Propuesta

```
src/components/research/
├── demographic-config/
│   ├── DemographicConfigModalBase.tsx      (nuevo - componente base)
│   ├── useDemographicConfig.ts             (nuevo - hook de opciones)
│   ├── useQuotaManagement.ts               (nuevo - hook de cuotas)
│   ├── types.ts                            (nuevo - tipos compartidos)
│   └── components/
│       ├── OptionsTab.tsx                  (nuevo - tab de opciones)
│       ├── QuotasTab.tsx                   (nuevo - tab de cuotas)
│       └── QuotaForm.tsx                   (nuevo - formulario de cuota)
├── AgeConfigModal.tsx                       (refactorizado)
├── CountryConfigModal.tsx                   (refactorizado - parcial)
├── GenderConfigModal.tsx                    (refactorizado)
├── EducationConfigModal.tsx                 (refactorizado)
├── EmploymentStatusConfigModal.tsx          (refactorizado)
├── HouseholdIncomeConfigModal.tsx            (refactorizado)
├── DailyHoursOnlineConfigModal.tsx          (refactorizado)
├── TechnicalProficiencyConfigModal.tsx      (refactorizado)
└── DemographicConfigModal.tsx               (refactorizado)
```

### Tipos Genéricos

```typescript
// Tipos base genéricos
interface BaseOption {
  id: string;
  label: string;
  isQualified: boolean;
  isCustom?: boolean;
}

interface BaseQuota<T = string> {
  id: string;
  field: T; // 'ageRange' | 'gender' | 'educationLevel' | etc.
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
}

interface DemographicConfigModalBaseProps<T extends BaseOption, Q extends BaseQuota> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  optionsTabLabel: string;
  quotasTabLabel: string;
  // ... más props
}
```

---

## 🔧 Implementación Detallada

### Paso 1: Crear Tipos Compartidos
- [ ] Definir interfaces base genéricas
- [ ] Crear tipos para diferentes variantes (simple, age, country)
- [ ] Exportar tipos para uso en modales específicos

### Paso 2: Crear Hook useDemographicConfig
- [ ] Lógica de estado de opciones
- [ ] Funciones CRUD (agregar, editar, eliminar)
- [ ] Toggle de calificación
- [ ] Inicialización con opciones predefinidas

### Paso 3: Crear Hook useQuotaManagement
- [ ] Lógica de estado de cuotas
- [ ] Funciones CRUD de cuotas
- [ ] Validación de cuotas
- [ ] Toggle de habilitación

### Paso 4: Crear Componente Base
- [ ] Estructura de tabs
- [ ] Integración de hooks
- [ ] Renderizado configurable
- [ ] Validaciones comunes

### Paso 5: Crear Componentes de Tabs
- [ ] OptionsTab - Tab de opciones genérico
- [ ] QuotasTab - Tab de cuotas genérico
- [ ] QuotaForm - Formulario individual de cuota

### Paso 6: Refactorizar Modales Simples
- [ ] GenderConfigModal
- [ ] EducationConfigModal
- [ ] EmploymentStatusConfigModal
- [ ] HouseholdIncomeConfigModal
- [ ] DailyHoursOnlineConfigModal
- [ ] TechnicalProficiencyConfigModal
- [ ] DemographicConfigModal

### Paso 7: Refactorizar AgeConfigModal
- [ ] Crear adaptador para mapeo de tipos
- [ ] Integrar con componente base
- [ ] Mantener lógica específica de isDisqualifying/isEnabled

### Paso 8: Refactorizar CountryConfigModal (Parcial)
- [ ] Extraer solo lógica de cuotas al hook
- [ ] Mantener lógica de continentes separada
- [ ] Integrar tab de cuotas del componente base

### Paso 9: Verificación y Testing
- [ ] Verificar que todos los modales funcionan
- [ ] Verificar compatibilidad con ResearchConfigurationModule
- [ ] Verificar que no hay errores de TypeScript
- [ ] Verificar que no hay errores de linting
- [ ] Probar funcionalidad de cada modal

---

## ✅ Criterios de Éxito

1. **Reducción de código:** Al menos 70% de reducción en líneas duplicadas
2. **Compatibilidad:** 100% compatible con código existente (mismas props, mismo comportamiento)
3. **Mantenibilidad:** Cambios futuros en un solo lugar afectan todos los modales
4. **Type Safety:** Tipos estrictos, sin `any`
5. **Sin Breaking Changes:** No requiere cambios en componentes que usan los modales

---

## 📝 Notas de Implementación

### Consideraciones Especiales

1. **AgeConfigModal**: 
   - Tiene lógica dual de `isDisqualifying` e `isEnabled`
   - Requiere adaptador para mapear a formato genérico
   - Mantener compatibilidad con props existentes

2. **CountryConfigModal**:
   - Lógica compleja de continentes y búsqueda
   - Solo extraer lógica de cuotas
   - Mantener estructura de continentes intacta

3. **Compatibilidad hacia atrás**:
   - Mantener mismos nombres de componentes
   - Mantener mismas props públicas
   - No cambiar comportamiento visible

### Riesgos y Mitigación

1. **Riesgo:** Romper funcionalidad existente
   - **Mitigación:** Mantener 100% compatibilidad de props y comportamiento

2. **Riesgo:** Over-engineering del componente base
   - **Mitigación:** Empezar simple, agregar complejidad solo si es necesario

3. **Riesgo:** Diferencias sutiles entre modales
   - **Mitigación:** Documentar todas las diferencias y crear adaptadores específicos

---

## 📅 Timeline Estimado

- **Fase 1 (Base):** 2-3 horas
- **Fase 2 (Modales simples):** 2-3 horas
- **Fase 3 (Modales especiales):** 1-2 horas
- **Fase 4 (Verificación):** 1 hora

**Total estimado:** 6-9 horas

---

## 🔄 Próximos Pasos

1. Crear estructura de tipos compartidos
2. Implementar hooks de lógica común
3. Crear componente base genérico
4. Refactorizar modales uno por uno
5. Verificar y documentar cambios

---

**Estado:** 📋 Planificado - Listo para implementación
