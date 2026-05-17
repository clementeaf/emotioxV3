/**
 * Page Flow Diagram — Top-Down Layout
 * Visual flowchart of visitor navigation between pages.
 * Nodes arranged in horizontal rows (by BFS depth), arrows flow downward.
 * Exit nodes show explicitly where visitors left the site.
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
const EXIT_W = 120;
const EXIT_H = 32;
const H_GAP = 32;
const V_GAP = 80;      // extra space for exit nodes between rows
const PAD_X = 24;
const PAD_Y = 24;
const EXIT_OFFSET_Y = 14; // distance below parent node for exit node
const MIN_ARROW_W = 1.5;
const MAX_ARROW_W = 6;

// ─── Types ───────────────────────────────────────────────────────────

interface LayoutNode {
    id: string;
    label: string;
    visitors: number;
    exits: number;
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

interface ExitNode {
    parentId: string;
    exits: number;
    exitPct: number;
    x: number;
    y: number;
}

// ─── Component ───────────────────────────────────────────────────────

export const PageFlowDiagram = ({ researchId }: PageFlowDiagramProps) => {
    const { data, isLoading } = useQuery({
        queryKey: ['tracking', researchId, 'funnels'],
        queryFn: () => trackingService.getFunnels(researchId),
        staleTime: 10_000,
    });

    const { nodes, edges, exitNodes, svgW, svgH } = useMemo(() => {
        if (!data || data.totalVisitors === 0) {
            return { nodes: [] as LayoutNode[], edges: [] as LayoutEdge[], exitNodes: [] as ExitNode[], svgW: 0, svgH: 0 };
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
                    <marker id="pfArrow" markerWidth={8} markerHeight={8} refX={7} refY={4} orient="auto">
                        <polygon points="0 0, 8 4, 0 8" fill="#94A3B8" />
                    </marker>
                    <marker id="pfArrowRed" markerWidth={8} markerHeight={8} refX={7} refY={4} orient="auto">
                        <polygon points="0 0, 8 4, 0 8" fill="#EF4444" />
                    </marker>
                </defs>

                {/* Flow edges (page → page) */}
                {edges.map((edge, i) => {
                    const from = nodeMap.get(edge.from);
                    const to = nodeMap.get(edge.to);
                    if (!from || !to) return null;

                    const x1 = from.x + NODE_W / 2;
                    const y1 = from.y + NODE_H;
                    const x2 = to.x + NODE_W / 2;
                    const y2 = to.y;

                    const dy = (y2 - y1) * 0.45;
                    const path = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;

                    const lx = (x1 + x2) / 2;
                    const ly = (y1 + y2) / 2;
                    const labelText = `${edge.count}×`;
                    const labelW = labelText.length * 6 + 12;

                    return (
                        <g key={`e-${i}`}>
                            <path d={path} fill="none" stroke="#CBD5E1" strokeWidth={edge.strokeWidth} markerEnd="url(#pfArrow)" opacity={0.65} />
                            <rect x={lx - labelW / 2} y={ly - 8} width={labelW} height={16} rx={8} fill="white" stroke="#E2E8F0" strokeWidth={0.5} />
                            <text x={lx} y={ly + 4} textAnchor="middle" fill="#94A3B8" style={{ fontSize: 9, fontWeight: 600 }}>{labelText}</text>
                        </g>
                    );
                })}

                {/* Exit edges (page → exit node) */}
                {exitNodes.map((exit, i) => {
                    const parent = nodeMap.get(exit.parentId);
                    if (!parent) return null;

                    const x1 = exit.x + EXIT_W / 2;
                    const y1 = parent.y + NODE_H;
                    const x2 = exit.x + EXIT_W / 2;
                    const y2 = exit.y;

                    return (
                        <g key={`exit-edge-${i}`}>
                            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 3" markerEnd="url(#pfArrowRed)" opacity={0.6} />
                        </g>
                    );
                })}

                {/* Page nodes */}
                {nodes.map((node) => {
                    const intensity = node.visitors / maxVisitors;
                    const bgColor = getNodeColor(intensity);
                    const textColor = intensity > 0.15 ? '#fff' : '#1E293B';
                    const subColor = intensity > 0.15 ? 'rgba(255,255,255,0.8)' : '#475569';

                    return (
                        <g key={node.id}>
                            <rect x={node.x + 1} y={node.y + 2} width={NODE_W} height={NODE_H} rx={10} fill="rgba(0,0,0,0.05)" />
                            <rect x={node.x} y={node.y} width={NODE_W} height={NODE_H} rx={10} fill={bgColor} stroke={intensity > 0.3 ? 'transparent' : '#E2E8F0'} strokeWidth={1} />
                            <text x={node.x + NODE_W / 2} y={node.y + NODE_H / 2 - 5} textAnchor="middle" fill={textColor} style={{ fontSize: 11, fontWeight: 600 }}>
                                {truncate(node.label, 22)}
                            </text>
                            <text x={node.x + NODE_W / 2} y={node.y + NODE_H / 2 + 10} textAnchor="middle" fill={subColor} style={{ fontSize: 9, fontWeight: 500 }}>
                                {node.visitors} visits
                            </text>
                        </g>
                    );
                })}

                {/* Exit nodes — explicit "left the site" boxes */}
                {exitNodes.map((exit, i) => (
                    <g key={`exit-${i}`}>
                        <rect x={exit.x} y={exit.y} width={EXIT_W} height={EXIT_H} rx={8} fill="#FEF2F2" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 3" />
                        <text x={exit.x + EXIT_W / 2} y={exit.y + EXIT_H / 2 - 4} textAnchor="middle" fill="#DC2626" style={{ fontSize: 9, fontWeight: 700 }}>
                            {exit.exits} left
                        </text>
                        <text x={exit.x + EXIT_W / 2} y={exit.y + EXIT_H / 2 + 8} textAnchor="middle" fill="#EF4444" style={{ fontSize: 8, fontWeight: 500 }}>
                            {exit.exitPct}% exit
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};

// ─── Layout Algorithm (top-down) ─────────────────────────────────────

function computeLayout(
    topPages: Array<{ pageUrl: string; visitors: number; exits?: number }>,
    transitions: Array<{ from: string; to: string; count: number }>
) {
    if (topPages.length === 0) {
        return { nodes: [] as LayoutNode[], edges: [] as LayoutEdge[], exitNodes: [] as ExitNode[], svgW: 0, svgH: 0 };
    }

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
    const exitsMap = new Map(topPages.map(p => [p.pageUrl, p.exits || 0]));

    // BFS from root
    const roots = topPages.filter(p => !(incoming.get(p.pageUrl) || []).length);
    const rootUrl = roots[0]?.pageUrl || topPages[0].pageUrl;

    const rowMap = new Map<string, number>();
    const queue: string[] = [rootUrl];
    rowMap.set(rootUrl, 0);

    while (queue.length > 0) {
        const url = queue.shift()!;
        const row = rowMap.get(url)!;
        const children = (outgoing.get(url) || []).sort((a, b) => b.count - a.count).slice(0, 5);
        for (const child of children) {
            if (!rowMap.has(child.to)) {
                rowMap.set(child.to, row + 1);
                queue.push(child.to);
            }
        }
    }

    // Orphans
    let maxRow = 0;
    for (const [, r] of rowMap) if (r > maxRow) maxRow = r;
    for (const p of topPages) {
        if (!rowMap.has(p.pageUrl)) rowMap.set(p.pageUrl, maxRow + 1);
    }

    // Group by row
    const rows = new Map<number, string[]>();
    for (const [url, row] of rowMap) {
        const arr = rows.get(row) || [];
        arr.push(url);
        rows.set(row, arr);
    }
    for (const [, arr] of rows) arr.sort((a, b) => (visitorsMap.get(b) || 0) - (visitorsMap.get(a) || 0));

    // Positions
    const rowCount = Math.max(...[...rows.keys()]) + 1;
    const maxNodesInRow = Math.max(...[...rows.values()].map(a => a.length), 1);
    const totalW = maxNodesInRow * NODE_W + (maxNodesInRow - 1) * H_GAP + PAD_X * 2;

    const nodes: LayoutNode[] = [];
    for (let row = 0; row < rowCount; row++) {
        const urls = rows.get(row) || [];
        const rowW = urls.length * NODE_W + (urls.length - 1) * H_GAP;
        const offsetX = (totalW - rowW) / 2;
        for (let col = 0; col < urls.length; col++) {
            const url = urls[col];
            nodes.push({
                id: url,
                label: shortenUrl(url),
                visitors: visitorsMap.get(url) || 0,
                exits: exitsMap.get(url) || 0,
                row, col,
                x: offsetX + col * (NODE_W + H_GAP),
                y: PAD_Y + row * (NODE_H + V_GAP),
            });
        }
    }

    // Edges
    const nodeIds = new Set(nodes.map(n => n.id));
    const maxCount = Math.max(...transitions.map(t => t.count), 1);
    const edges: LayoutEdge[] = transitions
        .filter(t => nodeIds.has(t.from) && nodeIds.has(t.to) && t.from !== t.to)
        .map(t => ({
            from: t.from, to: t.to, count: t.count,
            strokeWidth: MIN_ARROW_W + (t.count / maxCount) * (MAX_ARROW_W - MIN_ARROW_W),
        }));

    // Exit nodes — placed below+right of parent, offset to not overlap child arrows
    const exitNodes: ExitNode[] = [];
    for (const node of nodes) {
        if (node.exits > 0) {
            const exitPct = Math.round(node.exits / node.visitors * 100);
            // Position: to the right side of the node, below it
            exitNodes.push({
                parentId: node.id,
                exits: node.exits,
                exitPct,
                x: node.x + NODE_W - EXIT_W + 10, // align right edge
                y: node.y + NODE_H + EXIT_OFFSET_Y,
            });
        }
    }

    const svgW = Math.max(totalW, 400);
    const maxExitY = exitNodes.length > 0 ? Math.max(...exitNodes.map(e => e.y + EXIT_H)) : 0;
    const maxNodeY = nodes.length > 0 ? Math.max(...nodes.map(n => n.y + NODE_H)) : 0;
    const svgH = Math.max(maxNodeY, maxExitY) + PAD_Y * 2;

    return { nodes, edges, exitNodes, svgW, svgH: Math.max(svgH, 150) };
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
    if (intensity > 0.15) return '#60A5FA';
    return '#DBEAFE';
}
