import { moduleResponsesAPI } from '@/api/config';
import { useQuery } from '@tanstack/react-query';

interface DemographicData {
  countries: Array<{ id: string; label: string; count: number }>;
  ageRanges: Array<{ id: string; label: string; count: number }>;
  genders: Array<{ id: string; label: string; count: number }>;
  educationLevels: Array<{ id: string; label: string; count: number }>;
  userIds: Array<{ id: string; label: string; count: number }>;
  participants: Array<{ id: string; label: string; count: number }>;
}

interface GroupedResponse {
  participantId: string;
  value: any;
  responseTime?: string;
  timestamp: string;
  metadata?: any;
}

interface GroupedResponsesData {
  [questionKey: string]: GroupedResponse[];
}

/**
 * Procesa datos demográficos desde respuestas agrupadas
 */
const processDemographicsData = (groupedResponses: GroupedResponsesData): DemographicData => {
    if (!groupedResponses || Object.keys(groupedResponses).length === 0) {
      return {
        countries: [],
        ageRanges: [],
        genders: [],
        educationLevels: [],
        userIds: [],
        participants: []
      };
    }

    // Contadores para cada categoría
    const countryCounts: Record<string, number> = {};
    const ageCounts: Record<string, number> = {};
    const genderCounts: Record<string, number> = {};
    const educationCounts: Record<string, number> = {};
    const userIdCounts: Record<string, number> = {};
    const participantCounts: Record<string, number> = {};
    const participantTimestamps: Record<string, string> = {}; // Guardar timestamp de cada participante
    const processedParticipants = new Set<string>();

    // Procesar TODAS las respuestas que contengan "demographics" en el questionKey
    // Esto permite manejar múltiples respuestas de demographics por participante
    const demographicsQuestionKeys = Object.keys(groupedResponses).filter(key => 
      key.toLowerCase().includes('demographic')
    );

    // Procesar todas las respuestas de demographics
    demographicsQuestionKeys.forEach(questionKey => {
      const demographicsResponses = groupedResponses[questionKey] || [];
      
      demographicsResponses.forEach((response) => {
        const participantId = response.participantId;
        const demographicValue = response.value;

        // Contar participantes únicos (solo una vez por participante)
        if (participantId && !processedParticipants.has(participantId)) {
          processedParticipants.add(participantId);
          const participantKey = participantId;
          participantCounts[participantKey] = (participantCounts[participantKey] || 0) + 1;

          // Guardar timestamp del participante (usar el más reciente si hay múltiples)
          if (response.timestamp) {
            const existingTimestamp = participantTimestamps[participantKey];
            if (!existingTimestamp || new Date(response.timestamp) > new Date(existingTimestamp)) {
              participantTimestamps[participantKey] = response.timestamp;
            }
          }

          // Contar userIds únicos
          userIdCounts[participantId] = (userIdCounts[participantId] || 0) + 1;
        }

        // Procesar datos demográficos
        // El valor puede ser un objeto o un string/array
        let processedValue: Record<string, unknown> = {};
        
        if (typeof demographicValue === 'object' && demographicValue !== null) {
          processedValue = demographicValue as Record<string, unknown>;
        } else if (typeof demographicValue === 'string') {
          // Intentar parsear si es un JSON string
          try {
            processedValue = JSON.parse(demographicValue) as Record<string, unknown>;
          } catch {
            // Si no es JSON, tratar como valor directo
            processedValue = { value: demographicValue };
          }
        }

        // Procesar país (puede venir como 'country', 'pais', 'location', etc.)
        const location = processedValue.location as Record<string, unknown> | undefined;
        const country = processedValue.country || processedValue.pais || location?.country || processedValue.countryCode;
        if (country) {
          const countryStr = String(country);
          countryCounts[countryStr] = (countryCounts[countryStr] || 0) + 1;
        }

        // Procesar edad (puede venir como 'age', 'edad', 'ageRange', 'age_range', etc.)
        const age = processedValue.age || processedValue.edad || processedValue.ageRange || processedValue.age_range;
        if (age) {
          const ageStr = String(age);
          ageCounts[ageStr] = (ageCounts[ageStr] || 0) + 1;
        }

        // Procesar género (puede venir como 'gender', 'genero', 'sex', etc.)
        const gender = processedValue.gender || processedValue.genero || processedValue.sex;
        if (gender) {
          const genderStr = String(gender);
          genderCounts[genderStr] = (genderCounts[genderStr] || 0) + 1;
        }

        // Procesar educación (puede venir como 'education', 'educacion', 'educationLevel', 'education_level', etc.)
        const education = processedValue.education || processedValue.educacion || processedValue.educationLevel || processedValue.education_level;
        if (education) {
          const educationStr = String(education);
          educationCounts[educationStr] = (educationCounts[educationStr] || 0) + 1;
        }
      });
    });

    // Convertir contadores a arrays con formato y ordenar por count
    const countries = Object.entries(countryCounts)
      .sort(([, a], [, b]) => b - a) // Ordenar por count descendente
      .map(([label, count], index) => ({
        id: `country-${index + 1}`,
        label,
        count
      }));

    const ageRanges = Object.entries(ageCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([label, count], index) => ({
        id: `age-${index + 1}`,
        label,
        count
      }));

    const genders = Object.entries(genderCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([label, count], index) => ({
        id: `gender-${index + 1}`,
        label,
        count
      }));

    const educationLevels = Object.entries(educationCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([label, count], index) => ({
        id: `edu-${index + 1}`,
        label,
        count
      }));

    // Limitar User IDs a los primeros 20 para evitar UI sobrecargada
    const userIds = Object.entries(userIdCounts)
      .slice(0, 20) // Máximo 20 User IDs
      .map(([label, count], index) => ({
        id: `user-${index + 1}`,
        label: label.length > 20 ? `${label.substring(0, 20)}...` : label,
        count
      }));

    const participants = Object.entries(participantCounts)
      .slice(0, 20) // Máximo 20 participantes
      .map(([label, count], index) => {
        // Obtener timestamp del participante o usar fecha actual como fallback
        const timestamp = participantTimestamps[label] || new Date().toISOString();
        const date = new Date(timestamp);
        // Usar T12:00:00 para evitar problemas de zona horaria al formatear
        const dateObj = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const formattedDate = dateObj.toLocaleDateString('es-ES', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
        
        return {
          id: `part-${index + 1}`,
          label: `${formattedDate}, ${label.length > 15 ? `${label.substring(0, 15)}...` : label}`,
          count
        };
      });

    return {
      countries,
      ageRanges,
      genders,
      educationLevels,
      userIds,
      participants
    };
};

export const useDemographicsData = (researchId: string) => {
  // Usar React Query con query key específico para demographics para evitar conflictos
  const query = useQuery({
    queryKey: ['demographicsData', 'research', researchId],
    queryFn: async () => {
      if (!researchId) {
        throw new Error('Research ID es requerido');
      }

      const response = await moduleResponsesAPI.getResponsesByResearch(researchId);

      if (!response) {
        throw new Error('No se recibieron datos del servidor');
      }

      // La respuesta puede venir como { data: { questionKey: [...] } } o directamente como { questionKey: [...] }
      const groupedResponses = (response.data || response) as GroupedResponsesData;

      // Procesar datos demográficos
      return processDemographicsData(groupedResponses);
    },
    enabled: !!researchId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false, // No refetch si ya hay datos en cache
    retry: 1
  });

  return {
    data: query.data || null,
    isLoading: query.isLoading,
    error: query.error ? String(query.error) : null
  };
};
