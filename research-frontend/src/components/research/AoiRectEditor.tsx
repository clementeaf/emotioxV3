import { useCallback, useRef } from 'react';
import type { ReactElement, RefObject } from 'react';
import type { ManualAOI } from '../../types/attentionPrediction.types';
import { clampAoiBounds } from '../../utils/attentionPrediction.utils';

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

interface AoiRectEditorProps {
    aoi: ManualAOI;
    color: string;
    percentage: number;
    selected: boolean;
    onSelect: () => void;
    onChange: (updated: ManualAOI) => void;
    containerRef: RefObject<HTMLDivElement | null>;
    /** When true, disables move/resize so drawing new AOIs passes through */
    disabled?: boolean;
}

const HANDLES: Array<{ mode: DragMode; className: string; cursor: string }> = [
    { mode: 'nw', className: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2', cursor: 'nwse-resize' },
    { mode: 'ne', className: 'top-0 right-0 translate-x-1/2 -translate-y-1/2', cursor: 'nesw-resize' },
    { mode: 'sw', className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2', cursor: 'nesw-resize' },
    { mode: 'se', className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2', cursor: 'nwse-resize' },
    { mode: 'n', className: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2', cursor: 'ns-resize' },
    { mode: 's', className: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2', cursor: 'ns-resize' },
    { mode: 'w', className: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize' },
    { mode: 'e', className: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize' },
];

/**
 * Interactive AOI rectangle with drag-to-move and handle resize.
 * @param props - AOI data, styling, and change handlers
 * @returns Editable AOI overlay element
 */
export function AoiRectEditor({
    aoi,
    color,
    percentage,
    selected,
    onSelect,
    onChange,
    containerRef,
    disabled = false,
}: AoiRectEditorProps): ReactElement {
    const dragRef = useRef<{
        mode: DragMode;
        startX: number;
        startY: number;
        origin: ManualAOI;
    } | null>(null);

    const toPercent = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
        const el = containerRef.current;
        if (!el) return { x: 0, y: 0 };
        const rect = el.getBoundingClientRect();
        return {
            x: Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)),
            y: Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100)),
        };
    }, [containerRef]);

    const applyDrag = useCallback((clientX: number, clientY: number): void => {
        const drag = dragRef.current;
        if (!drag) return;
        const pos = toPercent(clientX, clientY);
        const dx = pos.x - drag.startX;
        const dy = pos.y - drag.startY;
        const o = drag.origin;
        const next = { ...o };

        switch (drag.mode) {
            case 'move':
                next.x = o.x + dx;
                next.y = o.y + dy;
                break;
            case 'se':
                next.width = o.width + dx;
                next.height = o.height + dy;
                break;
            case 'sw':
                next.x = o.x + dx;
                next.width = o.width - dx;
                next.height = o.height + dy;
                break;
            case 'ne':
                next.y = o.y + dy;
                next.width = o.width + dx;
                next.height = o.height - dy;
                break;
            case 'nw':
                next.x = o.x + dx;
                next.y = o.y + dy;
                next.width = o.width - dx;
                next.height = o.height - dy;
                break;
            case 'n':
                next.y = o.y + dy;
                next.height = o.height - dy;
                break;
            case 's':
                next.height = o.height + dy;
                break;
            case 'w':
                next.x = o.x + dx;
                next.width = o.width - dx;
                break;
            case 'e':
                next.width = o.width + dx;
                break;
            default:
                break;
        }

        onChange(clampAoiBounds(next));
    }, [onChange, toPercent]);

    const startDrag = (mode: DragMode, e: React.MouseEvent): void => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        const pos = toPercent(e.clientX, e.clientY);
        dragRef.current = { mode, startX: pos.x, startY: pos.y, origin: { ...aoi } };

        const onMove = (ev: MouseEvent): void => applyDrag(ev.clientX, ev.clientY);
        const onUp = (): void => {
            dragRef.current = null;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    return (
        <div
            className="absolute z-20 border-2"
            style={{
                left: `${aoi.x}%`,
                top: `${aoi.y}%`,
                width: `${aoi.width}%`,
                height: `${aoi.height}%`,
                backgroundColor: `${color}20`,
                borderColor: color,
                boxShadow: selected ? `0 0 0 2px ${color}55` : undefined,
                pointerEvents: disabled ? 'none' : 'auto',
            }}
            onMouseDown={disabled ? undefined : (e) => startDrag('move', e)}
        >
            <span
                className="absolute top-1 left-1 text-[10px] font-bold px-1 rounded pointer-events-none"
                style={{ color, backgroundColor: `${color}15` }}
            >
                {aoi.label} — {percentage}%
            </span>
            {selected && HANDLES.map((h) => (
                <div
                    key={h.mode}
                    role="presentation"
                    aria-hidden
                    className={`absolute w-2 h-2 bg-white border-2 rounded-sm ${h.className}`}
                    style={{ borderColor: color, cursor: h.cursor }}
                    onMouseDown={(e) => startDrag(h.mode, e)}
                />
            ))}
        </div>
    );
}
