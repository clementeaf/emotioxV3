/**
 * Zone Registry — manages named regions over a stimulus surface.
 *
 * Zones can be DOM elements (auto-tracked via getBoundingClientRect)
 * or manual rects. A ResizeObserver keeps element-backed zones fresh.
 *
 * Fallback: when no zones are registered, `generateGrid(rows, cols, container)`
 * produces a uniform NxN grid with IDs compatible with HYBRID_AOI_GRID (`r{row}c{col}`).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ZoneRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Zone {
  readonly id: string;
  readonly label: string;
  readonly rect: ZoneRect;
  readonly priority: number;
}

interface ManagedEntry {
  readonly id: string;
  readonly label: string;
  readonly priority: number;
  element: HTMLElement | null;
  manualRect: ZoneRect | null;
}

export interface ZoneMatch {
  readonly zone: Zone;
  readonly distance: number;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const EMPTY_RECT: ZoneRect = { x: 0, y: 0, width: 0, height: 0 };

const isValidRect = (r: ZoneRect): boolean =>
  r.width > 0 && r.height > 0;

const containsPoint = (r: ZoneRect, px: number, py: number): boolean =>
  px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;

const rectFromElement = (el: HTMLElement): ZoneRect => {
  const b = el.getBoundingClientRect();
  return { x: b.x, y: b.y, width: b.width, height: b.height };
};

const resolveRect = (entry: ManagedEntry): ZoneRect => {
  const raw = entry.element ? rectFromElement(entry.element) : (entry.manualRect ?? EMPTY_RECT);
  return raw;
};

const toZone = (entry: ManagedEntry, rect: ZoneRect): Zone => ({
  id: entry.id,
  label: entry.label,
  rect,
  priority: entry.priority,
});

/**
 * Euclidean distance from point to nearest edge of rect.
 * Returns 0 when the point is inside.
 */
const distanceToRect = (r: ZoneRect, px: number, py: number): number => {
  const cx = Math.max(r.x, Math.min(px, r.x + r.width));
  const cy = Math.max(r.y, Math.min(py, r.y + r.height));
  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy);
};

// ---------------------------------------------------------------------------
// Grid generator (backward-compatible with HYBRID_AOI_GRID r{row}c{col} IDs)
// ---------------------------------------------------------------------------

const ROW_LABELS = [
  'Superior', 'Centro superior', 'Centro', 'Centro inferior', 'Inferior',
  'Fila 5', 'Fila 6', 'Fila 7', 'Fila 8', 'Fila 9',
];

const COL_LABELS = [
  'izquierda', 'centro izquierda', 'centro', 'centro derecha', 'derecha',
  'col 5', 'col 6', 'col 7', 'col 8', 'col 9',
];

const gridLabel = (row: number, col: number, rows: number, cols: number): string => {
  const rowPart = rows <= ROW_LABELS.length ? ROW_LABELS[row] : `Fila ${row}`;
  const colPart = cols <= COL_LABELS.length ? COL_LABELS[col] : `Col ${col}`;
  // 3x3 special: match existing HYBRID_AOI_GRID labels exactly
  const threeByThreeLabels: Record<string, string> = {
    '0-0': 'Superior izquierda', '0-1': 'Superior centro', '0-2': 'Superior derecha',
    '1-0': 'Centro izquierda',   '1-1': 'Centro',          '1-2': 'Centro derecha',
    '2-0': 'Inferior izquierda', '2-1': 'Inferior centro',  '2-2': 'Inferior derecha',
  };
  const key = `${row}-${col}`;
  const match = rows === 3 && cols === 3 ? threeByThreeLabels[key] : undefined;
  return match ?? `${rowPart} ${colPart}`;
};

/**
 * Generate a uniform NxN grid of zones over a container rect.
 * IDs follow the `r{row}c{col}` pattern for backward compatibility.
 */
export function generateGrid(
  rows: number,
  cols: number,
  container: ZoneRect,
): Zone[] {
  const cellW = container.width / cols;
  const cellH = container.height / rows;

  const zones: Zone[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      zones.push({
        id: `r${row}c${col}`,
        label: gridLabel(row, col, rows, cols),
        rect: {
          x: container.x + col * cellW,
          y: container.y + row * cellH,
          width: cellW,
          height: cellH,
        },
        priority: 0,
      });
    }
  }
  return zones;
}

// ---------------------------------------------------------------------------
// ZoneRegistry class
// ---------------------------------------------------------------------------

export class ZoneRegistry {
  private readonly entries = new Map<string, ManagedEntry>();
  private observer: ResizeObserver | null = null;
  private snapshotCache: Zone[] | null = null;

  constructor() {
    this.observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => { this.invalidateCache(); })
      : null;
  }

  // -- Mutation --

  register(
    id: string,
    label: string,
    source: HTMLElement | ZoneRect,
    priority = 0,
  ): void {
    this.unregister(id);

    const isElement = typeof (source as HTMLElement).getBoundingClientRect === 'function';
    const entry: ManagedEntry = {
      id,
      label,
      priority,
      element: isElement ? (source as HTMLElement) : null,
      manualRect: isElement ? null : (source as ZoneRect),
    };

    this.entries.set(id, entry);
    const element = entry.element;
    // ponytail: only observe elements, manual rects are static
    if (element) { this.observer?.observe(element); }
    this.invalidateCache();
  }

  unregister(id: string): void {
    const existing = this.entries.get(id);
    if (existing?.element) { this.observer?.unobserve(existing.element); }
    this.entries.delete(id);
    this.invalidateCache();
  }

  clear(): void {
    this.entries.forEach((entry) => {
      if (entry.element) { this.observer?.unobserve(entry.element); }
    });
    this.entries.clear();
    this.invalidateCache();
  }

  // -- Queries --

  /** Snapshot of all zones with valid rects, sorted by priority desc. */
  getZones(): readonly Zone[] {
    return this.snapshotCache ?? this.rebuildCache();
  }

  /** Number of registered zones (including those with zero-size rects). */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Find the zone at a viewport point.
   * When multiple zones contain the point, the highest-priority zone wins.
   * Returns null when no zone contains the point.
   */
  getZoneAt(x: number, y: number): ZoneMatch | null {
    const zones = this.getZones();
    const containing = zones.filter((z) => containsPoint(z.rect, x, y));

    // zones are pre-sorted by priority desc — first match is highest priority
    const best = containing[0];
    return best ? { zone: best, distance: 0 } : null;
  }

  /**
   * Find the nearest zone to a viewport point.
   * Unlike getZoneAt, this always returns a result (unless registry is empty).
   */
  getNearestZone(x: number, y: number): ZoneMatch | null {
    const zones = this.getZones();
    const first = zones[0];
    return first
      ? zones.reduce<ZoneMatch>(
          (best, z) => {
            const d = distanceToRect(z.rect, x, y);
            return d < best.distance ? { zone: z, distance: d } : best;
          },
          { zone: first, distance: distanceToRect(first.rect, x, y) },
        )
      : null;
  }

  /** Force re-read of all element rects. Useful after layout changes not caught by ResizeObserver. */
  updateAll(): void {
    this.invalidateCache();
  }

  // -- Lifecycle --

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.entries.clear();
    this.snapshotCache = null;
  }

  // -- Internal --

  private invalidateCache(): void {
    this.snapshotCache = null;
  }

  private rebuildCache(): Zone[] {
    const zones: Zone[] = [];
    this.entries.forEach((entry) => {
      const rect = resolveRect(entry);
      if (isValidRect(rect)) { zones.push(toZone(entry, rect)); }
    });
    // Sort by priority descending, stable by insertion order
    zones.sort((a, b) => b.priority - a.priority);
    this.snapshotCache = zones;
    return zones;
  }
}
