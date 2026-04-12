/**
 * Export Service
 *
 * Fetches all research data and generates an XLSX file with one row per participant
 * and columns for demographics, module responses, timing, and metadata.
 * Uses the xlsx library already available in the project.
 */

import apiClient from './api/client';
import * as XLSX from 'xlsx';

interface ExportParticipant {
    participantId: string;
    demographics: Record<string, string>;
    responses: Record<string, unknown>;
    startDate?: string;
    endDate?: string;
    duration?: number;
}

/**
 * Fetches all analytics data for a research and builds a flat export dataset.
 */
async function fetchExportData(researchId: string): Promise<{
    participants: ExportParticipant[];
    demographicKeys: string[];
    responseColumns: string[];
}> {
    // Fetch demographics
    const demoRes = await apiClient.get<{
        results: {
            participants: Array<{ participantId: string; demographics: Record<string, string> }>;
            demographicTypes: string[];
        };
    }>(`/analytics/research/${researchId}/demographics`);
    const demoData = demoRes.results;

    // Fetch cognitive tasks
    const cogRes = await apiClient.get<{
        results: {
            modules: Array<{
                moduleId: string;
                moduleName: string;
                questionText: string;
                responses: Array<{ participantId: string; value: unknown; metadata?: Record<string, unknown>; createdAt: string }>;
            }>;
        };
    }>(`/analytics/research/${researchId}/cognitive-tasks`);
    const cogModules = cogRes.results?.modules || [];

    // Fetch IAT
    const iatRes = await apiClient.get<{
        results: {
            modules: Array<{
                moduleId: string;
                moduleName: string;
                testType: string;
                totalResponses: number;
                scores: Array<{ attributeId: string; attributeLabel: string; targetScores: Record<string, number> }>;
            }>;
        };
    }>(`/analytics/research/${researchId}/implicit-association`);
    const iatModules = iatRes.results?.modules || [];

    // Fetch screener
    let screenerChoices: Array<{ participantId: string; value: string }> = [];
    try {
        const scrRes = await apiClient.get<{
            results: { responses?: Array<{ participantId: string; value: string }> };
        }>(`/analytics/research/${researchId}/screener`);
        screenerChoices = scrRes.results?.responses || [];
    } catch { /* no screener */ }

    // Build participant map
    const participantMap = new Map<string, ExportParticipant>();

    const getOrCreate = (pid: string): ExportParticipant => {
        if (!participantMap.has(pid)) {
            participantMap.set(pid, {
                participantId: pid,
                demographics: {},
                responses: {},
            });
        }
        return participantMap.get(pid)!;
    };

    // Fill demographics
    for (const p of demoData.participants) {
        const ep = getOrCreate(p.participantId);
        ep.demographics = p.demographics;
    }

    // Fill cognitive task responses
    const responseColumns: string[] = [];
    for (const mod of cogModules) {
        const colName = mod.moduleName || mod.questionText || mod.moduleId;
        responseColumns.push(colName);
        for (const r of mod.responses) {
            const ep = getOrCreate(r.participantId);
            ep.responses[colName] = typeof r.value === 'object' ? JSON.stringify(r.value) : r.value;
            if (r.metadata?.duration && typeof r.metadata.duration === 'number') {
                ep.duration = (ep.duration || 0) + r.metadata.duration;
            }
            if (r.createdAt) {
                if (!ep.startDate || r.createdAt < ep.startDate) ep.startDate = r.createdAt;
                if (!ep.endDate || r.createdAt > ep.endDate) ep.endDate = r.createdAt;
            }
        }
    }

    // Fill screener
    if (screenerChoices.length > 0) {
        responseColumns.unshift('Screener');
        for (const r of screenerChoices) {
            const ep = getOrCreate(r.participantId);
            ep.responses['Screener'] = r.value;
        }
    }

    // Fill IAT scores as columns
    for (const mod of iatModules) {
        for (const score of mod.scores) {
            for (const [targetId] of Object.entries(score.targetScores)) {
                const colName = `${mod.moduleName} — ${score.attributeLabel} × ${targetId}`;
                if (!responseColumns.includes(colName)) responseColumns.push(colName);
                // IAT scores are aggregated, not per-participant — add to all participants with responses
            }
        }
    }

    return {
        participants: Array.from(participantMap.values()),
        demographicKeys: demoData.demographicTypes || [],
        responseColumns,
    };
}

/**
 * Generates and downloads an XLSX file for a research.
 */
export async function downloadResearchExport(researchId: string, researchName: string): Promise<void> {
    const { participants, demographicKeys, responseColumns } = await fetchExportData(researchId);

    // Build header row
    const headers = [
        'participantId',
        ...demographicKeys,
        ...responseColumns,
        'startDate',
        'endDate',
        'duration',
    ];

    // Build data rows
    const rows = participants.map(p => {
        const row: Record<string, unknown> = { participantId: p.participantId };

        for (const dk of demographicKeys) {
            row[dk] = p.demographics[dk] || '';
        }

        for (const rc of responseColumns) {
            const val = p.responses[rc];
            row[rc] = val !== undefined && val !== null ? String(val) : '';
        }

        row['startDate'] = p.startDate || '';
        row['endDate'] = p.endDate || '';
        row['duration'] = p.duration ? formatDuration(p.duration) : '';

        return row;
    });

    // Generate XLSX
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

    // Auto-width columns
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length, 12) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Responses');

    // Download
    const fileName = `${researchName.replace(/[^a-zA-Z0-9_-]/g, '_')}_export.xlsx`;
    XLSX.writeFile(wb, fileName);
}

function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
