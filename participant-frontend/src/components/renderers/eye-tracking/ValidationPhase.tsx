import React from 'react';
import { useTranslation } from 'react-i18next';
import { StepProgressPill } from './StepProgressPill';
import { TOTAL_STEPS } from './types';
import type { ShelfConfig } from './types';
import {
    HYBRID_VALIDATION_POINT,
    HYBRID_RECALIBRATION_RMSE_THRESHOLD_PX,
} from '../../../lib/eyeTracking';
import { ShelfGrid } from './ShelfGrid';

interface ValidationPhaseProps {
    validationRmse: number | null;
    resolvedUrl: string;
    imgRef: React.RefObject<HTMLImageElement | null>;
    onValidationClick: () => void;
    onRecalibrate: () => void;
    onSkipValidation: () => void;
    onImageLoad: () => void;
    shelfConfig: ShelfConfig | null;
}

export const ValidationPhase: React.FC<ValidationPhaseProps> = ({
    validationRmse,
    resolvedUrl,
    imgRef,
    onValidationClick,
    onRecalibrate,
    onSkipValidation,
    onImageLoad,
    shelfConfig,
}) => {
    const { t } = useTranslation();

    const showRecalibrateOption = validationRmse !== null && validationRmse > HYBRID_RECALIBRATION_RMSE_THRESHOLD_PX;

    /** Stop propagation so WebEyeTrack's global click listener doesn't
     *  feed mouse coordinates as a conflicting calibration point. */
    const handleClick = !showRecalibrateOption ? (e: React.MouseEvent) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        onValidationClick();
    } : undefined;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
            onClickCapture={handleClick}
            style={{ cursor: !showRecalibrateOption ? 'crosshair' : 'default' }}
        >
            <div className="pointer-events-none absolute top-4 left-1/2 z-[70] -translate-x-1/2">
                <StepProgressPill step={1} total={TOTAL_STEPS} percent={68} />
            </div>

            <div className="pointer-events-none absolute left-1/2 top-20 z-[70] max-w-lg -translate-x-1/2 px-4 text-center">
                {!showRecalibrateOption ? (
                    <p className="text-sm text-white/80">
                        {t('eyeTracking.validationHint', 'Look at the yellow dot and click anywhere to verify accuracy.')}
                    </p>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-amber-400 font-medium">
                            {t('eyeTracking.validationFailed', 'Calibration accuracy is low. Would you like to re-calibrate?')}
                        </p>
                        <div className="pointer-events-auto flex gap-3 justify-center">
                            <button
                                onClick={onRecalibrate}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                                {t('eyeTracking.recalibrate', 'Re-calibrate')}
                            </button>
                            <button
                                onClick={onSkipValidation}
                                className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
                            >
                                {t('eyeTracking.continueAnyway', 'Continue anyway')}
                            </button>
                        </div>
                    </div>
                )}
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
                            alt="Validation"
                            className="max-w-[95vw] max-h-[95vh] object-contain"
                            style={{ filter: 'blur(12px)', opacity: 0.6 }}
                            draggable={false}
                            onLoad={onImageLoad}
                        />
                    )}
                    {!showRecalibrateOption && (
                        <div
                            className="pointer-events-none absolute z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse"
                            style={{ left: `${HYBRID_VALIDATION_POINT[0]}%`, top: `${HYBRID_VALIDATION_POINT[1]}%` }}
                        />
                    )}
                </div>
            )}
        </div>
    );
};
