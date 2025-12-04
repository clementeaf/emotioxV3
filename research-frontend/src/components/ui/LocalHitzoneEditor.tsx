import React, { useRef, useState } from 'react';

/**
 * Interfaz para áreas de hitzone
 */
export interface HitzoneArea {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface LocalHitzoneEditorProps {
    imageUrl: string;
    initialAreas?: HitzoneArea[];
    onSave: (areas: HitzoneArea[]) => void;
    onClose: () => void;
}

/**
 * Editor de hitzones para imágenes en Navigation Flow
 */
export const LocalHitzoneEditor: React.FC<LocalHitzoneEditorProps> = ({
    imageUrl,
    initialAreas = [],
    onSave,
    onClose,
}) => {
    // Initialize areas from initialAreas on mount
    const [areas, setAreas] = useState<HitzoneArea[]>(() => {
        if (initialAreas && initialAreas.length > 0) {
            const validAreas = initialAreas.filter(
                (area) =>
                    area &&
                    typeof area.x === 'number' &&
                    typeof area.y === 'number' &&
                    typeof area.width === 'number' &&
                    typeof area.height === 'number' &&
                    area.width > 0 &&
                    area.height > 0
            );
            return validAreas.length > 0 ? JSON.parse(JSON.stringify(validAreas)) : [];
        }
        return [];
    });
    
    const [selectedIdx, setSelectedIdx] = useState<number | null>(() => {
        return (initialAreas && initialAreas.length > 0) ? 0 : null;
    });
    const [drawing, setDrawing] = useState(false);
    const [start, setStart] = useState<{ x: number; y: number } | null>(null);
    const [currentRect, setCurrentRect] = useState<HitzoneArea | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [testMode, setTestMode] = useState(false);
    const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
    const [imgNatural, setImgNatural] = useState<{ width: number; height: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeTestIdx, setActiveTestIdx] = useState<number | null>(null);

    const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>): void => {
        const { naturalWidth, naturalHeight, width, height } = e.currentTarget;
        setImgNatural({ width: naturalWidth, height: naturalHeight });
        setImgSize({ width, height });
    };

    const handleMouseDown = (e: React.MouseEvent): void => {
        if (e.button !== 0 || !imgNatural || !imgSize) return;
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const x = mouseX * (imgNatural.width / imgSize.width);
        const y = mouseY * (imgNatural.height / imgSize.height);
        setStart({ x, y });
        setCurrentRect({ id: `area_${Date.now()}`, x, y, width: 0, height: 0 });
        setDrawing(true);
    };

    const handleMouseMove = (e: React.MouseEvent): void => {
        if (!drawing || !start || !imgNatural || !imgSize) return;
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
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

    const handleMouseUp = (): void => {
        if (drawing && currentRect && currentRect.width > 10 && currentRect.height > 10) {
            setAreas([...areas, currentRect]);
            setSelectedIdx(areas.length);
        }
        setDrawing(false);
        setStart(null);
        setCurrentRect(null);
    };

    const handleRectClick = (idx: number, e: React.MouseEvent): void => {
        e.stopPropagation();
        setSelectedIdx(idx);
    };

    const handleDelete = (): void => {
        if (selectedIdx === null) return;
        setAreas(areas.filter((_, idx) => idx !== selectedIdx));
        setSelectedIdx(null);
    };

    return (
        <div className="flex flex-col items-center justify-center">
            <div
                ref={containerRef}
                className="relative w-[56vw] max-w-[28rem] max-h-[56vh] bg-white rounded-lg shadow-lg overflow-hidden"
                style={{
                    aspectRatio: imgNatural ? `${imgNatural.width} / ${imgNatural.height}` : undefined,
                }}
            >
                {imageUrl && (
                    <img
                        src={imageUrl}
                        alt="Base image"
                        className="w-full h-auto max-h-[56vh] object-contain bg-white"
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
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            pointerEvents: 'auto',
                            width: imgSize.width,
                            height: imgSize.height,
                        }}
                        onMouseDown={!testMode ? handleMouseDown : undefined}
                        onMouseMove={!testMode ? handleMouseMove : undefined}
                        onMouseUp={!testMode ? handleMouseUp : undefined}
                    >
                        {areas.map((area, idx) => {
                            const scaledRect = {
                                x: area.x * (imgSize.width / (imgNatural.width || imgSize.width)),
                                y: area.y * (imgSize.height / (imgNatural.height || imgSize.height)),
                                width: area.width * (imgSize.width / (imgNatural.width || imgSize.width)),
                                height: area.height * (imgSize.height / (imgNatural.height || imgSize.height)),
                            };

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
                                fill="rgba(0,123,255,0.2)"
                                stroke="#007bff"
                                strokeDasharray="4"
                            />
                        )}
                    </svg>
                )}
            </div>
            <div className="flex flex-col items-center justify-center w-full mt-4">
                {testMode ? (
                    <div className="flex flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => setTestMode(false)}
                            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        >
                            Exit Test
                        </button>
                        <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                            Close
                        </button>
                    </div>
                ) : areas.length === 0 ? (
                    <>
                        <div className="mb-4 text-sm text-neutral-600">Draw the zone to save</div>
                        <div className="flex flex-row items-center justify-center gap-4">
                            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                                Close
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mb-4 text-sm text-neutral-600">
                            {selectedIdx !== null
                                ? `Zone ${selectedIdx + 1} selected. You can save it, delete it, or test it.`
                                : 'Zone drawn. Select a zone to delete it, or you can save it or test it.'}
                        </div>
                        <div className="flex flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => {
                                    onSave(areas);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Save Zone
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={selectedIdx === null}
                                className={`px-4 py-2 rounded ${
                                    selectedIdx === null
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-red-500 text-white hover:bg-red-600'
                                }`}
                            >
                                Delete Zone
                            </button>
                            <button
                                onClick={() => setTestMode(true)}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                Test Hitzone
                            </button>
                            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                                Close
                            </button>
                        </div>
                    </>
                )}
            </div>
            {testMode && activeTestIdx !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center">
                        <h3 className="text-lg font-semibold mb-4">Hitzone Active! Zone {activeTestIdx + 1}</h3>
                        <button
                            onClick={() => setActiveTestIdx(null)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

