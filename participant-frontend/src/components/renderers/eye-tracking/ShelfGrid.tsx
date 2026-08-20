import React, { useRef, useCallback, useState, useEffect } from 'react';

function fisherYatesShuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

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
    rotationInterval?: number;
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
    rotationInterval = 0,
}) => {
    const [displayUrls, setDisplayUrls] = useState(urls);

    useEffect(() => {
        setDisplayUrls(urls);
    }, [urls]);

    useEffect(() => {
        if (rotationInterval < 5 || displayUrls.length < 2) return;
        const timer = setInterval(() => {
            setDisplayUrls(prev => fisherYatesShuffle(prev));
        }, rotationInterval * 1000);
        return () => clearInterval(timer);
    }, [rotationInterval, displayUrls.length]);

    const effectiveCols = shelfItems;

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

    if (displayUrls.length === 0) return null;

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
                const url = displayUrls[i % displayUrls.length];
                return (
                    <img
                        key={`${i}-${url}`}
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
