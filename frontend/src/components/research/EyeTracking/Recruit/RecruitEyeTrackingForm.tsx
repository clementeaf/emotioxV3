'use client';

import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { cn } from '@/lib/utils';
import { DemographicQuestionKeys, ParameterOptionKeys } from '@/shared/interfaces/eyeTrackingRecruit.interface';
import { AgeQuota } from '@/shared/types/eye-tracking.types';
import { eyeTrackingApi } from '@/api/domains/eye-tracking';
import { Trash2 } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/utils/toast';
import { ErrorModal } from '@/components/common/ErrorModal';
import AgeConfigModal from './components/AgeConfigModal';
import CountryConfigModal from './components/CountryConfigModal';
import { DailyHoursOnlineConfigModal } from './components/DailyHoursOnlineConfigModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { EducationConfigModal } from './components/EducationConfigModal';
import { EmploymentStatusConfigModal } from './components/EmploymentStatusConfigModal';
import { GenderConfigModal } from './components/GenderConfigModal';
import { HouseholdIncomeConfigModal } from './components/HouseholdIncomeConfigModal';
import { TechnicalProficiencyConfigModal } from './components/TechnicalProficiencyConfigModal';
import { useEyeTrackingRecruit } from './hooks/useEyeTrackingRecruit';
import { QRCodeModal } from '@/components/research/shared/QRCodeModal';

type BacklinkKeys = 'complete' | 'disqualified' | 'overquota';

interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, id, ...props }, ref) => {
    const isChecked = checked || false;

    const handleClick = () => {
      if (onCheckedChange) {
        onCheckedChange(!isChecked);
      }
    };

    return (
      <button
        ref={ref}
        role="checkbox"
        aria-checked={isChecked}
        id={id}
        data-state={isChecked ? 'checked' : 'unchecked'}
        onClick={handleClick}
        className={cn(
          'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
          className
        )}
        {...props}
      >
        {isChecked && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-white"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
    );
  }
);

Checkbox.displayName = 'Checkbox';

interface RecruitEyeTrackingFormProps {
  researchId: string;
  className?: string;
}

export function RecruitEyeTrackingForm({ researchId, className }: RecruitEyeTrackingFormProps) {
  const queryClient = useQueryClient();

  const {
    loading,
    saving,
    formData,
    lastSaved,
    demographicQuestionsEnabled,
    setDemographicQuestionsEnabled,
    linkConfigEnabled,
    setLinkConfigEnabled,
    handleDemographicChange,
    handleLinkConfigChange,
    handleBacklinkChange,
    handleParamOptionChange,
    setLimitParticipants,
    setParticipantLimit,
    updateCountryOptions,
    updateDisqualifyingCountries,
    updatePriorityCountries,
    updateGenderOptions,
    updateDisqualifyingGenders,
    updateEducationOptions,
    updateDisqualifyingEducation,
    updateHouseholdIncomeOptions,
    updateDisqualifyingHouseholdIncomes,
    updateEmploymentStatusOptions,
    updateDisqualifyingEmploymentStatuses,
    updateDailyHoursOnlineOptions,
    updateDisqualifyingDailyHoursOnline,
    updateTechnicalProficiencyOptions,
    updateDisqualifyingTechnicalProficiencies,
    handleAgeConfigSave,
    handleAgeQuotasSave,
    toggleAgeQuotasEnabled,
    handleCountryQuotasSave,
    toggleCountryQuotasEnabled,
    handleGenderQuotasSave,
    toggleGenderQuotasEnabled,
    handleEducationLevelQuotasSave,
    toggleEducationLevelQuotasEnabled,
    handleHouseholdIncomeQuotasSave,
    toggleHouseholdIncomeQuotasEnabled,
    handleEmploymentStatusQuotasSave,
    toggleEmploymentStatusQuotasEnabled,
    handleDailyHoursOnlineQuotasSave,
    toggleDailyHoursOnlineQuotasEnabled,
    handleTechnicalProficiencyQuotasSave,
    toggleTechnicalProficiencyQuotasEnabled,
    saveForm,
    generateRecruitmentLink,
    generateQRCode,
    copyLinkToClipboard,
    modalError,
    modalVisible,
    closeModal,
    setFormData,
    showQRModal,
    closeQRModal
  } = useEyeTrackingRecruit({ researchId });

  const [isDeleting, setIsDeleting] = React.useState(false);
  const [ageModalOpen, setAgeModalOpen] = React.useState(false);
  const [countryModalOpen, setCountryModalOpen] = React.useState(false);
  const [genderModalOpen, setGenderModalOpen] = React.useState(false);
  const [educationModalOpen, setEducationModalOpen] = React.useState(false);
  const [householdIncomeModalOpen, setHouseholdIncomeModalOpen] = React.useState(false);
  const [employmentStatusModalOpen, setEmploymentStatusModalOpen] = React.useState(false);
  const [dailyHoursOnlineModalOpen, setDailyHoursOnlineModalOpen] = React.useState(false);
  const [technicalProficiencyModalOpen, setTechnicalProficiencyModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);

  const getSaveButtonText = () => {
    if (saving) {
      return 'Guardando...';
    }
    if (formData.id && typeof formData.id === 'string' && formData.id.trim().length > 0) {
      return 'Actualizar';
    }
    return 'Guardar';
  };

  const handleDelete = async () => {
    if (!researchId) {
      showErrorToast('No hay datos para eliminar');
      return;
    }
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await eyeTrackingApi.recruit.deleteConfig(researchId);
      showSuccessToast('Datos de reclutamiento eliminados correctamente');

      // 🎯 DETECTAR ENTORNO AUTOMÁTICAMENTE
      const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const publicTestsBaseUrl = isDevelopment 
        ? 'http://localhost:5173'  // 🏠 DESARROLLO LOCAL
        : 'https://d35071761848hm.cloudfront.net'; // 🌐 PRODUCCIÓN - URL CORRECTA
      
      // 🎯 GENERAR PARTICIPANT ID ÚNICO PARA QUE LOS DATOS SE GUARDEN
      // Si no hay participantId, se activa modo preview y los datos no se guardan
      const participantId = `participant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const generatedUrl = `${publicTestsBaseUrl}/?researchId=${researchId}&participantId=${participantId}`;

      const defaultConfig = {
        id: undefined,
        researchId: researchId,
        questionKey: 'demographics',
        demographicQuestions: {
          age: { enabled: false, required: false, options: [], disqualifyingAges: [] },
          country: { enabled: false, required: false, options: [], disqualifyingCountries: [] },
          gender: { enabled: false, required: false, options: [], disqualifyingGenders: [] },
          educationLevel: { enabled: false, required: false, options: [], disqualifyingEducation: [] },
          householdIncome: { enabled: false, required: false, options: [], disqualifyingIncomes: [] },
          employmentStatus: { enabled: false, required: false, options: [], disqualifyingEmploymentStatuses: [] },
          dailyHoursOnline: { enabled: false, required: false, options: [], disqualifyingHours: [] },
          technicalProficiency: { enabled: false, required: false, options: [], disqualifyingProficiencies: [] }
        },
        linkConfig: { allowMobile: false, trackLocation: false, allowMultipleAttempts: false, showProgressBar: true },
        participantLimit: { enabled: false, value: 50 },
        backlinks: { complete: '', disqualified: '', overquota: '' },
        researchUrl: generatedUrl,
        parameterOptions: { saveDeviceInfo: false, saveLocationInfo: false, saveResponseTimes: false, saveUserJourney: false }
      };

      setFormData(defaultConfig);
      setDemographicQuestionsEnabled(false);
      setLinkConfigEnabled(false);

      queryClient.invalidateQueries({ queryKey: ['eyeTrackingRecruit', researchId] });

    } catch (error: any) {
      showErrorToast(error?.message || 'No se pudo eliminar la configuración');
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  const handleAgeConfigSaveLocal = (options: string[], disqualifyingAges: string[]) => {
    handleAgeConfigSave(options, disqualifyingAges);
    showSuccessToast('Configuración de edad guardada correctamente');
    setAgeModalOpen(false);
  };

  const handleAgeQuotasSaveLocal = (quotas: AgeQuota[]) => {
    handleAgeQuotasSave(quotas as any);
    showSuccessToast('Cuotas de edad guardadas correctamente');
  };

  const handleAgeQuotasToggleLocal = (enabled: boolean) => {
    toggleAgeQuotasEnabled(enabled);
    showSuccessToast(enabled ? 'Cuotas de edad habilitadas' : 'Cuotas de edad deshabilitadas');
  };

  const handleCountryQuotasSaveLocal = (quotas: any[]) => {
    handleCountryQuotasSave(quotas);
    showSuccessToast('Cuotas de país guardadas correctamente');
  };

  const handleCountryQuotasToggleLocal = (enabled: boolean) => {
    toggleCountryQuotasEnabled(enabled);
    showSuccessToast(enabled ? 'Cuotas de país habilitadas' : 'Cuotas de país deshabilitadas');
  };

  const handleGenderQuotasSaveLocal = (quotas: any[]) => {
    handleGenderQuotasSave(quotas);
    showSuccessToast('Cuotas de género guardadas correctamente');
  };

  const handleGenderQuotasToggleLocal = (enabled: boolean) => {
    toggleGenderQuotasEnabled(enabled);
    showSuccessToast(enabled ? 'Cuotas de género habilitadas' : 'Cuotas de género deshabilitadas');
  };

  const handleEducationLevelQuotasSaveLocal = (quotas: any[]) => {
    handleEducationLevelQuotasSave(quotas);
    showSuccessToast('Cuotas de nivel educativo guardadas correctamente');
  };

  const handleEducationLevelQuotasToggleLocal = (enabled: boolean) => {
    toggleEducationLevelQuotasEnabled(enabled);
    showSuccessToast(enabled ? 'Cuotas de nivel educativo habilitadas' : 'Cuotas de nivel educativo deshabilitadas');
  };

  const handleHouseholdIncomeQuotasSaveLocal = (quotas: any[]) => {
    handleHouseholdIncomeQuotasSave(quotas);
    showSuccessToast('Cuotas de ingresos guardadas correctamente');
  };

  const handleHouseholdIncomeQuotasToggleLocal = (enabled: boolean) => {
    toggleHouseholdIncomeQuotasEnabled(enabled);
    showSuccessToast(enabled ? 'Cuotas de ingresos habilitadas' : 'Cuotas de ingresos deshabilitadas');
  };

  const handleEmploymentStatusQuotasSaveLocal = (quotas: any[]) => {
    handleEmploymentStatusQuotasSave(quotas);
    showSuccessToast('Cuotas de situación laboral guardadas correctamente');
  };

  const handleEmploymentStatusQuotasToggleLocal = (enabled: boolean) => {
    toggleEmploymentStatusQuotasEnabled(enabled);
    showSuccessToast(enabled ? 'Cuotas de situación laboral habilitadas' : 'Cuotas de situación laboral deshabilitadas');
  };

  const handleDailyHoursOnlineQuotasSaveLocal = (quotas: any[]) => {
    handleDailyHoursOnlineQuotasSave(quotas);
    showSuccessToast('Cuotas de horas en línea guardadas correctamente');
  };

  const handleDailyHoursOnlineQuotasToggleLocal = (enabled: boolean) => {
    toggleDailyHoursOnlineQuotasEnabled(enabled);
    showSuccessToast(enabled ? 'Cuotas de horas en línea habilitadas' : 'Cuotas de horas en línea deshabilitadas');
  };

  const handleTechnicalProficiencyQuotasSaveLocal = (quotas: any[]) => {
    handleTechnicalProficiencyQuotasSave(quotas);
    showSuccessToast('Cuotas de competencia técnica guardadas correctamente');
  };

  const handleTechnicalProficiencyQuotasToggleLocal = (enabled: boolean) => {
    toggleTechnicalProficiencyQuotasEnabled(enabled);
    showSuccessToast(enabled ? 'Cuotas de competencia técnica habilitadas' : 'Cuotas de competencia técnica deshabilitadas');
  };

  const handleCountryConfigSave = (validCountries: string[], disqualifyingCountries: string[], priorityCountries: string[]) => {
    updateCountryOptions(validCountries);
    updateDisqualifyingCountries(disqualifyingCountries);
    updatePriorityCountries(priorityCountries);
    showSuccessToast('Configuración de países guardada correctamente');
    setCountryModalOpen(false);
  };

  const handleGenderConfigSave = (options: any[], disqualifyingGenders: string[]) => {
    const optionNames = options.map(option => option.name);
    updateGenderOptions(optionNames);
    updateDisqualifyingGenders(disqualifyingGenders);
    showSuccessToast('Configuración de géneros guardada correctamente');
    setGenderModalOpen(false);
  };

  const handleEducationConfigSave = (options: any[], disqualifyingEducation: string[]) => {
    const optionNames = options.map(option => option.name);
    updateEducationOptions(optionNames);
    updateDisqualifyingEducation(disqualifyingEducation);
    showSuccessToast('Configuración de educación guardada correctamente');
    setEducationModalOpen(false);
  };

  const handleHouseholdIncomeConfigSave = (options: any[], disqualifyingIncomes: string[]) => {
    const optionNames = options.map(option => option.name);
    updateHouseholdIncomeOptions(optionNames);
    updateDisqualifyingHouseholdIncomes(disqualifyingIncomes);
    showSuccessToast('Configuración de ingresos guardada correctamente');
    setHouseholdIncomeModalOpen(false);
  };

  const handleEmploymentStatusConfigSave = (options: any[], disqualifyingEmploymentStatuses: string[]) => {
    const optionNames = options.map(option => option.name);
    updateEmploymentStatusOptions(optionNames);
    updateDisqualifyingEmploymentStatuses(disqualifyingEmploymentStatuses);
    showSuccessToast('Configuración de situación laboral guardada correctamente');
    setEmploymentStatusModalOpen(false);
  };

  const handleDailyHoursOnlineConfigSave = (options: any[], disqualifyingHours: string[]) => {
    const optionNames = options.map(option => option.name);
    updateDailyHoursOnlineOptions(optionNames);
    updateDisqualifyingDailyHoursOnline(disqualifyingHours);
    showSuccessToast('Configuración de horas en línea guardada correctamente');
    setDailyHoursOnlineModalOpen(false);
  };

  const handleTechnicalProficiencyConfigSave = (options: any[], disqualifyingProficiencies: string[]) => {
    const optionNames = options.map(option => option.name);
    updateTechnicalProficiencyOptions(optionNames);
    updateDisqualifyingTechnicalProficiencies(disqualifyingProficiencies);
    showSuccessToast('Configuración de competencia técnica guardada correctamente');
    setTechnicalProficiencyModalOpen(false);
  };

  if (loading) {
    return (
      <>
        <div className={cn('max-w-4xl', className)}>
          <LoadingSkeleton variant="form" rows={8} title={true} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className={cn('max-w-[1600px]', className)}>
        <div className="overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-8">
              <div>
                <div className="mb-8">
                  <h2 className="text-base font-medium mb-4">Enlace de reclutamiento</h2>

                  <div className="space-y-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={demographicQuestionsEnabled}
                          onChange={(e) => {
                            setDemographicQuestionsEnabled(e.target.checked);
                          }}
                          className="w-5 h-5 mr-3 cursor-pointer"
                        />
                        <span className="text-sm font-medium">Preguntas demográficas</span>
                      </div>
                      <span className="text-sm text-neutral-400">Por favor seleccione</span>
                    </div>

                    <div className={`pl-10 space-y-3 ${!demographicQuestionsEnabled ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="age"
                          checked={formData.demographicQuestions.age.enabled}
                          onChange={(e) => {
                            handleDemographicChange('age' as DemographicQuestionKeys, e.target.checked);
                            if (e.target.checked) {
                              setAgeModalOpen(true);
                            }
                          }}
                          disabled={!demographicQuestionsEnabled}
                          className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <label htmlFor="age" className={`text-sm ${demographicQuestionsEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>Edad</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="country"
                          checked={formData.demographicQuestions.country.enabled}
                          onChange={(e) => {
                            handleDemographicChange('country' as DemographicQuestionKeys, e.target.checked);
                            if (e.target.checked) {
                              setCountryModalOpen(true);
                            }
                          }}
                          disabled={!demographicQuestionsEnabled}
                          className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <label htmlFor="country" className={`text-sm ${demographicQuestionsEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>País</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="gender"
                          checked={formData.demographicQuestions.gender.enabled}
                          onChange={(e) => {
                            handleDemographicChange('gender' as DemographicQuestionKeys, e.target.checked);
                            if (e.target.checked) {
                              setGenderModalOpen(true);
                            }
                          }}
                          disabled={!demographicQuestionsEnabled}
                          className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <label htmlFor="gender" className={`text-sm ${demographicQuestionsEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>Género</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="educationLevel"
                          checked={formData.demographicQuestions.educationLevel.enabled}
                          onChange={(e) => {
                            handleDemographicChange('educationLevel' as DemographicQuestionKeys, e.target.checked);
                            if (e.target.checked) {
                              setEducationModalOpen(true);
                            }
                          }}
                          disabled={!demographicQuestionsEnabled}
                          className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <label htmlFor="educationLevel" className={`text-sm ${demographicQuestionsEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>Nivel educativo</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="householdIncome"
                          checked={formData.demographicQuestions.householdIncome.enabled}
                          onChange={(e) => {
                            handleDemographicChange('householdIncome' as DemographicQuestionKeys, e.target.checked);
                            if (e.target.checked) {
                              setHouseholdIncomeModalOpen(true);
                            }
                          }}
                          disabled={!demographicQuestionsEnabled}
                          className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <label htmlFor="householdIncome" className={`text-sm ${demographicQuestionsEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>Ingresos familiares anuales</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="employmentStatus"
                          checked={formData.demographicQuestions.employmentStatus.enabled}
                          onChange={(e) => {
                            handleDemographicChange('employmentStatus' as DemographicQuestionKeys, e.target.checked);
                            if (e.target.checked) {
                              setEmploymentStatusModalOpen(true);
                            }
                          }}
                          disabled={!demographicQuestionsEnabled}
                          className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <label htmlFor="employmentStatus" className={`text-sm ${demographicQuestionsEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>Situación laboral</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="dailyHoursOnline"
                          checked={formData.demographicQuestions.dailyHoursOnline.enabled}
                          onChange={(e) => {
                            handleDemographicChange('dailyHoursOnline' as DemographicQuestionKeys, e.target.checked);
                            if (e.target.checked) {
                              setDailyHoursOnlineModalOpen(true);
                            }
                          }}
                          disabled={!demographicQuestionsEnabled}
                          className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <label htmlFor="dailyHoursOnline" className={`text-sm ${demographicQuestionsEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>Horas diarias en línea</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="technicalProficiency"
                          checked={formData.demographicQuestions.technicalProficiency.enabled}
                          onChange={(e) => {
                            handleDemographicChange('technicalProficiency' as DemographicQuestionKeys, e.target.checked);
                            if (e.target.checked) {
                              setTechnicalProficiencyModalOpen(true);
                            }
                          }}
                          disabled={!demographicQuestionsEnabled}
                          className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <label htmlFor="technicalProficiency" className={`text-sm ${demographicQuestionsEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>Competencia técnica</label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={linkConfigEnabled}
                          onChange={(e) => {
                            setLinkConfigEnabled(e.target.checked);
                          }}
                          className="w-5 h-5 mr-3 cursor-pointer"
                        />
                        <span className="text-sm font-medium">Configuración del enlace</span>
                      </div>
                      <span className="text-sm text-neutral-400">Por favor seleccione</span>
                    </div>

                    <div className={`pl-10 space-y-3 ${!linkConfigEnabled ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="allowMobile"
                          checked={formData.linkConfig.allowMobile}
                          onChange={(e) => {
                            handleLinkConfigChange('allowMobile', e.target.checked);
                          }}
                          disabled={!linkConfigEnabled}
                          className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <label htmlFor="allowMobile" className={`text-sm ${linkConfigEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>Permitir que los participantes realicen la encuesta en dispositivos móviles</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="trackLocation"
                          checked={formData.linkConfig.trackLocation}
                          onChange={(e) => {
                            handleLinkConfigChange('trackLocation', e.target.checked);
                          }}
                          disabled={!linkConfigEnabled}
                          className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <label htmlFor="trackLocation" className={`text-sm ${linkConfigEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>Rastrear la ubicación de los participantes</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="allowMultipleAttempts"
                          checked={formData.linkConfig.allowMultipleAttempts}
                          onChange={(e) => handleLinkConfigChange('allowMultipleAttempts', e.target.checked)}
                          disabled={!linkConfigEnabled}
                          className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <label htmlFor="allowMultipleAttempts" className={`text-sm ${linkConfigEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>Se puede realizar varias veces dentro de una misma sesión</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="showProgressBar"
                          checked={formData.linkConfig.showProgressBar}
                          onChange={(e) => handleLinkConfigChange('showProgressBar', e.target.checked)}
                          disabled={!linkConfigEnabled}
                          className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <label htmlFor="showProgressBar" className={`text-sm ${linkConfigEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                          Mostrar barra de progreso en public-tests
                          <span className="text-xs text-gray-500 ml-1">(permite actualizar respuestas previas)</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.participantLimit.enabled}
                          onChange={(e) => {
                            setLimitParticipants(e.target.checked);
                          }}
                          className="w-5 h-5 mr-3 cursor-pointer"
                        />
                        <span className="text-sm font-medium">Limitar número de participantes</span>
                      </div>
                      <span className="text-sm text-neutral-400">Por favor seleccione</span>
                    </div>

                    <div className={`pl-10 ${!formData.participantLimit.enabled ? 'opacity-60' : ''}`}>
                      <p className="text-sm mb-3">Dejar de aceptar respuestas después de este número de participantes.</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={formData.participantLimit.value}
                          onChange={(e) => setParticipantLimit(parseInt(e.target.value) || 0)}
                          disabled={!formData.participantLimit.enabled}
                          className="w-20 px-3 py-2 border border-neutral-300 rounded-md disabled:bg-neutral-100 disabled:cursor-not-allowed"
                        />
                        <span className="text-sm">Recibirás {formData.participantLimit.value} respuestas más.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div>
                <div className="mb-8">
                  <h2 className="text-base font-medium mb-4">Configuración de la investigación</h2>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center">
                        A. Enlaces de retorno
                        <div className="relative ml-2 group">
                          <span className="cursor-help w-5 h-5 rounded-full bg-blue-100 text-blue-600 inline-flex items-center justify-center text-xs font-bold">i</span>
                          <div className="absolute left-0 transform -translate-y-full top-0 w-72 bg-white p-3 rounded shadow-lg border border-neutral-200 hidden group-hover:block z-10 text-sm text-blue-700">
                            <p><strong>¿Qué son los enlaces de retorno?</strong></p>
                            <p className="mt-1">Son URLs a las que se redirigirá a los participantes después de completar, ser descalificados o exceder la cuota de la investigación. Por ejemplo, podrían ser redirigidos a:</p>
                            <ul className="list-disc pl-5 mt-1">
                              <li>Su sitio web principal</li>
                              <li>Una página de agradecimiento</li>
                              <li>Un panel de encuestas externo</li>
                            </ul>
                            <p className="mt-1">El sistema añadirá automáticamente un parámetro <code className="bg-blue-100 px-1 py-0.5 rounded">?uid=PARTICIPANT_ID</code> al final de cada URL para que pueda identificar al participante en su sistema.</p>
                          </div>
                        </div>
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Los participantes podrán acceder a tu investigación usando el enlace de reclutamiento que se generará. Asegúrate de que la configuración sea correcta antes de continuar.
                      </p>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm mb-2">Enlace para entrevistas completadas</label>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 bg-neutral-100 border border-r-0 border-neutral-300 rounded-l-md text-sm text-neutral-600">
                              https://
                            </span>
                            <input
                              type="text"
                              value={formData.backlinks.complete}
                              onChange={(e) => handleBacklinkChange('complete' as BacklinkKeys, e.target.value)}
                              placeholder="d1m54jkfd0fdui.cloudfront.net/completed"
                              className="w-full px-3 py-2 border border-neutral-300 rounded-r-md"
                            />
                          </div>
                          <p className="text-xs text-neutral-500 mt-1">
                            URL de Research Links para participantes que completan: <code className="bg-neutral-100 px-1 rounded">/completed</code>
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm mb-2">Enlace para entrevistas descalificadas</label>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 bg-neutral-100 border border-r-0 border-neutral-300 rounded-l-md text-sm text-neutral-600">
                              https://
                            </span>
                            <input
                              type="text"
                              value={formData.backlinks.disqualified}
                              onChange={(e) => handleBacklinkChange('disqualified' as BacklinkKeys, e.target.value)}
                              placeholder="d1m54jkfd0fdui.cloudfront.net/disqualified"
                              className="w-full px-3 py-2 border border-neutral-300 rounded-r-md"
                            />
                          </div>
                          <p className="text-xs text-neutral-500 mt-1">
                            URL de Research Links para participantes descalificados: <code className="bg-neutral-100 px-1 rounded">/disqualified</code>
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm mb-2">Enlace para entrevistas excedidas</label>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 bg-neutral-100 border border-r-0 border-neutral-300 rounded-l-md text-sm text-neutral-600">
                              https://
                            </span>
                            <input
                              type="text"
                              value={formData.backlinks.overquota}
                              onChange={(e) => handleBacklinkChange('overquota' as BacklinkKeys, e.target.value)}
                              placeholder="d1m54jkfd0fdui.cloudfront.net/exceeded"
                              className="w-full px-3 py-2 border border-neutral-300 rounded-r-md"
                            />
                          </div>
                          <p className="text-xs text-neutral-500 mt-1">
                            URL de Research Links para participantes que exceden cuota: <code className="bg-neutral-100 px-1 rounded">/exceeded</code>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center">
                        B. Enlace de investigación para compartir
                        <div className="relative ml-2 group">
                          <span className="cursor-help w-5 h-5 rounded-full bg-green-100 text-green-600 inline-flex items-center justify-center text-xs font-bold">i</span>
                          <div className="absolute left-0 transform -translate-y-full top-0 w-72 bg-white p-3 rounded shadow-lg border border-neutral-200 hidden group-hover:block z-10 text-sm text-green-700">
                            <p><strong>¿Cómo funciona este enlace?</strong></p>
                            <p className="mt-1">Esta es la URL que se debe compartir con participantes potenciales para invitarlos al estudio. Funciona así:</p>
                            <ul className="list-disc pl-5 mt-1">
                              <li>La URL contiene un marcador <code className="bg-green-100 px-1 py-0.5 rounded">{'participant_id'}</code> que debe ser reemplazado</li>
                              <li>Si usa un panel externo, ellos reemplazarán este marcador con el ID único de cada participante</li>
                              <li>Si comparte manualmente, puede reemplazarlo con cualquier identificador (ej. correo o nombre)</li>
                            </ul>
                            <p className="mt-1">Ejemplo: <code className="bg-green-100 px-1 py-0.5 rounded">www.useremotion.com/sysgd-jye746?respondent=123</code> donde &quot;123&quot; es el ID único del participante.</p>
                          </div>
                        </div>
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Los participantes podrán acceder a tu investigación usando el enlace de reclutamiento que se generará. Asegúrate de que la configuración sea correcta antes de continuar.
                      </p>

                      <div>
                        <label className="block text-sm mb-2">URL de la investigación</label>
                        <div className="flex">
                          <input
                            type="text"
                            value={formData.researchUrl}
                            readOnly
                            className="w-full px-3 py-2 border border-neutral-300 rounded-l-md bg-neutral-50 cursor-not-allowed"
                          />
                          <button
                            type="button"
                            className="px-2 py-2 bg-neutral-100 border border-l-0 border-neutral-300 rounded-r-md text-neutral-600 hover:bg-green-50 hover:text-green-600 hover:border-green-300 transition-colors duration-200"
                            onClick={copyLinkToClipboard}
                            title="Copiar enlace"
                            aria-label="Copiar enlace al portapapeles"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Esta URL se genera automáticamente con la misma que aparece en "Abrir vista de participante"
                        </div>
                      </div>

                      <div className="flex mt-4 gap-4">
                        <button
                          type="button"
                          onClick={generateQRCode}
                          className="px-4 py-2 rounded-lg bg-neutral-900 text-white shadow hover:bg-neutral-800 text-sm font-medium flex items-center gap-2"
                          aria-label="Generar código QR"
                        >
                          <span>Generar QR</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <rect x="7" y="7" width="3" height="3"></rect>
                            <rect x="14" y="7" width="3" height="3"></rect>
                            <rect x="7" y="14" width="3" height="3"></rect>
                            <rect x="14" y="14" width="3" height="3"></rect>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3 mt-10">C. Parámetros de investigación a guardar</h3>
                <p className="text-sm text-neutral-500 mb-4">Especifique los parámetros que desea guardar (claves separadas por comas)</p>

                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full">
                    <input
                      type="checkbox"
                      id="saveDeviceInfo"
                      checked={formData.parameterOptions.saveDeviceInfo}
                      onChange={(e) => handleParamOptionChange('saveDeviceInfo' as ParameterOptionKeys, e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="saveDeviceInfo" className="text-xs text-blue-600 cursor-pointer">Guardar información del dispositivo</label>
                  </div>

                  <div className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full">
                    <input
                      type="checkbox"
                      id="saveLocationInfo"
                      checked={formData.parameterOptions.saveLocationInfo}
                      onChange={(e) => handleParamOptionChange('saveLocationInfo' as ParameterOptionKeys, e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="saveLocationInfo" className="text-xs text-blue-600 cursor-pointer">Guardar información de ubicación</label>
                  </div>

                  <div className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full">
                    <input
                      type="checkbox"
                      id="saveResponseTimes"
                      checked={formData.parameterOptions.saveResponseTimes}
                      onChange={(e) => handleParamOptionChange('saveResponseTimes' as ParameterOptionKeys, e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="saveResponseTimes" className="text-xs text-blue-600 cursor-pointer">Guardar tiempos de respuesta</label>
                  </div>

                  <div className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full">
                    <input
                      type="checkbox"
                      id="saveUserJourney"
                      checked={formData.parameterOptions.saveUserJourney}
                      onChange={(e) => handleParamOptionChange('saveUserJourney' as ParameterOptionKeys, e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="saveUserJourney" className="text-xs text-blue-600 cursor-pointer">Guardar recorrido del usuario</label>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {/* 🎯 INDICADOR DE ESTADO DE GUARDADO */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 min-h-[16px]">
                    {saving ? (
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                        <span>Guardando...</span>
                      </div>
                    ) : lastSaved ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Guardado a las {lastSaved}</span>
                      </div>
                    ) : null}
                  </div>
                  
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting || !formData.id}
                      className="px-4 py-2 h-[40px] rounded-lg bg-red-600 text-white shadow hover:bg-red-700 text-sm font-medium disabled:opacity-50 flex items-center justify-center min-w-[180px]"
                    >
                      {isDeleting ? (
                        <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div> Eliminando...</span>
                      ) : (
                      
                        <span className="flex items-center gap-2"><Trash2 size={18} /> Eliminar datos</span>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={saveForm}
                      disabled={saving}
                      className="px-4 py-2 h-[40px] rounded-lg bg-neutral-900 text-white shadow hover:bg-neutral-800 text-sm font-medium disabled:opacity-50 flex items-center justify-center min-w-[180px]"
                    >
                      {saving ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                          <span>Guardando...</span>
                        </div>
                      ) : getSaveButtonText()}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para mostrar mensajes y errores */}
      {modalError && (
        <ErrorModal
          isOpen={modalVisible}
          onClose={closeModal}
          error={modalError}
        />
      )}

      {/* Modal para configuración de edad */}
      <AgeConfigModal
        isOpen={ageModalOpen}
        onClose={() => setAgeModalOpen(false)}
        onSave={handleAgeConfigSaveLocal}
        onQuotasSave={handleAgeQuotasSaveLocal as any}
        onQuotasToggle={handleAgeQuotasToggleLocal}
        initialValidAges={formData.demographicQuestions.age.options || []}
        initialDisqualifyingAges={formData.demographicQuestions.age.disqualifyingAges || []}
        initialQuotas={formData.demographicQuestions.age.quotas as any || []}
        quotasEnabled={formData.demographicQuestions.age.quotasEnabled || false}
      />

      {/* Modal para configuración de países */}
      <CountryConfigModal
        isOpen={countryModalOpen}
        onClose={() => setCountryModalOpen(false)}
        onSave={handleCountryConfigSave}
        onQuotasSave={handleCountryQuotasSaveLocal}
        onQuotasToggle={handleCountryQuotasToggleLocal}
        initialValidCountries={formData.demographicQuestions.country.options || []}
        initialDisqualifyingCountries={formData.demographicQuestions.country.disqualifyingCountries || []}
        initialPriorityCountries={formData.demographicQuestions.country.priorityCountries || []}
        initialQuotas={formData.demographicQuestions.country.quotas as any || []}
        quotasEnabled={formData.demographicQuestions.country.quotasEnabled || false}
      />

      {/* Modal para configuración de géneros */}
      <GenderConfigModal
        isOpen={genderModalOpen}
        onClose={() => setGenderModalOpen(false)}
        onSave={handleGenderConfigSave}
        onQuotasSave={handleGenderQuotasSaveLocal}
        onQuotasToggle={handleGenderQuotasToggleLocal}
        currentOptions={[
          { id: 'masculino', name: 'Masculino', isQualified: true },
          { id: 'femenino', name: 'Femenino', isQualified: true },
          { id: 'prefiero-no-especificar', name: 'Prefiero no especificar', isQualified: true }
        ]}
        currentDisqualified={formData.demographicQuestions.gender.disqualifyingGenders || []}
        initialQuotas={formData.demographicQuestions.gender.quotas as any || []}
        quotasEnabled={formData.demographicQuestions.gender.quotasEnabled || false}
      />

      {/* Modal para configuración de niveles educativos */}
      <EducationConfigModal
        isOpen={educationModalOpen}
        onClose={() => setEducationModalOpen(false)}
        onSave={handleEducationConfigSave}
        onQuotasSave={handleEducationLevelQuotasSaveLocal}
        onQuotasToggle={handleEducationLevelQuotasToggleLocal}
        currentOptions={[
          { id: 'basica', name: 'Básica', isQualified: true },
          { id: 'media', name: 'Media', isQualified: true },
          { id: 'universitaria', name: 'Universitaria', isQualified: true },
          { id: 'maestria', name: 'Maestría', isQualified: true },
          { id: 'doctorado', name: 'Doctorado', isQualified: true }
        ]}
        currentDisqualified={formData.demographicQuestions.educationLevel.disqualifyingEducation || []}
        initialQuotas={formData.demographicQuestions.educationLevel.quotas as any || []}
        quotasEnabled={formData.demographicQuestions.educationLevel.quotasEnabled || false}
      />

      {/* Modal para configuración de ingresos familiares */}
      <HouseholdIncomeConfigModal
        isOpen={householdIncomeModalOpen}
        onClose={() => setHouseholdIncomeModalOpen(false)}
        onSave={handleHouseholdIncomeConfigSave}
        onQuotasSave={handleHouseholdIncomeQuotasSaveLocal}
        onQuotasToggle={handleHouseholdIncomeQuotasToggleLocal}
        currentOptions={[
          { id: 'nivel-1', name: 'Menos de 20.000€', isQualified: true },
          { id: 'nivel-2', name: '20.000€ - 40.000€', isQualified: true },
          { id: 'nivel-3', name: '40.000€ - 60.000€', isQualified: true },
          { id: 'nivel-4', name: '60.000€ - 80.000€', isQualified: true },
          { id: 'nivel-5', name: 'Más de 80.000€', isQualified: true }
        ]}
        currentDisqualified={formData.demographicQuestions.householdIncome.disqualifyingIncomes || []}
        initialQuotas={formData.demographicQuestions.householdIncome.quotas as any || []}
        quotasEnabled={formData.demographicQuestions.householdIncome.quotasEnabled || false}
      />

      {/* Modal para configuración de situación laboral */}
      <EmploymentStatusConfigModal
        isOpen={employmentStatusModalOpen}
        onClose={() => setEmploymentStatusModalOpen(false)}
        onSave={handleEmploymentStatusConfigSave}
        onQuotasSave={handleEmploymentStatusQuotasSaveLocal}
        onQuotasToggle={handleEmploymentStatusQuotasToggleLocal}
        currentOptions={[
          { id: 'dependiente', name: 'Dependiente', isQualified: true },
          { id: 'independiente', name: 'Independiente', isQualified: true },
          { id: 'cesante', name: 'Cesante', isQualified: true },
          { id: 'jubilado', name: 'Jubilado', isQualified: true }
        ]}
        currentDisqualified={formData.demographicQuestions.employmentStatus.disqualifyingEmploymentStatuses || []}
        initialQuotas={formData.demographicQuestions.employmentStatus.quotas as any || []}
        quotasEnabled={formData.demographicQuestions.employmentStatus.quotasEnabled || false}
      />

      {/* Modal para configuración de horas diarias en línea */}
      <DailyHoursOnlineConfigModal
        isOpen={dailyHoursOnlineModalOpen}
        onClose={() => setDailyHoursOnlineModalOpen(false)}
        onSave={handleDailyHoursOnlineConfigSave}
        onQuotasSave={handleDailyHoursOnlineQuotasSaveLocal}
        onQuotasToggle={handleDailyHoursOnlineQuotasToggleLocal}
        currentOptions={[
          { id: '0-2', name: '0-2 horas', isQualified: true },
          { id: '2-4', name: '2-4 horas', isQualified: true },
          { id: '4-6', name: '4-6 horas', isQualified: true },
          { id: '6-8', name: '6-8 horas', isQualified: true },
          { id: '8+', name: 'Más de 8 horas', isQualified: true }
        ]}
        currentDisqualified={formData.demographicQuestions.dailyHoursOnline.disqualifyingHours || []}
        initialQuotas={formData.demographicQuestions.dailyHoursOnline.quotas as any || []}
        quotasEnabled={formData.demographicQuestions.dailyHoursOnline.quotasEnabled || false}
      />

      {/* Modal para configuración de competencia técnica */}
      <TechnicalProficiencyConfigModal
        isOpen={technicalProficiencyModalOpen}
        onClose={() => setTechnicalProficiencyModalOpen(false)}
        onSave={handleTechnicalProficiencyConfigSave}
        onQuotasSave={handleTechnicalProficiencyQuotasSaveLocal}
        onQuotasToggle={handleTechnicalProficiencyQuotasToggleLocal}
        currentOptions={[
          { id: 'basico', name: 'Básico', isQualified: true },
          { id: 'intermedio', name: 'Intermedio', isQualified: true },
          { id: 'profesional', name: 'Profesional', isQualified: true },
          { id: 'experto', name: 'Experto', isQualified: true }
        ]}
        currentDisqualified={formData.demographicQuestions.technicalProficiency.disqualifyingProficiencies || []}
        initialQuotas={formData.demographicQuestions.technicalProficiency.quotas as any || []}
        quotasEnabled={formData.demographicQuestions.technicalProficiency.quotasEnabled || false}
      />

      {/* Modal para confirmar eliminación */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {/* Modal de código QR */}
      <QRCodeModal
        open={showQRModal}
        onOpenChange={closeQRModal}
        researchUrl={formData.researchUrl}
      />
    </>
  );
}
