import { useCallback, useRef, startTransition } from 'react';
import { useLogger } from '../utils/logger';
import { QuestionConfig } from './useQuestionInitialization';

interface UseQuestionHandlersProps {
  questionType: string;
  config?: QuestionConfig;
  value: unknown;
  setValue: (value: unknown) => void;
  onSave: (data: Record<string, unknown>) => void;
  onAutoAdvance?: (selections: unknown[]) => void;
  isAdvancing: boolean;
}

export const useQuestionHandlers = ({
  questionType,
  config,
  value,
  setValue,
  onSave,
  onAutoAdvance,
  isAdvancing
}: UseQuestionHandlersProps) => {
  const { debug, info, warn } = useLogger('QuestionHandlers');
  const isProcessingRef = useRef(false);

  // 🎯 HANDLER PRINCIPAL QUE DECIDE QUÉ LÓGICA USAR
  const handleChange = useCallback((newValue: unknown) => {
    if (isAdvancing) {
      warn('Auto-avance en progreso, ignorando selección');
      return;
    }
    
    if (isProcessingRef.current) {
      debug('Ya procesando cambio, ignorando llamada duplicada');
      return;
    }
    
    isProcessingRef.current = true;

    const isMultipleEmotionSelection = 
      (questionType === 'emojis' || questionType === 'detailed') && 
      config?.maxSelections && 
      config.maxSelections > 1;

    if (isMultipleEmotionSelection) {
      // 🎯 LÓGICA DE SELECCIÓN MÚLTIPLE CON AUTO-AVANCE
      const currentSelections = Array.isArray(value) ? value : [];
      let updatedSelections: unknown[];

      if (currentSelections.includes(newValue)) {
        // Deseleccionar
        updatedSelections = currentSelections.filter(item => item !== newValue);
        debug('Deseleccionando', { value: newValue, updatedSelections });
      } else {
        // Seleccionar (si no se ha alcanzado el límite)
        if (currentSelections.length < config.maxSelections!) {
          updatedSelections = [...currentSelections, newValue];
          info('Seleccionando', {
            value: newValue,
            progress: `${updatedSelections.length}/${config.maxSelections}`
          });
        } else {
          warn('Límite máximo alcanzado');
          isProcessingRef.current = false;
          return;
        }
      }

      // Actualizar estado INMEDIATAMENTE para UX responsiva
      setValue(updatedSelections);
      
      const dataToSave = {
        selectedValue: updatedSelections,
        value: updatedSelections
      };
      
      // Diferir solo las operaciones del store
      setTimeout(() => {
        onSave(dataToSave);
        
        // Auto-avance si está configurado Y se alcanzó el máximo
        if (onAutoAdvance && updatedSelections.length === config.maxSelections) {
          info('Activando auto-avance', {
            selectionsCount: updatedSelections.length,
            maxSelections: config.maxSelections
          });
          
          setTimeout(() => {
            startTransition(() => {
              onAutoAdvance(updatedSelections);
            });
          }, 50);
        }
        
        // Resetear flag después de procesar
        isProcessingRef.current = false;
      }, 0);
    } else {
      // 🎯 LÓGICA SIMPLE PARA OTROS TIPOS DE PREGUNTA
      // Actualizar estado INMEDIATAMENTE para UX responsiva
      setValue(newValue);
      debug('Valor simple', { value: newValue, questionType });

      const dataToSave = {
        selectedValue: newValue,
        value: newValue
      };
      
      // 🎯 DEBUG: Log para linear_scale
      if (questionType === 'linear_scale') {
        console.log('[useQuestionHandlers] Guardando linear_scale:', {
          newValue,
          dataToSave,
          questionType,
          onSave: typeof onSave
        });
      }
      
      // 🎯 Guardar inmediatamente (saveToStore ahora es síncrono)
      try {
        onSave(dataToSave);
        
        // 🎯 DEBUG: Verificar que se guardó
        if (questionType === 'linear_scale') {
          console.log('[useQuestionHandlers] onSave llamado para linear_scale');
        }
      } catch (error) {
        console.error('[useQuestionHandlers] Error al guardar:', error);
      }
      
      // Resetear flag después de procesar
      isProcessingRef.current = false;
    }
  }, [
    isAdvancing,
    questionType,
    config?.maxSelections,
    value,
    setValue,
    onSave,
    onAutoAdvance,
    debug,
    info,
    warn
  ]);

  return {
    handleChange
  };
};