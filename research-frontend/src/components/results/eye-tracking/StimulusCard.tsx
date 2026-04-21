import { useState, useCallback } from 'react';
import { Eye, Users, Clock, Crosshair, Image, Download, SmilePlus, Sparkles, ShieldCheck, Settings } from 'lucide-react';
import { toPng } from 'html-to-image';
import { HeatmapRenderer } from '../cognitive-task/components/HeatmapRenderer';
import type { EyeTrackingStimulus } from '../../../services/analytics.service';
import { resolveStimulusUrl, MetricBadge, ViewModeTab, AOIRow } from './shared';
import type { ViewMode } from './shared';
import { ZoneHeatmapOverlay } from './ZoneHeatmapOverlay';
import { EmotionPanel } from './EmotionPanel';
import { SequencePanel } from './SequencePanel';
import { TransparencyMap } from './TransparencyMap';
import { FirstLookOverlay } from './FirstLookOverlay';
import { ScanpathOverlay } from './ScanpathOverlay';
import { VideoGazePlayer } from './VideoGazePlayer';
import { PredictionPanel } from './PredictionPanel';
import { HeatmapSettingsModal, DEFAULT_HEATMAP_SETTINGS } from './HeatmapSettingsModal';
import type { HeatmapSettings } from './HeatmapSettingsModal';

export const StimulusCard = ({ stimulus: rawStimulus, researchId, onRefresh }: { stimulus: EyeTrackingStimulus; researchId: string; onRefresh: () => void }) => {
  const stimulus = { ...rawStimulus, stimulusUrl: resolveStimulusUrl(rawStimulus.stimulusUrl) };
  const hasZoneMass = stimulus.zoneMass && Object.values(stimulus.zoneMass).some(v => v > 0);
  const hasHeatData = hasZoneMass || stimulus.heatmapData.length > 0;
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap');
  const [imageContainerRef, setImageContainerRef] = useState<HTMLDivElement | null>(null);
  const [heatmapSettings, setHeatmapSettings] = useState<HeatmapSettings>(DEFAULT_HEATMAP_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!imageContainerRef) return;
    try {
      const dataUrl = await toPng(imageContainerRef);
      const link = document.createElement('a');
      link.download = `eye-tracking-${stimulus.moduleName.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch { /* ignore download errors */ }
  }, [imageContainerRef, stimulus.moduleName]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Toolbar */}

      {/* Metrics bar */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b border-gray-100">
        <MetricBadge
          icon={<Users className="h-4 w-4" />}
          label="Participants"
          value={stimulus.uniqueParticipants}
        />
        <MetricBadge
          icon={<Eye className="h-4 w-4" />}
          label="Responses"
          value={stimulus.totalResponses}
        />
        <MetricBadge
          icon={<Clock className="h-4 w-4" />}
          label="Avg Dwell Time"
          value={stimulus.avgDwellTime > 0 ? `${(stimulus.avgDwellTime / 1000).toFixed(1)}s` : '—'}
        />
        <MetricBadge
          icon={<Crosshair className="h-4 w-4" />}
          label="Avg Fixations"
          value={stimulus.avgFixationCount || '—'}
        />
      </div>

      {/* Quality summary */}
      {stimulus.qualitySummary && stimulus.qualitySummary.low > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span className="text-amber-700">
            Quality gate: <span className="font-medium">{stimulus.qualitySummary.good} good</span>
            {stimulus.qualitySummary.fair > 0 && <>, <span className="font-medium">{stimulus.qualitySummary.fair} fair</span></>}
            , <span className="font-medium text-amber-800">{stimulus.qualitySummary.low} excluded</span>
            <span className="text-amber-500 ml-1">(low calibration quality)</span>
          </span>
        </div>
      )}

      {/* View mode tabs + Download */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex gap-2">
          <ViewModeTab
            active={viewMode === 'heatmap'}
            onClick={() => setViewMode('heatmap')}
            icon={<Eye className="h-4 w-4" />}
            label="Heat map"
          />
          <ViewModeTab
            active={viewMode === 'scanpath'}
            onClick={() => setViewMode('scanpath')}
            icon={<Crosshair className="h-4 w-4" />}
            label="Scan Path"
          />
          <ViewModeTab
            active={viewMode === 'firstlook'}
            onClick={() => setViewMode('firstlook')}
            icon={<Eye className="h-4 w-4" />}
            label="First Look"
          />
          <ViewModeTab
            active={viewMode === 'transparency'}
            onClick={() => setViewMode('transparency')}
            icon={<Eye className="h-4 w-4" />}
            label="Transparency"
          />
          {stimulus.sequenceAnalysis && (
            <ViewModeTab
              active={viewMode === 'sequence'}
              onClick={() => setViewMode('sequence')}
              icon={<Crosshair className="h-4 w-4" />}
              label="Sequence"
            />
          )}
          <ViewModeTab
            active={viewMode === 'image'}
            onClick={() => setViewMode('image')}
            icon={<Image className="h-4 w-4" />}
            label="Image"
          />
          {stimulus.emotions?.enabled && (
            <ViewModeTab
              active={viewMode === 'emotions'}
              onClick={() => setViewMode('emotions')}
              icon={<SmilePlus className="h-4 w-4" />}
              label="Emotions"
            />
          )}
          <ViewModeTab
            active={viewMode === 'prediction'}
            onClick={() => setViewMode('prediction')}
            icon={<Sparkles className="h-4 w-4" />}
            label="Prediction"
          />
          {stimulus.stimulusType === 'video' && stimulus.gazeTimeline && stimulus.gazeTimeline.length > 0 && (
            <ViewModeTab
              active={viewMode === 'video'}
              onClick={() => setViewMode('video')}
              icon={<Eye className="h-4 w-4" />}
              label="Video Gaze"
            />
          )}
        </div>
        <div className="flex items-center gap-3">
          {viewMode === 'heatmap' && hasHeatData && !hasZoneMass && (
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          )}
          {stimulus.stimulusUrl && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download image
            </button>
          )}
        </div>
      </div>

      {/* Stimulus image / heatmap / emotions / prediction */}
      <div className="px-5 pb-4">
        {viewMode === 'sequence' && stimulus.sequenceAnalysis ? (
          <SequencePanel sequenceAnalysis={stimulus.sequenceAnalysis} />
        ) : viewMode === 'transparency' && stimulus.stimulusUrl ? (
          <TransparencyMap imageUrl={stimulus.stimulusUrl} fixations={stimulus.fixations} />
        ) : viewMode === 'firstlook' && stimulus.stimulusUrl ? (
          <FirstLookOverlay imageUrl={stimulus.stimulusUrl} fixations={stimulus.fixations} />
        ) : viewMode === 'scanpath' && stimulus.stimulusUrl ? (
          <ScanpathOverlay
            imageUrl={stimulus.stimulusUrl}
            fixations={stimulus.fixations}
          />
        ) : viewMode === 'video' && stimulus.gazeTimeline ? (
          <VideoGazePlayer videoUrl={stimulus.stimulusUrl} gazeTimeline={stimulus.gazeTimeline} />
        ) : viewMode === 'emotions' ? (
          <EmotionPanel emotions={stimulus.emotions} />
        ) : viewMode === 'prediction' ? (
          <PredictionPanel stimulus={stimulus} researchId={researchId} onPredictionComplete={onRefresh} />
        ) : stimulus.stimulusUrl ? (
          <div ref={setImageContainerRef} className="w-fit mx-auto">
            {viewMode === 'heatmap' && hasHeatData ? (
              hasZoneMass ? (
                <ZoneHeatmapOverlay imageUrl={stimulus.stimulusUrl} zoneMass={stimulus.zoneMass!} />
              ) : (
                <HeatmapRenderer
                  imageUrl={stimulus.stimulusUrl}
                  data={stimulus.heatmapData.map(p => ({ x: p.x, y: p.y, value: p.duration }))}
                  coordSystem="pixel"
                  blur={heatmapSettings.blur}
                  opacity={heatmapSettings.opacity}
                  threshold={heatmapSettings.threshold}
                  className="w-full"
                />
              )
            ) : (
              <div className="rounded-lg overflow-hidden border bg-gray-100 w-fit mx-auto">
                <img
                  src={stimulus.stimulusUrl}
                  alt={stimulus.moduleName}
                  className="max-h-[60vh] w-auto block"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-gray-100 border border-gray-200 h-64 flex items-center justify-center">
            <div className="text-center">
              <Image className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No stimulus image configured</p>
            </div>
          </div>
        )}
      </div>

      {/* AOI list */}
      {stimulus.aois.length > 0 && (
        <div className="px-5 pb-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Areas of Interest</h4>
          <div className="space-y-2">
            {stimulus.aois.map((aoi, idx) => (
              <AOIRow key={aoi.id} aoi={aoi} index={idx} stimulusUrl={stimulus.stimulusUrl} />
            ))}
          </div>
        </div>
      )}

      {/* No data message */}
      {stimulus.totalResponses === 0 && (
        <div className="px-5 pb-5">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">
              No responses yet. Data will appear here once participants complete this eye tracking test.
            </p>
          </div>
        </div>
      )}

      {/* Response count footer */}
      {stimulus.totalResponses > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs text-gray-400 text-right">
            {stimulus.totalResponses} response{stimulus.totalResponses !== 1 ? 's' : ''} from {stimulus.uniqueParticipants} participant{stimulus.uniqueParticipants !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Heatmap settings modal */}
      {showSettings && stimulus.stimulusUrl && (
        <HeatmapSettingsModal
          imageUrl={stimulus.stimulusUrl}
          heatmapData={stimulus.heatmapData.map(p => ({ x: p.x, y: p.y, value: p.duration }))}
          settings={heatmapSettings}
          coordSystem="pixel"
          onApply={setHeatmapSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};
