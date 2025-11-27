import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { companiesApi } from '@/api/domains/companies';
import { findSimilarStrings, areSimilarEnough } from '@/utils/stringUtils';
import { SmartSuggestions } from './SmartSuggestions';

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CompanySelectWithCreateProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  id?: string;
  onCompanyCreated?: (newCompany: { id: string; name: string }) => void;
}

export const CompanySelectWithCreate: React.FC<CompanySelectWithCreateProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select or create a company',
  disabled = false,
  error = false,
  className,
  id,
  onCompanyCreated
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Encontrar la opción seleccionada
  const selectedOption = options.find(option => option.value === value);

  // Filtrar opciones basado en el texto de búsqueda
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchText.toLowerCase())
  );

  // Verificar si el texto ingresado coincide exactamente con alguna opción existente
  const exactMatch = options.find(option =>
    option.label.toLowerCase() === searchText.toLowerCase()
  );

  // Encontrar empresas similares usando el algoritmo de similitud
  const similarCompanies = useMemo(() => {
    if (!searchText.trim() || exactMatch) return [];

    const companyNames = options.map(option => option.label);
    const similarities = findSimilarStrings(searchText, companyNames, 60); // Umbral más bajo para mostrar más sugerencias

    return similarities.map(sim => ({
      text: sim.text,
      similarity: sim.similarity,
      value: options.find(opt => opt.label === sim.text)?.value || ''
    }));
  }, [searchText, options, exactMatch]);

  // Verificar si hay empresas muy similares (posibles duplicados)
  const hasSimilarCompanies = similarCompanies.length > 0;
  const hasHighSimilarity = similarCompanies.some(company => company.similarity >= 85);

  // Determinar si mostrar la opción de crear empresa
  const shouldShowCreateOption = searchText.trim() && !exactMatch && !isCreating && !showSuggestions;

  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchText('');
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Enfocar el input cuando se abre el dropdown
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Detectar automáticamente empresas similares mientras el usuario escribe
  useEffect(() => {
    if (hasSimilarCompanies && hasHighSimilarity && !showSuggestions) {
      setShowSuggestions(true);
    } else if (!hasSimilarCompanies && showSuggestions) {
      setShowSuggestions(false);
    }
  }, [hasSimilarCompanies, hasHighSimilarity, showSuggestions]);

  const handleCreateCompany = async () => {
    if (!searchText.trim() || isCreating) return;

    try {
      setIsCreating(true);
      const response = await companiesApi.create({
        name: searchText.trim(),
        status: 'active'
      });

      if (response.success && response.data) {
        const newCompany = response.data;
        // Notificar al componente padre que se creó una nueva empresa
        onCompanyCreated?.(newCompany);
        // Seleccionar la empresa recién creada
        onChange(newCompany.id);
        setIsOpen(false);
        setSearchText('');
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error creating company:', error);
      // Aquí podrías mostrar una notificación de error
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectSuggestion = (suggestionValue: string) => {
    onChange(suggestionValue);
    setIsOpen(false);
    setSearchText('');
    setShowSuggestions(false);
  };

  const handleCreateAnyway = () => {
    setShowSuggestions(false);
    handleCreateCompany();
  };

  const handleOptionClick = (optionValue: string) => {
    if (disabled) return;
    onChange(optionValue);
    setIsOpen(false);
    setSearchText('');
    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length === 1) {
        // Si hay solo una opción filtrada, seleccionarla
        handleOptionClick(filteredOptions[0].value);
      } else if (shouldShowCreateOption) {
        // Si no hay coincidencias exactas, crear nueva empresa
        handleCreateCompany();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchText('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Navegar a la primera opción filtrada
      if (filteredOptions.length > 0) {
        handleOptionClick(filteredOptions[0].value);
      }
    }
  };

  return (
    <div ref={selectRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        id={id}
        type="button"
        className={cn(
          'w-full px-3 py-2 rounded-lg border text-left flex items-center justify-between',
          'bg-white text-neutral-900 shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'transition-colors duration-200',
          error ? 'border-red-500' : 'border-neutral-200 hover:border-neutral-300',
          disabled && 'opacity-50 cursor-not-allowed bg-neutral-50',
          isOpen && 'ring-2 ring-blue-500 border-transparent'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={id && `${id}-label`}
      >
        <span className={cn(
          'block truncate',
          !selectedOption && 'text-neutral-500'
        )}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-neutral-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div className={cn(
          'absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg',
          'max-h-60 overflow-hidden flex flex-col'
        )}>
          {/* Search input */}
          <div className="p-2 border-b border-neutral-200">
            <input
              ref={inputRef}
              type="text"
              value={searchText}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder="Search or type to create..."
              className="w-full px-2 py-1 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Smart suggestions */}
          {showSuggestions && hasSimilarCompanies && (
            <SmartSuggestions
              searchText={searchText}
              similarCompanies={similarCompanies}
              onSelectSuggestion={handleSelectSuggestion}
              onCreateAnyway={handleCreateAnyway}
            />
          )}

          {/* Options list */}
          {!showSuggestions && (
            <div className="overflow-auto max-h-40">
              {filteredOptions.length === 0 && !shouldShowCreateOption ? (
                <div className="px-3 py-2 text-sm text-neutral-500">
                  No companies found
                </div>
              ) : (
                <>
                  {filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        'w-full px-3 py-2 text-left hover:bg-neutral-50 focus:bg-neutral-50',
                        'focus:outline-none text-sm transition-colors duration-150',
                        'flex items-center justify-between',
                        option.disabled && 'opacity-50 cursor-not-allowed',
                        option.value === value && 'bg-blue-50 text-blue-900'
                      )}
                      onClick={() => !option.disabled && handleOptionClick(option.value)}
                      disabled={option.disabled}
                      role="option"
                      aria-selected={option.value === value}
                    >
                      <span className="block truncate">{option.label}</span>
                      {option.value === value && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </button>
                  ))}

                  {/* Create new company option */}
                  {shouldShowCreateOption && (
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-green-50 focus:bg-green-50 focus:outline-none text-sm transition-colors duration-150 flex items-center gap-2 border-t border-neutral-200"
                      onClick={handleCreateCompany}
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 text-green-600" />
                      )}
                      <span className="text-green-700">
                        {isCreating ? 'Creating...' : `Create "${searchText}"`}
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};