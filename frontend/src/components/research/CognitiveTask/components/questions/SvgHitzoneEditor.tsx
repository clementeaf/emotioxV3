import React, { useEffect, useRef, useState } from 'react';

interface Area {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SvgHitzoneEditorProps {
  imageUrl: string;
  areas: Area[];
  setAreas: (areas: Area[]) => void;
  selectedAreaIdx: number | null;
  setSelectedAreaIdx: (idx: number | null) => void;
}

const CANVAS_WIDTH = 575;
const CANVAS_HEIGHT = 575;

export const SvgHitzoneEditor: React.FC<SvgHitzoneEditorProps & { onClose?: () => void; onSave?: (areas: Area[]) => void; }> = ({
  imageUrl,
  areas,
  setAreas: _setAreas,
  selectedAreaIdx,
  setSelectedAreaIdx: _setSelectedAreaIdx,
  onClose,
  onSave
}) => {
  // Estado local para las áreas, inicializado solo una vez
  const didInit = useRef(false);
  const [localAreas, setLocalAreas] = useState<Area[]>(areas);
  const [localSelectedIdx, setLocalSelectedIdx] = useState<number | null>(selectedAreaIdx);

  useEffect(() => {
    if (!didInit.current) {
      setLocalAreas(areas);
      setLocalSelectedIdx(selectedAreaIdx);
      didInit.current = true;
    }
  }, []); // Solo al montar

  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<Area | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Estado para drag y resize
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [resizing, setResizing] = useState<null | { corner: string }> (null);
  const [showTest, setShowTest] = useState(false);

  // Iniciar dibujo
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) {return;} // solo click izquierdo
    const rect = svgRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPoint({ x, y });
    setCurrentRect({ id: `area_${Date.now()}`, x, y, width: 0, height: 0 });
    setDrawing(true);
  };

  // Dibujar rectángulo
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !startPoint) {return;}
    const rect = svgRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentRect({
      id: currentRect!.id,
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y)
    });
  };

  // Finalizar dibujo
  const handleMouseUp = () => {
    if (drawing && currentRect && currentRect.width > 10 && currentRect.height > 10) {
      setLocalAreas([...localAreas, currentRect]);
      setLocalSelectedIdx(localAreas.length);
    }
    setDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
  };

  // Seleccionar área
  const handleRectClick = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalSelectedIdx(idx);
  };

  // Eliminar área seleccionada
  const handleDelete = () => {
    if (localSelectedIdx === null) {return;}
    setLocalAreas(localAreas.filter((_, idx) => idx !== localSelectedIdx));
    setLocalSelectedIdx(null);
  };

  // Mover área seleccionada (drag)
  const handleRectDrag = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (localSelectedIdx !== idx) {return;}
    // Implementar lógica de drag si se requiere (puede agregarse luego)
  };

  // Iniciar drag
  const handleRectMouseDown = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalSelectedIdx(idx);
    if (e.shiftKey) {return;} // Shift para solo seleccionar
    const area = localAreas[idx];
    setDragOffset({
      x: e.clientX - area.x,
      y: e.clientY - area.y
    });
  };

  // Drag
  const handleSvgMouseMove = (e: React.MouseEvent) => {
    if (dragOffset && localSelectedIdx !== null) {
      const rect = svgRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      setLocalAreas(localAreas.map((a, idx) => idx === localSelectedIdx ? { ...a, x, y } : a));
    } else if (resizing && localSelectedIdx !== null) {
      const rect = svgRef.current!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const area = localAreas[localSelectedIdx];
      let { x, y, width, height } = area;
      switch (resizing.corner) {
        case 'nw':
          width = width + (x - mouseX);
          height = height + (y - mouseY);
          x = mouseX;
          y = mouseY;
          break;
        case 'ne':
          width = Math.abs(mouseX - x);
          height = height + (y - mouseY);
          y = mouseY;
          break;
        case 'sw':
          width = width + (x - mouseX);
          x = mouseX;
          height = Math.abs(mouseY - y);
          break;
        case 'se':
          width = Math.abs(mouseX - x);
          height = Math.abs(mouseY - y);
          break;
      }
      if (width > 10 && height > 10) {
        setLocalAreas(localAreas.map((a, idx) => idx === localSelectedIdx ? { ...a, x, y, width, height } : a));
      }
    }
  };

  // Finalizar drag/resize
  const handleSvgMouseUp = () => {
    setDragOffset(null);
    setResizing(null);
    setDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
  };

  // Iniciar resize
  const handleResizeMouseDown = (corner: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setResizing({ corner });
  };

  // Validación de URL
  if (!imageUrl || imageUrl.trim() === '') {
    return <div style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: 8 }}>
      <span className="text-neutral-500">No se puede mostrar la imagen. Vuelve a subir el archivo.</span>
      {onClose && (
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, zIndex: 20 }} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Cerrar</button>
      )}
    </div>;
  }

  return (
    <div style={{ position: 'relative', width: 'min(90vw, 575px)', height: 'min(80vh, 575px)', background: '#fff', borderRadius: 8, boxShadow: '0 2px 16px #0002' }}>
      {/* Botón cerrar */}
      {onClose && (
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, zIndex: 20 }} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Cerrar</button>
      )}
      {/* Instrucciones */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 20, background: '#f8fafc', borderRadius: 6, padding: '8px 16px', fontSize: 13, color: '#333', boxShadow: '0 1px 4px #0001' }}>
        <b>Instrucciones:</b> Dibuja una zona arrastrando con el mouse. Haz clic en una zona para seleccionarla. Arrastra para mover. Usa los círculos para redimensionar. Pulsa &quot;Eliminar zona&quot; para borrar la seleccionada.
      </div>
      {/* Botones de acción */}
      <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 20, display: 'flex', gap: 8 }}>
        <button onClick={() => onSave && onSave(localAreas)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar zonas</button>
        <button onClick={() => setShowTest(v => !v)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">{showTest ? 'Ocultar prueba' : 'Probar hitzones'}</button>
        {localSelectedIdx !== null && (
          <button onClick={handleDelete} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Eliminar zona</button>
        )}
      </div>
      {/* Imagen base */}
      <img
        src={imageUrl}
        alt="Imagen base"
        style={{ width: '100%', height: '100%', display: 'block', borderRadius: 8, objectFit: 'contain', background: '#f8fafc' }}
        draggable={false}
        crossOrigin="anonymous"
        onError={(e) => {
          e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="575" height="575"><rect width="575" height="575" fill="%23f8fafc"/><text x="287" y="287" font-family="Arial" font-size="24" text-anchor="middle" dominant-baseline="middle" fill="%23999">Error</text></svg>';
        }}
      />
      {/* SVG de zonas */}
      <svg
        ref={svgRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'auto', width: '100%', height: '100%' }}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => { handleMouseMove(e); handleSvgMouseMove(e); }}
        onMouseUp={handleSvgMouseUp}
      >
        {localAreas.map((area, idx) => (
          <g key={area.id}>
            <rect
              x={area.x}
              y={area.y}
              width={area.width}
              height={area.height}
              fill={
                showTest
                  ? 'rgba(40,167,69,0.25)'
                  : idx === localSelectedIdx
                    ? 'rgba(0,123,255,0.3)'
                    : 'rgba(0,123,255,0.15)'
              }
              stroke={idx === localSelectedIdx ? '#007bff' : '#007bff'}
              strokeWidth={idx === localSelectedIdx ? 2 : 1}
              onClick={(e) => handleRectClick(idx, e)}
              onMouseDown={(e) => idx === localSelectedIdx ? handleRectMouseDown(idx, e) : undefined}
              style={{ cursor: idx === localSelectedIdx ? 'move' : 'pointer', filter: showTest ? 'drop-shadow(0 0 8px #28a745)' : undefined }}
            />
            {/* Handles para redimensionar solo si está seleccionada */}
            {idx === localSelectedIdx && !showTest && [
              { corner: 'nw', cx: area.x, cy: area.y },
              { corner: 'ne', cx: area.x + area.width, cy: area.y },
              { corner: 'sw', cx: area.x, cy: area.y + area.height },
              { corner: 'se', cx: area.x + area.width, cy: area.y + area.height }
            ].map(h => (
              <circle
                key={h.corner}
                cx={h.cx}
                cy={h.cy}
                r={6}
                fill="#fff"
                stroke="#007bff"
                strokeWidth={2}
                onMouseDown={(e) => handleResizeMouseDown(h.corner, e)}
                style={{ cursor: `${h.corner}-resize` }}
              />
            ))}
            {/* Tooltip de prueba */}
            {showTest && (
              <title>Zona interactiva #{idx + 1}</title>
            )}
          </g>
        ))}
        {currentRect && !showTest && (
          <rect
            x={currentRect.x}
            y={currentRect.y}
            width={currentRect.width}
            height={currentRect.height}
            fill={'rgba(0,123,255,0.2)'}
            stroke={'#007bff'}
            strokeDasharray="4"
          />
        )}
      </svg>
    </div>
  );
};
