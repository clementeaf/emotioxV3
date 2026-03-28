import { useState, useEffect, useCallback } from 'react';
import { Eye, Users, Clock, Crosshair, Image, Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { ResultsStateHandler } from '../shared/ResultsStateHandler';
import { HeatmapRenderer } from '../cognitive-task/components/HeatmapRenderer';
import * as analyticsService from '../../../services/analytics.service';
import type { EyeTrackingStimulus, EyeTrackingAOI } from '../../../services/analytics.service';

interface EyeTrackingResultsProps {
  researchId: string;
  className?: string;
}

type ViewMode = 'heatmap' | 'image';

// ==========================================
// STIMULUS CARD
// ==========================================

const StimulusCard = ({ stimulus }: { stimulus: EyeTrackingStimulus }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap');
  const [imageContainerRef, setImageContainerRef] = useState<HTMLDivElement | null>(null);

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
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {stimulus.moduleName}
          </h3>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {stimulus.modality === 'shelf' ? 'Shelf' : 'Stand Alone'}
          </span>
        </div>
        {stimulus.taskDescription && (
          <p className="text-sm text-gray-600">{stimulus.taskDescription}</p>
        )}
      </div>

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
            active={viewMode === 'image'}
            onClick={() => setViewMode('image')}
            icon={<Image className="h-4 w-4" />}
            label="Image"
          />
        </div>
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

      {/* Stimulus image / heatmap */}
      <div className="px-5 pb-4">
        {stimulus.stimulusUrl ? (
          <div ref={setImageContainerRef} className="w-fit mx-auto">
            {viewMode === 'heatmap' && stimulus.heatmapData.length > 0 ? (
              <HeatmapRenderer
                imageUrl={stimulus.stimulusUrl}
                data={stimulus.heatmapData.map(p => ({ x: p.x, y: p.y, value: p.duration }))}
                className="w-full"
              />
            ) : (
              <div className="rounded-lg overflow-hidden border bg-gray-100 w-fit mx-auto">
                <img
                  src={stimulus.stimulusUrl}
                  alt={stimulus.moduleName}
                  className="max-h-[700px] w-auto block"
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
    </div>
  );
};

// ==========================================
// HELPER COMPONENTS
// ==========================================

const MetricBadge = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
  <div className="text-center">
    <div className="flex items-center justify-center gap-1.5 text-gray-400 mb-1">
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <p className="text-lg font-semibold text-gray-900">{value}</p>
  </div>
);

const ViewModeTab = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors
      ${active
        ? 'bg-blue-100 text-blue-700 font-medium'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }
    `}
  >
    {icon}
    {label}
  </button>
);

const AOIRow = ({ aoi, index, stimulusUrl }: { aoi: EyeTrackingAOI; index: number; stimulusUrl: string }) => (
  <div className="flex items-center gap-4 p-3 bg-white border rounded-lg">
    {/* Thumbnail: cropped preview of the AOI region */}
    {stimulusUrl && (
      <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0 border bg-gray-50">
        <img
          src={stimulusUrl}
          alt={`AOI ${index + 1}`}
          className="w-full h-full"
          style={{
            objectFit: 'cover',
            objectPosition: `${aoi.x + aoi.width / 2}% ${aoi.y + aoi.height / 2}%`,
          }}
        />
      </div>
    )}

    {/* Label + index */}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 truncate">
        {aoi.label || `Area of Interest (AOI)`}
      </p>
      <p className="text-xs text-gray-400">#{index + 1}</p>
    </div>

    {/* Stats */}
    <div className="flex items-center gap-6 text-sm">
      <div className="text-center">
        <p className="font-semibold text-blue-600">{aoi.dwellTimePercent}%</p>
        <p className="text-xs text-gray-400">Dwell</p>
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-700">
          <Crosshair className="h-3.5 w-3.5 inline-block mr-0.5 -mt-0.5" />
          {aoi.fixationCount}
        </p>
        <p className="text-xs text-gray-400">Fixations</p>
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-700">
          {aoi.avgDuration > 0 ? `${(aoi.avgDuration / 1000).toFixed(1)}s` : '—'}
        </p>
        <p className="text-xs text-gray-400">Duration</p>
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-700">
          <Users className="h-3.5 w-3.5 inline-block mr-0.5 -mt-0.5" />
          {aoi.participantCount}
        </p>
        <p className="text-xs text-gray-400">Viewers</p>
      </div>
    </div>
  </div>
);

// ==========================================
// MAIN COMPONENT
// ==========================================

export const EyeTrackingResults = ({ researchId, className }: EyeTrackingResultsProps) => {
  const [data, setData] = useState<analyticsService.EyeTrackingResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await analyticsService.getEyeTrackingResults(researchId);
      setData(results);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load eye tracking results'));
    } finally {
      setIsLoading(false);
    }
  }, [researchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadingSkeleton = (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="h-96 bg-gray-200 rounded-xl" />
      <div className="h-96 bg-gray-200 rounded-xl" />
    </div>
  );

  return (
    <ResultsStateHandler
      isLoading={isLoading}
      error={error}
      onRetry={fetchData}
      loadingSkeleton={loadingSkeleton}
    >
      {data && (
        <div className={className}>
          {/* Header */}
          <div className="mb-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 mb-4">
              <span className="text-sm font-semibold text-gray-700">5.0.- Eye Tracking</span>
            </div>
          </div>

          {data.stimuli.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <Eye className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-900 mb-2">No Eye Tracking modules found</p>
              <p className="text-sm text-gray-500">
                This research does not have Eye Tracking stimuli configured.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {data.stimuli.map(stimulus => (
                <StimulusCard key={stimulus.moduleId} stimulus={stimulus} />
              ))}
            </div>
          )}
        </div>
      )}
    </ResultsStateHandler>
  );
};
