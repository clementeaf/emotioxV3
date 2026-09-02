import React from 'react';
import { useTranslation } from 'react-i18next';
import { StepProgressPill } from './StepProgressPill';
import { TOTAL_STEPS, HYBRID_CALIB_POINT_COUNT } from './types';
import type { ShelfConfig } from './types';
import { HYBRID_IMAGE_CALIBRATION_POINTS } from '../../../lib/eyeTracking';
import { ShelfGrid } from './ShelfGrid';

interface CalibrationPhaseProps {
    calibrationIndex: number;
    isDesktop: boolean;
    resolvedUrl: string;
    imgRef: React.RefObject<HTMLImageElement | null>;
    onCalibrationClick: () => void;
    onImageLoad: () => void;
    shelfConfig: ShelfConfig | null;
}

export const CalibrationPhase: React.FC<CalibrationPhaseProps> = ({
    calibrationIndex,
    isDesktop,
    resolvedUrl,
    imgRef,
    onCalibrationClick,
    onImageLoad,
    shelfConfig,
}) => {
    const { t } = useTranslation();

    const calibrationPercent = Math.round(30 + (calibrationIndex / HYBRID_CALIB_POINT_COUNT) * 35);
    const calDotImagePct = HYBRID_IMAGE_CALIBRATION_POINTS[calibrationIndex];

    /** Stop propagation so WebEyeTrack's global click listener doesn't
     *  feed mouse coordinates as a second (conflicting) calibration point. */
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        onCalibrationClick();
    };

    const hintText = isDesktop
        ? t('eyeTracking.calibrationHintDwell', 'Look at the green dot and hold your gaze for 1.5 seconds. You can also click the dot.')
        : t('eyeTracking.calibrationHintMobile', 'Look at the green dot, then tap on it.');

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black ${isDesktop ? 'cursor-default' : 'cursor-crosshair'}`}
            onClickCapture={handleClick}
        >
            <div className="pointer-events-none absolute top-4 left-1/2 z-[70] -translate-x-1/2">
                <StepProgressPill step={2} total={TOTAL_STEPS} percent={calibrationPercent} />
            </div>

            <div className="pointer-events-none absolute left-1/2 top-20 z-[70] max-w-lg -translate-x-1/2 px-4 text-center">
                <p className="text-sm text-white/80">
                    {hintText}
                </p>
                <p className="mt-1 text-xs text-white/50">
                    {t('eyeTracking.pointOf', 'Point {{current}} of {{total}}', {
                        current: calibrationIndex + 1,
                        total: HYBRID_CALIB_POINT_COUNT,
                    })}
                </p>
            </div>

            {(resolvedUrl || shelfConfig) && (
                <div className="relative">
                    {shelfConfig ? (
                        <ShelfGrid
                            urls={shelfConfig.urls}
                            shelfCount={shelfConfig.shelfCount}
                            shelfItems={shelfConfig.shelfItems}
                            blur
                            opacity={0.6}
                            containerRef={shelfConfig.containerRef}
                            onAllLoaded={shelfConfig.onAllLoaded}
                        />
                    ) : (
                        <img
                            ref={imgRef}
                            src={resolvedUrl}
                            alt="Calibration"
                            className="max-w-[100vw] max-h-[100vh] object-contain"
                            style={{ filter: 'blur(12px)', opacity: 0.6 }}
                            draggable={false}
                            onLoad={onImageLoad}
                        />
                    )}
                    {calDotImagePct && (
                        <div
                            className="pointer-events-none absolute z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"
                            style={{ left: `${calDotImagePct[0]}%`, top: `${calDotImagePct[1]}%` }}
                        >
                            {/* Pulsing ring for dwell feedback on desktop */}
                            {isDesktop && (
                                <div className="absolute inset-0 rounded-full border-2 border-green-300 animate-ping opacity-75" />
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
