interface QuestionConfig {
  id: string;
  type: string;
  title: string;
  description: string;
  instructions?: string;
}

export const DEFAULT_QUESTIONS: QuestionConfig[] = [
  {
    id: 'smartvoc_nps',
    type: 'SMARTVOC_NPS',
    title: 'Net Promoter Score (NPS)',
    description: 'On a scale from 0-10, how likely are you to recommend [company] to a friend or colleague?'
  },
  {
    id: 'smartvoc_voc',
    type: 'SMARTVOC_VOC',
    title: 'Voice of Customer (VOC)',
    description: 'Please share your thoughts about your experience with our service.'
  },
  {
    id: 'smartvoc_csat',
    type: 'SMARTVOC_CSAT',
    title: 'Customer Satisfaction (CSAT)',
    description: 'How would you rate your overall satisfaction level with our service?'
  },
  {
    id: 'smartvoc_ces',
    type: 'SMARTVOC_CES',
    title: 'Customer Effort Score (CES)',
    description: 'How much effort did you personally have to put forth to handle your request?'
  },
  {
    id: 'smartvoc_cv',
    type: 'SMARTVOC_CV',
    title: 'Customer Value (CV)',
    description: 'How would you rate the overall value you receive from our product/service?'
  },
  {
    id: 'smartvoc_nev',
    type: 'SMARTVOC_NEV',
    title: 'Net Emotional Value (NEV)',
    description: 'How do you feel about your experience with our service?',
    instructions: 'Please select up to 3 options from these 20 emotional moods'
  }
];

export const ALL_EMOTIONS = [
  'Feliz', 'Satisfecho', 'Confiado', 'Valorado', 'Cuidado', 'Seguro', 
  'Enfocado', 'Indulgente', 'Estimulado', 'Exploratorio', 'Interesado', 'Enérgico',
  'Descontento', 'Frustrado', 'Irritado', 'Decepción', 'Estresado', 'Infeliz', 
  'Desatendido', 'Apresurado'
] as const;

export const POSITIVE_EMOTIONS = [
  'Feliz', 'Satisfecho', 'Confiado', 'Valorado', 'Cuidado', 'Seguro', 
  'Enfocado', 'Indulgente', 'Estimulado', 'Exploratorio', 'Interesado', 'Enérgico'
] as const;

export const NEGATIVE_EMOTIONS = [
  'Descontento', 'Frustrado', 'Irritado', 'Decepción', 'Estresado', 'Infeliz', 
  'Desatendido', 'Apresurado'
] as const;

export const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'] as const;

