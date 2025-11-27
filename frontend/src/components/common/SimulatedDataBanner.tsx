'use client';

import { cn } from '@/lib/utils';

/**
 * Propiedades para el componente SimulatedDataBanner
 */
interface SimulatedDataBannerProps {
  /** Texto a mostrar en el banner */
  message?: string;
  /** Función a ejecutar cuando se hace clic en "Usar datos reales" */
  onSwitchToReal?: () => void;
  /** Clases CSS adicionales */
  className?: string;
  /** Si mostrar la opción de cambiar a datos reales */
  showSwitchOption?: boolean;
  /** Estilo del banner */
  variant?: 'default' | 'compact' | 'subtle' | 'floating';
}

/**
 * Componente que muestra un banner para indicar que se están viendo datos simulados
 */
export function SimulatedDataBanner({
  message = 'Estás viendo datos simulados',
  onSwitchToReal,
  className,
  showSwitchOption = true,
  variant = 'default'
}: SimulatedDataBannerProps) {
  
  // Estilos según la variante seleccionada
  const containerClasses = cn(
    {
      // Variante por defecto - banner completo
      'bg-amber-50 border border-amber-200 rounded-lg p-3': variant === 'default',
      
      // Variante compacta - más pequeña
      'bg-amber-50 border border-amber-200 rounded px-3 py-1.5 text-sm': variant === 'compact',
      
      // Variante sutil - menos llamativa
      'bg-white border border-neutral-200 rounded-lg p-2 shadow-sm': variant === 'subtle',
      
      // Variante flotante - para mostrar en esquina
      'bg-amber-50 border border-amber-300 rounded-lg p-2 shadow-md fixed bottom-4 right-4 z-50 max-w-xs': variant === 'floating',
    },
    className
  );

  const textClasses = cn(
    'flex items-center gap-1.5',
    {
      'text-amber-700': variant !== 'subtle',
      'text-neutral-600': variant === 'subtle',
      'text-sm': variant === 'default' || variant === 'floating',
      'text-xs': variant === 'compact',
    }
  );

  const buttonClasses = cn(
    'text-xs px-2 py-1 rounded hover:bg-opacity-80 transition-colors ml-auto whitespace-nowrap',
    {
      'bg-white border border-amber-200 text-amber-700 hover:bg-amber-100': 
        variant === 'default' || variant === 'compact' || variant === 'floating',
      'bg-neutral-100 border border-neutral-200 text-neutral-700 hover:bg-neutral-200': 
        variant === 'subtle',
    }
  );

  return (
    <div className={containerClasses}>
      <p className={textClasses}>
        <svg 
          className="w-4 h-4 text-amber-500 flex-shrink-0" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <span className="font-medium">{message}</span>
        
        {showSwitchOption && onSwitchToReal && (
          <button 
            onClick={onSwitchToReal}
            className={buttonClasses}
          >
            Usar datos reales
          </button>
        )}
      </p>
    </div>
  );
} 