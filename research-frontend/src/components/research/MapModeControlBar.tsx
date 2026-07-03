import { cn } from '../../lib/utils';
import {
    ACTIVE_HEATMAP_MAP_MODES,
    getHeatmapMapModeLabel,
    type HeatmapMapMode,
} from '../../utils/attentionPrediction.utils';

interface HeatmapSettings {
    blur: number;
    opacity: number;
    threshold: number;
    preset: string;
}

const DETAIL_PRESETS = ['Lab', 'Precise', 'Balanced', 'Smooth'];

// eslint-disable-next-line react-refresh/only-export-components
export const PRESET_VALUES: Record<string, Pick<HeatmapSettings, 'blur' | 'threshold' | 'opacity'>> = {
    'Lab':      { blur: 5,  threshold: 68, opacity: 45 },
    'Precise':  { blur: 8,  threshold: 58, opacity: 55 },
    'Balanced': { blur: 8,  threshold: 54, opacity: 48 },
    'Smooth':   { blur: 20, threshold: 50, opacity: 40 },
};

interface MapModeControlBarProps {
    mapMode: HeatmapMapMode;
    settings: HeatmapSettings;
    isAoiEditMode?: boolean;
    heatmapViewSummary: string;
    onMapModeChange: (mode: HeatmapMapMode) => void;
    onPresetChange: (preset: string, values: Pick<HeatmapSettings, 'blur' | 'threshold' | 'opacity'>) => void;
    onOpenSettings: () => void;
}

export const MapModeControlBar = ({
    mapMode,
    settings,
    isAoiEditMode = false,
    heatmapViewSummary,
    onMapModeChange,
    onPresetChange,
    onOpenSettings,
}: MapModeControlBarProps) => (
    <div className="px-4 py-2.5 border-b bg-slate-50 flex items-center gap-4 flex-wrap">
        <div className="flex gap-1">
            {ACTIVE_HEATMAP_MAP_MODES.map((mode) => {
                const disabled = isAoiEditMode && mode !== 'classic';
                return (
                    <button
                        key={mode}
                        type="button"
                        disabled={disabled}
                        onClick={() => onMapModeChange(mode)}
                        title={disabled ? 'Spotlight y Cold no disponibles en AOI Editor' : undefined}
                        className={cn(
                            'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                            mapMode === mode
                                ? 'bg-slate-800 text-white'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100',
                            disabled && 'opacity-40 cursor-not-allowed hover:bg-white',
                        )}
                    >
                        {getHeatmapMapModeLabel(mode)}
                    </button>
                );
            })}
        </div>
        {mapMode === 'classic' && (
            <div className="flex gap-1">
                {DETAIL_PRESETS.map(p => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => onPresetChange(p, PRESET_VALUES[p])}
                        className={cn(
                            'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                            settings.preset === p
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100',
                        )}
                    >
                        {p}
                    </button>
                ))}
            </div>
        )}
        <button
            type="button"
            onClick={onOpenSettings}
            className="max-w-md truncate rounded border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 hover:border-blue-300 hover:text-blue-700 transition-colors"
            title={heatmapViewSummary}
        >
            {heatmapViewSummary}
        </button>
        <button
            type="button"
            onClick={onOpenSettings}
            className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
        >
            Ajuste fino
        </button>
        {isAoiEditMode === false && mapMode === 'classic' && (settings.preset === 'Smooth' || settings.threshold < 48) && (
            <span className="text-[11px] text-amber-700">
                Usa Lab o Precise para mayor granularidad
            </span>
        )}
    </div>
);
