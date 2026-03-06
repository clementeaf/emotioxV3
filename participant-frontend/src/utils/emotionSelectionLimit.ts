const NUMBER_WORDS: Record<string, number> = {
    cero: 0,
    un: 1,
    uno: 1,
    una: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
    once: 11,
    doce: 12,
    trece: 13,
    catorce: 14,
    quince: 15,
    dieciseis: 16,
    diecisiete: 17,
    dieciocho: 18,
    diecinueve: 19,
    veinte: 20,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
};

export interface EmotionSelectionRule {
    kind: 'exact' | 'max';
    count: number;
}

const MAX_LIMIT_PATTERNS = [
    /(?:hasta|maximo|max|como maximo|un maximo de|no mas de|up to|maximum|max(?:imum)?|no more than)\s+(\d+|[a-z]+)/i,
];

const EXACT_LIMIT_PATTERNS = [
    /(?:selecciona|select)\s+(\d+|[a-z]+)(?:\s+(?:emociones|estados emocionales|emotions))?/i,
];

const normalizeText = (text: string): string => {
    return text
        .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/["'“”‘’.;,!?()]/g, ' ')
    .replaceAll(/\s+/g, ' ')
        .trim()
        .toLowerCase();
};

const parseNumericToken = (token: string): number | undefined => {
    const trimmed = token.trim().toLowerCase();
    if (/^\d+$/.test(trimmed)) {
        return Number.parseInt(trimmed, 10);
    }

    return NUMBER_WORDS[trimmed];
};

export const extractEmotionSelectionRule = (text?: string | null): EmotionSelectionRule | undefined => {
    if (!text || text.trim().length === 0) {
        return undefined;
    }

    const normalized = normalizeText(text);

    for (const pattern of MAX_LIMIT_PATTERNS) {
        const match = pattern.exec(normalized);
        if (!match?.[1]) {
            continue;
        }

        const limit = parseNumericToken(match[1]);
        if (typeof limit === 'number' && limit > 0) {
            return { kind: 'max', count: limit };
        }
    }

    for (const pattern of EXACT_LIMIT_PATTERNS) {
        const match = pattern.exec(normalized);
        if (!match?.[1]) {
            continue;
        }

        const limit = parseNumericToken(match[1]);
        if (typeof limit === 'number' && limit > 0) {
            return { kind: 'exact', count: limit };
        }
    }

    return undefined;
};

export const resolveEmotionSelectionRule = (...texts: Array<string | null | undefined>): EmotionSelectionRule | undefined => {
    for (const text of texts) {
        const rule = extractEmotionSelectionRule(text);
        if (rule) {
            return rule;
        }
    }

    return undefined;
};

export const resolveEmotionSelectionLimit = (...texts: Array<string | null | undefined>): number | undefined => {
    return resolveEmotionSelectionRule(...texts)?.count;
};