/**
 * Unit tests for tracking-emotion.analytics.ts
 * Mocks the database pool to test aggregation logic in isolation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
vi.mock('../../../config/database', () => ({
    default: { query: (...args: unknown[]) => mockQuery(...args) },
}));

import { getTrackingEmotionData } from '../tracking-emotion.analytics';

/** Build a session row as the DB returns it (emotion_samples as a JSON string). */
function sessionRow(
    id: string,
    samples: Array<{ timestamp: number; emotion: string; confidence: number }>,
    overrides: Partial<{ visitor_id: string; page_url: string; emotion_video_path: string | null }> = {},
) {
    return {
        id,
        visitor_id: overrides.visitor_id ?? `visitor-${id}`,
        page_url: overrides.page_url ?? 'https://example.com/',
        emotion_samples: JSON.stringify(samples),
        emotion_video_path: overrides.emotion_video_path ?? null,
    };
}

beforeEach(() => {
    mockQuery.mockReset();
});

// ─── Query construction ──────────────────────────────────────────────

describe('getTrackingEmotionData — query construction', () => {
    it('filters by researchId only when no pageUrl given', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await getTrackingEmotionData('r1');

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('emotion_samples IS NOT NULL');
        expect(params).toEqual(['r1']);
    });

    it('adds a page_url filter when pageUrl is given', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await getTrackingEmotionData('r1', 'https://example.com/pricing');

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('page_url = ?');
        expect(params).toEqual(['r1', 'https://example.com/pricing']);
    });
});

// ─── Empty / degenerate input ────────────────────────────────────────

describe('getTrackingEmotionData — empty input', () => {
    it('returns a zeroed result when no sessions have emotion data', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const result = await getTrackingEmotionData('r1');

        expect(result.totalSessions).toBe(0);
        expect(result.totalSamples).toBe(0);
        expect(result.avgConfidence).toBe(0);
        expect(result.timeline).toEqual([]);
        expect(result.valenceArousal).toEqual([]);
        expect(result.perSession).toEqual([]);
    });

    // Guards a real reporting hazard: with zero samples every emotion count is
    // tied at 0, so a naive "highest count" pick reports whichever emotion is
    // first in the list. An empty study must not claim its visitors felt joy.
    it('reports neutral (not the first-listed emotion) when there is no data', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const result = await getTrackingEmotionData('r1');

        expect(result.dominantEmotion).toBe('neutral');
    });

    it('reports every emotion at 0% when there is no data', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const result = await getTrackingEmotionData('r1');

        expect(result.distribution).toEqual({
            joy: 0, sadness: 0, surprise: 0, anger: 0, disgust: 0, fear: 0, neutral: 0,
        });
    });

    it('skips sessions whose sample array is empty', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', []), sessionRow('s2', [{ timestamp: 0, emotion: 'joy', confidence: 0.9 }])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.totalSessions).toBe(1);
        expect(result.perSession[0].sessionId).toBe('s2');
    });
});

// ─── Malformed input ─────────────────────────────────────────────────

describe('getTrackingEmotionData — malformed input', () => {
    it('survives unparseable JSON in emotion_samples', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                { id: 's1', visitor_id: 'v1', page_url: '/', emotion_samples: '{not json', emotion_video_path: null },
                sessionRow('s2', [{ timestamp: 0, emotion: 'joy', confidence: 0.8 }]),
            ],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.totalSessions).toBe(1);
        expect(result.totalSamples).toBe(1);
    });

    it('survives emotion_samples holding a non-array JSON value', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{ id: 's1', visitor_id: 'v1', page_url: '/', emotion_samples: '{"a":1}', emotion_video_path: null }],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.totalSamples).toBe(0);
    });

    it('accepts emotion_samples already parsed by the driver', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                id: 's1',
                visitor_id: 'v1',
                page_url: '/',
                emotion_samples: [{ timestamp: 0, emotion: 'anger', confidence: 0.7 }],
                emotion_video_path: null,
            }],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.totalSamples).toBe(1);
        expect(result.dominantEmotion).toBe('anger');
    });

    // Samples arrive from a browser we do not control, so an unrecognized label
    // must never leak into the reported figures.
    it('discards samples with an emotion outside the Ekman set', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'joy', confidence: 0.9 },
                { timestamp: 100, emotion: 'contempt', confidence: 0.95 },
                { timestamp: 200, emotion: 'hacked', confidence: 0.99 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.totalSamples).toBe(1);
        expect(result.dominantEmotion).toBe('joy');
        expect(result.distribution.joy).toBe(100);
    });

    it('keeps the distribution summing to 100% when junk samples are present', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'joy', confidence: 0.9 },
                { timestamp: 100, emotion: 'sadness', confidence: 0.5 },
                { timestamp: 200, emotion: 'not-an-emotion', confidence: 0.9 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        const sum = Object.values(result.distribution).reduce((a, b) => a + b, 0);
        expect(sum).toBe(100);
    });

    it('discards null and non-object entries in the sample array', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                id: 's1',
                visitor_id: 'v1',
                page_url: '/',
                emotion_samples: JSON.stringify([
                    null,
                    'joy',
                    42,
                    { timestamp: 0, emotion: 'joy', confidence: 0.9 },
                ]),
                emotion_video_path: null,
            }],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.totalSamples).toBe(1);
    });

    it('discards samples with a non-finite timestamp', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'joy', confidence: 0.9 },
                { timestamp: Infinity, emotion: 'anger', confidence: 0.9 },
                { timestamp: 'soon' as unknown as number, emotion: 'fear', confidence: 0.9 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.totalSamples).toBe(1);
        expect(result.dominantEmotion).toBe('joy');
    });

    it('discards samples whose confidence is not a usable number', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'joy', confidence: 0.8 },
                { timestamp: 100, emotion: 'fear', confidence: NaN },
                { timestamp: 200, emotion: 'anger', confidence: 'high' as unknown as number },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.totalSamples).toBe(1);
        expect(result.avgConfidence).toBe(0.8);
    });
});

// ─── Distribution & aggregate stats ──────────────────────────────────

describe('getTrackingEmotionData — distribution', () => {
    it('expresses the distribution as percentages of all samples', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'joy', confidence: 0.9 },
                { timestamp: 100, emotion: 'joy', confidence: 0.9 },
                { timestamp: 200, emotion: 'joy', confidence: 0.9 },
                { timestamp: 300, emotion: 'sadness', confidence: 0.5 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.distribution.joy).toBe(75);
        expect(result.distribution.sadness).toBe(25);
        expect(result.distribution.anger).toBe(0);
    });

    it('rounds percentages to one decimal', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'joy', confidence: 0.5 },
                { timestamp: 100, emotion: 'sadness', confidence: 0.5 },
                { timestamp: 200, emotion: 'anger', confidence: 0.5 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.distribution.joy).toBe(33.3);
    });

    it('aggregates counts across sessions', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                sessionRow('s1', [{ timestamp: 0, emotion: 'joy', confidence: 0.9 }]),
                sessionRow('s2', [
                    { timestamp: 0, emotion: 'fear', confidence: 0.6 },
                    { timestamp: 100, emotion: 'fear', confidence: 0.6 },
                ]),
            ],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.totalSessions).toBe(2);
        expect(result.totalSamples).toBe(3);
        expect(result.dominantEmotion).toBe('fear');
    });

    it('averages confidence across every sample, rounded to two decimals', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'joy', confidence: 0.9 },
                { timestamp: 100, emotion: 'joy', confidence: 0.6 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.avgConfidence).toBe(0.75);
    });
});

// ─── Per-session summaries ───────────────────────────────────────────

describe('getTrackingEmotionData — per-session summaries', () => {
    it('reports each session dominant emotion independently of the aggregate', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                sessionRow('s1', [
                    { timestamp: 0, emotion: 'joy', confidence: 0.9 },
                    { timestamp: 100, emotion: 'joy', confidence: 0.9 },
                ]),
                sessionRow('s2', [{ timestamp: 0, emotion: 'anger', confidence: 0.8 }]),
            ],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.perSession).toHaveLength(2);
        expect(result.perSession[0].dominantEmotion).toBe('joy');
        expect(result.perSession[1].dominantEmotion).toBe('anger');
        expect(result.dominantEmotion).toBe('joy');
    });

    it('picks the most frequent emotion within a session, not the first seen', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'neutral', confidence: 0.9 },
                { timestamp: 100, emotion: 'joy', confidence: 0.5 },
                { timestamp: 200, emotion: 'joy', confidence: 0.5 },
                { timestamp: 300, emotion: 'joy', confidence: 0.5 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.perSession[0].dominantEmotion).toBe('joy');
    });

    it('carries visitor, page and sample count through', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow(
                's1',
                [{ timestamp: 0, emotion: 'joy', confidence: 0.9 }, { timestamp: 100, emotion: 'joy', confidence: 0.9 }],
                { visitor_id: 'v-42', page_url: 'https://example.com/checkout' },
            )],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.perSession[0]).toMatchObject({
            sessionId: 's1',
            visitorId: 'v-42',
            pageUrl: 'https://example.com/checkout',
            sampleCount: 2,
        });
    });

    it('flags sessions that stored a webcam recording', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                sessionRow('s1', [{ timestamp: 0, emotion: 'joy', confidence: 0.9 }], { emotion_video_path: '/media/s1.webm' }),
                sessionRow('s2', [{ timestamp: 0, emotion: 'joy', confidence: 0.9 }]),
            ],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.perSession[0].hasVideo).toBe(true);
        expect(result.perSession[1].hasVideo).toBe(false);
    });
});

// ─── Timeline bucketing ──────────────────────────────────────────────

describe('getTrackingEmotionData — timeline', () => {
    it('groups samples into one-second buckets', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'joy', confidence: 0.9 },
                { timestamp: 400, emotion: 'joy', confidence: 0.7 },
                { timestamp: 1200, emotion: 'anger', confidence: 0.8 },
                { timestamp: 2500, emotion: 'fear', confidence: 0.6 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.timeline).toHaveLength(3);
        expect(result.timeline[0].timestampS).toBe(0);
        expect(result.timeline[1].timestampS).toBe(1);
    });

    it('picks the highest-confidence sample as each bucket emotion', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'joy', confidence: 0.3 },
                { timestamp: 200, emotion: 'anger', confidence: 0.95 },
                { timestamp: 400, emotion: 'sadness', confidence: 0.5 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.timeline).toHaveLength(1);
        expect(result.timeline[0].emotion).toBe('anger');
        expect(result.timeline[0].confidence).toBe(0.95);
    });

    it('emits one entry per bucket, timeline and valenceArousal aligned', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'joy', confidence: 0.9 },
                { timestamp: 1100, emotion: 'joy', confidence: 0.9 },
                { timestamp: 2200, emotion: 'joy', confidence: 0.9 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.timeline).toHaveLength(result.valenceArousal.length);
        expect(result.timeline.map(t => t.timestampS)).toEqual(result.valenceArousal.map(v => v.timestampS));
    });

    it('orders samples by timestamp before bucketing', async () => {
        // Sessions are concatenated in DB order, so the combined stream arrives
        // unsorted. Without an explicit sort the buckets are cut at the wrong
        // moments and the timeline comes out scrambled.
        mockQuery.mockResolvedValueOnce({
            rows: [
                sessionRow('s1', [
                    { timestamp: 2400, emotion: 'fear', confidence: 0.9 },
                    { timestamp: 100, emotion: 'joy', confidence: 0.9 },
                ]),
                sessionRow('s2', [{ timestamp: 1300, emotion: 'anger', confidence: 0.9 }]),
            ],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.timeline.map(t => t.timestampS)).toEqual([0, 1, 2]);
        expect(result.timeline.map(t => t.emotion)).toEqual(['joy', 'anger', 'fear']);
    });

    it('closes a bucket at exactly one second, not just past it', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'joy', confidence: 0.9 },
                { timestamp: 1000, emotion: 'anger', confidence: 0.9 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.timeline).toHaveLength(2);
        expect(result.timeline[1].emotion).toBe('anger');
    });

    it('picks the highest-confidence emotion in mid-stream buckets too', async () => {
        // The final bucket is flushed by a separate code path, so a bucket that
        // closes mid-loop needs its own guard.
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'joy', confidence: 0.2 },
                { timestamp: 300, emotion: 'fear', confidence: 0.99 },
                { timestamp: 600, emotion: 'sadness', confidence: 0.4 },
                { timestamp: 1800, emotion: 'neutral', confidence: 0.5 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.timeline).toHaveLength(2);
        expect(result.timeline[0].emotion).toBe('fear');
        expect(result.timeline[0].confidence).toBe(0.99);
    });

    it('measures the bucket boundary as elapsed time since the bucket opened', async () => {
        // The cut is `timestamp - bucketStart >= 1000`. Once bucketStart moves off
        // zero, any formula that combines the two values instead of subtracting
        // starts cutting a new bucket on every sample.
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'joy', confidence: 0.9 },
                { timestamp: 1100, emotion: 'anger', confidence: 0.9 },
                { timestamp: 1300, emotion: 'fear', confidence: 0.5 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.timeline).toHaveLength(2);
        expect(result.timeline.map(t => t.timestampS)).toEqual([0, 1]);
    });

    it('merges samples from different sessions by relative time', async () => {
        // Snippet timestamps are ms since capture start, so the same relative
        // second from two visitors belongs in the same bucket.
        mockQuery.mockResolvedValueOnce({
            rows: [
                sessionRow('s1', [{ timestamp: 100, emotion: 'joy', confidence: 0.9 }]),
                sessionRow('s2', [{ timestamp: 200, emotion: 'joy', confidence: 0.8 }]),
            ],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.timeline).toHaveLength(1);
        expect(result.timeline[0].timestampS).toBe(0);
    });
});

// ─── Valence / Arousal ───────────────────────────────────────────────

describe('getTrackingEmotionData — valence & arousal', () => {
    it('places joy in the positive-valence, positive-arousal quadrant', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [{ timestamp: 0, emotion: 'joy', confidence: 1 }])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.valenceArousal[0].valence).toBeGreaterThan(0);
        expect(result.valenceArousal[0].arousal).toBeGreaterThan(0);
    });

    it('places sadness in the negative-valence, negative-arousal quadrant', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [{ timestamp: 0, emotion: 'sadness', confidence: 1 }])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.valenceArousal[0].valence).toBeLessThan(0);
        expect(result.valenceArousal[0].arousal).toBeLessThan(0);
    });

    it('places anger in the negative-valence, high-arousal quadrant', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [{ timestamp: 0, emotion: 'anger', confidence: 1 }])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.valenceArousal[0].valence).toBeLessThan(0);
        expect(result.valenceArousal[0].arousal).toBeGreaterThan(0);
    });

    it('places surprise at positive valence with the highest arousal', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [{ timestamp: 0, emotion: 'surprise', confidence: 1 }])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.valenceArousal[0].valence).toBeGreaterThan(0);
        expect(result.valenceArousal[0].arousal).toBeGreaterThan(0.7);
    });

    it('places fear at strongly negative valence with high arousal', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [{ timestamp: 0, emotion: 'fear', confidence: 1 }])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.valenceArousal[0].valence).toBeLessThan(-0.5);
        expect(result.valenceArousal[0].arousal).toBeGreaterThan(0);
    });

    it('places disgust at negative valence with mild arousal', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [{ timestamp: 0, emotion: 'disgust', confidence: 1 }])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.valenceArousal[0].valence).toBeLessThan(-0.5);
        expect(result.valenceArousal[0].arousal).toBeGreaterThan(0);
        expect(result.valenceArousal[0].arousal).toBeLessThan(0.5);
    });

    it('puts neutral at the origin', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [{ timestamp: 0, emotion: 'neutral', confidence: 0.9 }])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.valenceArousal[0]).toMatchObject({ valence: 0, arousal: 0 });
    });

    it('weights the average by confidence, not by sample count', async () => {
        // One strongly-detected joy against one barely-detected sadness should
        // land positive; an unweighted mean would sit near zero.
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'joy', confidence: 0.95 },
                { timestamp: 100, emotion: 'sadness', confidence: 0.05 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.valenceArousal[0].valence).toBeGreaterThan(0.5);
    });

    it('scales arousal by confidence rather than dividing by it', async () => {
        // Two samples of equal emotion but unequal confidence must average to
        // that emotion's arousal — dividing by confidence would blow past it.
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'surprise', confidence: 0.2 },
                { timestamp: 100, emotion: 'surprise', confidence: 0.4 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.valenceArousal[0].arousal).toBeCloseTo(0.8, 2);
    });

    it('lets the higher-confidence emotion dominate a mixed bucket', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'fear', confidence: 0.1 },
                { timestamp: 100, emotion: 'joy', confidence: 0.9 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        // Weighted: (0.8*0.9 + -0.8*0.1) / 1.0 = 0.64
        expect(result.valenceArousal[0].valence).toBeCloseTo(0.64, 2);
    });

    it('rounds to two decimals in every bucket, not only the last one', async () => {
        // Buckets closed mid-stream go through a separate push than the final
        // bucket, so the rounding there needs its own assertion.
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'fear', confidence: 0.1 },
                { timestamp: 200, emotion: 'joy', confidence: 0.9 },
                { timestamp: 1500, emotion: 'neutral', confidence: 0.5 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.valenceArousal).toHaveLength(2);
        // First (mid-stream) bucket: (0.8*0.9 + -0.8*0.1) / 1.0 = 0.64
        expect(result.valenceArousal[0].valence).toBe(0.64);
        // (0.5*0.9 + 0.6*0.1) / 1.0 = 0.51
        expect(result.valenceArousal[0].arousal).toBe(0.51);
    });

    it('keeps valence and arousal inside the circumplex bounds', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'fear', confidence: 1 },
                { timestamp: 100, emotion: 'anger', confidence: 1 },
                { timestamp: 200, emotion: 'joy', confidence: 1 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        for (const point of result.valenceArousal) {
            expect(point.valence).toBeGreaterThanOrEqual(-1);
            expect(point.valence).toBeLessThanOrEqual(1);
            expect(point.arousal).toBeGreaterThanOrEqual(-1);
            expect(point.arousal).toBeLessThanOrEqual(1);
        }
    });

    it('falls back to the origin when every sample has zero confidence', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [sessionRow('s1', [
                { timestamp: 0, emotion: 'joy', confidence: 0 },
                { timestamp: 100, emotion: 'anger', confidence: 0 },
            ])],
        });

        const result = await getTrackingEmotionData('r1');

        expect(result.valenceArousal[0]).toMatchObject({ valence: 0, arousal: 0 });
    });
});
