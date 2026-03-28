# Tipografia — Vambe AI

## Font Family

| Nivel | Font | Formato | Fuente |
|-------|------|---------|--------|
| **Primaria** | Plus Jakarta Sans | WOFF2 | Google Fonts / self-hosted |
| **Fallback** | system-ui, sans-serif | — | Stack del sistema |

Plus Jakarta Sans es una fuente geometrica sans-serif con excelente legibilidad en pantalla. Alternativa moderna a Inter/DM Sans.

## Pesos

| Peso | Valor | Uso |
|------|-------|-----|
| Regular | 400 | Body text, descripciones, labels |
| Semibold | 600 | Headings, botones, badges, enfasis |

> No se detectaron otros pesos (300 light, 500 medium, 700 bold) en el sitio publico.

## Escala de Tamanos

Responsive mobile-first con Tailwind CSS:

| Token Tailwind | Mobile | Desktop | Uso |
|----------------|--------|---------|-----|
| `text-sm` | 14px | 14px | Captions, badges, metadata |
| `text-base` | 16px | 16px | Body text principal |
| `text-lg` | 18px | 18px | Subtitulos, labels grandes |
| `text-xl` | 20px | 20px | Titulos de seccion |
| `text-2xl` | 24px | 24px | Headings de pagina (mobile) |
| `text-3xl` | — | 30px | Headings de pagina (tablet) |
| `text-[2.375rem]` | — | 38px | Hero headings (desktop) |

## Line Height

| Contexto | Valor | Token Tailwind |
|----------|-------|----------------|
| Headings | 1.25 | `leading-tight` |
| Body | 1.625 | `leading-relaxed` |
| UI compacta | 1.0 | `leading-none` |

## Letter Spacing

No se detecto letter-spacing customizado. Se asume valores default de Plus Jakarta Sans.

## Jerarquia Tipografica

```
Hero title     — 38px / Semibold / leading-tight
Page heading   — 24-30px / Semibold / leading-tight
Section title  — 20px / Semibold / leading-tight
Subtitle       — 18px / Regular / leading-relaxed
Body           — 16px / Regular / leading-relaxed
Caption/Badge  — 14px / Semibold / leading-none
```
