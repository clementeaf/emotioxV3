/**
 * MultiLangInput
 *
 * Input/textarea with language tabs (ES/EN). Stores value as JSON: {"es":"...","en":"..."}.
 * Falls back to plain string for backward compatibility.
 */
import { useState, useCallback } from 'react';

const LANGS = [
    { code: 'en', label: 'EN' },
    { code: 'es', label: 'ES' },
] as const;

type LangCode = typeof LANGS[number]['code'];

interface MultiLangInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    multiline?: boolean;
    maxLength?: number;
    label?: string;
}

function parseMultiLang(raw: string): Record<LangCode, string> {
    if (!raw) return { en: '', es: '' };
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return { en: parsed.en || '', es: parsed.es || '' };
        }
    } catch { /* not JSON */ }
    // Plain string — treat as EN
    return { en: raw, es: '' };
}

function serializeMultiLang(values: Record<LangCode, string>): string {
    // If only one language has content, check if we should simplify
    const hasEn = values.en.trim().length > 0;
    const hasEs = values.es.trim().length > 0;
    if (!hasEn && !hasEs) return '';
    return JSON.stringify(values);
}

export const MultiLangInput = ({
    value,
    onChange,
    placeholder,
    multiline = false,
    maxLength,
    label,
}: MultiLangInputProps) => {
    const [activeLang, setActiveLang] = useState<LangCode>('en');
    const values = parseMultiLang(value);

    const handleChange = useCallback((text: string) => {
        const updated = { ...values, [activeLang]: text };
        onChange(serializeMultiLang(updated));
    }, [values, activeLang, onChange]);

    const InputTag = multiline ? 'textarea' : 'input';

    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-sm font-medium text-gray-700">{label}</label>
            )}
            <div className="flex items-center gap-1 mb-1">
                {LANGS.map(lang => {
                    const hasContent = values[lang.code].trim().length > 0;
                    return (
                        <button
                            key={lang.code}
                            type="button"
                            onClick={() => setActiveLang(lang.code)}
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                                activeLang === lang.code
                                    ? 'bg-blue-600 text-white'
                                    : hasContent
                                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                        >
                            {lang.label}
                            {hasContent && activeLang !== lang.code && (
                                <span className="ml-0.5 inline-block w-1 h-1 rounded-full bg-green-500" />
                            )}
                        </button>
                    );
                })}
            </div>
            <InputTag
                value={values[activeLang]}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    multiline ? 'min-h-[80px] resize-y' : ''
                }`}
            />
        </div>
    );
};

/**
 * Resolves the correct language string from a multi-lang JSON value.
 * Used in participant-frontend to pick the right language.
 */
export function resolveMultiLang(raw: string | undefined, lang: string): string {
    if (!raw) return '';
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return parsed[lang] || parsed.en || parsed.es || '';
        }
    } catch { /* not JSON */ }
    return raw;
}

export default MultiLangInput;
