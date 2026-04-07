/**
 * Lightweight client-side sentiment analysis (mirrors backend sentiment.service.ts).
 * Returns mood string: 'positive' | 'negative' | 'neutral' | 'indeterminate'
 */

const ES_POSITIVE = new Set([
    'bueno', 'buena', 'excelente', 'genial', 'increíble', 'maravilloso', 'fantástico',
    'perfecto', 'perfecta', 'mejor', 'bien', 'encanta', 'agradable', 'fácil', 'rápido',
    'útil', 'feliz', 'satisfecho', 'eficiente', 'claro', 'intuitivo', 'recomiendo',
    'positivo', 'hermoso', 'bonito', 'seguro', 'confiable', 'sencillo', 'funciona',
    'efectivo', 'profesional', 'calidad', 'gracias', 'impresionante', 'estupendo', 'ideal',
]);

const ES_NEGATIVE = new Set([
    'malo', 'mala', 'terrible', 'horrible', 'pésimo', 'peor', 'mal', 'difícil',
    'complicado', 'confuso', 'lento', 'molesto', 'frustrado', 'frustrante', 'decepcionante',
    'triste', 'insatisfecho', 'incómodo', 'inútil', 'aburrido', 'odio', 'negativo',
    'problema', 'error', 'falla', 'roto', 'deficiente', 'mediocre', 'imposible',
    'inaceptable', 'ridículo', 'queja', 'basura', 'desperdicio',
]);

const EN_POSITIVE = new Set([
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'perfect',
    'best', 'better', 'love', 'like', 'enjoy', 'pleasant', 'easy', 'fast', 'useful',
    'helpful', 'happy', 'satisfied', 'comfortable', 'efficient', 'clear', 'intuitive',
    'recommend', 'positive', 'nice', 'beautiful', 'safe', 'reliable', 'simple', 'works',
    'effective', 'professional', 'quality', 'thanks', 'outstanding', 'awesome', 'incredible',
]);

const EN_NEGATIVE = new Set([
    'bad', 'terrible', 'horrible', 'worst', 'worse', 'poor', 'awful', 'difficult',
    'hard', 'complicated', 'confusing', 'slow', 'annoying', 'frustrated', 'frustrating',
    'disappointed', 'disappointing', 'angry', 'sad', 'unsatisfied', 'useless', 'boring',
    'ugly', 'hate', 'negative', 'problem', 'error', 'broken', 'mediocre', 'impossible',
    'unacceptable', 'ridiculous', 'complaint', 'trash', 'waste', 'fail', 'failure',
]);

const NEGATION = new Set([
    'no', 'not', 'never', 'ni', 'nunca', 'jamás', 'tampoco', 'sin', "don't", "doesn't", "didn't", "won't", "can't",
]);

const INTENSIFIER = new Set([
    'very', 'really', 'extremely', 'super', 'totally', 'muy', 'mucho', 'demasiado', 'bastante', 'súper',
]);

const tokenize = (text: string): string[] =>
    text.toLowerCase()
        .replace(/[^a-záéíóúñü\s'-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 1);

export const analyzeSentimentLocal = (text: string): string => {
    if (!text || text.trim().length === 0) return 'indeterminate';

    const words = tokenize(text);
    if (words.length === 0) return 'indeterminate';

    let score = 0;
    let matched = 0;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const prev = i > 0 ? words[i - 1] : '';
        const negated = NEGATION.has(prev);
        const multiplier = INTENSIFIER.has(prev) ? 1.5 : 1;

        if (ES_POSITIVE.has(word) || EN_POSITIVE.has(word)) {
            score += (negated ? -1 : 1) * multiplier;
            matched++;
        } else if (ES_NEGATIVE.has(word) || EN_NEGATIVE.has(word)) {
            score += (negated ? 1 : -1) * multiplier;
            matched++;
        }
    }

    if (matched === 0) return 'indeterminate';
    const norm = score / matched;
    if (norm > 0.2) return 'positive';
    if (norm < -0.2) return 'negative';
    return 'neutral';
};
