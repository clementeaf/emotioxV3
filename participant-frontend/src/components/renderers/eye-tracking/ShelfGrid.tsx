import React, { useRef, useCallback } from 'react';

export interface ShelfGridProps {
    urls: string[];
    shelfCount: number;
    shelfItems: number;
    blur?: boolean;
    opacity?: number;
    className?: string;
    style?: React.CSSProperties;
    onAllLoaded?: () => void;
    containerRef?: React.RefObject<HTMLDivElement | null>;
}

export const ShelfGrid: React.FC<ShelfGridProps> = ({
    urls,
    shelfCount,
    shelfItems,
    blur = false,
    opacity,
    className = '',
    style,
    onAllLoaded,
    containerRef,
}) => {
    // Ensure all uploaded images are shown: columns = max(shelfItems, urls.length)
    const effectiveCols = Math.max(shelfItems, urls.length);
    const totalCells = shelfCount * effectiveCols;
    const loadedRef = useRef(0);

    const handleImageLoad = useCallback(() => {
        loadedRef.current += 1;
        if (loadedRef.current >= totalCells) {
            onAllLoaded?.();
        }
    }, [totalCells, onAllLoaded]);

    if (urls.length === 0) return null;

    return (
        <div
            ref={containerRef}
            className={`max-w-[80vw] max-h-[70vh] mx-auto select-none ${className}`}
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${effectiveCols}, 1fr)`,
                gridTemplateRows: `repeat(${shelfCount}, 1fr)`,
                gap: 4,
                ...(blur ? { filter: 'blur(12px)' } : {}),
                ...(opacity != null ? { opacity } : {}),
                ...style,
            }}
        >
            {Array.from({ length: totalCells }, (_, i) => {
                const col = i % effectiveCols;
                const url = urls[col % urls.length];
                return (
                    <img
                        key={i}
                        src={url}
                        alt={`Shelf item ${i + 1}`}
                        className="w-full h-full object-contain"
                        style={{ maxHeight: '30vh' }}
                        draggable={false}
                        onLoad={handleImageLoad}
                    />
                );
            })}
        </div>
    );
};
