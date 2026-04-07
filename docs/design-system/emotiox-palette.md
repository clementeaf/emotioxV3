# EmotioX V3 — Light Theme Color System

Solo light. Nunca dark.

Basado en principios Vambe AI (jerarquia por superficie, no sombras; bordes semi-transparentes; estetica plana) adaptado a fondo claro.

## Surfaces

| Token | Hex | Uso |
|-------|-----|-----|
| `surface-app` | `#F1F5F9` | Fondo app shell |
| `surface-primary` | `#FFFFFF` | Cards, sidebar, paneles, modales |
| `surface-secondary` | `#F8FAFC` | Superficies anidadas, headers tabla, inputs |
| `surface-tertiary` | `#F1F5F9` | Hover en cards, items seleccionados |
| `surface-sunken` | `#E2E8F0` | Areas hundidas, inputs disabled |

## Text

| Token | Hex | Contraste (blanco) | Uso |
|-------|-----|-------------------|-----|
| `heading` | `#0F172A` | 15.4:1 | Titulos, KPIs, labels importantes |
| `body` | `#334155` | 9.7:1 | Body text, descripciones |
| `muted` | `#64748B` | 4.6:1 | Placeholders, timestamps, captions |
| `faint` | `#94A3B8` | 2.8:1 | Solo decorativo (iconos, watermarks) |
| `inverse` | `#FFFFFF` | — | Texto sobre fondos accent |

## Accent / Brand

| Token | Hex | Uso |
|-------|-----|-----|
| `accent` | `#006AFF` | CTAs, nav activo, links, focus |
| `accent-hover` | `#0058D4` | Hover botones (mas oscuro en light) |
| `accent-pressed` | `#004AB3` | Active/pressed |
| `accent-light` | `#EBF3FF` | Fondo items seleccionados, tags |
| `accent-muted` | `#B3D4FF` | Focus rings suaves |
| `accent-subtle` | `#F5F9FF` | Hover muy sutil |

## Borders (semi-transparentes)

| Token | Valor | Uso |
|-------|-------|-----|
| default | `rgba(0,0,0,0.08)` | Cards, dividers, celdas |
| subtle | `rgba(0,0,0,0.05)` | Separadores ligeros |
| hover | `rgba(0,0,0,0.15)` | Hover interactivo |
| focus | `#006AFF` | Focus state |
| strong | `rgba(0,0,0,0.20)` | Containers enfatizados |

## Status / Semantic

Cada status: bg (fondo), DEFAULT (badge/icono), text (texto legible), border.

| Status | bg | solid | text | border |
|--------|-----|-------|------|--------|
| Success | `#F0FDF4` | `#22C55E` | `#15803D` | `#86EFAC` |
| Warning | `#FFFBEB` | `#F59E0B` | `#92400E` | `#FCD34D` |
| Error | `#FEF2F2` | `#EF4444` | `#B91C1C` | `#FCA5A5` |
| Info | `#EFF6FF` | `#3B82F6` | `#1D4ED8` | `#93C5FD` |

## Chart Palette

| # | Color | Hex | Uso |
|---|-------|-----|-----|
| 1 | Blue | `#006AFF` | Serie primaria (brand) |
| 2 | Violet | `#7C3AED` | Segunda serie |
| 3 | Teal | `#0D9488` | Tercera serie |
| 4 | Amber | `#D97706` | Cuarta serie |
| 5 | Rose | `#E11D48` | Quinta, sentimiento negativo |
| 6 | Indigo | `#4F46E5` | Sexta serie |
| 7 | Emerald | `#059669` | Septima, sentimiento positivo |
| 8 | Slate | `#64748B` | Octava, referencia/neutral |

Auxiliares: grid `#E5E7EB`, ejes `#9CA3AF`, labels ejes `#374151`, referencia `#EF4444`.

NPS: promoter `#10B981`, passive `#D1D5DB`, detractor `#F87171`.

## Sombras (solo funcionales)

| Token | Valor | Uso |
|-------|-------|-----|
| `dropdown` | `0 4px 12px rgba(0,0,0,0.08)` | Dropdowns |
| `modal` | `0 8px 24px rgba(0,0,0,0.12)` | Modales |

No usar sombras decorativas. Jerarquia visual por superficie, no elevacion.

## Principios

1. **Hover va mas oscuro** en light theme (mas contraste = mas enfasis)
2. **Bordes semi-transparentes** se adaptan automaticamente a cualquier superficie
3. **Sin sombras decorativas** — solo funcionales (dropdown, modal)
4. **`text-faint` no cumple WCAG AA** — solo para decorativo, nunca contenido legible
5. **Chart palette empieza con brand blue** — refuerza identidad en data viz
