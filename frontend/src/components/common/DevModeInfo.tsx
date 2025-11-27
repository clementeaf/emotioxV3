'use client';



/**
 * Props para el componente DevModeInfo
 */
interface DevModeInfoProps {
  /** Clases CSS adicionales */
  className?: string;
  /** Si mostrar el banner completo o compacto */
  variant?: 'default' | 'compact' | 'floating';
}

/**
 * Componente que muestra información sobre el modo de desarrollo
 * y permite cambiar entre datos reales y simulados
 * 
 * NOTA: Este componente ha sido desactivado según requerimiento.
 */
export function DevModeInfo({ 
  className, 
  variant = 'floating' 
}: DevModeInfoProps) {
  // El componente ahora siempre retorna null (eliminado de la UI)
  return null;
} 