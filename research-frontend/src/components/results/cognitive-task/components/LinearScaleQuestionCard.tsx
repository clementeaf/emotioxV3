import { useState, useRef, useEffect } from 'react';
import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';

interface LinearScaleOption {
  value: number;
  percentage: number;
  color: string;
}

interface LinearScaleQuestionCardProps {
  questionNumber: string;
  questionText: string;
  questionType?: string;
  conditionalityDisabled?: boolean;
  required?: boolean;
  options: LinearScaleOption[];
  totalResponses: number;
  onDownloadCSV?: () => void;
  className?: string;
}

export const LinearScaleQuestionCard = ({
  questionNumber,
  questionText,
  questionType = 'Linear Scale question',
  conditionalityDisabled = true,
  required = false,
  options,
  totalResponses,
  onDownloadCSV,
  className
}: LinearScaleQuestionCardProps) => {
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

  return (
    <Card className={cn('p-6 pb-24', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">{questionNumber}- {questionText}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 text-xs font-medium rounded text-blue-600 bg-blue-50">
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Scale Options with Colored Bars */}
        <div className="border rounded-lg p-6">
          <div className="space-y-4">
            {options.map((option) => (
              <div key={option.value} className="flex items-center gap-3">
                <div className="text-sm font-medium text-gray-700 shrink-0 whitespace-nowrap">
                  Option {String(option.value).padStart(2, '0')}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-6 rounded-full transition-all duration-300"
                    style={{
                      width: `${option.percentage}%`,
                      backgroundColor: option.color,
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-12 text-right shrink-0 cursor-help" title="Percentage of participants who selected this value">
                  {option.percentage}%
                </span>
              </div>
            ))}
          </div>

        </div>

        {/* Right: Stats */}
        <div className="border rounded-lg p-6">
          <div>
            <h3 className="text-base font-medium text-gray-700 mb-1">Responses</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900 cursor-help" title="Total number of participants who answered this question">{totalResponses.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
