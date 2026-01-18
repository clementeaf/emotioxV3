# Análisis de Distribución de Código - Research Frontend

**Fecha de análisis:** 2026-01-15  
**Total de archivos:** 189 (TypeScript/TSX)  
**Total de líneas de código:** ~31,691

---

## 📊 Distribución por Categoría

### Pages (18 archivos)
```
admin/
  └── UserManagementPage.tsx

auth/
  ├── LoginPage.tsx
  └── RegisterPage.tsx

dashboard/
  └── DashboardPage.tsx

modules/
  ├── ModulesPage.tsx (645 líneas)
  └── ModuleBuilderPage.tsx (590 líneas)

profile/
  └── ProfilePage.tsx

research/
  ├── ResearchBuilderPage.tsx (711 líneas) ⚠️ Grande
  ├── ResearchInProgressPage.tsx
  ├── ResearchPage.tsx
  ├── ResearchProgressPage.tsx
  └── ResearchResultsPage.tsx

research-techniques/
  ├── ResearchTechniqueBuilderPage.tsx
  └── ResearchTechniquesPage.tsx

research-types/
  ├── ModuleTemplateAssignationPage.tsx
  ├── ResearchTypeBuilderPage.tsx
  └── ResearchTypesPage.tsx
```

### Components (99 archivos)

#### Layout (5 archivos)
- `AuthLayout.tsx`
- `DashboardLayout.tsx`
- `ResearchBuilderSidebar.tsx` (678 líneas) ⚠️ Grande
- `Sidebar.tsx`
- `StandardSidebar.tsx`

#### Research (28 archivos)
**Config Modals (9 archivos - Patrón repetitivo):**
- `AgeConfigModal.tsx` (671 líneas) ⚠️ Grande
- `CountryConfigModal.tsx` (901 líneas) ⚠️ Muy grande
- `DailyHoursOnlineConfigModal.tsx` (571 líneas)
- `EducationConfigModal.tsx` (563 líneas)
- `EmploymentStatusConfigModal.tsx` (570 líneas)
- `GenderConfigModal.tsx` (580 líneas)
- `HouseholdIncomeConfigModal.tsx` (571 líneas)
- `TechnicalProficiencyConfigModal.tsx` (570 líneas)
- `DemographicConfigModal.tsx` (664 líneas) ⚠️ Grande

**Otros componentes:**
- `CognitiveTaskModuleCard.tsx`
- `CreateEnterpriseModal.tsx`
- `CreateResearchForm.tsx`
- `CreateResearchTechniqueModal.tsx`
- `EditableComponent.tsx`
- `LoadingErrorStates.tsx`
- `ModuleContentEditor.tsx`
- `ModuleTemplateSelectionModal.tsx`
- `ResearchBuilderHeader.tsx`
- `ResearchConfigurationModule.tsx` (720 líneas) ⚠️ Grande
- `ResearchFormStep1.tsx`
- `ResearchFormStep2.tsx`
- `ResearchSettingsView.tsx`
- `SmartVOCModuleCard.tsx`
- `SmartVOCPreview.tsx`
- `SortableSmartVOCCard.tsx`
- `StageEmptyState.tsx`
- `participants/ParticipantsTable.tsx` (518 líneas)
- `ResearchInProgress/ResearchInProgressContent.tsx`

#### Results (20 archivos)
**Cognitive Task (10 archivos):**
- `CognitiveTaskResults.tsx`
- `ChoiceResultsWrapper.tsx`
- `NavigationFlowResultsWrapper.tsx`
- `PreferenceTestResultsWrapper.tsx`
- `RankingResultsWrapper.tsx`
- `ScaleResultsWrapper.tsx`
- `components/` (5 archivos)

**Smart VOC (8 archivos):**
- `SmartVOCResults.tsx`
- `components/` (7 archivos)
  - `NPSAnalysis.tsx` (408 líneas)

**Shared (2 archivos):**
- `ResultsStateHandler.tsx`
- `utils/` (cálculos y helpers)

#### UI (25 archivos)
Componentes base reutilizables:
- `Autocomplete.tsx`
- `Badge.tsx`
- `Button.tsx`
- `Card.tsx`
- `Checkbox.tsx`
- `ConfirmationModal.tsx`
- `CustomSelect.tsx`
- `FileUpload.tsx`
- `FileUploadAdvanced.tsx` (871 líneas) ⚠️ Muy grande
- `HorizontalSlider.tsx`
- `Input.tsx`
- `Modal.tsx`
- `QRCodeModal.tsx`
- `ScaleRating.tsx`
- `SearchInput.tsx`
- `Select.tsx`
- `Stepper.tsx`
- `Tabs.tsx`
- `Textarea.tsx`
- `Toast.tsx`
- `Toggle.tsx`
- `VirtualizedList.tsx`
- Y más...

#### Otros
- `hitzone/` (5 archivos)
- `modules/` (4 archivos)
- `research-types/` (1 archivo)

### Services (23 archivos)
```
api/
  ├── client.ts
  ├── config.service.ts
  └── types.ts

analysis.service.ts
analytics.service.ts
auth.service.ts
cognitiveTask.service.ts
enterprises.service.ts
media.service.ts
modules.service.ts
moduleTemplates.service.ts
public.service.ts
questions.service.ts
realtime.service.ts
research.service.ts
researchInProgress.service.ts
researchTechniques.service.ts
researchTypes.service.ts
responses.service.ts
smartVOC.service.ts
stageTemplates.service.ts
users.service.ts
```

### Hooks (24 archivos)
Custom hooks para lógica reutilizable:
- `useResearch.ts` / `useResearchQuery.ts`
- `useResearchForm.ts`
- `useModuleComponents.ts`
- `useModuleTemplatesQuery.ts`
- `useResearchTypesQuery.ts`
- `useSmartVOCAnalytics.ts`
- `useCognitiveTaskAnalytics.ts`
- `useRealtime.ts`
- `useToast.ts`
- `useUrlValidation.ts`
- Y más...

---

## 🔍 Análisis de Tamaño

### Archivos > 500 líneas (16 archivos)
1. **CountryConfigModal.tsx** - 901 líneas ⚠️
2. **FileUploadAdvanced.tsx** - 871 líneas ⚠️
3. **ResearchConfigurationModule.tsx** - 720 líneas
4. **ResearchBuilderPage.tsx** - 711 líneas
5. **ResearchBuilderSidebar.tsx** - 678 líneas
6. **AgeConfigModal.tsx** - 671 líneas
7. **DemographicConfigModal.tsx** - 664 líneas
8. **ModulesPage.tsx** - 645 líneas
9. **ModuleBuilderPage.tsx** - 590 líneas
10. **GenderConfigModal.tsx** - 580 líneas
11. **HouseholdIncomeConfigModal.tsx** - 571 líneas
12. **DailyHoursOnlineConfigModal.tsx** - 571 líneas
13. **TechnicalProficiencyConfigModal.tsx** - 570 líneas
14. **EmploymentStatusConfigModal.tsx** - 570 líneas
15. **EducationConfigModal.tsx** - 563 líneas
16. **ParticipantsTable.tsx** - 518 líneas

---

## 🎯 Patrones Identificados

### 1. Config Modals - Alta Duplicación
**9 modales de configuración demográfica** con estructura muy similar:
- AgeConfigModal
- CountryConfigModal
- DailyHoursOnlineConfigModal
- EducationConfigModal
- EmploymentStatusConfigModal
- GenderConfigModal
- HouseholdIncomeConfigModal
- TechnicalProficiencyConfigModal
- DemographicConfigModal

**Problema:** Mucho código duplicado (500-900 líneas cada uno)

**Oportunidad de mejora:** Crear componente base genérico o hook compartido

### 2. Componentes UI Bien Organizados
- 25 componentes UI reutilizables
- Separación clara entre UI base y componentes de dominio
- Buen uso de forwardRef y composición

### 3. Services Bien Estructurados
- Separación por dominio (research, modules, questions, etc.)
- API client centralizado
- Tipos compartidos

### 4. Hooks Personalizados
- 24 hooks custom
- Buena separación de lógica reutilizable
- Hooks específicos por dominio (useResearch, useModuleComponents, etc.)

---

## ⚠️ Áreas de Mejora Identificadas

### 1. Archivos Muy Grandes
- **CountryConfigModal.tsx** (901 líneas) - Considerar dividir
- **FileUploadAdvanced.tsx** (871 líneas) - Considerar dividir
- **ResearchConfigurationModule.tsx** (720 líneas) - Considerar dividir en sub-componentes

### 2. Duplicación en Config Modals
- Los 9 modales de configuración demográfica tienen mucha lógica duplicada
- **Oportunidad:** Crear componente base `DemographicConfigModalBase` o hook `useDemographicConfig`

### 3. ResearchBuilderPage
- 711 líneas - Maneja múltiples responsabilidades
- **Oportunidad:** Extraer lógica a hooks o componentes más pequeños

### 4. ResearchBuilderSidebar
- 678 líneas - Mucha lógica en un solo componente
- **Oportunidad:** Dividir en sub-componentes (StageList, ModuleList, etc.)

---

## ✅ Fortalezas de la Arquitectura

1. **Separación clara de responsabilidades:**
   - Pages → Vistas principales
   - Components → Componentes reutilizables
   - Services → Lógica de negocio y API
   - Hooks → Lógica reutilizable

2. **Organización por dominio:**
   - `research/` - Componentes específicos de research
   - `results/` - Componentes de resultados
   - `ui/` - Componentes base

3. **Buen uso de TypeScript:**
   - Tipos definidos
   - Interfaces claras
   - Generics donde corresponde

4. **Rutas centralizadas:**
   - `routes.tsx` centraliza toda la configuración de rutas
   - Fácil de mantener y escalar

---

## 📈 Métricas

| Categoría | Archivos | % del Total |
|-----------|----------|-------------|
| Components | 99 | 52.4% |
| Pages | 18 | 9.5% |
| Services | 23 | 12.2% |
| Hooks | 24 | 12.7% |
| Otros | 25 | 13.2% |

---

## 🎯 Recomendaciones

### Prioridad Alta
1. **Refactorizar Config Modals:** Crear componente base genérico para reducir duplicación
2. **Dividir archivos grandes:** CountryConfigModal, FileUploadAdvanced, ResearchConfigurationModule

### Prioridad Media
3. **Extraer lógica de ResearchBuilderPage** a hooks personalizados
4. **Dividir ResearchBuilderSidebar** en componentes más pequeños

### Prioridad Baja
5. **Documentar arquitectura** con diagramas
6. **Crear guías de estilo** para nuevos desarrolladores
