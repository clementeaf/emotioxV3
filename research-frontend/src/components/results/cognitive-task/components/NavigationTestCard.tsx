import { useState, useMemo, useRef, useEffect } from 'react';
import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';
import { HeatmapRenderer } from './HeatmapRenderer';

interface AOI {
  id: string;
  label: string;
  percentage: number;
  thumbnail?: string;
}

interface NavigationResponse {
  participantId: string;
  completed?: boolean;
  completedFlow?: boolean;
  clicks?: number;
  totalClicks?: number;
  correctClicks: number;
  accuracy?: number;
  duration?: number;
  totalDuration?: number;
  heatmapData?: Array<{ x: number; y: number; timestamp: number; isCorrect: boolean }>;
}

interface NavigationStep {
  stepNumber: number;
  title: string;
  description?: string;
  duration: string;
  completionRate: number;
  participantCount: number;
  aois?: AOI[];
  hasHeatmap?: boolean;
  heatmapData?: Array<{ x: number; y: number; value?: number; isCorrect?: boolean; timestamp?: number }>;
  imageUrl?: string;
  hitZones?: Array<{ x: number; y: number; width: number; height: number }>;
  responses?: NavigationResponse[];
}

interface NavigationTestCardProps {
  questionNumber: string;
  questionText: string;
  questionType?: string;
  conditionalityDisabled?: boolean;
  required?: boolean;
  steps: NavigationStep[];
  onDownloadCSV?: () => void;
  className?: string;
}

const GRID_SIZE = 10;

const HitZoneOverlay = ({ hitZones }: { hitZones?: Array<{ x: number; y: number; width: number; height: number }> }) => {
  if (!hitZones || hitZones.length === 0) return null;
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      {hitZones.map((hz, idx) => (
        <rect
          key={idx}
          x={hz.x}
          y={hz.y}
          width={hz.width}
          height={hz.height}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3B82F6"
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />
      ))}
    </svg>
  );
};

const QuantityMapperTab = ({ step }: { step: NavigationStep }) => {
  const gridData = useMemo(() => {
    const cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => 0);
    const clicks = step.heatmapData || [];
    let maxCount = 0;

    for (const click of clicks) {
      const col = Math.min(Math.floor((click.x / 100) * GRID_SIZE), GRID_SIZE - 1);
      const row = Math.min(Math.floor((click.y / 100) * GRID_SIZE), GRID_SIZE - 1);
      cells[row * GRID_SIZE + col]++;
      if (cells[row * GRID_SIZE + col] > maxCount) {
        maxCount = cells[row * GRID_SIZE + col];
      }
    }

    return { cells, maxCount };
  }, [step.heatmapData]);

  if (!step.imageUrl) {
    return (
      <div className="mb-4 rounded-lg overflow-hidden bg-gray-200 h-64 flex items-center justify-center">
        <span className="text-gray-500 font-semibold text-lg">No Image Available</span>
      </div>
    );
  }

  const cellW = 100 / GRID_SIZE;
  const cellH = 100 / GRID_SIZE;

  return (
    <div className="space-y-3">
      <div className="mb-4 rounded-lg overflow-hidden border bg-gray-100 relative">
        <img src={step.imageUrl} alt={step.title} className="w-full h-auto" />
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {gridData.cells.map((count, idx) => {
            if (count === 0) return null;
            const row = Math.floor(idx / GRID_SIZE);
            const col = idx % GRID_SIZE;
            const opacity = gridData.maxCount > 0 ? (count / gridData.maxCount) * 0.7 + 0.1 : 0;
            return (
              <rect
                key={idx}
                x={col * cellW}
                y={row * cellH}
                width={cellW}
                height={cellH}
                fill={`rgba(239, 68, 68, ${opacity})`}
                stroke="rgba(239, 68, 68, 0.3)"
                strokeWidth="0.15"
              />
            );
          })}
          {/* Grid lines */}
          {Array.from({ length: GRID_SIZE + 1 }, (_, i) => (
            <line key={`h-${i}`} x1={0} y1={i * cellH} x2={100} y2={i * cellH} stroke="rgba(0,0,0,0.1)" strokeWidth="0.1" />
          ))}
          {Array.from({ length: GRID_SIZE + 1 }, (_, i) => (
            <line key={`v-${i}`} x1={i * cellW} y1={0} x2={i * cellW} y2={100} stroke="rgba(0,0,0,0.1)" strokeWidth="0.1" />
          ))}
          {/* Count labels */}
          {gridData.cells.map((count, idx) => {
            if (count === 0) return null;
            const row = Math.floor(idx / GRID_SIZE);
            const col = idx % GRID_SIZE;
            return (
              <text
                key={`t-${idx}`}
                x={col * cellW + cellW / 2}
                y={row * cellH + cellH / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="2"
                fill="white"
                fontWeight="bold"
                style={{ textShadow: '0 0 2px rgba(0,0,0,0.8)' } as React.CSSProperties}
              >
                {count}
              </text>
            );
          })}
        </svg>
        <HitZoneOverlay hitZones={step.hitZones} />
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-gray-600">
        <span>Click density:</span>
        <div className="flex items-center gap-1">
          <span>Low</span>
          <div className="flex">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((op) => (
              <div key={op} className="w-5 h-3" style={{ backgroundColor: `rgba(239, 68, 68, ${op})` }} />
            ))}
          </div>
          <span>High</span>
        </div>
        {gridData.maxCount > 0 && (
          <span className="text-gray-500">Max: {gridData.maxCount} clicks/cell</span>
        )}
      </div>
    </div>
  );
};

const ScanPathTab = ({ step }: { step: NavigationStep }) => {
  const clicks = useMemo(() => {
    const raw = step.heatmapData || [];
    return [...raw].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  }, [step.heatmapData]);

  if (!step.imageUrl) {
    return (
      <div className="mb-4 rounded-lg overflow-hidden bg-gray-200 h-64 flex items-center justify-center">
        <span className="text-gray-500 font-semibold text-lg">No Image Available</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="mb-4 rounded-lg overflow-hidden border bg-gray-100 relative">
        <img src={step.imageUrl} alt={step.title} className="w-full h-auto" />
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Defs for arrow markers */}
          <defs>
            <marker id="arrow-green" markerWidth="3" markerHeight="3" refX="2" refY="1.5" orient="auto">
              <path d="M0,0 L3,1.5 L0,3 Z" fill="#22C55E" />
            </marker>
            <marker id="arrow-red" markerWidth="3" markerHeight="3" refX="2" refY="1.5" orient="auto">
              <path d="M0,0 L3,1.5 L0,3 Z" fill="#EF4444" />
            </marker>
          </defs>
          {/* Lines connecting sequential clicks */}
          {clicks.map((click, idx) => {
            if (idx === 0) return null;
            const prev = clicks[idx - 1];
            const isCorrect = click.isCorrect;
            return (
              <line
                key={`line-${idx}`}
                x1={prev.x}
                y1={prev.y}
                x2={click.x}
                y2={click.y}
                stroke={isCorrect ? '#22C55E' : '#EF4444'}
                strokeWidth="0.3"
                strokeOpacity={0.7}
                markerEnd={isCorrect ? 'url(#arrow-green)' : 'url(#arrow-red)'}
              />
            );
          })}
          {/* Click points with numbers */}
          {clicks.map((click, idx) => (
            <g key={`point-${idx}`}>
              <circle
                cx={click.x}
                cy={click.y}
                r="1.2"
                fill={click.isCorrect ? '#22C55E' : '#EF4444'}
                stroke="white"
                strokeWidth="0.3"
              />
              <text
                x={click.x}
                y={click.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="1"
                fill="white"
                fontWeight="bold"
              >
                {idx + 1}
              </text>
            </g>
          ))}
        </svg>
        <HitZoneOverlay hitZones={step.hitZones} />
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Correct click</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Incorrect click</span>
        </div>
        <span className="text-gray-400">Numbers indicate click order</span>
        <span className="text-gray-500">{clicks.length} total clicks</span>
      </div>
    </div>
  );
};

const getClicks = (r: NavigationResponse) => r.totalClicks ?? r.clicks ?? 0;
const getDuration = (r: NavigationResponse) => r.totalDuration ?? r.duration ?? 0;
const getCompleted = (r: NavigationResponse) => r.completed ?? r.completedFlow ?? false;

const NavigationTab = ({ step }: { step: NavigationStep }) => {
  const responses = step.responses || [];
  const totalClicks = responses.reduce((sum, r) => sum + getClicks(r), 0);
  const totalCorrect = responses.reduce((sum, r) => sum + r.correctClicks, 0);
  const overallAccuracy = totalClicks > 0 ? Math.round((totalCorrect / totalClicks) * 100) : 0;
  const avgDuration = responses.length > 0
    ? (responses.reduce((sum, r) => sum + getDuration(r), 0) / responses.length / 1000).toFixed(1)
    : '0';
  const completedCount = responses.filter(r => getCompleted(r)).length;

  return (
    <div className="space-y-6">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-900">{totalClicks}</div>
          <div className="text-xs text-gray-500 mt-1">Total Clicks</div>
        </div>
        <div className="p-4 bg-white border rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{totalCorrect}</div>
          <div className="text-xs text-gray-500 mt-1">Correct Clicks</div>
        </div>
        <div className="p-4 bg-white border rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{overallAccuracy}%</div>
          <div className="text-xs text-gray-500 mt-1">Accuracy</div>
        </div>
        <div className="p-4 bg-white border rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-900">{avgDuration}s</div>
          <div className="text-xs text-gray-500 mt-1">Avg Duration</div>
        </div>
      </div>

      {/* Completion summary */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-600">Completed flow:</span>
        <span className="font-semibold text-green-600">{completedCount}/{responses.length}</span>
        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${responses.length > 0 ? (completedCount / responses.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Per-participant table */}
      {responses.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Participant</th>
                <th className="text-center px-4 py-2 font-medium text-gray-600">Completed</th>
                <th className="text-center px-4 py-2 font-medium text-gray-600">Clicks</th>
                <th className="text-center px-4 py-2 font-medium text-gray-600">Correct</th>
                <th className="px-4 py-2 font-medium text-gray-600">Accuracy</th>
                <th className="text-center px-4 py-2 font-medium text-gray-600">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {responses.map((r, idx) => {
                const clicks = getClicks(r);
                const acc = clicks > 0 ? Math.round((r.correctClicks / clicks) * 100) : 0;
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900 font-mono text-xs">
                      {r.participantId.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-2 text-center">
                      {getCompleted(r) ? (
                        <span className="text-green-600 font-semibold">Yes</span>
                      ) : (
                        <span className="text-red-500">No</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center text-gray-700">{clicks}</td>
                    <td className="px-4 py-2 text-center text-gray-700">{r.correctClicks}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={cn(
                              'h-2 rounded-full transition-all',
                              acc >= 70 ? 'bg-green-500' : acc >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            )}
                            style={{ width: `${acc}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-10 text-right">{acc}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center text-gray-700">{(getDuration(r) / 1000).toFixed(1)}s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {responses.length === 0 && (
        <div className="text-center py-8 text-gray-500">No participant data available</div>
      )}
    </div>
  );
};

export const NavigationTestCard = ({
  questionNumber,
  questionText,
  questionType = 'Navigation Test',
  conditionalityDisabled = true,
  required = false,
  steps,
  onDownloadCSV,
  className
}: NavigationTestCardProps) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1]));
  const [activeTab, setActiveTab] = useState('heat-click-map');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  const toggleStep = (stepNumber: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepNumber)) {
      newExpanded.delete(stepNumber);
    } else {
      newExpanded.add(stepNumber);
    }
    setExpandedSteps(newExpanded);
  };

  return (
    <Card className={cn('p-6 pb-24', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">{questionNumber}- {questionText}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 text-xs font-medium rounded text-green-600 bg-green-50">
              {questionType}
            </span>
            {conditionalityDisabled && (
              <span className="px-2 py-1 text-xs font-medium rounded text-blue-600 bg-blue-50">
                Conditionality disabled
              </span>
            )}
            {required && (
              <span className="px-2 py-1 text-xs font-medium rounded text-red-600 bg-red-50">
                Required
              </span>
            )}
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
            aria-label="Options"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 py-1 bg-white border rounded-lg shadow-lg z-10">
              {onDownloadCSV ? (
                <button
                  type="button"
                  onClick={() => {
                    onDownloadCSV();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Descargar CSV (.csv)
                </button>
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">No actions</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step) => {
          const isExpanded = expandedSteps.has(step.stepNumber);

          return (
            <div key={step.stepNumber} className="border rounded-lg overflow-hidden">
              {/* Step Header - Always Visible */}
              <div className="p-4 bg-white flex items-center gap-4">
                {/* Step thumbnail */}
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-blue-700">Step {step.stepNumber}</span>
                </div>

                {/* Progress info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-700">Step {step.stepNumber}</span>
                    {/* Progress bar */}
                    <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${step.completionRate}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{step.duration}</span>
                    <span className="text-xs font-semibold text-blue-600">{step.completionRate}%</span>
                    <span className="text-xs text-gray-500">{step.participantCount}</span>
                  </div>
                </div>

                {/* Show details button */}
                <button
                  onClick={() => toggleStep(step.stepNumber)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                >
                  {isExpanded ? 'Hide details' : 'Show details'}
                </button>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t bg-gray-50">
                  {/* Step Title */}
                  <div className="p-4 border-b bg-white">
                    <h4 className="font-semibold text-base mb-1">{step.title}</h4>
                    {step.description && (
                      <p className="text-sm text-gray-600">{step.description}</p>
                    )}
                  </div>

                  {/* Update Banner */}
                  <div className="p-3 bg-purple-50 border-b border-purple-200 flex items-center justify-between">
                    <span className="text-sm text-purple-900">
                      New data was obtained. Please update graph
                    </span>
                    <button className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">
                      Update
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="border-b bg-white">
                    <div className="flex gap-1 px-4">
                      {['Heat click map', 'Click map', 'Quantity mapper', 'Scan Path', 'Image', 'Navigation'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab.toLowerCase().replace(/\s+/g, '-'))}
                          className={cn(
                            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                            activeTab === tab.toLowerCase().replace(/\s+/g, '-')
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-gray-600 hover:text-gray-900'
                          )}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-4">
                    {/* Heat Click Map Tab - Shows heatmap with clicks colored by correctness */}
                    {activeTab === 'heat-click-map' && (
                      <>
                        {step.imageUrl ? (
                          <div className="mb-4 rounded-lg overflow-hidden border bg-gray-100 relative">
                            <HeatmapRenderer
                              imageUrl={step.imageUrl}
                              data={step.heatmapData || []}
                              className="w-full"
                            />
                            {/* Overlay hitZones on top of heatmap */}
                            {step.hitZones && step.hitZones.length > 0 && (
                              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                {step.hitZones.map((hz, idx) => (
                                  <rect
                                    key={idx}
                                    x={hz.x}
                                    y={hz.y}
                                    width={hz.width}
                                    height={hz.height}
                                    fill="rgba(59, 130, 246, 0.15)"
                                    stroke="#3B82F6"
                                    strokeWidth="0.5"
                                    strokeDasharray="2,2"
                                  />
                                ))}
                              </svg>
                            )}
                          </div>
                        ) : (
                          <div className="mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 h-64 flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">Heatmap (No Image Available)</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Click Map Tab - Shows individual clicks as dots */}
                    {activeTab === 'click-map' && (
                      <>
                        {step.imageUrl ? (
                          <div className="mb-4 rounded-lg overflow-hidden border bg-gray-100 relative">
                            <img src={step.imageUrl} alt={step.title} className="w-full h-auto" />
                            {/* Render individual clicks as dots */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                              {(step.heatmapData || []).map((click, idx) => (
                                <circle
                                  key={idx}
                                  cx={click.x}
                                  cy={click.y}
                                  r="0.8"
                                  fill={click.isCorrect ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'}
                                  stroke={click.isCorrect ? '#22C55E' : '#EF4444'}
                                  strokeWidth="0.2"
                                />
                              ))}
                            </svg>
                            {/* Overlay hitZones */}
                            {step.hitZones && step.hitZones.length > 0 && (
                              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                {step.hitZones.map((hz, idx) => (
                                  <rect
                                    key={idx}
                                    x={hz.x}
                                    y={hz.y}
                                    width={hz.width}
                                    height={hz.height}
                                    fill="rgba(59, 130, 246, 0.1)"
                                    stroke="#3B82F6"
                                    strokeWidth="0.5"
                                    strokeDasharray="2,2"
                                  />
                                ))}
                              </svg>
                            )}
                          </div>
                        ) : (
                          <div className="mb-4 rounded-lg overflow-hidden bg-gray-200 h-64 flex items-center justify-center">
                            <span className="text-gray-500 font-semibold text-lg">No Image Available</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Image Tab - Shows only the image */}
                    {activeTab === 'image' && (
                      <>
                        {step.imageUrl ? (
                          <div className="mb-4 rounded-lg overflow-hidden border bg-gray-100">
                            <img src={step.imageUrl} alt={step.title} className="w-full h-auto" />
                          </div>
                        ) : (
                          <div className="mb-4 rounded-lg overflow-hidden bg-gray-200 h-64 flex items-center justify-center">
                            <span className="text-gray-500 font-semibold text-lg">No Image Available</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Quantity Mapper Tab - Grid density overlay */}
                    {activeTab === 'quantity-mapper' && (
                      <QuantityMapperTab step={step} />
                    )}

                    {/* Scan Path Tab - Sequential click paths */}
                    {activeTab === 'scan-path' && (
                      <ScanPathTab step={step} />
                    )}

                    {/* Navigation Tab - Statistics and per-participant table */}
                    {activeTab === 'navigation' && (
                      <NavigationTab step={step} />
                    )}

                    {/* AOIs (Areas of Interest) */}
                    {step.aois && step.aois.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">Areas of Interest (AOI)</h5>
                        {step.aois.map((aoi, idx) => (
                          <div key={idx} className="flex items-center gap-4 p-3 bg-white border rounded-lg">
                            {/* AOI Thumbnail */}
                            <div className={cn(
                              'w-16 h-16 rounded flex items-center justify-center flex-shrink-0',
                              idx === 0 ? 'bg-gray-100' :
                                idx === 1 ? 'bg-blue-900' :
                                  idx === 2 ? 'bg-gray-200' :
                                    'bg-gradient-to-br from-blue-200 to-purple-200'
                            )}>
                              {idx === 0 && (
                                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>

                            {/* AOI Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{aoi.label}</span>
                                <span className="text-xs text-gray-500">#1</span>
                              </div>
                            </div>

                            {/* Percentage */}
                            <div className="text-right">
                              <span className="text-sm font-semibold text-blue-600">{aoi.percentage}%</span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <button className="text-gray-400 hover:text-gray-600">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button className="text-gray-400 hover:text-gray-600">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                                Remove AOI
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
