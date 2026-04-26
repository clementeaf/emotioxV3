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
    const totalCells = shelfCount * shelfItems;
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
            className={`max-w-[95vw] max-h-[85vh] select-none ${className}`}
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${shelfItems}, 1fr)`,
                gridTemplateRows: `repeat(${shelfCount}, 1fr)`,
                gap: 2,
                ...(blur ? { filter: 'blur(12px)' } : {}),
                ...(opacity != null ? { opacity } : {}),
                ...style,
            }}
        >
            {Array.from({ length: totalCells }, (_, i) => {
                // Column-based mapping: each URL fills an entire column (repeats across rows)
                const col = i % shelfItems;
                const url = urls[col % urls.length];
                return (
                    <img
                        key={i}
                        src={url}
                        alt={`Shelf item ${i + 1}`}
                        className="w-full h-full object-contain"
                        draggable={false}
                        onLoad={handleImageLoad}
                    />
                );
            })}
        </div>
    );
};
