import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Module } from '../services/public.service';
import { getComponentText } from '../utils/moduleComponent';

export const useButtonConfig = () => {
  const { t } = useTranslation();

  const isStartButtonComponent = useCallback((component: { id?: string; label?: string; name?: string }): boolean => {
    const id = component.id?.toLowerCase() || '';
    const label = component.label?.toLowerCase() || '';
    const name = component.name?.toLowerCase() || '';

    // Check by ID (exact match or contains)
    if (id === 'start_button_text' ||
      id === 'start-button-text' ||
      id.includes('start_button_text') ||
      id.includes('start-button-text')) {
      return true;
    }

    // Check by label/name (more flexible matching)
    if (label.includes('start button') ||
      name.includes('start button') ||
      label === 'start button text' ||
      name === 'start button text') {
      return true;
    }

    return false;
  }, []);

  const getButtonText = useCallback((module: Module | undefined): string => {
    if (!module) {
      return t('common.saveAndContinue');
    }

    // For Welcome Screen, use the start_button_text component value
    if (module.name === 'Welcome Screen') {
      const startButtonComponent = module.structure?.components?.find((comp) => isStartButtonComponent(comp));

      if (startButtonComponent) {
        let buttonText = getComponentText(startButtonComponent);

        // If getComponentText doesn't return a value, try other sources
        if (!buttonText || buttonText.trim().length === 0) {
          if (typeof startButtonComponent.value === 'string' && startButtonComponent.value.trim().length > 0) {
            buttonText = startButtonComponent.value;
          } else if (typeof startButtonComponent.defaultValue === 'string' && startButtonComponent.defaultValue.trim().length > 0) {
            buttonText = startButtonComponent.defaultValue;
          } else if (typeof startButtonComponent.settings?.defaultValue === 'string' && startButtonComponent.settings.defaultValue.trim().length > 0) {
            buttonText = startButtonComponent.settings.defaultValue;
          }
        }

        if (buttonText && buttonText.trim().length > 0) {
          return buttonText;
        }
      }
    }

    // Default text
    return t('common.saveAndContinue');
  }, [isStartButtonComponent, t]);

  const shouldShowButton = useCallback((module: Module | undefined): boolean => {
    if (!module) {
      return true; // Default: show button
    }

    const moduleName = module.name || '';

    // SmartVOC scale modules (CSAT, CES, CV, NPS) — auto-advance, no button
    if (
      moduleName.includes('CSAT') ||
      moduleName.includes('CES') ||
      moduleName.includes('CV') ||
      moduleName.includes('NPS')
    ) {
      return false;
    }

    // Navigation Flow - internal completion handling
    if (moduleName === 'Navigation Flow') {
      return false;
    }

    // Implicit Association - internal trial engine handles advancement
    if (moduleName.includes('Attribute Testing') ||
        moduleName.includes('Comparing Attribute') ||
        moduleName.includes('Objects Comparing') ||
        moduleName.includes('Object Comparing')) {
      return false;
    }

    // Eye Tracking - internal timer handles advancement
    if (moduleName === 'Eye Tracking' || moduleName.toLowerCase().includes('eye tracking')) {
      return false;
    }

    // NEV - uses parent footer button (no auto-advance)
    // (removed from exclusion list so parent button shows)

    // Preference Test - uses parent footer button (no internal Continue)
    // (removed from exclusion list so parent button shows)

    // Single Choice - uses parent footer button (no internal Continue)
    // (removed from exclusion list so parent button shows)

    // Thank You Screen - final step, no button needed
    if (moduleName === 'Thank You Screen' || moduleName === 'Thank you screen') {
      return false;
    }

    // Show button for Multiple Choice and other modules that require explicit confirmation
    return true;
  }, []);

  return { isStartButtonComponent, getButtonText, shouldShowButton };
};
