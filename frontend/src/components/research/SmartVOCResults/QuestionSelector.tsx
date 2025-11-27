'use client';


import React, { useState } from 'react';
import { QuestionType } from 'shared/interfaces/question-types.enum';
import { SmartVOCQuestion } from 'shared/interfaces/smart-voc.interface';

interface QuestionSelectorProps {
  questions: SmartVOCQuestion[];
  smartVOCData: any;
}

const QuestionSelector: React.FC<QuestionSelectorProps> = ({ questions, smartVOCData }) => {
  const [selectedQuestion, setSelectedQuestion] = useState<SmartVOCQuestion | null>(null);

  // Filtrar preguntas que tienen datos disponibles
  const availableQuestions = questions.filter(question => {
    // Verificar si hay datos para esta pregunta específica
    switch (question.type) {
      case QuestionType.SMARTVOC_NPS:
        return smartVOCData?.npsScores?.length > 0 || smartVOCData?.monthlyNPSData?.length > 0;
      case QuestionType.SMARTVOC_VOC:
        return smartVOCData?.vocResponses?.length > 0;
      case QuestionType.SMARTVOC_CSAT:
        return smartVOCData?.csatScores?.length > 0;
      case QuestionType.SMARTVOC_CES:
        return smartVOCData?.cesScores?.length > 0;
      case QuestionType.SMARTVOC_CV:
        return smartVOCData?.cvScores?.length > 0;
      case QuestionType.SMARTVOC_NEV:
        return smartVOCData?.nevScores?.length > 0;
      default:
        return true; // Mostrar todas las preguntas por defecto
    }
  });

  // Eliminar duplicados basados en el tipo de pregunta
  const uniqueQuestions = availableQuestions.filter((question, index, self) =>
    index === self.findIndex(q => q.type === question.type)
  );

  // Función para obtener el título legible de la pregunta
  const getQuestionTitle = (question: SmartVOCQuestion): string => {
    if (question.title && question.title.trim()) {
      return question.title;
    }

    // Fallback basado en el tipo
    switch (question.type) {
      case QuestionType.SMARTVOC_NPS:
        return 'Net Promoter Score (NPS)';
      case QuestionType.SMARTVOC_VOC:
        return 'Voice of Customer (VOC)';
      case QuestionType.SMARTVOC_CSAT:
        return 'Customer Satisfaction (CSAT)';
      case QuestionType.SMARTVOC_CES:
        return 'Customer Effort Score (CES)';
      case QuestionType.SMARTVOC_CV:
        return 'Customer Value (CV)';
      case QuestionType.SMARTVOC_NEV:
        return 'Net Emotional Value (NEV)';
      default:
        return `Pregunta ${question.id}`;
    }
  };

  // Función para obtener el tipo de pregunta legible
  const getQuestionType = (type: string): string => {
    switch (type) {
      case QuestionType.SMARTVOC_NPS:
        return 'Linear Scale question';
      case QuestionType.SMARTVOC_VOC:
        return 'Text question';
      case QuestionType.SMARTVOC_CSAT:
        return 'Stars question';
      case QuestionType.SMARTVOC_CES:
        return 'Linear Scale question';
      case QuestionType.SMARTVOC_CV:
        return 'Linear Scale question';
      case QuestionType.SMARTVOC_NEV:
        return 'Linear Scale question';
      default:
        return 'Question';
    }
  };

  // Función para obtener datos específicos de la pregunta
  const getQuestionData = (question: SmartVOCQuestion) => {
    switch (question.type) {
      case QuestionType.SMARTVOC_NPS:
        const npsScores = smartVOCData?.npsScores || [];
        const maxNpsScore = npsScores.length > 0 ? Math.max(...npsScores) : 10;
        const isScale0to6 = maxNpsScore <= 6;

        let promoters, detractors, neutrals;

        if (isScale0to6) {
          // Escala 0-6: 0-2 detractores, 3 neutral, 4-6 promotores
          promoters = npsScores.filter((score: number) => score >= 4).length;
          detractors = npsScores.filter((score: number) => score <= 2).length;
          neutrals = npsScores.filter((score: number) => score === 3).length;
        } else {
          // Escala 0-10: 0-6 detractores, 7-8 neutral, 9-10 promotores
          promoters = npsScores.filter((score: number) => score >= 9).length;
          detractors = npsScores.filter((score: number) => score <= 6).length;
          neutrals = npsScores.filter((score: number) => score >= 7 && score <= 8).length;
        }
        const npsScore = npsScores.length > 0 ? Math.round(((promoters - detractors) / npsScores.length) * 100) : 0;

        return {
          responses: { count: npsScores.length, timeAgo: '26s' },
          score: npsScore,
          distribution: [
            { label: 'Promoters', percentage: promoters, color: '#10B981' },
            { label: 'Neutrals', percentage: neutrals, color: '#F59E0B' },
            { label: 'Detractors', percentage: detractors, color: '#EF4444' }
          ],
          monthlyData: smartVOCData?.monthlyNPSData || [],
          loyaltyEvolution: {
            promoters,
            promotersTrend: 'up' as const,
            detractors,
            detractorsTrend: 'down' as const,
            neutrals,
            neutralsTrend: 'down' as const,
            changePercentage: 10
          }
        };

      case QuestionType.SMARTVOC_CSAT:
        const csatScores = smartVOCData?.csatScores || [];
        const csatPromoters = Math.round(csatScores.length * 0.7);
        const csatNeutrals = Math.round(csatScores.length * 0.1);
        const csatDetractors = Math.round(csatScores.length * 0.2);
        const averageCSAT = csatScores.length > 0 ? Math.round((csatScores.reduce((a: number, b: number) => a + b, 0) / csatScores.length) * 10) / 10 : 0;

        return {
          responses: { count: csatScores.length, timeAgo: '26s' },
          score: averageCSAT,
          distribution: [
            { label: 'Promoters', percentage: csatPromoters, color: '#10B981' },
            { label: 'Neutrals', percentage: csatNeutrals, color: '#F59E0B' },
            { label: 'Detractors', percentage: csatDetractors, color: '#EF4444' }
          ],
          monthlyData: smartVOCData?.monthlyCSATData || [],
          loyaltyEvolution: {
            promoters: csatPromoters,
            promotersTrend: 'up' as const,
            detractors: csatDetractors,
            detractorsTrend: 'down' as const,
            neutrals: csatNeutrals,
            neutralsTrend: 'down' as const,
            changePercentage: 12
          }
        };

      case QuestionType.SMARTVOC_CES:
        const cesScores = smartVOCData?.cesScores || [];
        const littleEffort = Math.round(cesScores.length * 0.7);
        const neutralsCES = Math.round(cesScores.length * 0.1);
        const muchEffort = Math.round(cesScores.length * 0.2);
        const averageCES = cesScores.length > 0 ? Math.round((cesScores.reduce((a: number, b: number) => a + b, 0) / cesScores.length) * 10) / 10 : 0;

        return {
          responses: { count: cesScores.length, timeAgo: '28s' },
          score: averageCES,
          distribution: [
            { label: 'Little effort', percentage: littleEffort, color: '#10B981' },
            { label: 'Neutrals', percentage: neutralsCES, color: '#F59E0B' },
            { label: 'Much effort', percentage: muchEffort, color: '#EF4444' }
          ],
          monthlyData: smartVOCData?.monthlyCESData || [],
          loyaltyEvolution: {
            promoters: littleEffort,
            promotersTrend: 'up' as const,
            detractors: muchEffort,
            detractorsTrend: 'down' as const,
            neutrals: neutralsCES,
            neutralsTrend: 'down' as const,
            changePercentage: 8
          }
        };

      case QuestionType.SMARTVOC_CV:
        const cvScores = smartVOCData?.cvScores || [];
        const worth = Math.round(cvScores.length * 0.7);
        const neutralsCV = Math.round(cvScores.length * 0.1);
        const worthless = Math.round(cvScores.length * 0.2);
        const averageCV = cvScores.length > 0 ? Math.round((cvScores.reduce((a: number, b: number) => a + b, 0) / cvScores.length) * 10) / 10 : 0;

        return {
          responses: { count: cvScores.length, timeAgo: '20s' },
          score: averageCV,
          distribution: [
            { label: 'Worth', percentage: worth, color: '#10B981' },
            { label: 'Neutrals', percentage: neutralsCV, color: '#F59E0B' },
            { label: 'Worthless', percentage: worthless, color: '#EF4444' }
          ],
          monthlyData: smartVOCData?.monthlyCVData || [],
          loyaltyEvolution: {
            promoters: worth,
            promotersTrend: 'up' as const,
            detractors: worthless,
            detractorsTrend: 'down' as const,
            neutrals: neutralsCV,
            neutralsTrend: 'down' as const,
            changePercentage: 14
          }
        };

      case QuestionType.SMARTVOC_NEV:
        const nevScores = smartVOCData?.nevScores || [];
        const positive = Math.round(nevScores.length * 0.7);
        const neutralNEV = Math.round(nevScores.length * 0.2);
        const negative = Math.round(nevScores.length * 0.1);
        const averageNEV = nevScores.length > 0 ? Math.round((nevScores.reduce((a: number, b: number) => a + b, 0) / nevScores.length) * 10) / 10 : 0;

        return {
          responses: { count: nevScores.length, timeAgo: '26s' },
          score: averageNEV,
          distribution: [
            { label: 'Positive', percentage: positive, color: '#10B981' },
            { label: 'Neutral', percentage: neutralNEV, color: '#F59E0B' },
            { label: 'Negative', percentage: negative, color: '#EF4444' }
          ],
          monthlyData: smartVOCData?.monthlyNEVData || [],
          loyaltyEvolution: {
            promoters: positive,
            promotersTrend: 'up' as const,
            detractors: negative,
            detractorsTrend: 'down' as const,
            neutrals: neutralNEV,
            neutralsTrend: 'down' as const,
            changePercentage: 11
          }
        };

      case QuestionType.SMARTVOC_VOC:
        const vocResponses = smartVOCData?.vocResponses || [];
        const positiveResponses = Math.round(vocResponses.length * 0.6);
        const neutralVOC = Math.round(vocResponses.length * 0.3);
        const negativeResponses = Math.round(vocResponses.length * 0.1);

        return {
          responses: { count: vocResponses.length, timeAgo: '26s' },
          score: vocResponses.length,
          distribution: [
            { label: 'Positive', percentage: positiveResponses, color: '#10B981' },
            { label: 'Neutral', percentage: neutralVOC, color: '#F59E0B' },
            { label: 'Negative', percentage: negativeResponses, color: '#EF4444' }
          ],
          monthlyData: smartVOCData?.monthlyVOCData || [],
          loyaltyEvolution: {
            promoters: positiveResponses,
            promotersTrend: 'up' as const,
            detractors: negativeResponses,
            detractorsTrend: 'down' as const,
            neutrals: neutralVOC,
            neutralsTrend: 'down' as const,
            changePercentage: 10
          }
        };

      default:
        return {
          responses: { count: 0, timeAgo: '26s' },
          score: 0,
          distribution: [],
          monthlyData: [],
          loyaltyEvolution: {
            promoters: 0,
            promotersTrend: 'up' as const,
            detractors: 0,
            detractorsTrend: 'down' as const,
            neutrals: 0,
            neutralsTrend: 'down' as const,
            changePercentage: 0
          }
        };
    }
  };

  // Seleccionar la primera pregunta por defecto si no hay ninguna seleccionada
  React.useEffect(() => {
    if (!selectedQuestion && uniqueQuestions.length > 0) {
      setSelectedQuestion(uniqueQuestions[0]);
    }
  }, [uniqueQuestions, selectedQuestion]);

  if (uniqueQuestions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No hay preguntas SmartVOC disponibles con datos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
    </div>
  );
};

export default QuestionSelector;
