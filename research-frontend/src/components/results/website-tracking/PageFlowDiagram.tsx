/**
 * Page Flow Diagram — Top-Down Layout
 * Visual flowchart of visitor navigation between pages.
 * Nodes arranged in horizontal rows (by BFS depth), arrows flow downward.
 * Full-width, vertical scroll only.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as trackingService from '../../../services/tracking.service';

interface PageFlowDiagramProps {
    researchId: string;
}

// ─── Layout Constants ────────────────────────────────────────────────

const NODE_W = 180;
const NODE_H = 52;
const H_GAP = 32;     // horizontal gap between nodes in same row
const V_GAP = 56;     // vertical gap between rows (space for arrows)
const PAD_X = 24;
const PAD_Y = 24;
const MIN_ARROW_W = 1.5;
const MAX_ARROW_W = 6;

// ─── Types ───────────────────────────────────────────────────────────

interface LayoutNode {
    id: string;
    label: string;
    visitors: number;
    row: number;
    col: number;
    x: number;
    y: number;
}

interface LayoutEdge {
    from: string;
    to: string;
    count: number;
    strokeWidth: number;
}

// ─── Component ───────────────────────────────────────────────────────

export const PageFlowDiagram = ({ researchId }: PageFlowDiagramProps) => {
    const { data, isLoading } = useQuery({
        queryKey: ['tracking', researchId, 'funnels'],
        queryFn: () => trackingService.getFunnels(researchId),
        staleTime: 10_000,
    });

    const { nodes, edges, svgW, svgH } = useMemo(() => {
        if (!data || data.totalVisitors === 0) {
            return { nodes: [] as LayoutNode[], edges: [] as LayoutEdge[], svgW: 0, svgH: 0 };
        }
        return computeLayout(data.topPages, data.transitions);
    }, [data]);

    if (isLoading) {
        return <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />;
    }

    if (nodes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <p className="text-sm">No page flow data yet.</p>
            </div>
        );
    }

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const maxVisitors = Math.max(...nodes.map(n => n.visitors), 1);

    return (
        <div className="w-full">
            <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                width="100%"
                height={svgH}
                className="block"
            >
                <defs>
                    <marker
                        id="pfArrow"
                        markerWidth={8}
                        markerHeight={8}
                        refX={7}
                        refY={4}
                        orient="auto"
                    >
                        <polygon points="0 0, 8 4, 0 8" fill="#94A3B8" />
                    </marker>
                </defs>

                {/* Edges — drawn first so nodes render on top */}
                {edges.map((edge, i) => {
                    const from = nodeMap.get(edge.from);
                    const to = nodeMap.get(edge.to);
                    if (!from || !to) return null;

                    // Arrow exits from bottom center of source, enters top center of target
                    const x1 = from.x + NODE_W / 2;
                    const y1 = from.y + NODE_H;
                    const x2 = to.x + NODE_W / 2;
                    const y2 = to.y;

                    // Vertical Bézier
                    const dy = (y2 - y1) * 0.45;
                    const path = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;

                    // Label at midpoint
                    const lx = (x1 + x2) / 2;
                    const ly = (y1 + y2) / 2;
                    const pct = from.visitors > 0 ? Math.round(edge.count / from.visitors * 100) : 0;
                    const labelText = `${edge.count} (${pct}%)`;
                    const labelW = labelText.length * 5.5 + 12;

                    return (
                        <g key={`e-${i}`}>
                            <path
                                d={path}
                                fill="none"
                                stroke="#CBD5E1"
                                strokeWidth={edge.strokeWidth}
                                markerEnd="url(#pfArrow)"
                                opacity={0.65}
                            />
                            <rect
                                x={lx - labelW / 2}
                                y={ly - 8}
                                width={labelW}
                                height={16}
                                rx={8}
                                fill="white"
                                stroke="#E2E8F0"
                                strokeWidth={0.5}
                            />
                            <text
                                x={lx}
                                y={ly + 4}
                                textAnchor="middle"
                                fill="#94A3B8"
                                style={{ fontSize: 9, fontWeight: 600 }}
                            >
                                {labelText}
                            </text>
                        </g>
                    );
                })}

                {/* Nodes */}
                {nodes.map((node) => {
                    const intensity = node.visitors / maxVisitors;
                    const bgColor = getNodeColor(intensity);
                    const textColor = intensity > 0.5 ? '#fff' : '#1E293B';
                    const subColor = intensity > 0.5 ? 'rgba(255,255,255,0.75)' : '#64748B';

                    return (
                        <g key={node.id}>
                            {/* Shadow */}
                            <rect
                                x={node.x + 1}
                                y={node.y + 2}
                                width={NODE_W}
                                height={NODE_H}
                                rx={10}
                                fill="rgba(0,0,0,0.05)"
                            />
                            {/* Box */}
                            <rect
                                x={node.x}
                                y={node.y}
                                width={NODE_W}
                                height={NODE_H}
                                rx={10}
                                fill={bgColor}
                                stroke={intensity > 0.3 ? 'transparent' : '#E2E8F0'}
                                strokeWidth={1}
                            />
                            {/* Page label */}
                            <text
                                x={node.x + NODE_W / 2}
                                y={node.y + NODE_H / 2 - 5}
                                textAnchor="middle"
                                fill={textColor}
                                style={{ fontSize: 11, fontWeight: 600 }}
                            >
                                {truncate(node.label, 22)}
                            </text>
                            {/* Visitor count */}
                            <text
                                x={node.x + NODE_W / 2}
                                y={node.y + NODE_H / 2 + 10}
                                textAnchor="middle"
                                fill={subColor}
                                style={{ fontSize: 9, fontWeight: 500 }}
                            >
                                {node.visitors} visitors
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

// ─── Layout Algorithm (top-down) ─────────────────────────────────────

function computeLayout(
    topPages: Array<{ pageUrl: string; visitors: number }>,
    transitions: Array<{ from: string; to: string; count: number }>
) {
    if (topPages.length === 0) {
        return { nodes: [] as LayoutNode[], edges: [] as LayoutEdge[], svgW: 0, svgH: 0 };
    }

    // Build adjacency
    const outgoing = new Map<string, Array<{ to: string; count: number }>>();
    const incoming = new Map<string, Array<{ from: string; count: number }>>();
    for (const t of transitions) {
        const out = outgoing.get(t.from) || [];
        out.push({ to: t.to, count: t.count });
        outgoing.set(t.from, out);

        const inc = incoming.get(t.to) || [];
        inc.push({ from: t.from, count: t.count });
        incoming.set(t.to, inc);
    }

    const visitorsMap = new Map(topPages.map(p => [p.pageUrl, p.visitors]));

    // Find root: entry page (no incoming, or most visitors)
    const roots = topPages.filter(p => {
        const inc = incoming.get(p.pageUrl) || [];
        return inc.length === 0;
    });
    const rootUrl = roots[0]?.pageUrl || topPages[0].pageUrl;

    // BFS assigns rows (depth levels)
    const rowMap = new Map<string, number>();
    const queue: string[] = [rootUrl];
    rowMap.set(rootUrl, 0);

    while (queue.length > 0) {
        const url = queue.shift()!;
        const row = rowMap.get(url)!;
        const children = (outgoing.get(url) || [])
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        for (const child of children) {
            if (!rowMap.has(child.to)) {
                rowMap.set(child.to, row + 1);
                queue.push(child.to);
            }
        }
    }

    // Orphan pages → last row
    let maxRow = 0;
    for (const [, r] of rowMap) if (r > maxRow) maxRow = r;
    for (const p of topPages) {
        if (!rowMap.has(p.pageUrl)) {
            rowMap.set(p.pageUrl, maxRow + 1);
        }
    }

    // Group by row, sort by visitors within each row
    const rows = new Map<number, string[]>();
    for (const [url, row] of rowMap) {
        const arr = rows.get(row) || [];
        arr.push(url);
        rows.set(row, arr);
    }
    for (const [, arr] of rows) {
        arr.sort((a, b) => (visitorsMap.get(b) || 0) - (visitorsMap.get(a) || 0));
    }

    // Compute positions — center each row horizontally
    const rowCount = Math.max(...[...rows.keys()]) + 1;
    const maxNodesInRow = Math.max(...[...rows.values()].map(a => a.length), 1);
    const totalW = maxNodesInRow * NODE_W + (maxNodesInRow - 1) * H_GAP + PAD_X * 2;

    const nodes: LayoutNode[] = [];
    for (let row = 0; row < rowCount; row++) {
        const urls = rows.get(row) || [];
        const rowW = urls.length * NODE_W + (urls.length - 1) * H_GAP;
        const offsetX = (totalW - rowW) / 2; // center the row

        for (let col = 0; col < urls.length; col++) {
            const url = urls[col];
            nodes.push({
                id: url,
                label: shortenUrl(url),
                visitors: visitorsMap.get(url) || 0,
                row,
                col,
                x: offsetX + col * (NODE_W + H_GAP),
                y: PAD_Y + row * (NODE_H + V_GAP),
            });
        }
    }

    // Build edges
    const nodeIds = new Set(nodes.map(n => n.id));
    const maxCount = Math.max(...transitions.map(t => t.count), 1);
    const edges: LayoutEdge[] = transitions
        .filter(t => nodeIds.has(t.from) && nodeIds.has(t.to) && t.from !== t.to)
        .map(t => ({
            from: t.from,
            to: t.to,
            count: t.count,
            strokeWidth: MIN_ARROW_W + (t.count / maxCount) * (MAX_ARROW_W - MIN_ARROW_W),
        }));

    const svgW = Math.max(totalW, 400);
    const svgH = PAD_Y * 2 + rowCount * NODE_H + (rowCount - 1) * V_GAP;

    return { nodes, edges, svgW, svgH: Math.max(svgH, 150) };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function shortenUrl(url: string): string {
    try {
        const u = new URL(url);
        return u.pathname === '/' ? u.hostname : u.pathname;
    } catch {
        return url.length > 30 ? url.slice(0, 30) + '...' : url;
    }
}

function truncate(s: string, max: number): string {
    return s.length > max ? s.slice(0, max - 1) + '...' : s;
}

function getNodeColor(intensity: number): string {
    if (intensity > 0.7) return '#1D4ED8';
    if (intensity > 0.5) return '#2563EB';
    if (intensity > 0.3) return '#3B82F6';
    if (intensity > 0.15) return '#93C5FD';
    return '#F1F5F9';
}
