/**
 * Lexicon-based sentiment analysis for ES/EN text responses.
 * Returns: 'positive' | 'negative' | 'neutral' | 'indeterminate'
 */

export type Sentiment = 'positive' | 'negative' | 'neutral' | 'indeterminate';

// Spanish positive words
const ES_POSITIVE = new Set([
  'bueno', 'buena', 'excelente', 'genial', 'increíble', 'increible', 'maravilloso', 'maravillosa',
  'fantástico', 'fantastico', 'perfecto', 'perfecta', 'mejor', 'bien', 'muy bien', 'encanta',
  'encantó', 'encanto', 'agradable', 'fácil', 'facil', 'rápido', 'rapido', 'útil', 'util',
  'contento', 'contenta', 'feliz', 'satisfecho', 'satisfecha', 'cómodo', 'comodo', 'cómoda',
  'eficiente', 'claro', 'clara', 'intuitivo', 'intuitiva', 'práctico', 'practico',
  'recomiendo', 'recomendable', 'positivo', 'positiva', 'agrado', 'gusto', 'gustó',
  'amor', 'amo', 'hermoso', 'hermosa', 'bonito', 'bonita', 'lindo', 'linda',
  'seguro', 'segura', 'confiable', 'confianza', 'sencillo', 'sencilla',
  'funciona', 'funcional', 'efectivo', 'efectiva', 'conveniente', 'accesible',
  'amable', 'atento', 'atenta', 'profesional', 'calidad', 'vale', 'vale la pena',
  'gracias', 'agradezco', 'agradecido', 'agradecida', 'extraordinario', 'notable',
  'superior', 'sobresaliente', 'espectacular', 'impresionante', 'magnífico', 'magnifico',
  'estupendo', 'estupenda', 'óptimo', 'optimo', 'ideal', 'destacado', 'destacada',
]);

// Spanish negative words
const ES_NEGATIVE = new Set([
  'malo', 'mala', 'terrible', 'horrible', 'pésimo', 'pesimo', 'peor', 'mal',
  'difícil', 'dificil', 'complicado', 'complicada', 'confuso', 'confusa', 'lento', 'lenta',
  'molesto', 'molesta', 'frustrado', 'frustrada', 'frustrante', 'decepcionado', 'decepcionada',
  'decepcionante', 'enojado', 'enojada', 'enojo', 'triste', 'insatisfecho', 'insatisfecha',
  'incómodo', 'incomodo', 'incómoda', 'inútil', 'inutil', 'aburrido', 'aburrida',
  'feo', 'fea', 'odio', 'detesto', 'negativo', 'negativa', 'problema', 'problemas',
  'error', 'errores', 'falla', 'fallas', 'roto', 'rota', 'deficiente', 'pobre',
  'desagradable', 'inseguro', 'insegura', 'lamentable', 'mediocre', 'deplorable',
  'no funciona', 'no sirve', 'no me gusta', 'no recomiendo', 'no vale',
  'imposible', 'inaceptable', 'inadecuado', 'inadecuada', 'innecesario', 'innecesaria',
  'vergonzoso', 'vergonzosa', 'ridículo', 'ridiculo', 'absurdo', 'absurda',
  'queja', 'quejas', 'reclamo', 'estafa', 'basura', 'desperdicio',
]);

// English positive words
const EN_POSITIVE = new Set([
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'perfect',
  'best', 'better', 'well', 'love', 'loved', 'like', 'liked', 'enjoy', 'enjoyed',
  'pleasant', 'easy', 'fast', 'quick', 'useful', 'helpful', 'happy', 'satisfied',
  'comfortable', 'efficient', 'clear', 'intuitive', 'practical', 'recommend',
  'positive', 'nice', 'beautiful', 'pretty', 'safe', 'reliable', 'trust',
  'simple', 'works', 'functional', 'effective', 'convenient', 'accessible',
  'friendly', 'professional', 'quality', 'worth', 'thanks', 'grateful',
  'outstanding', 'impressive', 'superb', 'brilliant', 'awesome', 'incredible',
  'magnificent', 'ideal', 'superior', 'remarkable', 'extraordinary', 'delightful',
  'smooth', 'seamless', 'elegant', 'clean', 'polished', 'solid', 'robust',
]);

// English negative words
const EN_NEGATIVE = new Set([
  'bad', 'terrible', 'horrible', 'worst', 'worse', 'poor', 'awful',
  'difficult', 'hard', 'complicated', 'confusing', 'slow', 'annoying',
  'frustrated', 'frustrating', 'disappointed', 'disappointing', 'angry',
  'sad', 'unsatisfied', 'uncomfortable', 'useless', 'boring', 'ugly',
  'hate', 'hated', 'negative', 'problem', 'problems', 'error', 'errors',
  'bug', 'bugs', 'broken', 'deficient', 'unpleasant', 'insecure', 'mediocre',
  'impossible', 'unacceptable', 'inadequate', 'unnecessary', 'ridiculous',
  'absurd', 'complaint', 'scam', 'trash', 'waste', 'garbage',
  'clunky', 'laggy', 'unreliable', 'painful', 'confuse', 'confused',
  'fail', 'failed', 'failure', 'crash', 'crashes', 'stuck',
]);

// Negation words that flip sentiment
const NEGATION_ES = new Set(['no', 'ni', 'nunca', 'jamás', 'jamas', 'tampoco', 'sin', 'nada', 'nadie', 'ningún', 'ningun', 'ninguno', 'ninguna']);
const NEGATION_EN = new Set(['no', 'not', 'never', 'neither', 'nor', "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "cannot", "isn't", "aren't", "wasn't', 'without"]);

// Intensifiers that boost score
const INTENSIFIER_ES = new Set(['muy', 'mucho', 'demasiado', 'bastante', 'súper', 'super', 'extremadamente', 'totalmente', 'completamente', 'absolutamente']);
const INTENSIFIER_EN = new Set(['very', 'really', 'extremely', 'super', 'totally', 'completely', 'absolutely', 'incredibly', 'highly', 'so']);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9áéíóúñü\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(/\s+/).filter(w => w.length > 1);
}

export function analyzeSentiment(text: string): { sentiment: Sentiment; score: number } {
  if (!text || text.trim().length === 0) {
    return { sentiment: 'indeterminate', score: 0 };
  }

  const words = tokenize(text);

  if (words.length === 0) {
    return { sentiment: 'indeterminate', score: 0 };
  }

  let score = 0;
  let matchedWords = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prevWord = i > 0 ? words[i - 1] : '';
    const isNegated = NEGATION_ES.has(prevWord) || NEGATION_EN.has(prevWord);
    const isIntensified = INTENSIFIER_ES.has(prevWord) || INTENSIFIER_EN.has(prevWord);
    const multiplier = isIntensified ? 1.5 : 1;

    if (ES_POSITIVE.has(word) || EN_POSITIVE.has(word)) {
      score += (isNegated ? -1 : 1) * multiplier;
      matchedWords++;
    } else if (ES_NEGATIVE.has(word) || EN_NEGATIVE.has(word)) {
      score += (isNegated ? 1 : -1) * multiplier;
      matchedWords++;
    }
  }

  // If no sentiment words matched, it's indeterminate
  if (matchedWords === 0) {
    return { sentiment: 'indeterminate', score: 0 };
  }

  // Normalize score by matched words
  const normalizedScore = score / matchedWords;

  if (normalizedScore > 0.2) return { sentiment: 'positive', score: normalizedScore };
  if (normalizedScore < -0.2) return { sentiment: 'negative', score: normalizedScore };
  return { sentiment: 'neutral', score: normalizedScore };
}
