import { type ReactNode, useState, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────

type Alignment = 'left' | 'center' | 'right';

export interface DataTableColumn<T> {
    /** Unique key for the column */
    key: string;
    /** Header label */
    header: string;
    /** Custom header renderer (overrides header string) */
    headerRender?: () => ReactNode;
    /** Text alignment (default: 'left') */
    align?: Alignment;
    /** Custom cell renderer. Receives the row and row index. */
    render?: (row: T, index: number) => ReactNode;
    /** Property name to read from the row (used when render is not provided) */
    accessor?: keyof T;
    /** Enable sorting on this column (requires accessor) */
    sortable?: boolean;
    /** Header className override */
    headerClassName?: string;
    /** Cell className override */
    cellClassName?: string;
}

export interface DataTableProps<T> {
    /** Column definitions */
    columns: DataTableColumn<T>[];
    /** Row data array */
    data: T[];
    /** Unique key extractor per row */
    rowKey: (row: T, index: number) => string;
    /** Size variant */
    size?: 'default' | 'compact';
    /** Row click handler */
    onRowClick?: (row: T, index: number) => void;
    /** Message when data is empty */
    emptyMessage?: string;
    /** Extra className for the container */
    className?: string;
    /** Sticky header */
    stickyHeader?: boolean;
}

// ─── Styles ──────────────────────────────────────────────────────────

const ALIGN_CLASSES: Record<Alignment, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
};

const SIZE_STYLES = {
    default: {
        table: 'text-sm',
        th: 'py-2.5 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider',
        td: 'py-2.5 px-3',
    },
    compact: {
        table: 'text-xs',
        th: 'py-1.5 px-2 text-xs font-medium text-gray-500',
        td: 'py-1.5 px-2',
    },
};

// ─── Component ───────────────────────────────────────────────────────

export function DataTable<T>({
    columns,
    data,
    rowKey,
    size = 'default',
    onRowClick,
    emptyMessage = 'No data available.',
    className,
    stickyHeader = false,
}: DataTableProps<T>) {
    const styles = SIZE_STYLES[size];

    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const handleSort = (col: DataTableColumn<T>) => {
        if (!col.sortable || !col.accessor) return;
        if (sortKey === col.key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(col.key);
            setSortDir('asc');
        }
    };

    const sortedData = useMemo(() => {
        if (!sortKey) return data;
        const col = columns.find((c) => c.key === sortKey);
        if (!col?.accessor) return data;
        const accessor = col.accessor;
        return [...data].sort((a, b) => {
            const aVal = a[accessor];
            const bVal = b[accessor];
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
            }
            const aStr = String(aVal);
            const bStr = String(bVal);
            return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });
    }, [data, sortKey, sortDir, columns]);

    return (
        <div className={cn('overflow-x-auto', className)}>
            <table className={cn('w-full', styles.table)}>
                <thead>
                    <tr className="border-b border-gray-200">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={cn(
                                    styles.th,
                                    ALIGN_CLASSES[col.align || 'left'],
                                    col.sortable && 'cursor-pointer select-none hover:text-gray-700',
                                    stickyHeader && 'sticky top-0 bg-white z-10',
                                    col.headerClassName,
                                )}
                                onClick={col.sortable ? () => handleSort(col) : undefined}
                            >
                                {col.headerRender ? col.headerRender() : (
                                    <span className="inline-flex items-center gap-1">
                                        {col.header}
                                        {col.sortable && sortKey === col.key && (
                                            sortDir === 'asc'
                                                ? <ChevronUp className="h-3 w-3" />
                                                : <ChevronDown className="h-3 w-3" />
                                        )}
                                    </span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="py-8 text-center text-gray-400 text-sm"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        sortedData.map((row, i) => (
                            <tr
                                key={rowKey(row, i)}
                                onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                                className={cn(
                                    'border-b border-gray-50 transition-colors',
                                    onRowClick && 'cursor-pointer hover:bg-gray-50',
                                    !onRowClick && 'hover:bg-gray-50/50',
                                )}
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={cn(
                                            styles.td,
                                            ALIGN_CLASSES[col.align || 'left'],
                                            col.cellClassName,
                                        )}
                                    >
                                        {col.render
                                            ? col.render(row, i)
                                            : col.accessor
                                                ? String(row[col.accessor] ?? '')
                                                : null}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
