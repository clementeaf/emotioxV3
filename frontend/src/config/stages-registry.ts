// Unified Stage Registry - Single source of truth for all stage configuration
// To add a new stage, just add it to STAGE_REGISTRY and that's it!

import React from 'react';

export interface UnifiedStageConfig {
  id: string;
  title: string;
  displayTitle: string;
  component: string;
  containerStyles?: React.CSSProperties;
  props?: Record<string, unknown>;
}

// ✨ SINGLE PLACE TO ADD NEW STAGES ✨
// Just add your new stage here and everything else is automatic!
export const STAGE_REGISTRY: Record<string, UnifiedStageConfig> = {
  // ========== BUILD STAGES ==========
  'screener': {
    id: 'screener',
    title: 'Screener',
    displayTitle: 'Configuración de Screener',
    component: 'PlaceholderCard' // ❌ ELIMINADO: ScreenerForm - componente no existe
  },
  'welcome-screen': {
    id: 'welcome-screen',
    title: 'Welcome Screen',
    displayTitle: 'Configuración de pantalla de bienvenida',
    component: 'WelcomeScreenForm'
  },
  'implicit-association': {
    id: 'implicit-association',
    title: 'Implicit Association',
    displayTitle: 'Configuración de Asociación Implícita',
    component: 'ImplicitAssociationForm'
  },
  'smart-voc': {
    id: 'smart-voc',
    title: 'Smart VOC',
    displayTitle: 'Configuración de Smart VOC',
    component: 'SmartVOCForm'
  },
  'cognitive': {
    id: 'cognitive',
    title: 'Cognitive Tasks',
    displayTitle: 'Configuración de tareas cognitivas',
    component: 'CognitiveTaskForm'
  },
  'thank-you': {
    id: 'thank-you',
    title: 'Thank You Screen',
    displayTitle: 'Configuración de pantalla de agradecimiento',
    component: 'ThankYouScreenForm'
  },

  // ========== RECRUIT STAGES ==========
  'eye-tracking': {
    id: 'eye-tracking',
    title: 'Eye Tracking',
    displayTitle: 'Configuración de seguimiento ocular',
    component: 'SimpleEyeTrackingForm'
  },
  'eye-tracking-recruit': {
    id: 'eye-tracking-recruit',
    title: 'Configuración de estudio',
    displayTitle: 'Configuración de estudio',
    component: 'RecruitEyeTrackingForm'
  },
  'configuration': {
    id: 'configuration',
    title: 'Configuration',
    displayTitle: 'Configuración del Reclutamiento',
    component: 'PlaceholderCard',
    props: {
      title: 'Configuración',
      description: 'La configuración de reclutamiento estará disponible pronto.',
      variant: 'coming-soon'
    }
  },
  'participants': {
    id: 'participants',
    title: 'Participants',
    displayTitle: 'Gestión de Participantes',
    component: 'PlaceholderCard',
    props: {
      title: 'Gestión de Participantes',
      description: 'La gestión de participantes estará disponible pronto.',
      variant: 'coming-soon'
    }
  },

  // ========== RESULTS STAGES ==========
  'resume': {
    id: 'resume',
    title: 'Resume',
    displayTitle: 'Resumen de Resultados',
    component: 'ResumeForm'
  },
  'implicit-association-results': {
    id: 'implicit-association-results',
    title: 'Implicit Association',
    displayTitle: 'Resultados de Asociación Implícita',
    component: 'ImplicitAssociationResults'
  },
  'smart-voc-results': {
    id: 'smart-voc-results',
    title: 'SmartVOC',
    displayTitle: 'Resultados de SmartVOC',
    component: 'SmartVOCResults'
  },
  'cognitive-task-results': {
    id: 'cognitive-task-results',
    title: 'Cognitive Task',
    displayTitle: 'Resultados de Tareas Cognitivas',
    component: 'CognitiveTaskResults'
  },

  // ========== RESEARCH STATUS ==========
  'research-in-progress': {
    id: 'research-in-progress',
    title: 'Investigación en curso',
    displayTitle: 'Investigación en curso',
    component: 'ResearchInProgressPage',
    props: { standalone: true }
  },

  // ========== DEFAULT ==========
  'default': {
    id: 'default',
    title: 'Default',
    displayTitle: 'Configuración de investigación',
    component: 'PlaceholderCard',
    props: {
      title: 'Configuración de Investigación',
      description: 'La configuración de investigación estará disponible pronto.',
      variant: 'coming-soon'
    }
  },

  // ========== DEVELOPMENT STAGES ==========
  'test-common': {
    id: 'test-common',
    title: 'Test Common',
    displayTitle: 'Test Common Components',
    component: 'TestCommonPage'
  }
};

// Auto-generated exports from STAGE_REGISTRY
export const BUILD_STAGES = Object.fromEntries(
  Object.entries(STAGE_REGISTRY)
    .filter(([key]) => ['screener', 'welcome-screen', 'implicit-association', 'smart-voc', 'cognitive', 'eye-tracking', 'thank-you'].includes(key))
    .map(([key, stage]) => [key, { id: stage.id, title: stage.title }])
);

export const STAGE_TITLES = Object.fromEntries(
  Object.entries(STAGE_REGISTRY).map(([key, stage]) => [key, stage.displayTitle])
);

export const STAGE_COMPONENTS = Object.fromEntries(
  Object.entries(STAGE_REGISTRY).map(([key, stage]) => [
    key,
    {
      component: stage.component,
      props: stage.props,
      containerStyles: stage.containerStyles
    }
  ])
);

// Helper function to get a stage by ID
export const getStageById = (id: string): UnifiedStageConfig | undefined => {
  return STAGE_REGISTRY[id];
};

// Helper function to get stages by category
export const getStagesByCategory = (category: 'build' | 'recruit' | 'results' | 'status'): UnifiedStageConfig[] => {
  const categoryRanges = {
    build: ['screener', 'welcome-screen', 'implicit-association', 'smart-voc', 'cognitive', 'eye-tracking', 'thank-you'],
    recruit: ['eye-tracking-recruit', 'configuration', 'participants'],
    results: ['resume', 'smart-voc-results', 'cognitive-task-results'],
    status: ['research-in-progress']
  };

  return categoryRanges[category]
    ?.map(id => STAGE_REGISTRY[id])
    .filter(Boolean) || [];
};