'use client';


// EyeTrackingRecruitFormData está definido en el hook useEyeTrackingRecruit
interface EyeTrackingRecruitFormData {
  id?: string;
  researchId: string;
  demographicQuestions: Record<string, {
    enabled: boolean;
    required: boolean;
    options?: string[];
    disqualifyingAges?: string[];
    disqualifyingCountries?: string[];
    disqualifyingGenders?: string[];
    disqualifyingEducation?: string[];
    disqualifyingIncomes?: string[];
    disqualifyingEmploymentStatuses?: string[];
    disqualifyingHours?: string[];
    disqualifyingProficiencies?: string[];
  }>;
  linkConfig: Record<string, boolean>;
  participantLimit: { enabled: boolean; value: number };
  backlinks: Record<string, string>;
  researchUrl: string;
  parameterOptions: Record<string, boolean>;
}

interface ParticipantViewProps {
  formData: EyeTrackingRecruitFormData;
  onClose: () => void;
  demographicQuestionsEnabled?: boolean;
  linkConfigEnabled?: boolean;
}

export function ParticipantView({
  formData,
  onClose,
  demographicQuestionsEnabled = true,
  linkConfigEnabled = true
}: ParticipantViewProps) {
  const getOptionLabel = (key: string, value: string) => {
    const labels: { [key: string]: { [key: string]: string } } = {
      age: {
        '18-24': '18-24 años',
        '25-34': '25-34 años',
        '35-44': '35-44 años',
        '45-54': '45-54 años',
        '55-64': '55-64 años',
        '65+': '65 años o más'
      },
      country: {
        'ES': 'España',
        'MX': 'México',
        'AR': 'Argentina',
        'CO': 'Colombia',
        'CL': 'Chile',
        'PE': 'Perú'
      },
      gender: {
        'M': 'Masculino',
        'F': 'Femenino',
        'O': 'Otro',
        'P': 'Prefiero no decirlo'
      },
      educationLevel: {
        '1': 'Educación primaria',
        '2': 'Educación secundaria',
        '3': 'Bachillerato',
        '4': 'Formación profesional',
        '5': 'Grado universitario',
        '6': 'Máster/Postgrado',
        '7': 'Doctorado'
      },
      householdIncome: {
        '1': 'Menos de 20.000€',
        '2': '20.000€ - 40.000€',
        '3': '40.000€ - 60.000€',
        '4': '60.000€ - 80.000€',
        '5': 'Más de 80.000€'
      },
      employmentStatus: {
        'employed': 'Empleado',
        'unemployed': 'Desempleado',
        'student': 'Estudiante',
        'retired': 'Jubilado'
      },
      dailyHoursOnline: {
        '0-2': '0-2 horas',
        '2-4': '2-4 horas',
        '4-6': '4-6 horas',
        '6-8': '6-8 horas',
        '8+': 'Más de 8 horas'
      },
      technicalProficiency: {
        'beginner': 'Principiante',
        'intermediate': 'Intermedio',
        'advanced': 'Avanzado',
        'expert': 'Experto'
      }
    };

    return labels[key]?.[value] || value;
  };

  // Verificar si hay preguntas demográficas habilitadas, teniendo en cuenta el switch principal
  const hasEnabledDemographicQuestions = demographicQuestionsEnabled &&
    Object.values(formData.demographicQuestions).some(q => q.enabled);

  // Verificar si hay configuraciones de enlace habilitadas, teniendo en cuenta el switch principal
  const hasEnabledLinkConfig = linkConfigEnabled &&
    Object.values(formData.linkConfig).some(value => value);

  // Verificar si hay parámetros habilitados
  const hasEnabledParameters = Object.values(formData.parameterOptions).some(value => value);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Vista participante</h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Vista previa</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="max-w-xl mx-auto space-y-8">
            {/* Bienvenida */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Bienvenido/a al estudio
              </h1>
              <p className="text-gray-600">
                Gracias por participar en nuestra investigación. Por favor, complete la siguiente información.
              </p>
            </div>

            {/* Información importante */}
            {hasEnabledParameters && (
              <div className="bg-amber-50 p-4 rounded-lg space-y-2">
                <h3 className="text-lg font-medium text-amber-800 mb-2">Información importante</h3>
                <ul className="space-y-2">
                  {formData.parameterOptions.saveDeviceInfo && (
                    <li className="flex items-center gap-2 text-amber-700">
                      <span className="text-amber-500">•</span>
                      Se recopilará información de tu dispositivo
                    </li>
                  )}
                  {formData.parameterOptions.saveLocationInfo && (
                    <li className="flex items-center gap-2 text-amber-700">
                      <span className="text-amber-500">•</span>
                      Se guardará información de tu ubicación
                    </li>
                  )}
                  {formData.parameterOptions.saveResponseTimes && (
                    <li className="flex items-center gap-2 text-amber-700">
                      <span className="text-amber-500">•</span>
                      Se registrarán tus tiempos de respuesta
                    </li>
                  )}
                  {formData.parameterOptions.saveUserJourney && (
                    <li className="flex items-center gap-2 text-amber-700">
                      <span className="text-amber-500">•</span>
                      Se registrará tu recorrido durante el estudio
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Configuración */}
            {hasEnabledLinkConfig && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <h3 className="text-lg font-medium mb-2">Información del estudio</h3>
                <ul className="space-y-2">
                  {linkConfigEnabled && formData.linkConfig.allowMobile && (
                    <li className="flex items-center gap-2 text-green-700">
                      <span className="text-green-500">✓</span>
                      Este estudio es compatible con dispositivos móviles
                    </li>
                  )}
                  {linkConfigEnabled && formData.linkConfig.trackLocation && (
                    <li className="flex items-center gap-2 text-amber-700">
                      <span className="text-amber-500">ℹ️</span>
                      Se solicitará acceso a tu ubicación
                    </li>
                  )}
                  {linkConfigEnabled && formData.linkConfig.allowMultipleAttempts && (
                    <li className="flex items-center gap-2 text-blue-700">
                      <span className="text-blue-500">ℹ️</span>
                      Puedes participar múltiples veces en este estudio
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Preguntas demográficas */}
            {hasEnabledDemographicQuestions && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Información demográfica</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Por favor, complete la siguiente información para ayudarnos a clasificar sus respuestas.
                  {demographicQuestionsEnabled && Object.values(formData.demographicQuestions).some(q => q.enabled && q.required) && (
                    <span className="text-red-500 ml-1">Los campos marcados con * son obligatorios.</span>
                  )}
                </p>

                <div className="space-y-4">
                  {Object.entries(formData.demographicQuestions)
                    .filter(([_, value]) => demographicQuestionsEnabled && value.enabled)
                    .map(([key, value]) => (
                      <div key={key} className="bg-white p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {key === 'age' ? 'Edad' :
                            key === 'country' ? 'País' :
                              key === 'gender' ? 'Género' :
                                key === 'educationLevel' ? 'Nivel educativo' :
                                  key === 'householdIncome' ? 'Ingresos del hogar' :
                                    key === 'employmentStatus' ? 'Situación laboral' :
                                      key === 'dailyHoursOnline' ? 'Horas diarias en línea' :
                                        key === 'technicalProficiency' ? 'Nivel técnico' :
                                          key}
                          {value.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <select
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          defaultValue=""
                          required={value.required}
                        >
                          <option value="" disabled>Seleccione una opción</option>
                          {value.options?.map((opt: string) => (
                            <option key={opt} value={opt}>
                              {getOptionLabel(key, opt)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Límite de participantes */}
            {formData.participantLimit.enabled && (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-700">
                  Este estudio está limitado a {formData.participantLimit.value} participantes
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Vista previa del formulario que verán los participantes
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Cerrar vista previa
          </button>
        </div>
      </div>
    </div>
  );
}
