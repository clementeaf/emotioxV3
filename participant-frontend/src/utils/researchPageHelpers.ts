import type { ModuleStructure, ModuleComponent } from '../types/module';
import type { Module, ResearchData } from '../services/public.service';
import { getComponentText } from './moduleComponent';
import { resolveScreenerChoiceOptions, resolveScreenerTitleComponent } from './screenerParticipant';

/**
 * Checks whether a value is a plain object record.
 */
export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Extracts a boolean-only map from an unknown value.
 */
const toBooleanRecord = (value: unknown): Record<string, boolean> => {
  if (!isRecord(value)) return {};
  const result: Record<string, boolean> = {};
  Object.entries(value).forEach(([key, entryValue]) => {
    if (typeof entryValue === 'boolean') {
      result[key] = entryValue;
    }
  });
  return result;
};

/**
 * Determines whether a module is hidden for participants based on module.config.hidden.
 */
export const isModuleHidden = (module: Module): boolean => {
  const cfg: unknown = module.config;
  if (!isRecord(cfg)) return false;
  const hidden = cfg.hidden;
  return hidden === true;
};

/**
 * Checks whether a file-upload component has at least one valid image (with s3Key or url).
 */
const hasValidFileUpload = (components: ModuleComponent[]): boolean => {
  const fileUploadComponent = components.find(c => c.type === 'file-upload');
  if (!fileUploadComponent) return false;

  if (fileUploadComponent.value) {
    try {
      const parsed = typeof fileUploadComponent.value === 'string'
        ? JSON.parse(fileUploadComponent.value)
        : fileUploadComponent.value;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasValidImage = parsed.some((img: unknown) => {
          if (typeof img === 'object' && img !== null) {
            const imgObj = img as { s3Key?: string; url?: string };
            return Boolean(imgObj.s3Key || imgObj.url);
          }
          return false;
        });
        return hasValidImage;
      }
    } catch {
      // Invalid JSON, consider not configured
    }
  }
  return false;
};

/**
 * Determines whether a module has been configured with content from research-frontend.
 * Modules that only have default template values are considered not configured.
 */
export const isModuleConfigured = (module: Module): boolean => {
  // Welcome and Thank You screens are always considered configured if they exist
  if (module.name === 'Welcome Screen' || module.name === 'Thank You Screen' || module.name === 'Thank you screen') {
    return true;
  }

  // Research Configuration is not shown to participants
  if (module.name === 'Research Configuration') {
    return false;
  }

  const components = module.structure?.components || [];

  // For Navigation Flow: requires file-upload component with images
  if (module.name === 'Navigation Flow') {
    return hasValidFileUpload(components);
  }

  // For Preference Test: requires file-upload component with images
  if (module.name === 'Preference Test') {
    return hasValidFileUpload(components);
  }

  // For Ranking: requires items component with items configured
  if (module.name === 'Ranking') {
    const itemsComponent = components.find(c =>
      c.id === 'items' || (c.id === 'ranking-slider' && c.type === 'select')
    );
    if (!itemsComponent) return false;

    // Check if items component has value with actual items
    if (itemsComponent.value) {
      try {
        const parsed = typeof itemsComponent.value === 'string'
          ? JSON.parse(itemsComponent.value)
          : itemsComponent.value;
        // Value can be an array directly or an object { items: [...] }
        const itemsArray = Array.isArray(parsed) ? parsed
          : (parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items))
            ? (parsed as { items: unknown[] }).items
            : null;
        if (itemsArray && itemsArray.length > 0) {
          // Check if items have labels (not just default template values)
          const hasConfiguredItems = itemsArray.some((item: unknown) => {
            if (typeof item === 'object' && item !== null) {
              const itemObj = item as { label?: string; id?: string };
              return Boolean(itemObj.label && itemObj.label.trim() && itemObj.label !== 'Item 1' && itemObj.label !== 'Item 2' && itemObj.label !== 'Item 3');
            }
            return false;
          });
          return hasConfiguredItems;
        }
      } catch {
        // Invalid JSON, check if it's a string with content
        if (typeof itemsComponent.value === 'string' && itemsComponent.value.trim().length > 0) {
          return true;
        }
      }
    }
    return false;
  }

  // For other Cognitive Tasks: require at least title or description configured
  const cognitiveTaskNames = ['Short Text', 'Long Text', 'Single Choice', 'Multiple Choice', 'Linear Scale'];
  if (cognitiveTaskNames.includes(module.name)) {
    const titleComponent = components.find(c => c.id.includes('title') || c.id.includes('question-title'));
    const descriptionComponent = components.find(c => c.id.includes('description') || c.id.includes('question-description'));

    // Check if title has configured value (not just empty or default)
    const hasTitle: boolean = Boolean(
      titleComponent &&
      titleComponent.value &&
      typeof titleComponent.value === 'string' &&
      titleComponent.value.trim().length > 0
    );

    // Check if description has configured value
    const hasDescription: boolean = Boolean(
      descriptionComponent &&
      descriptionComponent.value &&
      typeof descriptionComponent.value === 'string' &&
      descriptionComponent.value.trim().length > 0
    );

    // For choice questions, also check if choices are configured
    if (module.name === 'Single Choice' || module.name === 'Multiple Choice') {
      const choiceComponents = components.filter(c => c.settings?.isChoice || c.id.includes('choice-'));
      const hasConfiguredChoices = choiceComponents.some((c): boolean => {
        const text = getComponentText(c);
        return Boolean(text && text.trim().length > 0);
      });
      return hasTitle || hasDescription || hasConfiguredChoices;
    }

    return hasTitle || hasDescription;
  }

  // For SmartVOC modules, always consider configured if they exist
  // (they typically have default configurations)
  const smartVOCNames = ['CSAT', 'NPS', 'CES', 'CV', 'NEV', 'VOC'];
  if (smartVOCNames.some(name => module.name.includes(name))) {
    return true;
  }

  // Screener: configured if it has question text AND at least one choice with a label
  if (module.name === 'Screener') {
    const sorted = [...components].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const titleComp = resolveScreenerTitleComponent(sorted);
    const hasQuestion = Boolean(getComponentText(titleComp)?.trim());
    const choices = resolveScreenerChoiceOptions(components);
    const hasLabeledChoices = choices.some(c => c.label.trim().length > 0);
    return hasQuestion && hasLabeledChoices;
  }

  // Implicit Association modules: configured if they have at least one target
  const iatNames = ['Attribute Testing', 'Comparing Attribute', 'Objects Comparing', 'Object Comparing'];
  if (iatNames.some(name => module.name.includes(name))) {
    const hasTarget = components.some(c =>
      (c.id.startsWith('target-') && c.id.endsWith('-name') && getComponentText(c)) ||
      (c.id.startsWith('object-') && c.id.endsWith('-name') && getComponentText(c))
    );
    return hasTarget;
  }

  // Eye Tracking: configured if it has a stimulus image
  if (module.name === 'Eye Tracking' || module.name.toLowerCase().includes('eye tracking')) {
    const hasStimulus = components.some(c =>
      c.type === 'file-upload' || c.id === 'stimulus-image' || c.id === 'image' || c.id === 'stimulus'
    );
    if (!hasStimulus) return false;
    const fileComp = components.find(c =>
      c.type === 'file-upload' || c.id === 'stimulus-image' || c.id === 'image' || c.id === 'stimulus'
    );
    return Boolean(fileComp && getComponentText(fileComp));
  }

  // Default: consider configured if module exists
  // (for unknown module types, show them to avoid breaking the flow)
  return true;
};

/**
 * Finds linkConfig within the "Research Configuration" module, if present.
 */
export const getLinkConfig = (research: ResearchData): Record<string, boolean> => {
  const stages = research.stages || [{ id: 'legacy', name: 'Legacy', description: '', order_index: 0, modules: research.modules || [] }];
  for (const stage of stages) {
    for (const module of stage.modules || []) {
      if (module.name !== 'Research Configuration') continue;
      const linkConfigValue: unknown = isRecord(module.config) ? module.config.linkConfig : undefined;
      return toBooleanRecord(linkConfigValue);
    }
  }
  return {};
};

/**
 * Finds backlinks within the "Research Configuration" module, if present.
 */
export const getBacklinks = (research: ResearchData): Record<string, string> => {
  const stages = research.stages || [{ id: 'legacy', name: 'Legacy', description: '', order_index: 0, modules: research.modules || [] }];
  for (const stage of stages) {
    for (const module of stage.modules || []) {
      if (module.name !== 'Research Configuration') continue;
      const config = module.config;
      if (isRecord(config) && isRecord(config.backlinks)) {
        const backlinks: Record<string, string> = {};
        Object.entries(config.backlinks).forEach(([key, value]) => {
          if (typeof value === 'string' && value.trim().length > 0) {
            backlinks[key] = value;
          }
        });
        return backlinks;
      }
    }
  }
  return {};
};

/**
 * Finds demographics configuration, if present.
 */
export const getDemographicsConfig = (research: ResearchData): Record<string, unknown> | null => {
  const stages = research.stages || [{ id: 'legacy', name: 'Legacy', description: '', order_index: 0, modules: research.modules || [] }];
  for (const stage of stages) {
    for (const module of stage.modules || []) {
      if (module.name !== 'Research Configuration') continue;
      const config = module.config;
      if (isRecord(config) && isRecord(config.demographics)) {
        return config.demographics;
      }
    }
  }
  return null;
};

/**
 * Extracts study logo config from Research Configuration module.
 * Returns { enabled, s3Key } or null if not configured.
 */
export const getStudyLogo = (research: ResearchData): { enabled: boolean; s3Key?: string } | null => {
  const stages = research.stages || [{ id: 'legacy', name: 'Legacy', description: '', order_index: 0, modules: research.modules || [] }];
  for (const stage of stages) {
    for (const module of stage.modules || []) {
      if (module.name !== 'Research Configuration') continue;
      const config = module.config;
      if (isRecord(config) && isRecord(config.studyLogo)) {
        const logo = config.studyLogo;
        return {
          enabled: typeof logo.enabled === 'boolean' ? logo.enabled : true,
          s3Key: typeof logo.s3Key === 'string' ? logo.s3Key : undefined,
        };
      }
    }
  }
  return null;
};

/**
 * Converts a backend module name to a stable stepId used by the participant flow.
 */
export const getStepIdFromModuleName = (moduleName: string): string | null => {
  const trimmed = moduleName.trim();

  if (trimmed === 'Research Configuration') return null;
  if (trimmed === 'Demographics') return 'demographics';

  // Welcome / Thank you screens
  if (trimmed === 'Welcome Screen') return 'welcome';
  if (trimmed === 'Thank You Screen' || trimmed === 'Thank you screen') return 'thank-you';

  // Cognitive tasks
  if (trimmed === 'Short Text') return 'short-text';
  if (trimmed === 'Long Text') return 'long-text';
  if (trimmed === 'Single Choice') return 'single-choice';
  if (trimmed === 'Multiple Choice') return 'multiple-choice';
  if (trimmed === 'Linear Scale') return 'linear-scale';
  if (trimmed === 'Ranking') return 'ranking';
  if (trimmed === 'Navigation Flow') return 'navigation-flow';
  if (trimmed === 'Preference Test') return 'preference-test';

  // SmartVOC
  if (trimmed.includes('CSAT')) return 'csat';
  if (trimmed.includes('NPS')) return 'nps';
  if (trimmed.includes('CES')) return 'ces';
  if (trimmed.includes('CV')) return 'cv';
  if (trimmed.includes('NEV')) return 'nev';
  if (trimmed.includes('VOC')) return 'voc';

  // Screener
  if (trimmed === 'Screener') return 'screener';

  // Implicit Association (individual module names within the stage)
  if (trimmed.includes('Attribute Testing')) return 'attribute-testing';
  if (trimmed.includes('Comparing Attribute')) return 'comparing-attribute';
  if (trimmed.includes('Objects Comparing') || trimmed.includes('Object Comparing')) return 'objects-comparing';

  // Eye Tracking
  if (trimmed === 'Eye Tracking') return 'eye-tracking';

  return trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Normalizes a module from backend format to Module format.
 * Backend returns: { id, name, description, config: {...}, structure: { components: [...] } }
 * Frontend expects: { id, name, description, structure: { components: [...] } }
 */
export const normalizeModule = (module: unknown): Module => {
  if (!isRecord(module)) {
    throw new Error('Invalid module format');
  }

  const moduleId = typeof module.id === 'string' ? module.id : '';
  const moduleName = typeof module.name === 'string' ? module.name : '';
  const moduleDescription = typeof module.description === 'string' ? module.description : '';

  // Extract structure - backend already provides it in structure field
  let structure: ModuleStructure = { components: [] };

  // First try: structure field (backend already extracts it)
  if (isRecord(module.structure) && Array.isArray(module.structure.components)) {
    structure = { components: module.structure.components as ModuleComponent[] };
  }
  // Fallback: config.structure.components (legacy or if backend didn't extract)
  else if (isRecord(module.config)) {
    if (isRecord(module.config.structure) && Array.isArray(module.config.structure.components)) {
      structure = { components: module.config.structure.components as ModuleComponent[] };
    }
    // Legacy format: config.components
    else if (Array.isArray(module.config.components)) {
      structure = { components: module.config.components as ModuleComponent[] };
    }
  }

  return {
    id: moduleId,
    name: moduleName,
    description: moduleDescription,
    structure: structure,
    config: isRecord(module.config) ? module.config : {}
  };
};
