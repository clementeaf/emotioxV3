import React from 'react';
import { useTranslation } from 'react-i18next';
import { StepProgressPill } from './StepProgressPill';
import { TOTAL_STEPS } from './types';
import type { Fixation, ShelfConfig } from './types';
import { ShelfGrid } from './ShelfGrid';

interface ViewingPhaseProps {
    isDesktop: boolean;
    isVideo: boolean;
    resolvedUrl: string;
    viewingDuration: number;
    timeLeft: number;
    fixations: Fixation[];
    naturalSize: { w: number; h: number } | null;
    microDot: { u: number; v: number } | null;
    imgRef: React.RefObject<HTMLImageElement | null>;
    stimulusVideoRef: React.RefObject<HTMLVideoElement | null>;
    containerRef: React.RefObject<HTMLDivElement | null>;
    onImageInteraction: (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;
    onImageLoad: () => void;
    onVideoLoadedMetadata: () => void;
    onVideoEnded?: () => void;
    shelfConfig: ShelfConfig | null;
}

export const ViewingPhase: React.FC<ViewingPhaseProps> = ({
    isDesktop,
    isVideo,
    resolvedUrl,
    viewingDuration,
    timeLeft,
    fixations,
    naturalSize,
    microDot,
    imgRef,
    stimulusVideoRef,
    containerRef,
    onImageInteraction,
    onImageLoad,
    onVideoLoadedMetadata,
    onVideoEnded,
    shelfConfig,
}) => {
    const { t } = useTranslation();

    const viewingPercent = Math.round(70 + (1 - timeLeft / Math.ceil(viewingDuration / 1000)) * 30);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center select-none"
            style={{ backgroundImage: 'linear-gradient(rgb(235, 239, 251) 0%, rgb(245, 247, 253) 50%, rgb(255, 255, 255) 100%)' }}
        >
            <div className="pointer-events-none absolute top-4 left-1/2 z-[70] -translate-x-1/2">
                <StepProgressPill step={4} total={TOTAL_STEPS} percent={viewingPercent} />
            </div>

            {/* Timer */}
            <div className="pointer-events-none absolute top-16 left-1/2 z-[70] -translate-x-1/2">
                <span className={`text-lg font-mono font-bold ${
                    timeLeft <= 3 ? 'text-red-500' : 'text-gray-400'
                }`}>
                    {timeLeft}s
                </span>
            </div>

            {/* Stimulus container (image or video) */}
            <div
                ref={containerRef}
                className={`relative ${isDesktop ? '' : 'cursor-crosshair'}`}
                onClick={onImageInteraction}
                onTouchStart={onImageInteraction}
                onContextMenu={(e) => e.preventDefault()}
                style={{ touchAction: 'none' }}
            >
                {shelfConfig ? (
                    <ShelfGrid
                        urls={shelfConfig.urls}
                        shelfCount={shelfConfig.shelfCount}
                        shelfItems={shelfConfig.shelfItems}
                        containerRef={shelfConfig.containerRef}
                        onAllLoaded={shelfConfig.onAllLoaded}
                        rotationInterval={shelfConfig.rotationInterval}
                    />
                ) : isVideo ? (
                    <video
                        ref={stimulusVideoRef}
                        src={resolvedUrl}
                        className="max-w-[100vw] max-h-[100vh] object-contain"
                        muted
                        playsInline
                        preload="auto"
                        onLoadedMetadata={onVideoLoadedMetadata}
                        onEnded={onVideoEnded}
                    />
                ) : (
                    <img
                        ref={imgRef}
                        src={resolvedUrl}
                        alt="Stimulus"
                        className="max-w-[100vw] max-h-[100vh] object-contain"
                        draggable={false}
                        onLoad={onImageLoad}
                    />
                )}
                {/* Micro-recalibration dot (nearly invisible, drift correction) */}
                {microDot && isDesktop && (
                    <div
                        className="absolute pointer-events-none rounded-full"
                        style={{
                            left: `${microDot.u * 100}%`,
                            top: `${microDot.v * 100}%`,
                            width: 4,
                            height: 4,
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: 'rgba(120, 120, 120, 0.12)',
                        }}
                    />
                )}
                {/* Click indicators (mobile/tablet only — desktop is silent) */}
                {!isDesktop && fixations.map((fix, idx) => {
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

            {!isDesktop && (
                <p className="pointer-events-none absolute bottom-6 left-1/2 z-[70] -translate-x-1/2 text-xs text-gray-400">
                    {t('eyeTracking.clicks', '{{count}} points recorded', {
                        count: fixations.length,
                    })}
                </p>
            )}
        </div>
    );
};
