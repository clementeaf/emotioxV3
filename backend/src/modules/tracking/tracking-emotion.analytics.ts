/**
 * Tracking Emotion Analytics
 * Aggregates facial emotion data from Website Tracking sessions.
 */

import pool from '../../config/database';

type EkmanEmotion = 'joy' | 'sadness' | 'surprise' | 'anger' | 'disgust' | 'fear' | 'neutral';

const ALL_EMOTIONS: EkmanEmotion[] = ['joy', 'sadness', 'surprise', 'anger', 'disgust', 'fear', 'neutral'];

interface EmotionSample {
    timestamp: number;
    emotion: EkmanEmotion;
    confidence: number;
}

export interface TrackingEmotionData {
    totalSessions: number;
    totalSamples: number;
    distribution: Record<EkmanEmotion, number>;
    dominantEmotion: EkmanEmotion;
    avgConfidence: number;
    timeline: Array<{ timestampS: number; emotion: EkmanEmotion; confidence: number }>;
    perSession: Array<{
        sessionId: string;
        visitorId: string;
        pageUrl: string;
        dominantEmotion: EkmanEmotion;
        sampleCount: number;
        hasVideo: boolean;
    }>;
    valenceArousal: Array<{ timestampS: number; valence: number; arousal: number }>;
}

// Russell's circumplex approximation
const VA_MAP: Record<EkmanEmotion, { v: number; a: number }> = {
    neutral:  { v:  0.0, a:  0.0 },
    joy:      { v:  0.8, a:  0.5 },
    sadness:  { v: -0.6, a: -0.4 },
    anger:    { v: -0.7, a:  0.7 },
    surprise: { v:  0.2, a:  0.8 },
    fear:     { v: -0.8, a:  0.6 },
    disgust:  { v: -0.7, a:  0.2 },
};

/**
 * Samples come straight from a browser we do not control, so anything that is
 * not a known emotion with a usable confidence is dropped before it can reach
 * the reported figures. Counting an unrecognized label would inflate
 * totalSamples (pushing the distribution below 100%) and could even surface it
 * as the dominant emotion, which the distribution never lists.
 */
function isValidSample(raw: unknown): raw is EmotionSample {
    if (!raw || typeof raw !== 'object') return false;
    const s = raw as Record<string, unknown>;
    // Number.isFinite already rejects non-numbers, so no typeof check is needed.
    return (
        (ALL_EMOTIONS as string[]).includes(s.emotion as string) &&
        Number.isFinite(s.confidence) &&
        Number.isFinite(s.timestamp)
    );
}

function computeVA(samples: EmotionSample[]): { valence: number; arousal: number } {
    if (samples.length === 0) return { valence: 0, arousal: 0 };
    let v = 0, a = 0, w = 0;
    for (const s of samples) {
        const va = VA_MAP[s.emotion];
        if (!va) continue;
        v += va.v * s.confidence;
        a += va.a * s.confidence;
        w += s.confidence;
    }
    return w > 0 ? { valence: v / w, arousal: a / w } : { valence: 0, arousal: 0 };
}

export async function getTrackingEmotionData(
    researchId: string,
    pageUrl?: string
): Promise<TrackingEmotionData> {
    let query = `SELECT id, visitor_id, page_url, emotion_samples, emotion_video_path
                 FROM tracking_sessions
                 WHERE research_id = ? AND emotion_samples IS NOT NULL`;
    const params: unknown[] = [researchId];

    if (pageUrl) {
        query += ' AND page_url = ?';
        params.push(pageUrl);
    }

    const result = await pool.query(query, params);
    const sessions = result.rows as Array<{
        id: string;
        visitor_id: string;
        page_url: string;
        emotion_samples: string | unknown[];
        emotion_video_path: string | null;
    }>;

    const counts: Record<EkmanEmotion, number> = Object.fromEntries(
        ALL_EMOTIONS.map(e => [e, 0])
    ) as Record<EkmanEmotion, number>;

    let totalSamples = 0;
    let totalConfidence = 0;
    const allSamples: EmotionSample[] = [];
    const perSession: TrackingEmotionData['perSession'] = [];

    for (const session of sessions) {
        let samples: EmotionSample[] = [];
        try {
            const raw = typeof session.emotion_samples === 'string'
                ? JSON.parse(session.emotion_samples)
                : session.emotion_samples;
            samples = Array.isArray(raw) ? raw.filter(isValidSample) : [];
        } catch { samples = []; }

        if (samples.length === 0) continue;

        // Per-session stats
        const sessionCounts: Record<string, number> = {};
        for (const s of samples) {
            counts[s.emotion] = (counts[s.emotion] || 0) + 1;
            sessionCounts[s.emotion] = (sessionCounts[s.emotion] || 0) + 1;
            totalConfidence += s.confidence;
        }
        totalSamples += samples.length;
        allSamples.push(...samples);

        const dominant = Object.entries(sessionCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] as EkmanEmotion || 'neutral';

        perSession.push({
            sessionId: session.id,
            visitorId: session.visitor_id,
            pageUrl: session.page_url,
            dominantEmotion: dominant,
            sampleCount: samples.length,
            hasVideo: !!session.emotion_video_path,
        });
    }

    // Distribution as percentages
    const distribution = Object.fromEntries(
        ALL_EMOTIONS.map(e => [e, totalSamples > 0 ? Math.round(counts[e] / totalSamples * 1000) / 10 : 0])
    ) as Record<EkmanEmotion, number>;

    // With no samples every count is tied at 0, and picking the highest would
    // just return whichever emotion is listed first. Report neutral instead.
    const dominantEmotion: EkmanEmotion = totalSamples === 0
        ? 'neutral'
        : (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as EkmanEmotion) || 'neutral';

    // Timeline: downsample to 1-second buckets
    const timeline: TrackingEmotionData['timeline'] = [];
    const valenceArousal: TrackingEmotionData['valenceArousal'] = [];

    if (allSamples.length > 0) {
        allSamples.sort((a, b) => a.timestamp - b.timestamp);
        const bucketMs = 1000;
        let bucketStart = allSamples[0].timestamp;
        let bucket: EmotionSample[] = [];

        for (const s of allSamples) {
            if (s.timestamp - bucketStart >= bucketMs && bucket.length > 0) {
                const dominant = bucket.sort((a, b) => b.confidence - a.confidence)[0];
                const sec = Math.round(bucketStart / 1000);
                timeline.push({ timestampS: sec, emotion: dominant.emotion, confidence: dominant.confidence });
                const va = computeVA(bucket);
                valenceArousal.push({ timestampS: sec, valence: Math.round(va.valence * 100) / 100, arousal: Math.round(va.arousal * 100) / 100 });
                bucket = [];
                bucketStart = s.timestamp;
            }
            bucket.push(s);
        }
        // Last bucket
        if (bucket.length > 0) {
            const dominant = bucket.sort((a, b) => b.confidence - a.confidence)[0];
            const sec = Math.round(bucketStart / 1000);
            timeline.push({ timestampS: sec, emotion: dominant.emotion, confidence: dominant.confidence });
            const va = computeVA(bucket);
            valenceArousal.push({ timestampS: sec, valence: Math.round(va.valence * 100) / 100, arousal: Math.round(va.arousal * 100) / 100 });
        }
    }

    return {
        totalSessions: perSession.length,
        totalSamples,
        distribution,
        dominantEmotion,
        avgConfidence: totalSamples > 0 ? Math.round(totalConfidence / totalSamples * 100) / 100 : 0,
        timeline,
        perSession,
        valenceArousal,
    };
}
