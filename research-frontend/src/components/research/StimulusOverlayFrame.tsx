import type { MouseEventHandler, ReactNode, Ref } from 'react';
import { useControls } from 'react-zoom-pan-pinch';
import { cn } from '../../lib/utils';

interface StimulusOverlayFrameProps {
    children: ReactNode;
    className?: string;
    containerRef?: Ref<HTMLDivElement>;
    onMouseDown?: MouseEventHandler<HTMLDivElement>;
    dimOverlay?: boolean;
    maxDisplayHeightPx?: number;
}

/**
 * Centers media and constrains overlay coordinates to the visible image box.
 */
export const StimulusOverlayFrame = ({
    children,
    className,
    containerRef,
    onMouseDown,
    dimOverlay = false,
    maxDisplayHeightPx,
}: StimulusOverlayFrameProps) => (
    <div className="flex w-full justify-center">
        <div
            ref={containerRef}
            className={cn('relative w-fit max-w-full', className)}
            style={maxDisplayHeightPx != null && maxDisplayHeightPx > 0
                ? { maxHeight: maxDisplayHeightPx }
                : undefined}
            onMouseDown={onMouseDown}
        >
            {children}
            {dimOverlay && (
                <div className="absolute inset-0 bg-black/25 pointer-events-none" />
            )}
        </div>
    </div>
);

// eslint-disable-next-line react-refresh/only-export-components
export const STIMULUS_TRANSFORM_CONTENT_STYLE = {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
} as const;

export const ZoomControls = () => {
    const { zoomIn, zoomOut, resetTransform } = useControls();
    return (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white/90 rounded-lg shadow-sm border px-1.5 py-1">
            <button onClick={() => zoomOut()} className="px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100 rounded" title="Zoom out">−</button>
            <button onClick={() => zoomIn()} className="px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100 rounded" title="Zoom in">+</button>
            <button onClick={() => resetTransform()} className="px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-100 rounded" title="Reset zoom">↺</button>
        </div>
    );
};
