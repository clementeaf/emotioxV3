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
    // Use researcher-configured shelfItems as column count.
    // Images cycle via urls[i % urls.length] if fewer images than cells.
    const effectiveCols = shelfItems;

    // On small screens, cap columns to prevent unreadable images (min ~80px per cell)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const maxCols = isMobile ? Math.min(effectiveCols, 4) : effectiveCols;
    const effectiveRows = isMobile && effectiveCols > maxCols
        ? Math.ceil((effectiveCols * shelfCount) / maxCols)
        : shelfCount;

    const totalCells = effectiveRows * maxCols;
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
            className={`max-w-[85vw] max-h-[75vh] mx-auto select-none overflow-hidden ${className}`}
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${maxCols}, 1fr)`,
                gridTemplateRows: `repeat(${effectiveRows}, 1fr)`,
                gap: isMobile ? 2 : 4,
                ...(blur ? { filter: 'blur(12px)' } : {}),
                ...(opacity != null ? { opacity } : {}),
                ...style,
            }}
        >
            {Array.from({ length: totalCells }, (_, i) => {
                // Map cell index back to image: row-first then column cycling
                const url = urls[i % urls.length];
                return (
                    <img
                        key={i}
                        src={url}
                        alt={`Shelf item ${i + 1}`}
                        className="w-full h-full object-contain"
                        style={{ minWidth: isMobile ? 60 : 80, minHeight: isMobile ? 60 : 80 }}
                        draggable={false}
                        onLoad={handleImageLoad}
                    />
                );
            })}
        </div>
    );
};
