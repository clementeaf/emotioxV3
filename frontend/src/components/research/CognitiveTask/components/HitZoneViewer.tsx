import React from 'react';
import { HitZone } from 'shared/interfaces/cognitive-task.interface';

interface HitZoneViewerProps {
  hitzones: HitZone[];
  imageNaturalSize: { width: number; height: number };
  imageRenderedSize: { width: number; height: number };
  onHitzoneClick?: (hitzoneIds: string[]) => void; // Nuevo: callback opcional para clicks
  enableClicks?: boolean; // Nuevo: habilitar/deshabilitar clicks
}

export const HitZoneViewer: React.FC<HitZoneViewerProps> = ({
  hitzones,
  imageNaturalSize,
  imageRenderedSize,
  onHitzoneClick,
  enableClicks = false, // Por defecto, clicks deshabilitados para no romper funcionalidad existente
}) => {
  if (!hitzones || hitzones.length === 0 || !imageNaturalSize || !imageRenderedSize) {
    return null;
  }

  const { width: naturalWidth, height: naturalHeight } = imageNaturalSize;
  const { width: renderedWidth, height: renderedHeight } = imageRenderedSize;

  // Calcula el aspect ratio para el escalado (letterboxing/pillarboxing)
  const naturalRatio = naturalWidth / naturalHeight;
  const renderedRatio = renderedWidth / renderedHeight;

  let scale: number;
  let offsetX = 0;
  let offsetY = 0;

  if (naturalRatio > renderedRatio) {
    // La imagen se ajusta al ancho (pillarboxed)
    scale = renderedWidth / naturalWidth;
    offsetY = (renderedHeight - (naturalHeight * scale)) / 2;
  } else {
    // La imagen se ajusta al alto (letterboxed)
    scale = renderedHeight / naturalHeight;
    offsetX = (renderedWidth - (naturalWidth * scale)) / 2;
  }

  // Función para detectar qué hitzones están bajo un punto de click
  const detectHitzonesAtPoint = (clientX: number, clientY: number, containerElement: HTMLElement) => {
    const rect = containerElement.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const hitHitzones: string[] = [];

    hitzones.forEach((zone) => {
      const scaledX = zone.region.x * scale + offsetX;
      const scaledY = zone.region.y * scale + offsetY;
      const scaledWidth = zone.region.width * scale;
      const scaledHeight = zone.region.height * scale;

      const isHit = x >= scaledX && x <= scaledX + scaledWidth &&
                    y >= scaledY && y <= scaledY + scaledHeight;

      // Debug: mostrar info de cada hitzone
      console.log(`🔍 Hitzone ${zone.id}:`, {
        region: zone.region,
        scaled: { x: scaledX, y: scaledY, width: scaledWidth, height: scaledHeight },
        clickPoint: { x, y },
        hit: isHit
      });

      if (isHit) {
        hitHitzones.push(zone.id);
      }
    });

    return hitHitzones;
  };

  // Handler para clicks en el contenedor
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableClicks || !onHitzoneClick) return;

    const hitHitzones = detectHitzonesAtPoint(e.clientX, e.clientY, e.currentTarget);

    // Debug logging
    console.log('🎯 Click detectado:', {
      clickPoint: { x: e.clientX - e.currentTarget.getBoundingClientRect().left, y: e.clientY - e.currentTarget.getBoundingClientRect().top },
      hitzonasDetectadas: hitHitzones.length,
      hitzoneIds: hitHitzones,
      totalHitzones: hitzones.length
    });

    if (hitHitzones.length > 0) {
      onHitzoneClick(hitHitzones);
    }
  };

  return (
    <div
      className={`absolute top-0 left-0 w-full h-full ${enableClicks ? 'cursor-pointer' : 'pointer-events-none'}`}
      onClick={handleContainerClick}
    >
      {hitzones.map((zone, index) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          left: `${zone.region.x * scale + offsetX}px`,
          top: `${zone.region.y * scale + offsetY}px`,
          width: `${zone.region.width * scale}px`,
          height: `${zone.region.height * scale}px`,
          backgroundColor: `rgba(29, 161, 242, 0.${2 + index})`, // Diferente opacidad por zona
          border: `2px solid rgba(29, 161, 242, 0.7)`,
          borderRadius: '4px',
          boxShadow: '0 0 10px rgba(29, 161, 242, 0.5)',
          pointerEvents: 'none', // Importante: evitar interferencia con click del contenedor
          zIndex: index, // Diferente z-index para cada zona
        };

        return (
          <div key={`${zone.id}-${index}`} style={style}>
            {/* Debug: mostrar info de la zona */}
            <div className="text-xs text-white bg-black bg-opacity-50 p-1 rounded absolute top-0 left-0">
              {zone.name || zone.id.slice(-8)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
