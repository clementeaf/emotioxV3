/**
 * Tipos compartidos para modales de configuración demográfica
 * 
 * Estos tipos proporcionan una base genérica para todos los modales
 * de configuración demográfica, permitiendo reutilización de código
 * mientras mantienen type safety.
 */

/**
 * Opción base genérica para configuración demográfica
 */
export interface BaseDemographicOption {
  id: string;
  label: string;
  isQualified: boolean;
  isCustom?: boolean;
}

/**
 * Cuota base genérica para configuración demográfica
 */
export interface BaseDemographicQuota<TField = string> {
  id: string;
  field: TField;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
  enforcementMode: 'immediate' | 'post_collection';
}

/**
 * Configuración para opciones predefinidas
 */
export interface PredefinedOptionConfig {
  id: string;
  label: string;
}

/**
 * Props base para el componente modal genérico
 */
export interface DemographicConfigModalBaseProps<
  TOption extends BaseDemographicOption = BaseDemographicOption,
  TQuota extends BaseDemographicQuota = BaseDemographicQuota
> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  optionsTabLabel: string;
  quotasTabLabel: string;
  onSave: (qualifiedOptions: TOption[], disqualifiedIds: string[]) => void;
  onQuotasSave?: (quotas: TQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  initialOptions?: TOption[];
  initialDisqualified?: string[];
  initialQuotas?: TQuota[];
  quotasEnabled?: boolean;
  predefinedOptions?: PredefinedOptionConfig[];
  addOptionPlaceholder?: string;
  addOptionButtonText?: string;
  addCustomOptionText?: string;
  statisticsLabel?: string;
  qualifiedLabel?: string;
  disqualifiedLabel?: string;
  quotasTitle?: string;
  quotasDescription?: string;
  quotasInfoTitle?: string;
  quotasInfoItems?: string[];
  quotasDisabledMessage?: string;
  quotasDisabledInfoTitle?: string;
  quotasDisabledInfoText?: string[];
  validationMessage?: string;
  saveButtonText?: string;
  cancelButtonText?: string;
}

/**
 * Configuración específica para diferentes tipos de modales
 */
export interface DemographicModalConfig {
  fieldName: 'ageRange' | 'gender' | 'educationLevel' | 'employmentStatus' | 
            'householdIncome' | 'dailyHoursOnline' | 'technicalProficiency' | 
            'country' | 'demographic';
  getAvailableOptions: (options: BaseDemographicOption[]) => BaseDemographicOption[];
  getQuotaFieldValue: (option: BaseDemographicOption) => string;
  validateQuota?: (quota: BaseDemographicQuota) => boolean;
}

/**
 * Hook de opciones demográficas - retorno
 */
export interface UseDemographicConfigReturn<TOption extends BaseDemographicOption> {
  options: TOption[];
  setOptions: React.Dispatch<React.SetStateAction<TOption[]>>;
  editingId: string | null;
  editValue: string;
  setEditingId: (id: string | null) => void;
  setEditValue: (value: string) => void;
  handleToggleQualification: (optionId: string) => void;
  handleEditStart: (option: TOption) => void;
  handleEditSave: () => void;
  handleEditCancel: () => void;
  handleAddCustom: (defaultLabel: string) => void;
  handleDelete: (optionId: string) => void;
  qualifiedCount: number;
  totalCount: number;
  disqualifiedIds: string[];
}

/**
 * Hook de gestión de cuotas - retorno
 */
export interface UseQuotaManagementReturn<TQuota extends BaseDemographicQuota> {
  quotas: TQuota[];
  setQuotas: React.Dispatch<React.SetStateAction<TQuota[]>>;
  quotasEnabled: boolean;
  setQuotasEnabled: (enabled: boolean) => void;
  handleAddQuota: (fieldValue: string) => void;
  handleUpdateQuota: (id: string, field: keyof TQuota, value: unknown) => void;
  handleDeleteQuota: (id: string) => void;
  handleToggleQuotasEnabled: () => void;
}
