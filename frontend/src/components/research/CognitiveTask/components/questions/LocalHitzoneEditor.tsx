import React, { useEffect, useRef, useState } from 'react';

import type { HitzoneArea } from '../../types';

interface LocalHitzoneEditorProps {
  imageUrl: string;
  initialAreas?: HitzoneArea[];
  onSave: (areas: HitzoneArea[]) => void;
  onClose: () => void;
  hitZones?: HitzoneArea[];
}

const CANVAS_SIZE = 575;

export const LocalHitzoneEditor: React.FC<LocalHitzoneEditorProps> = ({
  imageUrl,
  initialAreas = [],
  onSave,
  onClose,
}) => {
  const [areas, setAreas] = useState<HitzoneArea[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<HitzoneArea | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [testMode, setTestMode] = useState(false);
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const [imgNatural, setImgNatural] = useState<{ width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showActiveModal, setShowActiveModal] = useState(false);
  const [activeTestIdx, setActiveTestIdx] = useState<number | null>(null);

  // Sincronizar con initialAreas y seleccionar automáticamente la primera zona
  useEffect(() => {
    console.log('LocalHitzoneEditor - initialAreas received:', initialAreas);
    
    if (initialAreas && initialAreas.length > 0) {
      // Validar que las áreas tienen las propiedades necesarias
      const validAreas = initialAreas.filter(area => 
        area && 
        typeof area.x === 'number' && 
        typeof area.y === 'number' && 
        typeof area.width === 'number' && 
        typeof area.height === 'number' &&
        area.width > 0 && 
        area.height > 0
      );
      
      console.log('LocalHitzoneEditor - Valid areas:', validAreas);
      
      if (validAreas.length > 0) {
        setAreas(JSON.parse(JSON.stringify(validAreas)));
        setSelectedIdx(0);
        console.log('LocalHitzoneEditor - Set areas and selectedIdx to 0');
      } else {
        console.log('LocalHitzoneEditor - No valid areas found');
        setAreas([]);
        setSelectedIdx(null);
      }
    } else {
      console.log('LocalHitzoneEditor - No initial areas, resetting');
      setAreas([]);
      setSelectedIdx(null);
    }
  }, [initialAreas]);

  // Al cargar la imagen, medir el tamaño real renderizado y el natural
  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight, width, height } = e.currentTarget;
    setImgNatural({ width: naturalWidth, height: naturalHeight });
    setImgSize({ width, height });
  };

  // Iniciar dibujo
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !imgNatural || !imgSize) {return;}
    const rect = svgRef.current!.getBoundingClientRect();
    // Coordenadas relativas al SVG
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    // Convertir a sistema de referencia del canvas base
    const x = mouseX * (imgNatural.width / imgSize.width);
    const y = mouseY * (imgNatural.height / imgSize.height);
    setStart({ x, y });
    setCurrentRect({ id: `area_${Date.now()}`, x, y, width: 0, height: 0 });
    setDrawing(true);
  };

  // Dibujar rectángulo
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !start || !imgNatural || !imgSize) {return;}
    const rect = svgRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    // Convertir a sistema de referencia del canvas base
    const x = mouseX * (imgNatural.width / imgSize.width);
    const y = mouseY * (imgNatural.height / imgSize.height);
    setCurrentRect({
      id: currentRect!.id,
      x: Math.min(start.x, x),
      y: Math.min(start.y, y),
      width: Math.abs(x - start.x),
      height: Math.abs(y - start.y),
    });
  };

  // Finalizar dibujo
  const handleMouseUp = () => {
    if (drawing && currentRect && currentRect.width > 10 && currentRect.height > 10) {
      setAreas([...areas, currentRect]);
      setSelectedIdx(areas.length);
    }
    setDrawing(false);
    setStart(null);
    setCurrentRect(null);
  };

  // Seleccionar área
  const handleRectClick = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIdx(idx);
  };

  // Eliminar área seleccionada
  const handleDelete = () => {
    if (selectedIdx === null) {return;}
    setAreas(areas.filter((_, idx) => idx !== selectedIdx));
    setSelectedIdx(null);
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        ref={containerRef}
        className="relative w-[80vw] max-w-4xl max-h-[80vh] bg-white rounded-lg shadow-lg overflow-hidden"
        style={{ aspectRatio: imgNatural ? `${imgNatural.width} / ${imgNatural.height}` : undefined }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Imagen base"
            className="w-full h-auto max-h-[80vh] object-contain bg-white"
            draggable={false}
            onLoad={handleImgLoad}
            style={{ display: 'block' }}
            crossOrigin="anonymous"
          />
        )}
        {imgSize && imgNatural && (
          <svg
            ref={svgRef}
            width={imgSize.width}
            height={imgSize.height}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'auto', width: imgSize.width, height: imgSize.height }}
            onMouseDown={!testMode ? handleMouseDown : undefined}
            onMouseMove={!testMode ? handleMouseMove : undefined}
            onMouseUp={!testMode ? handleMouseUp : undefined}
          >
            {areas.map((area, idx) => {
              console.log(`Rendering area ${idx}:`, area);
              const scaledRect = {
                x: area.x * (imgSize.width / (imgNatural.width || imgSize.width)),
                y: area.y * (imgSize.height / (imgNatural.height || imgSize.height)),
                width: area.width * (imgSize.width / (imgNatural.width || imgSize.width)),
                height: area.height * (imgSize.height / (imgNatural.height || imgSize.height))
              };
              console.log(`Scaled rect ${idx}:`, scaledRect);
              
              return (
                <rect
                  key={area.id}
                  x={scaledRect.x}
                  y={scaledRect.y}
                  width={scaledRect.width}
                  height={scaledRect.height}
                  fill={idx === selectedIdx ? 'rgba(0,123,255,0.3)' : 'rgba(0,123,255,0.15)'}
                  stroke="#007bff"
                  strokeWidth={idx === selectedIdx ? 2 : 1}
                  onClick={
                    testMode
                      ? () => setActiveTestIdx(idx)
                      : (e) => handleRectClick(idx, e)
                  }
                  style={{
                    cursor: 'pointer',
                    opacity: 1,
                    pointerEvents: 'auto',
                  }}
                />
              );
            })}
            {currentRect && !testMode && (
              <rect
                x={currentRect.x * (imgSize.width / (imgNatural.width || imgSize.width))}
                y={currentRect.y * (imgSize.height / (imgNatural.height || imgSize.height))}
                width={currentRect.width * (imgSize.width / (imgNatural.width || imgSize.width))}
                height={currentRect.height * (imgSize.height / (imgNatural.height || imgSize.height))}
                fill={'rgba(0,123,255,0.2)'}
                stroke={'#007bff'}
                strokeDasharray="4"
              />
            )}
          </svg>
        )}
      </div>
      {/* Mensaje y botones condicionales según cantidad de áreas y testMode */}
      <div className="flex flex-col items-center justify-center w-full mt-4">
        {testMode ? (
          <div className="flex flex-row items-center justify-center gap-4">
            <button onClick={() => setTestMode(false)} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">Salir de prueba</button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cerrar</button>
          </div>
        ) : areas.length === 0 ? (
          <>
            <div className="mb-4 text-sm text-neutral-600">Dibuja la zona a guardar</div>
            <div className="flex flex-row items-center justify-center gap-4">
              <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cerrar</button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 text-sm text-neutral-600">
              {selectedIdx !== null
                ? `Zona ${selectedIdx + 1} seleccionada. Puedes guardarla, eliminarla o probarla.`
                : 'Zona dibujada. Selecciona una zona para eliminarla, o puedes guardarla o probarla.'
              }
            </div>
            <div className="flex flex-row items-center justify-center gap-4">
              <button onClick={() => {
                onSave(areas);
              }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar zona</button>
              <button
                onClick={handleDelete}
                disabled={selectedIdx === null}
                className={`px-4 py-2 rounded ${
                  selectedIdx === null
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                Eliminar zona
              </button>
              <button onClick={() => setTestMode(true)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Probar hitzone</button>
              <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cerrar</button>
            </div>
          </>
        )}
      </div>
      {/* Modal de prueba para cualquier hitzone */}
      {testMode && activeTestIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-4">¡Hitzone activo! Zona {activeTestIdx + 1}</h3>
            <button onClick={() => setActiveTestIdx(null)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};
