/**
 * Utilidades compartidas para componentes de emociones
 */

/**
 * Maneja la lógica de selección de emociones
 */
export const handleEmotionClick = (
  emotionId: string,
  selectedEmotions: string[],
  maxSelections: number,
  onEmotionSelect?: (emotionId: string) => void
) => {
  if (!onEmotionSelect) return;

  if (selectedEmotions.includes(emotionId)) {
    // Deseleccionar
    onEmotionSelect(emotionId);
  } else if (selectedEmotions.length < maxSelections) {
    // Seleccionar
    onEmotionSelect(emotionId);
  }
};

/**
 * Genera clases CSS para botones de emociones
 */
export const getEmotionButtonClasses = (
  isSelected: boolean,
  isDisabled: boolean,
  baseClasses: string = ''
) => {
  if (isSelected) {
    return `${baseClasses} border-blue-500 bg-blue-50 text-blue-800 shadow-md`;
  }
  
  if (isDisabled) {
    return `${baseClasses} border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed`;
  }
  
  return `${baseClasses} border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm`;
};

/**
 * Genera clases CSS para botones de clusters
 */
export const getClusterButtonClasses = (
  clusterId: string,
  selectedCluster: string | undefined,
  baseClasses: string = ''
) => {
  const isSelected = selectedCluster === clusterId;
  
  switch (clusterId) {
    case 'advocacy':
      return isSelected
        ? `${baseClasses} border-green-500 bg-green-50 shadow-lg scale-105`
        : `${baseClasses} border-green-200 bg-green-50 hover:border-green-300 hover:shadow-md`;
    
    case 'recommendation':
      return isSelected
        ? `${baseClasses} border-green-600 bg-green-50 shadow-lg scale-105`
        : `${baseClasses} border-green-300 bg-green-50 hover:border-green-400 hover:shadow-md`;
    
    case 'attention':
      return isSelected
        ? `${baseClasses} border-green-700 bg-green-50 shadow-lg scale-105`
        : `${baseClasses} border-green-400 bg-green-50 hover:border-green-500 hover:shadow-md`;
    
    case 'destroying':
      return isSelected
        ? `${baseClasses} border-red-500 bg-red-50 shadow-lg scale-105`
        : `${baseClasses} border-red-200 bg-red-50 hover:border-red-300 hover:shadow-md`;
    
    default:
      return baseClasses;
  }
};
