/**
 * Website Tracking PDF Report
 * Shows a section picker matching the tab/subtab structure, then generates
 * a print-optimized HTML report. Uses window.print() — no extra dependencies.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { FileText } from 'lucide-react';
import * as trackingService from '../../../services/tracking.service';
import { useResearch } from '../../../hooks/useResearchQuery';

interface ReportSections {
    funnels_custom: boolean;
    funnels_pageVisits: boolean;
    funnels_transitions: boolean;
    heatmaps_click: boolean;
    heatmaps_scroll: boolean;
    heatmaps_attention: boolean;
    heatmaps_density: boolean;
    sessions: boolean;
    live: boolean;
    aiAnalysis: boolean;
}

const DEFAULT_SECTIONS: ReportSections = {
    funnels_custom: true,
    funnels_pageVisits: true,
    funnels_transitions: true,
    heatmaps_click: true,
    heatmaps_scroll: true,
    heatmaps_attention: true,
    heatmaps_density: false,
    sessions: true,
    live: false,
    aiAnalysis: true,
};

interface SectionGroup {
    label: string;
    items: Array<{ key: keyof ReportSections; label: string }>;
}

const SECTION_GROUPS: SectionGroup[] = [
    {
        label: 'Funnels',
        items: [
            { key: 'funnels_custom', label: 'Custom Funnels' },
            { key: 'funnels_pageVisits', label: 'Page Visits' },
            { key: 'funnels_transitions', label: 'Transitions' },
        ],
    },
    {
        label: 'Heatmaps',
        items: [
            { key: 'heatmaps_click', label: 'Click' },
            { key: 'heatmaps_scroll', label: 'Scroll' },
            { key: 'heatmaps_attention', label: 'Attention' },
            { key: 'heatmaps_density', label: 'Density' },
        ],
    },
    {
        label: 'Sessions',
        items: [
            { key: 'sessions', label: 'Visitor journeys' },
        ],
    },
    {
        label: 'Live',
        items: [
            { key: 'live', label: 'Active visitors snapshot' },
        ],
    },
    {
        label: 'AI Analysis',
        items: [
            { key: 'aiAnalysis', label: 'Professional UX analysis (GPT-4o)' },
        ],
    },
];

export const WebTrackingReportButton = ({ researchId }: { researchId: string }) => {
    const { data: research } = useResearch(researchId);
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const [sections, setSections] = useState<ReportSections>(DEFAULT_SECTIONS);
    const [lang, setLang] = useState<'en' | 'es'>('en');
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showPicker) return;
        const handler = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showPicker]);

    const toggleSection = (key: keyof ReportSections) => {
        setSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleGroup = (group: SectionGroup) => {
        const allChecked = group.items.every(item => sections[item.key]);
        setSections(prev => {
            const next = { ...prev };
            for (const item of group.items) next[item.key] = !allChecked;
            return next;
        });
    };

    const selectedCount = Object.values(sections).filter(Boolean).length;

    const handleGenerate = useCallback(async () => {
        setGenerating(true);
        setShowPicker(false);
        setProgress(0);
        setProgressLabel('Loading overview...');

        try {
            const needsFunnels = sections.funnels_custom || sections.funnels_pageVisits || sections.funnels_transitions;
            const needsHeatmaps = sections.heatmaps_click || sections.heatmaps_scroll || sections.heatmaps_attention || sections.heatmaps_density;
            const needsSessions = sections.sessions;
            const needsLive = sections.live;
            const needsAI = sections.aiAnalysis;

            // Count total steps for progress
            let totalSteps = 2; // overview + pages always
            if (needsFunnels) totalSteps++;
            if (needsSessions) totalSteps++;
            if (needsLive) totalSteps++;
            if (needsHeatmaps && sections.heatmaps_scroll) totalSteps++;
            if (needsHeatmaps) totalSteps++;
            if (needsAI) totalSteps++;
            totalSteps++; // final render step
            let step = 0;

            const advance = (label: string) => {
                step++;
                setProgress(Math.round((step / totalSteps) * 100));
                setProgressLabel(label);
            };

            const overview = await trackingService.getOverview(researchId);
            advance('Loading pages...');

            const pages = await trackingService.getTrackedPages(researchId);
            advance(needsFunnels ? 'Loading funnels...' : needsHeatmaps ? 'Loading heatmap data...' : 'Processing...');

            let config: trackingService.TrackingConfig | null = null;
            if (needsFunnels) {
                config = await trackingService.getTrackingConfig(researchId);
                advance('Loading heatmap data...');
            }

            let visitors: trackingService.VisitorJourneysResponse | null = null;
            if (needsSessions) {
                visitors = await trackingService.getVisitorJourneys(researchId, 20, 0);
                advance('Loading sessions...');
            }

            let liveSessions: trackingService.LiveSessionsResponse | null = null;
            if (needsLive) {
                liveSessions = await trackingService.getLiveSessions(researchId);
                advance('Loading scroll data...');
            }

            let scrollDepth: { depths: Array<{ depthPct: number; percentage: number }> } | null = null;
            if (needsHeatmaps && sections.heatmaps_scroll) {
                scrollDepth = await trackingService.getScrollDepth(researchId);
                advance('Loading friction data...');
            }

            let friction: { tags: Record<string, number> } | null = null;
            if (needsHeatmaps) {
                friction = await trackingService.getFrictionSummary(researchId);
                advance(needsAI ? 'Running AI analysis...' : 'Building report...');
            }

            let aiReport: trackingService.TrackingReport | null = null;
            if (needsAI) {
                aiReport = await trackingService.generateTrackingReport(researchId, sections);
                advance('Building report...');
            }

            setProgress(100);
            setProgressLabel('Opening report...');

            openTrackingReport(research?.name || 'Website Tracking', {
                sections,
                overview,
                pages,
                funnels: config?.funnels || [],
                visitors: visitors?.visitors || [],
                liveSessions: liveSessions?.sessions || [],
                scrollDepth: scrollDepth || { depths: [] },
                friction: friction?.tags || {},
                aiReport,
                lang,
            });
        } catch (e) {
            console.error('Failed to generate report:', e);
        } finally {
            setGenerating(false);
            setProgress(0);
            setProgressLabel('');
        }
    }, [researchId, research?.name, sections, lang]);

    return (
        <div className="relative" ref={pickerRef}>
            {generating ? (
                <div className="relative overflow-hidden px-2.5 py-1.5 text-white bg-blue-600 border border-blue-600 rounded-lg text-center" style={{ height: 28 }}>
                    <div className="absolute inset-0 bg-blue-700 transition-all duration-300" style={{ width: `${progress}%` }} />
                    <div className="relative flex items-center justify-center gap-1 h-full">
                        <span className="text-[9px] font-semibold">{progress}%</span>
                        <span className="text-[8px] text-blue-200 truncate max-w-[80px]">{progressLabel}</span>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowPicker(!showPicker)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <FileText className="h-3.5 w-3.5" />
                    PDF Report
                </button>
            )}

            {showPicker && (
                <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Include in report:</p>
                    <div className="space-y-2">
                        {SECTION_GROUPS.map((group) => {
                            const allChecked = group.items.every(item => sections[item.key]);
                            const someChecked = group.items.some(item => sections[item.key]);
                            return (
                                <div key={group.label}>
                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={allChecked}
                                            ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                                            onChange={() => toggleGroup(group)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                        />
                                        <span className="text-xs font-medium text-slate-700">{group.label}</span>
                                    </label>
                                    {group.items.length > 1 && (
                                        <div className="ml-6 space-y-0.5">
                                            {group.items.map((item) => (
                                                <label key={item.key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={sections[item.key]}
                                                        onChange={() => toggleSection(item.key)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                                                    />
                                                    <span className="text-[11px] text-slate-500">{item.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400">{selectedCount} selected</span>
                            <div className="flex rounded-md border border-gray-200 overflow-hidden">
                                <button
                                    onClick={() => setLang('en')}
                                    className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${lang === 'en' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                >EN</button>
                                <button
                                    onClick={() => setLang('es')}
                                    className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${lang === 'es' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                >ES</button>
                            </div>
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={selectedCount === 0}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            Generate
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Report HTML Generator ───────────────────────────────────────────

interface ReportInput {
    sections: ReportSections;
    overview: trackingService.TrackingOverview;
    pages: trackingService.TrackedPage[];
    funnels: trackingService.FunnelDefinition[];
    visitors: trackingService.VisitorJourney[];
    liveSessions: trackingService.LiveVisitor[];
    scrollDepth: { depths: Array<{ depthPct: number; percentage: number }> };
    friction: Record<string, number>;
    aiReport: trackingService.TrackingReport | null;
    lang: 'en' | 'es';
}

const i18n = {
    en: {
        title: 'Website Tracking Report',
        generated: 'Generated',
        overview: 'Overview',
        uniqueVisitors: 'Unique Visitors',
        sessions: 'Sessions',
        pagesTracked: 'Pages Tracked',
        totalEvents: 'Total Events',
        avgDuration: 'Avg. Duration',
        customFunnels: 'Custom Funnels',
        pageVisits: 'Page Visits',
        transitions: 'Top Page Transitions',
        page: 'Page',
        views: 'Views',
        events: 'Events',
        step: 'Step',
        from: 'From',
        to: 'To',
        heatmaps: 'Heatmaps',
        heatmapLayers: 'Heatmap layers included in this analysis:',
        clickDist: 'Click Distribution — Top Pages',
        totalClicks: 'Total Clicks',
        scrollDepth: 'Scroll Depth',
        depth: 'Depth',
        reached: 'Reached',
        frictionEvents: 'Friction Events',
        frictionDetected: 'friction events detected.',
        sessionsSummary: 'Sessions — Visitor Summary',
        visitorsRecorded: 'visitors recorded.',
        visitor: 'Visitor',
        pages_: 'Pages',
        lastSeen: 'Last Seen',
        liveSnapshot: 'Live — Snapshot',
        activeVisitors: 'active visitor(s) at time of report generation.',
        currentPage: 'Current Page',
        aiAnalysis: 'Professional Analysis',
        usabilityScore: 'Usability Score',
        engagement: 'Engagement',
        funnelFlow: 'Funnel & Page Flow',
        scrollBehavior: 'Scroll Behavior',
        frictionAnalysis: 'Friction Analysis',
        keyFindings: 'Key Findings',
        recommendations: 'Recommendations',
        topIssues: 'Top Issues',
        issue: 'Issue',
        severity: 'Severity',
        suggestion: 'Suggestion',
        printBtn: 'Print / Save PDF',
    },
    es: {
        title: 'Reporte de Tracking Web',
        generated: 'Generado',
        overview: 'Resumen',
        uniqueVisitors: 'Visitantes Únicos',
        sessions: 'Sesiones',
        pagesTracked: 'Páginas Rastreadas',
        totalEvents: 'Eventos Totales',
        avgDuration: 'Duración Prom.',
        customFunnels: 'Embudos Personalizados',
        pageVisits: 'Visitas por Página',
        transitions: 'Transiciones Principales',
        page: 'Página',
        views: 'Visitas',
        events: 'Eventos',
        step: 'Paso',
        from: 'Desde',
        to: 'Hacia',
        heatmaps: 'Mapas de Calor',
        heatmapLayers: 'Capas de mapa de calor incluidas en este análisis:',
        clickDist: 'Distribución de Clicks — Páginas Principales',
        totalClicks: 'Total Clicks',
        scrollDepth: 'Profundidad de Scroll',
        depth: 'Profundidad',
        reached: 'Alcanzado',
        frictionEvents: 'Eventos de Fricción',
        frictionDetected: 'eventos de fricción detectados.',
        sessionsSummary: 'Sesiones — Resumen de Visitantes',
        visitorsRecorded: 'visitantes registrados.',
        visitor: 'Visitante',
        pages_: 'Páginas',
        lastSeen: 'Última Visita',
        liveSnapshot: 'En Vivo — Captura',
        activeVisitors: 'visitante(s) activo(s) al momento de generar el reporte.',
        currentPage: 'Página Actual',
        aiAnalysis: 'Análisis Profesional',
        usabilityScore: 'Puntaje de Usabilidad',
        engagement: 'Engagement',
        funnelFlow: 'Embudo y Flujo de Páginas',
        scrollBehavior: 'Comportamiento de Scroll',
        frictionAnalysis: 'Análisis de Fricción',
        keyFindings: 'Hallazgos Clave',
        recommendations: 'Recomendaciones',
        topIssues: 'Problemas Principales',
        issue: 'Problema',
        severity: 'Severidad',
        suggestion: 'Sugerencia',
        printBtn: 'Imprimir / Guardar PDF',
    },
};

function openTrackingReport(researchName: string, data: ReportInput) {
    const { sections, overview, pages, funnels, visitors, liveSessions, scrollDepth, friction, aiReport, lang } = data;
    const t = i18n[lang];
    const topPages = [...pages].sort((a, b) => b.sessionCount - a.sessionCount).slice(0, 10);
    const frictionEntries = Object.entries(friction).sort((a, b) => b[1] - a[1]);
    const totalFriction = frictionEntries.reduce((sum, [, v]) => sum + v, 0);

    let body = '';

    // Always show overview
    body += `
<h2>${t.overview}</h2>
<div class="metrics">
  <div class="metric"><div class="metric-value">${overview.uniqueVisitors}</div><div class="metric-label">${t.uniqueVisitors}</div></div>
  <div class="metric"><div class="metric-value">${overview.totalSessions}</div><div class="metric-label">${t.sessions}</div></div>
  <div class="metric"><div class="metric-value">${overview.pagesTracked}</div><div class="metric-label">${t.pagesTracked}</div></div>
  <div class="metric"><div class="metric-value">${overview.totalEvents.toLocaleString()}</div><div class="metric-label">${t.totalEvents}</div></div>
  <div class="metric"><div class="metric-value">${formatDur(overview.avgSessionDuration)}</div><div class="metric-label">${t.avgDuration}</div></div>
</div>`;

    // Funnels
    if (sections.funnels_custom && funnels.length > 0) {
        body += `<h2>${t.customFunnels}</h2>`;
        for (const funnel of funnels) {
            body += `
<h3>${funnel.name}</h3>
<table>
  <thead><tr><th>#</th><th>${t.step}</th><th>URL</th></tr></thead>
  <tbody>
    ${funnel.steps.map((s, i) => `<tr><td>${i + 1}</td><td>${s.label || '—'}</td><td class="url">${shortenUrl(s.url)}</td></tr>`).join('')}
  </tbody>
</table>`;
        }
    }

    if (sections.funnels_pageVisits && topPages.length > 0) {
        body += `
<h2>${t.pageVisits}</h2>
<table>
  <thead><tr><th>${t.page}</th><th>${t.views}</th><th>${t.events}</th></tr></thead>
  <tbody>
    ${topPages.map(p => `<tr><td>${p.pageTitle || shortenUrl(p.pageUrl)}</td><td>${p.sessionCount}</td><td>${p.eventCount}</td></tr>`).join('')}
  </tbody>
</table>`;
    }

    if (sections.funnels_transitions && topPages.length > 1) {
        body += `
<h2>${t.transitions}</h2>
<table>
  <thead><tr><th>${t.from}</th><th>${t.to}</th></tr></thead>
  <tbody>
    ${topPages.slice(0, -1).map((p, i) => `<tr><td>${p.pageTitle || shortenUrl(p.pageUrl)}</td><td>${topPages[i + 1].pageTitle || shortenUrl(topPages[i + 1].pageUrl)}</td></tr>`).join('')}
  </tbody>
</table>`;
    }

    // Heatmaps section
    const heatmapSections: string[] = [];
    if (sections.heatmaps_click) heatmapSections.push(lang === 'es' ? 'Click — muestra dónde hacen click los usuarios' : 'Click heatmap — shows where users click on each page');
    if (sections.heatmaps_scroll) heatmapSections.push(lang === 'es' ? 'Scroll — profundidad de desplazamiento' : 'Scroll depth — how far users scroll');
    if (sections.heatmaps_attention) heatmapSections.push(lang === 'es' ? 'Atención — tiempo de visualización por zona' : 'Attention — time spent viewing each zone');
    if (sections.heatmaps_density) heatmapSections.push(lang === 'es' ? 'Densidad — concentración de clicks' : 'Density — click concentration areas');

    if (heatmapSections.length > 0) {
        body += `<h2>${t.heatmaps}</h2>
<p class="note">${t.heatmapLayers}</p>
<ul>${heatmapSections.map(s => `<li>${s}</li>`).join('')}</ul>`;

        if (sections.heatmaps_click) {
            body += `
<h3>${t.clickDist}</h3>
<table>
  <thead><tr><th>${t.page}</th><th>${t.totalClicks}</th><th>${t.sessions}</th></tr></thead>
  <tbody>
    ${topPages.slice(0, 5).map(p => `<tr><td>${p.pageTitle || shortenUrl(p.pageUrl)}</td><td>${p.eventCount}</td><td>${p.sessionCount}</td></tr>`).join('')}
  </tbody>
</table>`;
        }

        if (sections.heatmaps_scroll && scrollDepth.depths.length > 0) {
            body += `
<h3>${t.scrollDepth}</h3>
<table>
  <thead><tr><th>${t.depth}</th><th>${t.reached}</th><th></th></tr></thead>
  <tbody>
    ${scrollDepth.depths.map(d => `<tr>
      <td>${d.depthPct}%</td>
      <td>${d.percentage}%</td>
      <td><div class="bar-container"><div class="bar-fill" style="width:${d.percentage}%;background:#3b82f6">${d.percentage > 10 ? d.percentage + '%' : ''}</div></div></td>
    </tr>`).join('')}
  </tbody>
</table>`;
        }

        if (frictionEntries.length > 0 && (sections.heatmaps_click || sections.heatmaps_attention)) {
            body += `
<h3>${t.frictionEvents}</h3>
<p class="note">${totalFriction} ${t.frictionDetected}</p>
<div class="metrics">
  ${frictionEntries.map(([tag, count]) => {
      const colors: Record<string, string> = { 'dead-click': '#f59e0b', 'rage-click': '#ef4444', 'speed-browsing': '#3b82f6', 'mouse-out': '#6b7280' };
      return `<div class="metric" style="border-color:${colors[tag] || '#e2e8f0'}">
        <div class="metric-value" style="color:${colors[tag] || '#0f172a'}">${count}</div>
        <div class="metric-label">${tag.replace(/-/g, ' ')}</div>
      </div>`;
  }).join('')}
</div>`;
        }
    }

    // Sessions
    if (sections.sessions && visitors.length > 0) {
        body += `
<h2>${t.sessionsSummary}</h2>
<p class="note">${visitors.length} ${t.visitorsRecorded}</p>
<table>
  <thead><tr><th>${t.visitor}</th><th>${t.sessions}</th><th>${t.pages_}</th><th>${t.lastSeen}</th></tr></thead>
  <tbody>
    ${visitors.slice(0, 20).map(v => `<tr>
      <td class="mono">${v.visitorId.slice(0, 14)}...</td>
      <td>${v.sessionCount}</td>
      <td>${v.pages.length}</td>
      <td class="url">${new Date(v.lastSeen as string).toLocaleDateString(lang === 'es' ? 'es' : 'en-US')}</td>
    </tr>`).join('')}
  </tbody>
</table>`;
    }

    // Live
    if (sections.live) {
        body += `
<h2>${t.liveSnapshot}</h2>
<p class="note">${liveSessions.length} ${t.activeVisitors}</p>`;
        if (liveSessions.length > 0) {
            body += `<table>
  <thead><tr><th>${t.visitor}</th><th>${t.currentPage}</th></tr></thead>
  <tbody>
    ${liveSessions.slice(0, 10).map(s => `<tr><td class="mono">${s.visitorId.slice(0, 14)}...</td><td class="url">${s.pages[0] ? shortenUrl(s.pages[0].pageUrl) : '—'}</td></tr>`).join('')}
  </tbody>
</table>`;
        }
    }

    // AI Analysis
    if (sections.aiAnalysis && aiReport) {
        const severityColors: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#6b7280' };

        body += `
<h2>${t.aiAnalysis}</h2>
<div class="metrics">
  <div class="metric" style="min-width:160px"><div class="metric-value" style="color:#2563eb">${aiReport.usabilityScore}/100</div><div class="metric-label">${t.usabilityScore}</div></div>
</div>

<p class="overview">${aiReport.overview}</p>

${aiReport.engagementAnalysis ? `<h3>${t.engagement}</h3><p class="note">${aiReport.engagementAnalysis}</p>` : ''}
${aiReport.funnelAnalysis ? `<h3>${t.funnelFlow}</h3><p class="note">${aiReport.funnelAnalysis}</p>` : ''}
${aiReport.scrollBehavior ? `<h3>${t.scrollBehavior}</h3><p class="note">${aiReport.scrollBehavior}</p>` : ''}
${aiReport.frictionAnalysis ? `<h3>${t.frictionAnalysis}</h3><p class="note">${aiReport.frictionAnalysis}</p>` : ''}

<h3>${t.keyFindings}</h3>
${aiReport.keyFindings.map((f, i) => `<div class="finding"><div class="finding-num">${i + 1}</div><div class="finding-text">${f}</div></div>`).join('')}

<h3>${t.recommendations}</h3>
${aiReport.recommendations.map(r => `<div class="rec"><div class="rec-dot"></div><div class="rec-text">${r}</div></div>`).join('')}

${aiReport.topIssues.length > 0 ? `
<h3>${t.topIssues}</h3>
<table>
  <thead><tr><th>${t.issue}</th><th>${t.severity}</th><th>${t.suggestion}</th></tr></thead>
  <tbody>
    ${aiReport.topIssues.map(issue => `<tr>
      <td>${issue.issue}</td>
      <td><span style="color:${severityColors[issue.severity] || '#6b7280'};font-weight:600;text-transform:uppercase;font-size:0.75rem">${issue.severity}</span></td>
      <td class="note">${issue.suggestion}</td>
    </tr>`).join('')}
  </tbody>
</table>` : ''}`;
    }

    const html = `<!DOCTYPE html>
<html><head>
<title>${researchName} — ${t.title}</title>
<style>
  @media print { @page { margin: 1.5cm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.1rem; margin: 1.8rem 0 0.5rem; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.25rem; }
  h3 { font-size: 0.95rem; margin: 1rem 0 0.5rem; color: #475569; }
  .subtitle { color: #64748b; font-size: 0.85rem; margin-bottom: 1.5rem; }
  .note { font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem; }
  .metrics { display: flex; gap: 1rem; margin: 1rem 0; flex-wrap: wrap; }
  .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 1rem; text-align: center; min-width: 120px; }
  .metric-value { font-size: 1.5rem; font-weight: 700; color: #0f172a; }
  .metric-label { font-size: 0.75rem; color: #64748b; }
  table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; font-size: 0.85rem; }
  th { text-align: left; padding: 0.5rem; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 0.75rem; text-transform: uppercase; }
  td { padding: 0.5rem; border-bottom: 1px solid #f1f5f9; }
  .mono { font-family: monospace; font-size: 0.8rem; }
  .url { font-size: 0.8rem; color: #64748b; }
  ul { margin: 0.5rem 0 0.5rem 1.5rem; font-size: 0.85rem; color: #475569; }
  li { margin: 0.25rem 0; }
  .bar-container { width: 100%; height: 20px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; display: flex; align-items: center; padding-left: 6px; font-size: 0.7rem; font-weight: 600; color: white; }
  .overview { font-size: 0.95rem; color: #475569; margin: 1rem 0; }
  .finding { display: flex; gap: 0.75rem; margin: 0.5rem 0; align-items: flex-start; }
  .finding-num { width: 24px; height: 24px; border-radius: 50%; background: #dbeafe; color: #2563eb; font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .finding-text { font-size: 0.9rem; color: #475569; }
  .rec { display: flex; gap: 0.5rem; margin: 0.5rem 0; align-items: flex-start; }
  .rec-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; flex-shrink: 0; margin-top: 8px; }
  .rec-text { font-size: 0.9rem; color: #475569; }
  .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 0.75rem; display: flex; justify-content: space-between; }
  .print-btn { position: fixed; top: 1rem; right: 1rem; padding: 0.5rem 1rem; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
  @media print { .print-btn { display: none; } }
</style>
</head><body>
<button class="print-btn" onclick="window.print()">${t.printBtn}</button>

<h1>${researchName}</h1>
<p class="subtitle">${t.title} — ${t.generated} ${new Date().toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

${body}

<div class="footer">
  <span>EmotioCX — ${t.title}</span>
  <span>${new Date().toISOString().split('T')[0]}</span>
</div>
</body></html>`;

    // Render HTML in a hidden container, convert to PDF, download
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    document.body.appendChild(container);

    import('html2pdf.js').then((mod) => {
        const html2pdf = mod.default;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (html2pdf() as any)
            .set({
                margin: [10, 10, 10, 10],
                filename: `${researchName.replace(/[^a-zA-Z0-9]/g, '_')}_report.pdf`,
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
            })
            .from(container)
            .save()
            .then(() => {
                document.body.removeChild(container);
            });
    });
}

function formatDur(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function shortenUrl(url: string): string {
    try {
        const u = new URL(url);
        return u.pathname === '/' ? u.hostname : u.hostname + u.pathname;
    } catch { return url; }
}
