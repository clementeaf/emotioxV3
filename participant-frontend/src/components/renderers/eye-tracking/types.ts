import type { ModuleConfig } from '../../../types/module';
import { getComponentText } from '../../../utils/moduleComponent';
import {
    HYBRID_IMAGE_CALIBRATION_POINTS,
} from '../../../lib/eyeTracking';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EyeTrackingRendererProps {
    module: ModuleConfig;
    onComplete?: () => void;
}

export interface Fixation {
    x: number;
    y: number;
    duration: number;
    timestamp: number;
}

/**
 * Phases:
 * intro → setup → preparing → calibration → validating → viewing → complete
 * If validation fails, loops back to calibration (re-calibrate).
 */
export type ETPhase = 'intro' | 'setup' | 'preparing' | 'calibration' | 'validating' | 'viewing' | 'complete';

export const TOTAL_STEPS = 3;

/** One-Euro params — responsive enough to avoid lag during calibration clicks. */
export const EYE_TRACKING_ONE_EURO_MIN_CUTOFF = 2.0;
export const EYE_TRACKING_ONE_EURO_BETA = 0.05;

export const HYBRID_CALIB_POINT_COUNT = HYBRID_IMAGE_CALIBRATION_POINTS.length;

// Gaze collection polling interval (ms)
export const GAZE_POLL_MS = 50;

// ---------------------------------------------------------------------------
// Device detection
// ---------------------------------------------------------------------------

export function getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('ipad') || (ua.includes('tablet') && !ua.includes('mobile'))) return 'tablet';
    if (/android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return 'mobile';
    return 'desktop';
}

// ---------------------------------------------------------------------------
// Config extraction (mirrors backend)
// ---------------------------------------------------------------------------

export const extractConfig = (module: ModuleConfig) => {
    const components = module.structure?.components || [];

    // Stimulus URL — canonical ID: 'stimuli', fallback to any file-upload
    let stimulusUrl = '';
    const fileUploadComp = components.find(c =>
        c.id === 'stimuli' || c.type === 'file-upload' || c.id === 'stimulus-image' || c.id === 'image' || c.id === 'stimulus'
    );
    if (fileUploadComp) {
        const raw = getComponentText(fileUploadComp);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const first = parsed[0] as { s3Key?: string; url?: string };
                    stimulusUrl = first.s3Key || first.url || '';
                } else if (typeof parsed === 'string') {
                    stimulusUrl = parsed;
                }
            } catch {
                stimulusUrl = raw;
            }
        }
    }

    // Task description — canonical ID: 'task-instructions'
    let taskDescription = '';
    const descComp = components.find(c =>
        c.id === 'task-instructions' || c.id === 'task-description' || c.id === 'question-title' || c.id === 'description'
    );
    if (descComp) {
        taskDescription = getComponentText(descComp) || descComp.placeholder?.text || '';
    }

    // Viewing duration — canonical ID: 'priming-time' (value in seconds, convert to ms)
    let viewingDuration = 10000;
    const durationComp = components.find(c =>
        c.id === 'priming-time' || c.id === 'viewing-duration' || c.id === 'duration' || c.id === 'exposure-time'
    );
    if (durationComp) {
        const raw = getComponentText(durationComp);
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed) && parsed > 0) {
            // priming-time stores seconds (5, 10, 15, 20, 30); legacy stores ms
            viewingDuration = parsed <= 60 ? parsed * 1000 : parsed;
        }
    }

    // Display mode — canonical ID: 'display-mode'
    let displayMode: 'stand_alone' | 'shelf' = 'stand_alone';
    const modeComp = components.find(c => c.id === 'display-mode');
    if (modeComp) {
        const val = getComponentText(modeComp).toLowerCase();
        if (val === 'shelf') displayMode = 'shelf';
    }

    // Feature toggles
    const emotionRecognition = components.find(c => c.id === 'emotion-recognition');
    const hasEmotionRecognition = emotionRecognition ? getComponentText(emotionRecognition) === 'true' : true;

    const attentionMeasurement = components.find(c => c.id === 'attention-measurement');
    const hasAttentionMeasurement = attentionMeasurement ? getComponentText(attentionMeasurement) === 'true' : true;

    // Detect video stimulus
    const isVideo = /\.(mp4|webm|ogg)$/i.test(stimulusUrl) || stimulusUrl.includes('video/');

    return { stimulusUrl, taskDescription, viewingDuration, displayMode, hasEmotionRecognition, hasAttentionMeasurement, isVideo };
};
