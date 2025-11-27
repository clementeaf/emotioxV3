import React from 'react';
import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimilarCompany {
  text: string;
  similarity: number;
  value: string;
}

interface SmartSuggestionsProps {
  searchText: string;
  similarCompanies: SimilarCompany[];
  onSelectSuggestion: (value: string) => void;
  onCreateAnyway: () => void;
  className?: string;
}

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  searchText,
  similarCompanies,
  onSelectSuggestion,
  onCreateAnyway,
  className
}) => {
  if (similarCompanies.length === 0) return null;

  const highSimilarity = similarCompanies.some(company => company.similarity >= 85);

  return (
    <div className={cn('border-t border-amber-200 bg-amber-50 p-3', className)}>
      <div className="flex items-start gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800">
            {highSimilarity ? '¿Quisiste decir alguna de estas empresas?' : 'Empresas similares encontradas'}
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Evita duplicados seleccionando una empresa existente
          </p>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        {similarCompanies.slice(0, 3).map((company, index) => (
          <button
            key={company.value}
            type="button"
            onClick={() => onSelectSuggestion(company.value)}
            className="w-full flex items-center justify-between p-2 rounded-md hover:bg-amber-100 transition-colors text-left border border-transparent hover:border-amber-300"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
              <span className="text-sm text-amber-800 truncate">{company.text}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs text-amber-600">
                {Math.round(company.similarity)}% similar
              </span>
              <ArrowRight className="h-3 w-3 text-amber-600" />
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-amber-200">
        <span className="text-xs text-amber-700">
          ¿Ninguna coincide?
        </span>
        <button
          type="button"
          onClick={onCreateAnyway}
          className="text-xs text-amber-800 hover:text-amber-900 font-medium hover:underline transition-colors"
        >
          Crear "{searchText}" de todas formas
        </button>
      </div>
    </div>
  );
};