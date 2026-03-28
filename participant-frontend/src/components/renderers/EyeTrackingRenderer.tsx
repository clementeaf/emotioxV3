import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModuleConfig } from '../../types/module';
import { useParticipantStore } from '../../stores/useParticipantStore';
import { getComponentText } from '../../utils/moduleComponent';
import { mediaService } from '../../services/media.service';

interface EyeTrackingRendererProps {
    module: ModuleConfig;
    onComplete?: () => void;
}

interface Fixation {
    x: number;
    y: number;
    duration: number;
    timestamp: number;
}

type ETPhase = 'instructions' | 'viewing' | 'complete';

/**
 * Extract Eye Tracking config from module structure.
 * Mirrors backend extractEyeTrackingConfig.
 */
const extractConfig = (module: ModuleConfig) => {
    const components = module.structure?.components || [];

    // Stimulus image — file-upload or known IDs
    let stimulusUrl = '';
    const fileUploadComp = components.find(c =>
        c.type === 'file-upload' || c.id === 'stimulus-image' || c.id === 'image' || c.id === 'stimulus'
    );
    if (fileUploadComp) {
        const raw = getComponentText(fileUploadComp);
        if (raw) {
            // Could be a JSON array (like Navigation Flow images) or a direct URL
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const first = parsed[0] as { s3Key?: string; url?: string };
                    stimulusUrl = first.s3Key || first.url || '';
                } else if (typeof parsed === 'string') {
                    stimulusUrl = parsed;
                }
            } catch {
                // Direct URL string
                stimulusUrl = raw;
            }
        }
    }

    // Modality
    let modality: 'stand_alone' | 'shelf' = 'stand_alone';
    const modalityComp = components.find(c =>
        c.id === 'modality' || c.id === 'test-mode' || c.id === 'display-mode'
    );
    if (modalityComp) {
        const val = getComponentText(modalityComp).toLowerCase();
        if (val.includes('shelf')) modality = 'shelf';
    }

    // Task description
    let taskDescription = '';
    const descComp = components.find(c =>
        c.id === 'task-description' || c.id === 'question-title' || c.id === 'description'
    );
    if (descComp) {
        taskDescription = getComponentText(descComp) || descComp.placeholder?.text || '';
    }

    // Viewing duration (ms) — default 10 seconds
    let viewingDuration = 10000;
    const durationComp = components.find(c =>
        c.id === 'viewing-duration' || c.id === 'duration' || c.id === 'exposure-time'
    );
    if (durationComp) {
        const parsed = parseInt(getComponentText(durationComp), 10);
        if (!isNaN(parsed) && parsed > 0) viewingDuration = parsed;
    }

    return { stimulusUrl, modality, taskDescription, viewingDuration };
};

/**
 * Eye Tracking renderer using click/tap tracking as proxy for gaze data.
 * Records click positions, timestamps, and durations on stimulus images.
 * Response format: component_id = 'eye-tracking-data',
 * value = { fixations: [...], calibrationQuality: 'click-proxy', integrityScore: 1.0 }
 */
export const EyeTrackingRenderer: React.FC<EyeTrackingRendererProps> = ({ module, onComplete }) => {
    const { t } = useTranslation();
    const { saveResponse } = useParticipantStore();

    const { stimulusUrl, taskDescription, viewingDuration } = useMemo(
        () => extractConfig(module),
        [module]
    );

    const [phase, setPhase] = useState<ETPhase>('instructions');
    const [resolvedUrl, setResolvedUrl] = useState<string>('');
    const [fixations, setFixations] = useState<Fixation[]>([]);
    const [timeLeft, setTimeLeft] = useState(Math.ceil(viewingDuration / 1000));
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastClickRef = useRef<{ time: number } | null>(null);
    const savedRef = useRef(false);
    const fixationsRef = useRef<Fixation[]>([]);
    const naturalSizeRef = useRef<{ w: number; h: number } | null>(null);
    const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

    // Resolve stimulus URL (s3Key → presigned URL)
    useEffect(() => {
        if (!stimulusUrl) return;
        let cancelled = false;

        const resolve = async () => {
            try {
                // If it's an s3Key, resolve via media service
                if (stimulusUrl.startsWith('/') || (!stimulusUrl.startsWith('http') && !stimulusUrl.startsWith('blob'))) {
                    const url = await mediaService.getMediaUrl(stimulusUrl);
                    if (!cancelled) setResolvedUrl(url);
                } else {
                    if (!cancelled) setResolvedUrl(stimulusUrl);
                }
            } catch {
                if (!cancelled) setResolvedUrl(stimulusUrl);
            }
        };

        resolve();
        return () => { cancelled = true; };
    }, [stimulusUrl]);

    // Countdown timer during viewing phase
    useEffect(() => {
        if (phase !== 'viewing') return;

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // End viewing after duration
        const timeout = setTimeout(() => {
            setPhase('complete');
        }, viewingDuration);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [phase, viewingDuration]);

    // Save results when complete — use ref to capture final fixations
    useEffect(() => {
        if (phase === 'complete' && !savedRef.current) {
            savedRef.current = true;
            const finalFixations = fixationsRef.current;
            const responseValue = JSON.stringify({
                fixations: finalFixations.map(f => ({
                    x: f.x,
                    y: f.y,
                    duration: f.duration,
                    timestamp: f.timestamp,
                })),
                calibrationQuality: 'click-proxy',
                integrityScore: 1.0,
            });
            saveResponse(module.id, 'eye-tracking-data', responseValue);

            // Auto-advance after brief delay
            const timer = setTimeout(() => {
                onComplete?.();
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [phase, module.id, saveResponse, onComplete]);

    // Handle image load — capture natural dimensions once
    const handleImageLoad = useCallback(() => {
        if (imgRef.current) {
            const size = {
                w: imgRef.current.naturalWidth,
                h: imgRef.current.naturalHeight,
            };
            naturalSizeRef.current = size;
            setNaturalSize(size);
        }
    }, []);

    // Handle click/tap on stimulus image — record as fixation
    const handleImageInteraction = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (phase !== 'viewing' || !imgRef.current) return;

        const img = imgRef.current;
        const rect = img.getBoundingClientRect();
        const naturalW = naturalSizeRef.current?.w || img.naturalWidth || rect.width;
        const naturalH = naturalSizeRef.current?.h || img.naturalHeight || rect.height;

        let clientX: number;
        let clientY: number;

        if ('touches' in e) {
            const touch = e.touches[0] || (e as React.TouchEvent).changedTouches[0];
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        // Convert to natural image coordinates
        const relX = (clientX - rect.left) / rect.width;
        const relY = (clientY - rect.top) / rect.height;
        const x = Math.round(relX * naturalW);
        const y = Math.round(relY * naturalH);

        const now = performance.now();
        const duration = lastClickRef.current
            ? Math.round(now - lastClickRef.current.time)
            : 200; // Default fixation duration for first click

        lastClickRef.current = { time: now };

        const newFixation: Fixation = {
            x,
            y,
            duration: Math.min(duration, 5000), // Cap at 5s
            timestamp: Math.round(now),
        };

        setFixations(prev => {
            const next = [...prev, newFixation];
            fixationsRef.current = next;
            return next;
        });
    }, [phase]);

    // Unconfigured state
    if (!stimulusUrl) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
                <p className="text-gray-400 text-center">
                    {t('eyeTracking.notConfigured', 'This eye tracking test has not been configured yet.')}
                </p>
            </div>
        );
    }

    // Instructions screen
    if (phase === 'instructions') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
                <div className="w-full max-w-lg space-y-6 text-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {module.name}
                    </h2>
                    {taskDescription && (
                        <p className="text-gray-600">{taskDescription}</p>
                    )}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <p className="text-gray-600">
                            {t('eyeTracking.instructions', 'An image will appear. Tap or click on the areas that catch your attention.')}
                        </p>
                        <p className="text-sm text-gray-500">
                            {t('eyeTracking.duration', 'You will have {{seconds}} seconds.', {
                                seconds: Math.ceil(viewingDuration / 1000),
                            })}
                        </p>
                    </div>
                    <button
                        onClick={() => setPhase('viewing')}
                        disabled={!resolvedUrl}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {resolvedUrl
                            ? t('eyeTracking.start', 'Start')
                            : t('eyeTracking.loading', 'Loading image...')}
                    </button>
                </div>
            </div>
        );
    }

    // Viewing phase — show stimulus, capture clicks
    if (phase === 'viewing') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-2 py-4 select-none">
                {/* Timer */}
                <div className="mb-3 text-center">
                    <span className={`text-lg font-mono font-bold ${
                        timeLeft <= 3 ? 'text-red-500' : 'text-gray-500'
                    }`}>
                        {timeLeft}s
                    </span>
                </div>

                {/* Stimulus image container */}
                <div
                    ref={containerRef}
                    className="relative cursor-crosshair max-w-full"
                    onClick={handleImageInteraction}
                    onTouchStart={handleImageInteraction}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ touchAction: 'none' }}
                >
                    <img
                        ref={imgRef}
                        src={resolvedUrl}
                        alt="Stimulus"
                        className="max-w-full max-h-[70vh] object-contain rounded-lg"
                        draggable={false}
                        onLoad={handleImageLoad}
                    />
                    {/* Click indicators */}
                    {fixations.map((fix, idx) => {
                        const natW = naturalSize?.w || 1;
                        const natH = naturalSize?.h || 1;
                        const left = (fix.x / natW) * 100;
                        const top = (fix.y / natH) * 100;
                        return (
                            <div
                                key={idx}
                                className="absolute w-4 h-4 rounded-full bg-blue-500 bg-opacity-40 border-2 border-blue-400 pointer-events-none"
                                style={{
                                    left: `${left}%`,
                                    top: `${top}%`,
                                    transform: 'translate(-50%, -50%)',
                                }}
                            />
                        );
                    })}
                </div>

                {/* Fixation count */}
                <p className="mt-3 text-xs text-gray-400">
                    {t('eyeTracking.clicks', '{{count}} points recorded', {
                        count: fixations.length,
                    })}
                </p>
            </div>
        );
    }

    // Complete screen
    if (phase === 'complete') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
                <div className="text-center space-y-4">
                    <div className="text-5xl">&#10003;</div>
                    <p className="text-lg font-medium text-gray-700">
                        {t('eyeTracking.complete', 'Test completed. Thank you!')}
                    </p>
                    <p className="text-sm text-gray-500">
                        {t('eyeTracking.pointsRecorded', '{{count}} attention points recorded.', {
                            count: fixations.length,
                        })}
                    </p>
                </div>
            </div>
        );
    }

    return null;
};
