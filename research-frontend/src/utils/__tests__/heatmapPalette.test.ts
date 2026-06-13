import { describe, expect, it } from 'vitest';
import {
    HEATMAP_GRADIENTS,
    OVERLAY_DIM_FACTORS,
} from '../../components/results/cognitive-task/components/HeatmapRenderer';
import { VIDEO_HEATMAP_COLORS } from '../../components/research/VideoAccumulatedHeatmapOverlay';
import { COLD_MAP_GRADIENT } from '../coldMapRender';
import type { HeatmapVisualProfile } from '../attentionPrediction.utils';

/* ─── Helpers ─── */

const ALL_PROFILES: HeatmapVisualProfile[] = ['lab', 'precise', 'balanced', 'smooth'];

/** Parse 6-digit hex to {r, g, b} */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16),
    };
}

/** Relative luminance (WCAG) — lower = darker, higher = lighter */
function relativeLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(
        c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    );
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** WCAG contrast ratio between two luminances */
function contrastRatio(l1: number, l2: number): number {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

function sortedKeys(obj: Record<number, string>): number[] {
    return Object.keys(obj).map(Number).sort((a, b) => a - b);
}

/* ═══════════════════════════════════════════════════════════════
   1. HEATMAP GRADIENTS — completeness & structure
   ═══════════════════════════════════════════════════════════════ */

describe('HEATMAP_GRADIENTS — completeness & structure', () => {
    it('covers every HeatmapVisualProfile exactly', () => {
        const gradientProfiles = Object.keys(HEATMAP_GRADIENTS).sort();
        expect(gradientProfiles).toEqual([...ALL_PROFILES].sort());
    });

    it.each(ALL_PROFILES)('%s — has at least 4 gradient stops', (profile) => {
        expect(Object.keys(HEATMAP_GRADIENTS[profile]).length).toBeGreaterThanOrEqual(4);
    });

    it.each(ALL_PROFILES)('%s — stops are strictly ascending', (profile) => {
        const keys = sortedKeys(HEATMAP_GRADIENTS[profile]);
        for (let i = 1; i < keys.length; i++) {
            expect(keys[i]).toBeGreaterThan(keys[i - 1]);
        }
    });

    it.each(ALL_PROFILES)('%s — all stops in range (0, 1]', (profile) => {
        for (const key of sortedKeys(HEATMAP_GRADIENTS[profile])) {
            expect(key).toBeGreaterThan(0);
            expect(key).toBeLessThanOrEqual(1);
        }
    });

    it.each(ALL_PROFILES)('%s — last stop is exactly 1.0', (profile) => {
        const keys = sortedKeys(HEATMAP_GRADIENTS[profile]);
        expect(keys[keys.length - 1]).toBe(1.0);
    });

    it.each(ALL_PROFILES)('%s — all hex values are valid 6-digit', (profile) => {
        for (const hex of Object.values(HEATMAP_GRADIENTS[profile])) {
            expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/);
        }
    });

    it('smooth has more stops than lab (wider spread for diffuse rendering)', () => {
        expect(Object.keys(HEATMAP_GRADIENTS.smooth).length)
            .toBeGreaterThan(Object.keys(HEATMAP_GRADIENTS.lab).length);
    });

    it('smooth starts earlier than lab (lower first stop key)', () => {
        const smoothFirst = sortedKeys(HEATMAP_GRADIENTS.smooth)[0];
        const labFirst = sortedKeys(HEATMAP_GRADIENTS.lab)[0];
        expect(smoothFirst).toBeLessThan(labFirst);
    });
});

/* ═══════════════════════════════════════════════════════════════
   2. PALETTE COLOR SCIENCE — blue→violet, no warm leaks
   ═══════════════════════════════════════════════════════════════ */

describe('HEATMAP_GRADIENTS — blue→violet color science', () => {
    const WARM_HEX = ['#ff0', '#ff00', '#0f0', '#8f0', '#f80', '#f00', '#c00', '#e00', '#ff0000', '#00ff00', '#ffff00'];

    it.each(ALL_PROFILES)('%s — zero warm-palette colors (no yellow, green, red)', (profile) => {
        for (const hex of Object.values(HEATMAP_GRADIENTS[profile])) {
            expect(WARM_HEX).not.toContain(hex.toLowerCase());
        }
    });

    it.each(ALL_PROFILES)('%s — blue channel >= 0x99 in every stop', (profile) => {
        for (const hex of Object.values(HEATMAP_GRADIENTS[profile])) {
            const { b } = hexToRgb(hex);
            expect(b).toBeGreaterThanOrEqual(0x99);
        }
    });

    it.each(ALL_PROFILES)('%s — green channel never dominates (g < b always)', (profile) => {
        for (const hex of Object.values(HEATMAP_GRADIENTS[profile])) {
            const { g, b } = hexToRgb(hex);
            expect(g).toBeLessThan(b);
        }
    });

    it.each(ALL_PROFILES)('%s — highest-intensity stop has violet hue (r > 0x80)', (profile) => {
        const keys = sortedKeys(HEATMAP_GRADIENTS[profile]);
        const topHex = HEATMAP_GRADIENTS[profile][keys[keys.length - 1]];
        const { r } = hexToRgb(topHex);
        expect(r).toBeGreaterThanOrEqual(0x80);
    });

    it.each(ALL_PROFILES)('%s — lowest-intensity stop has blue hue (r < 0x80)', (profile) => {
        const keys = sortedKeys(HEATMAP_GRADIENTS[profile]);
        const lowHex = HEATMAP_GRADIENTS[profile][keys[0]];
        const { r } = hexToRgb(lowHex);
        expect(r).toBeLessThan(0x80);
    });

    it.each(ALL_PROFILES)('%s — contrast ratio vs white >= 1.5 (visible on white bg)', (profile) => {
        const whiteLum = 1.0;
        for (const hex of Object.values(HEATMAP_GRADIENTS[profile])) {
            const { r, g, b } = hexToRgb(hex);
            const lum = relativeLuminance(r, g, b);
            const ratio = contrastRatio(whiteLum, lum);
            expect(ratio).toBeGreaterThanOrEqual(1.5);
        }
    });

    it('all profiles share the same blue anchor (#5599ff or #3377cc family)', () => {
        for (const profile of ALL_PROFILES) {
            const keys = sortedKeys(HEATMAP_GRADIENTS[profile]);
            const firstHex = HEATMAP_GRADIENTS[profile][keys[0]];
            const { r, b } = hexToRgb(firstHex);
            expect(b).toBeGreaterThan(r * 2);
        }
    });
});

/* ═══════════════════════════════════════════════════════════════
   3. OVERLAY DIM FACTORS — completeness & ordering
   ═══════════════════════════════════════════════════════════════ */

describe('OVERLAY_DIM_FACTORS — completeness & ordering', () => {
    it('covers every HeatmapVisualProfile exactly', () => {
        const dimProfiles = Object.keys(OVERLAY_DIM_FACTORS).sort();
        expect(dimProfiles).toEqual([...ALL_PROFILES].sort());
    });

    it.each(ALL_PROFILES)('%s — dim factor is positive and < 1', (profile) => {
        expect(OVERLAY_DIM_FACTORS[profile]).toBeGreaterThan(0);
        expect(OVERLAY_DIM_FACTORS[profile]).toBeLessThan(1);
    });

    it('ordering: lab < precise <= balanced < smooth', () => {
        expect(OVERLAY_DIM_FACTORS.lab).toBeLessThan(OVERLAY_DIM_FACTORS.precise);
        expect(OVERLAY_DIM_FACTORS.precise).toBeLessThanOrEqual(OVERLAY_DIM_FACTORS.balanced);
        expect(OVERLAY_DIM_FACTORS.balanced).toBeLessThan(OVERLAY_DIM_FACTORS.smooth);
    });

    it('lab is the least dim (most transparent overlay)', () => {
        const min = Math.min(...Object.values(OVERLAY_DIM_FACTORS));
        expect(OVERLAY_DIM_FACTORS.lab).toBe(min);
    });

    it('smooth is the most dim (strongest overlay)', () => {
        const max = Math.max(...Object.values(OVERLAY_DIM_FACTORS));
        expect(OVERLAY_DIM_FACTORS.smooth).toBe(max);
    });
});

/* ═══════════════════════════════════════════════════════════════
   4. VIDEO HEATMAP COLORS — RGB tuples, blue→violet progression
   ═══════════════════════════════════════════════════════════════ */

describe('VIDEO_HEATMAP_COLORS — RGB tuples & blue→violet progression', () => {
    const STOPS = ['center', 'mid', 'edge'] as const;

    it.each(STOPS)('%s — is a 3-element tuple', (stop) => {
        expect(VIDEO_HEATMAP_COLORS[stop]).toHaveLength(3);
    });

    it.each(STOPS)('%s — all channels in 0-255 range', (stop) => {
        for (const ch of VIDEO_HEATMAP_COLORS[stop]) {
            expect(ch).toBeGreaterThanOrEqual(0);
            expect(ch).toBeLessThanOrEqual(255);
        }
    });

    it('center is violet: red > green, blue > green', () => {
        const [r, g, b] = VIDEO_HEATMAP_COLORS.center;
        expect(r).toBeGreaterThan(g);
        expect(b).toBeGreaterThan(g);
    });

    it('mid is blue-violet: blue dominates', () => {
        const [r, , b] = VIDEO_HEATMAP_COLORS.mid;
        expect(b).toBeGreaterThan(r);
    });

    it('edge is blue: blue channel is max', () => {
        const [r, g, b] = VIDEO_HEATMAP_COLORS.edge;
        expect(b).toBeGreaterThan(r);
        expect(b).toBeGreaterThan(g);
    });

    it('blue channel never below red in any stop (no warm leaks)', () => {
        for (const stop of STOPS) {
            const [r, , b] = VIDEO_HEATMAP_COLORS[stop];
            expect(b).toBeGreaterThanOrEqual(r);
        }
    });

    it('red channel increases from edge to center (intensity progression)', () => {
        expect(VIDEO_HEATMAP_COLORS.center[0]).toBeGreaterThan(VIDEO_HEATMAP_COLORS.mid[0]);
        expect(VIDEO_HEATMAP_COLORS.mid[0]).toBeGreaterThan(VIDEO_HEATMAP_COLORS.edge[0]);
    });

    it('contrast vs white bg >= 1.3 (visible on white packaging)', () => {
        const whiteLum = 1.0;
        for (const stop of STOPS) {
            const [r, g, b] = VIDEO_HEATMAP_COLORS[stop];
            const lum = relativeLuminance(r, g, b);
            expect(contrastRatio(whiteLum, lum)).toBeGreaterThanOrEqual(1.3);
        }
    });
});

/* ═══════════════════════════════════════════════════════════════
   5. COLD MAP GRADIENT — differentiation from classic
   ═══════════════════════════════════════════════════════════════ */

describe('COLD_MAP_GRADIENT — green→cyan differentiation', () => {
    it('has at least 4 gradient stops', () => {
        expect(Object.keys(COLD_MAP_GRADIENT).length).toBeGreaterThanOrEqual(4);
    });

    it('stops are in valid range (0, 1] and ascending', () => {
        const keys = sortedKeys(COLD_MAP_GRADIENT);
        for (const key of keys) {
            expect(key).toBeGreaterThan(0);
            expect(key).toBeLessThanOrEqual(1);
        }
        for (let i = 1; i < keys.length; i++) {
            expect(keys[i]).toBeGreaterThan(keys[i - 1]);
        }
    });

    it('last stop is 1.0', () => {
        const keys = sortedKeys(COLD_MAP_GRADIENT);
        expect(keys[keys.length - 1]).toBe(1.0);
    });

    it('all hex values are valid 6-digit', () => {
        for (const hex of Object.values(COLD_MAP_GRADIENT)) {
            expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/);
        }
    });

    it('green channel >= red channel in every stop (green/cyan family)', () => {
        for (const hex of Object.values(COLD_MAP_GRADIENT)) {
            const { r, g } = hexToRgb(hex);
            expect(g).toBeGreaterThanOrEqual(r);
        }
    });

    it('no purple/violet colors (red <= green always)', () => {
        for (const hex of Object.values(COLD_MAP_GRADIENT)) {
            const { r, g } = hexToRgb(hex);
            expect(r).toBeLessThanOrEqual(g);
        }
    });

    it('zero overlap with any classic profile gradient colors', () => {
        const coldColors = new Set(Object.values(COLD_MAP_GRADIENT).map(c => c.toLowerCase()));
        for (const profile of ALL_PROFILES) {
            for (const classicHex of Object.values(HEATMAP_GRADIENTS[profile])) {
                expect(coldColors.has(classicHex.toLowerCase())).toBe(false);
            }
        }
    });

    it('zero overlap with video heatmap RGB values', () => {
        const videoHexes = [
            `#${VIDEO_HEATMAP_COLORS.center.map(c => c.toString(16).padStart(2, '0')).join('')}`,
            `#${VIDEO_HEATMAP_COLORS.mid.map(c => c.toString(16).padStart(2, '0')).join('')}`,
            `#${VIDEO_HEATMAP_COLORS.edge.map(c => c.toString(16).padStart(2, '0')).join('')}`,
        ].map(h => h.toLowerCase());
        const coldColors = Object.values(COLD_MAP_GRADIENT).map(c => c.toLowerCase());
        for (const cold of coldColors) {
            expect(videoHexes).not.toContain(cold);
        }
    });

    it('visually distinct — hue angle differs from classic by at least 60deg', () => {
        // Classic first stop hue is ~220-240 (blue), cold should be ~120-180 (green-cyan)
        const classicFirstHex = Object.values(HEATMAP_GRADIENTS.lab)[0];
        const coldFirstHex = Object.values(COLD_MAP_GRADIENT)[0];
        const { r: cr, g: cg, b: cb } = hexToRgb(classicFirstHex);
        const { r: dr, g: dg, b: db } = hexToRgb(coldFirstHex);

        const classicHue = Math.atan2(Math.sqrt(3) * (cg - cb), 2 * cr - cg - cb) * 180 / Math.PI;
        const coldHue = Math.atan2(Math.sqrt(3) * (dg - db), 2 * dr - dg - db) * 180 / Math.PI;

        const hueDiff = Math.abs(classicHue - coldHue);
        const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
        expect(normalizedDiff).toBeGreaterThanOrEqual(60);
    });
});

/* ═══════════════════════════════════════════════════════════════
   6. CROSS-MODE CONSISTENCY — no two modes share colors
   ═══════════════════════════════════════════════════════════════ */

describe('cross-mode color isolation', () => {
    it('classic and cold use distinct color palettes (zero hex overlap)', () => {
        const classicHexes = new Set<string>();
        for (const profile of ALL_PROFILES) {
            for (const hex of Object.values(HEATMAP_GRADIENTS[profile])) {
                classicHexes.add(hex.toLowerCase());
            }
        }
        const coldHexes = new Set(Object.values(COLD_MAP_GRADIENT).map(c => c.toLowerCase()));

        for (const hex of classicHexes) {
            expect(coldHexes.has(hex)).toBe(false);
        }
    });

    it('cold and video use distinct hex values', () => {
        const videoHexes = new Set([
            `#${VIDEO_HEATMAP_COLORS.center.map(c => c.toString(16).padStart(2, '0')).join('')}`,
            `#${VIDEO_HEATMAP_COLORS.mid.map(c => c.toString(16).padStart(2, '0')).join('')}`,
            `#${VIDEO_HEATMAP_COLORS.edge.map(c => c.toString(16).padStart(2, '0')).join('')}`,
        ].map(h => h.toLowerCase()));
        const coldHexes = Object.values(COLD_MAP_GRADIENT).map(c => c.toLowerCase());

        for (const cold of coldHexes) {
            expect(videoHexes.has(cold)).toBe(false);
        }
    });

    it('classic is blue→violet, cold is green→cyan, video is violet→blue (semantically distinct)', () => {
        // Classic: lowest stop (by key) is blue-dominant
        const labKeys = sortedKeys(HEATMAP_GRADIENTS.lab);
        const classicFirst = hexToRgb(HEATMAP_GRADIENTS.lab[labKeys[0]]);
        expect(classicFirst.b).toBeGreaterThan(classicFirst.r);
        expect(classicFirst.b).toBeGreaterThan(classicFirst.g);

        // Cold: all stops have g >= r
        for (const hex of Object.values(COLD_MAP_GRADIENT)) {
            const { r, g } = hexToRgb(hex);
            expect(g).toBeGreaterThanOrEqual(r);
        }

        // Video center: violet (r and b both high, g low)
        const [vr, vg, vb] = VIDEO_HEATMAP_COLORS.center;
        expect(vr).toBeGreaterThan(vg);
        expect(vb).toBeGreaterThan(vg);
    });
});
