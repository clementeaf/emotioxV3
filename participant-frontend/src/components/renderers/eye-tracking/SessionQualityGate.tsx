import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StepProgressPill } from './StepProgressPill';
import { TOTAL_STEPS } from './types';
import {
    checkBrightness,
    checkResolution,
    checkDistance,
    checkHeadStability,
    checkFaceConfidence,
    estimateDistanceCm,
    computePositionVariance,
    evaluateGate,
    HEAD_STABILITY_FRAMES,
    type QualityCheckResult,
    type CheckStatus,
} from '../../../lib/eyeTracking/sessionQualityChecks';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionQualityGateProps {
    cameraRef: React.RefObject<HTMLVideoElement | null>;
    /** BlazeGaze gazePosRef — used as proxy for face detection (if gaze is valid, face is detected). */
    gazeActive: boolean;
    onPass: () => void;
    onReject: () => void;
}

// ---------------------------------------------------------------------------
// Status icon
// ---------------------------------------------------------------------------

const StatusIcon: React.FC<{ status: CheckStatus }> = ({ status }) => {
    if (status === 'pass') return <span className="text-green-500 text-lg">✓</span>;
    if (status === 'fail') return <span className="text-red-500 text-lg">✗</span>;
    if (status === 'warn') return <span className="text-amber-500 text-lg">!</span>;
    // pending / checking
    return <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />;
};

const statusBg = (status: CheckStatus): string => {
    if (status === 'pass') return 'bg-green-50 border-green-200';
    if (status === 'fail') return 'bg-red-50 border-red-200';
    if (status === 'warn') return 'bg-amber-50 border-amber-200';
    return 'bg-gray-50 border-gray-200';
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SessionQualityGate: React.FC<SessionQualityGateProps> = ({
    cameraRef,
    gazeActive,
    onPass,
    onReject,
}) => {
    const { t } = useTranslation();

    const [checks, setChecks] = useState<QualityCheckResult[]>([
        { id: 'resolution', status: 'pending' },
        { id: 'brightness', status: 'pending' },
        { id: 'faceDetection', status: 'pending' },
        { id: 'distance', status: 'pending' },
        { id: 'headStability', status: 'pending' },
    ]);
    const [gateResult, setGateResult] = useState<{ canProceed: boolean } | null>(null);
    const [autoAdvance, setAutoAdvance] = useState(false);
    const headPositionsRef = useRef<{ x: number; y: number }[]>([]);
    const runCountRef = useRef(0);

    const updateCheck = useCallback((id: string, result: QualityCheckResult) => {
        setChecks(prev => prev.map(c => c.id === id ? result : c));
    }, []);

    // Run quality checks in sequence with a short delay
    useEffect(() => {
        const video = cameraRef.current;
        if (!video || !video.srcObject) return;

        // Wait for video to have dimensions
        const startChecks = () => {
            if (video.videoWidth === 0) {
                setTimeout(startChecks, 200);
                return;
            }

            runCountRef.current += 1;

            // 1. Resolution — instant
            updateCheck('resolution', checkResolution(video));

            // 2. Brightness — instant from frame
            setTimeout(() => {
                updateCheck('brightness', checkBrightness(video));
            }, 300);

            // 3. Face detection — use gazeActive as proxy (BlazeGaze needs face)
            setTimeout(() => {
                const confidence = gazeActive ? 0.9 : 0.3;
                updateCheck('faceDetection', checkFaceConfidence(confidence));
            }, 800);

            // 4. Distance — estimate from video frame center region brightness proxy
            // In production this would use MediaPipe iris landmarks.
            // ponytail: approximate via frame analysis — iris landmarks need FaceLandmarker
            // which is heavy. Using brightness-based face size estimation as proxy.
            setTimeout(() => {
                // Rough iris diameter estimate from video width
                // Average face width in frame ≈ 30-50% of frame width at 50-60cm
                // This is a rough heuristic; real MediaPipe iris would be better
                const faceWidthRatio = estimateFaceWidthRatio(video);
                const irisEstPx = faceWidthRatio * video.videoWidth * 0.08; // iris ≈ 8% of face width
                const distCm = estimateDistanceCm(irisEstPx, video.videoWidth);
                updateCheck('distance', checkDistance(distCm));
            }, 1200);

            // 5. Head stability — collect positions over ~1s
            setTimeout(() => {
                updateCheck('headStability', { id: 'headStability', status: 'checking' });
                headPositionsRef.current = [];

                let frameCount = 0;
                const collectFrame = () => {
                    if (frameCount >= HEAD_STABILITY_FRAMES) {
                        const variance = computePositionVariance(headPositionsRef.current);
                        updateCheck('headStability', checkHeadStability(variance));
                        return;
                    }
                    // Use brightness centroid as rough head position proxy
                    const pos = estimateFaceCentroid(video);
                    if (pos) headPositionsRef.current.push(pos);
                    frameCount++;
                    requestAnimationFrame(collectFrame);
                };
                requestAnimationFrame(collectFrame);
            }, 1500);
        };

        startChecks();
    }, [cameraRef, gazeActive, updateCheck]);

    // Evaluate gate when all checks complete
    useEffect(() => {
        const allDone = checks.every(c => c.status !== 'pending' && c.status !== 'checking');
        if (allDone) {
            const result = evaluateGate(checks);
            setGateResult(result);
            if (result.canProceed) {
                setAutoAdvance(true);
            }
        }
    }, [checks]);

    // Auto-advance after 1.5s if passed
    useEffect(() => {
        if (!autoAdvance) return;
        const timer = setTimeout(onPass, 1500);
        return () => clearTimeout(timer);
    }, [autoAdvance, onPass]);

    const checkLabels: Record<string, string> = {
        resolution: t('eyeTracking.qg.resolution', 'Camera resolution'),
        brightness: t('eyeTracking.qg.brightness', 'Lighting conditions'),
        faceDetection: t('eyeTracking.qg.faceDetection', 'Face detection'),
        distance: t('eyeTracking.qg.distance', 'Face distance'),
        headStability: t('eyeTracking.qg.headStability', 'Head stability'),
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
            <StepProgressPill step={1} total={TOTAL_STEPS} percent={25} />

            <div className="w-full max-w-md space-y-4 mt-8">
                <h2 className="text-xl font-bold text-gray-900 text-center">
                    {t('eyeTracking.qg.title', 'Checking session quality...')}
                </h2>
                <p className="text-sm text-gray-500 text-center">
                    {t('eyeTracking.qg.subtitle', 'Verifying your environment for accurate tracking.')}
                </p>

                <div className="space-y-3 mt-6">
                    {checks.map(check => (
                        <div
                            key={check.id}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${statusBg(check.status)}`}
                        >
                            <StatusIcon status={check.status} />
                            <div className="flex-1">
                                <span className="text-sm font-medium text-gray-800">
                                    {checkLabels[check.id] || check.id}
                                </span>
                                {check.message && (
                                    <p className="text-xs text-gray-500 mt-0.5">{check.message}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {gateResult && !gateResult.canProceed && (
                    <div className="flex gap-3 justify-center mt-6">
                        <button
                            onClick={() => {
                                // Retry all checks
                                setChecks(prev => prev.map(c => ({ ...c, status: 'pending' as const })));
                                setGateResult(null);
                                runCountRef.current = 0;
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            {t('eyeTracking.qg.retry', 'Retry')}
                        </button>
                        <button
                            onClick={onReject}
                            className="px-4 py-2 bg-white/80 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            {t('eyeTracking.qg.skip', 'Continue anyway')}
                        </button>
                    </div>
                )}

                {gateResult?.canProceed && (
                    <p className="text-center text-sm text-green-600 font-medium mt-4">
                        {t('eyeTracking.qg.passed', 'All checks passed — proceeding to calibration...')}
                    </p>
                )}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Helpers — rough face estimation from brightness analysis
// ponytail: these are cheap heuristics, not full face detection.
// Real iris detection would need FaceLandmarker, but BlazeGaze already handles
// the actual tracking. These are just for the quality gate UX.
// ---------------------------------------------------------------------------

function estimateFaceWidthRatio(video: HTMLVideoElement): number {
    const w = 64;
    const h = 48;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0.35;
    ctx.drawImage(video, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    // Count bright-ish pixels in center band (face region)
    const centerStart = Math.floor(w * 0.2);
    const centerEnd = Math.ceil(w * 0.8);
    let facePixels = 0;
    let totalCenter = 0;
    for (let y = 0; y < h; y++) {
        for (let x = centerStart; x < centerEnd; x++) {
            const i = (y * w + x) * 4;
            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            totalCenter++;
            if (lum > 60) facePixels++;
        }
    }
    return totalCenter > 0 ? Math.min(0.6, Math.max(0.15, facePixels / totalCenter)) : 0.35;
}

function estimateFaceCentroid(video: HTMLVideoElement): { x: number; y: number } | null {
    const w = 32;
    const h = 24;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    let sumX = 0, sumY = 0, total = 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            if (lum > 80) {
                sumX += x;
                sumY += y;
                total++;
            }
        }
    }
    if (total === 0) return null;
    return { x: sumX / total, y: sumY / total };
}
