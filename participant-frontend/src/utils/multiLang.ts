/**
 * Resolves the correct language string from a multi-lang JSON value.
 * Multi-lang values are stored as JSON: {"en":"...","es":"..."}.
 * Falls back to plain string for backward compatibility.
 */
export function resolveMultiLang(raw: string | undefined, lang: string): string {
    if (!raw) return '';
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return parsed[lang] || parsed.en || parsed.es || '';
        }
    } catch { /* not JSON — return as-is */ }
    return raw;
}
