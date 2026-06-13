import { useCallback, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { HeatmapRenderer } from '../results/cognitive-task/components/HeatmapRenderer';
import { SpotlightRenderer } from '../results/cognitive-task/components/SpotlightRenderer';
import { ColdMapRenderer } from '../results/cognitive-task/components/ColdMapRenderer';
import {
    resolveHeatmapVisualProfile,
    type HeatmapMapMode,
    type SpotlightSettings,
    type ColdMapSettings,
} from '../../utils/attentionPrediction.utils';
import type { HeatmapSettings, HeatmapPoint } from './HeatmapSettingsModal';

interface StimulusFullscreenModalProps {
    imageUrl: string;
    title: string;
    heatmapData: HeatmapPoint[];
    settings: HeatmapSettings;
    mapMode: HeatmapMapMode;
    spotlightSettings: SpotlightSettings;
    coldSettings: ColdMapSettings;
    showHeatmap: boolean;
    onClose: () => void;
}

const RENDERER_CLASS = 'block max-w-full h-auto';

const FullscreenPreview = ({
    imageUrl,
    heatmapData,
    settings,
    mapMode,
    spotlightSettings,
    coldSettings,
    showHeatmap,
}: Omit<StimulusFullscreenModalProps, 'title' | 'onClose'>) => {
    const renderersByMode: Record<HeatmapMapMode, () => React.ReactNode> = {
        spotlight: () => (
            <SpotlightRenderer
                imageUrl={imageUrl}
                data={heatmapData}
                blur={spotlightSettings.blur}
                reveal={spotlightSettings.reveal}
                dim={spotlightSettings.dim}
                threshold={settings.threshold}
                className={RENDERER_CLASS}
            />
        ),
        cold: () => (
            <ColdMapRenderer
                imageUrl={imageUrl}
                data={heatmapData}
                intensity={coldSettings.intensity}
                blur={coldSettings.blur}
                threshold={coldSettings.threshold}
                className={RENDERER_CLASS}
            />
        ),
        classic: () => (
            <HeatmapRenderer
                imageUrl={imageUrl}
                data={heatmapData}
                blur={settings.blur}
                opacity={settings.opacity}
                threshold={settings.threshold}
                granularity={settings.preset === 'Smooth' ? 'smooth' : 'precise'}
                visualProfile={resolveHeatmapVisualProfile(settings.preset)}
                canvasClassName={RENDERER_CLASS}
                borderless
            />
        ),
    };

    if (!showHeatmap || heatmapData.length === 0) {
        return <img src={imageUrl} alt="Stimulus original" className={RENDERER_CLASS} />;
    }

    return <>{renderersByMode[mapMode]()}</>;
};

export const StimulusFullscreenModal = ({
    imageUrl,
    title,
    heatmapData,
    settings,
    mapMode,
    spotlightSettings,
    coldSettings,
    showHeatmap,
    onClose,
}: StimulusFullscreenModalProps) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent): void => {
            const isEscape = e.key === 'Escape';
            if (!isEscape) return;
            onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const handleDownload = useCallback(async () => {
        const el = contentRef.current;
        if (!el) return;
        try {
            const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}-heatmap.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch {
            // Download failed silently
        }
    }, [title]);

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col bg-black/95"
            role="dialog"
            aria-modal="true"
            aria-label={`Vista completa: ${title}`}
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-black/80 flex-shrink-0">
                <span className="text-sm text-white/70 truncate max-w-md">{title}</span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void handleDownload()}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-white/10 rounded hover:bg-white/20 transition-colors"
                    >
                        Descargar imagen
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-white/60 hover:text-white transition-colors"
                        aria-label="Cerrar vista completa"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Scrollable content — image at natural size */}
            <div className="flex-1 overflow-auto flex items-start justify-center p-4">
                <div ref={contentRef} className="inline-block">
                    <FullscreenPreview
                        imageUrl={imageUrl}
                        heatmapData={heatmapData}
                        settings={settings}
                        mapMode={mapMode}
                        spotlightSettings={spotlightSettings}
                        coldSettings={coldSettings}
                        showHeatmap={showHeatmap}
                    />
                </div>
            </div>
        </div>
    );
};
