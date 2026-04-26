import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StepProgressPill } from './StepProgressPill';
import { TOTAL_STEPS } from './types';

interface SetupPhaseProps {
    isDesktop: boolean;
    checks: boolean[];
    allChecked: boolean;
    onToggleCheck: (index: number) => void;
    onReady: () => void;
    cameraRef?: React.RefObject<HTMLVideoElement | null>;
}

export const SetupPhase: React.FC<SetupPhaseProps> = ({ isDesktop, checks, allChecked, onToggleCheck, onReady, cameraRef }) => {
    const { t } = useTranslation();
    const [streamReady, setStreamReady] = useState(false);
    const previewRef = useRef<HTMLVideoElement>(null);

    // Poll for camera stream readiness and attach to preview element
    useEffect(() => {
        if (!isDesktop || !cameraRef) return;
        const check = setInterval(() => {
            const stream = cameraRef.current?.srcObject as MediaStream | null;
            if (stream && stream.active) {
                setStreamReady(true);
                if (previewRef.current && previewRef.current.srcObject !== stream) {
                    previewRef.current.srcObject = stream;
                }
                clearInterval(check);
            }
        }, 200);
        return () => clearInterval(check);
    }, [isDesktop, cameraRef]);

    const checkLabelsDesktop = [
        t('eyeTracking.check1', 'I am seated and will not move.'),
        t('eyeTracking.check2', 'My device is stable and at face level.'),
        t('eyeTracking.check3', 'My face is well lit, no backlight.'),
        t('eyeTracking.check4', 'No light-reflecting glasses on.'),
    ];
    const checkLabelsMobile = [
        t('eyeTracking.checkMobile1', 'I am holding my device comfortably and it is stable.'),
        t('eyeTracking.checkMobile2', 'I will tap where my attention goes on the image.'),
        t('eyeTracking.checkMobile3', 'I am in a quiet environment without distractions.'),
        t('eyeTracking.checkMobile4', 'I understand my taps will be recorded.'),
    ];
    const checkLabels = isDesktop ? checkLabelsDesktop : checkLabelsMobile;

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
            <StepProgressPill step={1} total={TOTAL_STEPS} percent={30} />

            <div className="w-full max-w-lg space-y-6 mt-8">
                {/* Camera preview — live feed on desktop, icon on mobile */}
                <div className="w-40 h-32 bg-gray-800 rounded-lg mx-auto flex items-center justify-center overflow-hidden">
                    {isDesktop && streamReady ? (
                        <video
                            ref={previewRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            style={{ transform: 'scaleX(-1)' }}
                        />
                    ) : (
                        <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    )}
                </div>

                <h2 className="text-xl font-bold text-gray-900">
                    {t('eyeTracking.setupTitle', 'To continue')}
                </h2>
                <p className="text-gray-500 text-sm">
                    {t('eyeTracking.setupSubtitle', 'Please confirm that you meet all of the requirements mentioned below by ticking each of the checkboxes.')}
                </p>

                {/* Checkboxes */}
                <div className="space-y-4">
                    {checkLabels.map((label, idx) => (
                        <label key={idx} className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={checks[idx]}
                                onChange={() => onToggleCheck(idx)}
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                            />
                            <span className="text-sm text-gray-700">{label}</span>
                        </label>
                    ))}
                </div>

                <button
                    onClick={onReady}
                    disabled={!allChecked}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {t('eyeTracking.ready', 'Ready')}
                </button>
            </div>
        </div>
    );
};
