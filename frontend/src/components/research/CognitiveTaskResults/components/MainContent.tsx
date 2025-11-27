'use client';

import { useState, useEffect } from 'react';

import { CognitiveTaskQuestion } from '../types';

import { AnalysisTabs, AnalysisTabType, CommentsList, KeywordsPanel, SentimentAnalysisPanel, ThemesPanel } from './';

interface MainContentProps {
  data: CognitiveTaskQuestion;
  initialActiveTab?: AnalysisTabType;
  themeImageSrc?: string;
}

export function MainContent({
  data,
  initialActiveTab = 'sentiment',
  themeImageSrc
}: MainContentProps) {
  const [activeTab, setActiveTab] = useState<AnalysisTabType>(initialActiveTab);
  
  // Inicializar selectedItems con los IDs de los sentimentResults disponibles
  const [selectedItems, setSelectedItems] = useState<string[]>(() => {
    if (data.sentimentResults && data.sentimentResults.length > 0) {
      return data.sentimentResults.map(item => item.id);
    }
    return [];
  });
  
  // Actualizar selectedItems cuando cambien los sentimentResults
  useEffect(() => {
    if (data.sentimentResults && data.sentimentResults.length > 0) {
      setSelectedItems(data.sentimentResults.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  }, [data.sentimentResults]);

  const toggleItemSelection = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleSelectAll = () => {
    if (data.sentimentResults) {
      if (selectedItems.length === data.sentimentResults.length) {
        setSelectedItems([]);
      } else {
        setSelectedItems(data.sentimentResults.map(item => item.id));
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
      {/* Panel izquierdo: Lista de comentarios */}
      {data.sentimentResults && data.sentimentResults.length > 0 ? (
        <CommentsList
          comments={data.sentimentResults}
          selectedItems={selectedItems}
          onToggleSelection={toggleItemSelection}
          onSelectAll={handleSelectAll}
          questionId={data.questionNumber}
          questionType={data.questionType}
          required={data.required}
          conditionalityDisabled={data.conditionalityDisabled}
        />
      ) : (
        <div className="p-4 text-center text-gray-500">
          <p>No hay datos de sentimiento disponibles</p>
          <p className="text-sm">data.sentimentResults: {data.sentimentResults ? `Array(${data.sentimentResults.length})` : 'undefined'}</p>
          <p className="text-xs mt-2">data completo: {JSON.stringify(data, null, 2)}</p>
        </div>
      )}

      {/* Panel derecho: Análisis de sentimiento */}
      <div className="max-h-[500px] overflow-y-auto">
        {/* Pestañas */}
        <AnalysisTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Contenido de la pestaña */}
        {activeTab === 'sentiment' && (
          <SentimentAnalysisPanel analysis={data.sentimentAnalysis} />
        )}

        {activeTab === 'themes' && (
          <ThemesPanel
            themes={data.themes}
            imageSrc={themeImageSrc}
          />
        )}

        {activeTab === 'keywords' && (
          <KeywordsPanel keywords={data.keywords} />
        )}
      </div>
    </div>
  );
}
