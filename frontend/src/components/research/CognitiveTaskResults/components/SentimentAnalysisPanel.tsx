'use client';


import { SentimentAnalysis } from '../types';

interface SentimentAnalysisPanelProps {
  analysis?: SentimentAnalysis;
}

export function SentimentAnalysisPanel({ analysis }: SentimentAnalysisPanelProps) {
  if (!analysis) {
    return (
      <div className="p-6 text-center">
        <p className="text-neutral-500">No hay datos de análisis disponibles.</p>
      </div>
    );
  }

  // 🎯 FUNCIÓN PARA EXTRAER EL TEXTO REAL
  const extractTextValue = (text: any): string => {
    if (typeof text === 'string') {
      return text;
    }

    if (typeof text === 'object' && text !== null) {
      // Intentar extraer el valor de diferentes propiedades comunes
      if (text.value) {
        return String(text.value);
      }
      if (text.text) {
        return String(text.text);
      }
      if (text.response) {
        return String(text.response);
      }
      if (text.answer) {
        return String(text.answer);
      }
      // Si no hay propiedades conocidas, mostrar el objeto como JSON
      return JSON.stringify(text);
    }

    // Fallback para otros tipos
    return String(text);
  };

  // 🎯 EXTRAER EL TEXTO REAL DEL ANÁLISIS
  const analysisText = extractTextValue(analysis.text);

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-neutral-800 mb-4">Sentiment analysis</h3>

      <div className="text-neutral-700 mb-6 whitespace-pre-line">
        {analysisText}
      </div>

      {analysis.actionables && analysis.actionables.length > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-semibold text-neutral-800 mb-3">Accionables:</h4>
          <ul className="space-y-2">
            {analysis.actionables.map((item, index) => (
              <li key={index} className="text-neutral-700">
                {extractTextValue(item)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
