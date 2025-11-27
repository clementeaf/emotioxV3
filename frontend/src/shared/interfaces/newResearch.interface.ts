/**
 * Interfaz para representar los datos recogidos por el formulario de creación de nuevas investigaciones
 * Esta interfaz refleja los tres pasos del formulario y la estructura exacta de datos que se envía al backend
 */

import { ResearchType } from './research.model';

/**
 * Interfaz principal para una nueva investigación
 * Contiene los datos recogidos en los 3 pasos del formulario
 */
export interface NewResearch {
  /**
   * Nombre de la investigación (Paso 1)
   * Mínimo 3 caracteres
   */
  name: string;
  
  /**
   * Empresa o cliente para el que se realiza la investigación (Paso 1)
   */
  enterprise: string;
  
  /**
   * Tipo de investigación seleccionado (Paso 2)
   * Por defecto: ResearchType.EYE_TRACKING
   */
  type: ResearchType;
  
  /**
   * Técnica de investigación elegida (Paso 3)
   * Valores posibles: 'biometric' | 'aim-framework'
   */
  technique: string;
  
  /**
   * Descripción de la investigación
   * Este campo se inicializa vacío
   */
  description: string;
  
  /**
   * Número objetivo de participantes
   * Por defecto: 100
   */
  targetParticipants: number;
  
  /**
   * Objetivos de la investigación
   * Se inicializa como un array vacío
   */
  objectives: string[];
  
  /**
   * Etiquetas para clasificar la investigación
   * Se inicializa como un array vacío
   */
  tags: string[];
}

/**
 * Valores por defecto para una nueva investigación
 */
export const DEFAULT_NEW_RESEARCH: Partial<NewResearch> = {
  type: ResearchType.EYE_TRACKING,
  technique: 'aim-framework',
  description: '',
  targetParticipants: 100,
  objectives: [],
  tags: []
};

/**
 * Estructura de los pasos del formulario para referencia
 */
export const FORM_STEPS = {
  paso1: {
    titulo: 'Name the Research',
    descripcion: 'Please, name the research project and assign it to an existing client or create a new one',
    campos: ['name', 'enterprise']
  },
  paso2: {
    titulo: 'Kind of research',
    descripcion: 'Select the type of research you wish to carry out',
    campos: ['type']
  },
  paso3: {
    titulo: 'Techniques for Behavioural Research',
    descripcion: 'Please, select the configuration for this research',
    campos: ['technique']
  }
}; 