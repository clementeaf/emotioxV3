/**
 * Biometrics Analytics — EEG and Wearable (Heart Rate/HRV)
 * Aggregates data from 'eeg-recording' and 'wearable-biometric' component_ids.
 */

import pool from '../../config/database';

// ─── EEG Analytics ──────────────────────────────────────────────

interface EEGStimulusResult {
    stimulusIndex: number;
    stimulusUrl: string;
    participantCount: number;
    avgAttention: number;
    avgMeditation: number;
    avgAlpha: number;
    avgBeta: number;
    avgDelta: number;
    avgTheta: number;
    avgGamma: number;
    avgSignalQuality: number;
}

export interface EEGAnalyticsResult {
    moduleId: string;
    moduleName: string;
    totalParticipants: number;
    stimuli: EEGStimulusResult[];
    baseline: {
        avgAttention: number;
        avgMeditation: number;
    } | null;
}

export async function getEEGResults(researchId: string): Promise<EEGAnalyticsResult[]> {
    const result = await pool.query(
        `SELECT r.participant_id, r.module_id, r.value, m.name AS module_name
         FROM responses r JOIN modules m ON m.id = r.module_id
         WHERE r.research_id = ? AND r.component_id = 'eeg-recording'`,
        [researchId]
    );

    const moduleMap = new Map<string, { name: string; rows: Array<{ participant_id: string; value: unknown }> }>();
    for (const row of result.rows) {
        const r = row as { participant_id: string; module_id: string; value: unknown; module_name: string };
        if (!moduleMap.has(r.module_id)) moduleMap.set(r.module_id, { name: r.module_name, rows: [] });
        moduleMap.get(r.module_id)!.rows.push({ participant_id: r.participant_id, value: r.value });
    }

    const results: EEGAnalyticsResult[] = [];

    for (const [moduleId, { name, rows }] of moduleMap) {
        const stimuliAgg = new Map<number, { url: string; participants: Set<string>; attention: number[]; meditation: number[]; alpha: number[]; beta: number[]; delta: number[]; theta: number[]; gamma: number[]; quality: number[] }>();
        let baselineAttention: number[] = [];
        let baselineMeditation: number[] = [];

        for (const row of rows) {
            try {
                const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;

                // Baseline
                if (Array.isArray(parsed.baseline) && parsed.baseline.length > 0) {
                    for (const s of parsed.baseline) {
                        baselineAttention.push(s.attentionIndex ?? 0);
                        baselineMeditation.push(s.meditationIndex ?? 0);
                    }
                }

                // Stimuli
                for (const stim of parsed.stimuli ?? []) {
                    const idx = stim.stimulusIndex ?? 0;
                    if (!stimuliAgg.has(idx)) {
                        stimuliAgg.set(idx, { url: stim.stimulusUrl || '', participants: new Set(), attention: [], meditation: [], alpha: [], beta: [], delta: [], theta: [], gamma: [], quality: [] });
                    }
                    const entry = stimuliAgg.get(idx)!;
                    entry.participants.add(row.participant_id);
                    entry.attention.push(stim.avgAttention ?? 0);
                    entry.meditation.push(stim.avgMeditation ?? 0);
                    entry.alpha.push(stim.avgAlpha ?? 0);
                    entry.beta.push(stim.avgBeta ?? 0);

                    // Per-sample band averages
                    for (const s of stim.samples ?? []) {
                        entry.delta.push(s.delta ?? 0);
                        entry.theta.push(s.theta ?? 0);
                        entry.gamma.push(s.gamma ?? 0);
                        entry.quality.push(s.signalQuality ?? 0);
                    }
                }
            } catch { /* skip */ }
        }

        results.push({
            moduleId,
            moduleName: name,
            totalParticipants: new Set(rows.map(r => r.participant_id)).size,
            stimuli: Array.from(stimuliAgg.entries()).sort((a, b) => a[0] - b[0]).map(([idx, d]) => ({
                stimulusIndex: idx,
                stimulusUrl: d.url,
                participantCount: d.participants.size,
                avgAttention: avg(d.attention),
                avgMeditation: avg(d.meditation),
                avgAlpha: avg(d.alpha),
                avgBeta: avg(d.beta),
                avgDelta: avg(d.delta),
                avgTheta: avg(d.theta),
                avgGamma: avg(d.gamma),
                avgSignalQuality: avg(d.quality),
            })),
            baseline: baselineAttention.length > 0 ? {
                avgAttention: avg(baselineAttention),
                avgMeditation: avg(baselineMeditation),
            } : null,
        });
    }

    return results;
}

// ─── Wearable (Heart Rate / HRV) Analytics ──────────────────────

interface WearableStimulusResult {
    stimulusIndex: number;
    stimulusUrl: string;
    participantCount: number;
    avgBPM: number;
    maxBPM: number;
    minBPM: number;
    avgRMSSD: number | null;
    avgSDNN: number | null;
    avgStressIndex: number | null;
}

export interface WearableAnalyticsResult {
    moduleId: string;
    moduleName: string;
    totalParticipants: number;
    stimuli: WearableStimulusResult[];
    baseline: {
        avgBPM: number;
        rmssd: number | null;
        sdnn: number | null;
    } | null;
}

export async function getWearableResults(researchId: string): Promise<WearableAnalyticsResult[]> {
    const result = await pool.query(
        `SELECT r.participant_id, r.module_id, r.value, m.name AS module_name
         FROM responses r JOIN modules m ON m.id = r.module_id
         WHERE r.research_id = ? AND r.component_id = 'wearable-biometric'`,
        [researchId]
    );

    const moduleMap = new Map<string, { name: string; rows: Array<{ participant_id: string; value: unknown }> }>();
    for (const row of result.rows) {
        const r = row as { participant_id: string; module_id: string; value: unknown; module_name: string };
        if (!moduleMap.has(r.module_id)) moduleMap.set(r.module_id, { name: r.module_name, rows: [] });
        moduleMap.get(r.module_id)!.rows.push({ participant_id: r.participant_id, value: r.value });
    }

    const results: WearableAnalyticsResult[] = [];

    for (const [moduleId, { name, rows }] of moduleMap) {
        const stimuliAgg = new Map<number, { url: string; participants: Set<string>; bpms: number[]; maxBPMs: number[]; minBPMs: number[]; rmssds: number[]; sdnns: number[]; stressIndices: number[] }>();
        let baselineBPMs: number[] = [];
        let baselineRMSSDs: number[] = [];
        let baselineSDNNs: number[] = [];

        for (const row of rows) {
            try {
                const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;

                if (parsed.baseline) {
                    baselineBPMs.push(parsed.baseline.avgBPM ?? 0);
                    if (parsed.baseline.hrv) {
                        baselineRMSSDs.push(parsed.baseline.hrv.rmssd ?? 0);
                        baselineSDNNs.push(parsed.baseline.hrv.sdnn ?? 0);
                    }
                }

                for (const stim of parsed.stimuli ?? []) {
                    const idx = stim.stimulusIndex ?? 0;
                    if (!stimuliAgg.has(idx)) {
                        stimuliAgg.set(idx, { url: stim.stimulusUrl || '', participants: new Set(), bpms: [], maxBPMs: [], minBPMs: [], rmssds: [], sdnns: [], stressIndices: [] });
                    }
                    const entry = stimuliAgg.get(idx)!;
                    entry.participants.add(row.participant_id);
                    entry.bpms.push(stim.avgBPM ?? 0);
                    entry.maxBPMs.push(stim.maxBPM ?? 0);
                    entry.minBPMs.push(stim.minBPM ?? 999);
                    if (stim.hrv) {
                        entry.rmssds.push(stim.hrv.rmssd ?? 0);
                        entry.sdnns.push(stim.hrv.sdnn ?? 0);
                        entry.stressIndices.push(stim.hrv.stressIndex ?? 0);
                    }
                }
            } catch { /* skip */ }
        }

        results.push({
            moduleId,
            moduleName: name,
            totalParticipants: new Set(rows.map(r => r.participant_id)).size,
            stimuli: Array.from(stimuliAgg.entries()).sort((a, b) => a[0] - b[0]).map(([idx, d]) => ({
                stimulusIndex: idx,
                stimulusUrl: d.url,
                participantCount: d.participants.size,
                avgBPM: avg(d.bpms),
                maxBPM: d.maxBPMs.length > 0 ? Math.max(...d.maxBPMs) : 0,
                minBPM: d.minBPMs.length > 0 ? Math.min(...d.minBPMs) : 0,
                avgRMSSD: d.rmssds.length > 0 ? avg(d.rmssds) : null,
                avgSDNN: d.sdnns.length > 0 ? avg(d.sdnns) : null,
                avgStressIndex: d.stressIndices.length > 0 ? avg(d.stressIndices) : null,
            })),
            baseline: baselineBPMs.length > 0 ? {
                avgBPM: avg(baselineBPMs),
                rmssd: baselineRMSSDs.length > 0 ? avg(baselineRMSSDs) : null,
                sdnn: baselineSDNNs.length > 0 ? avg(baselineSDNNs) : null,
            } : null,
        });
    }

    return results;
}

function avg(arr: number[]): number {
    return arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 1000) / 1000 : 0;
}
