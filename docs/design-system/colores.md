# Paleta de Colores — Vambe AI

> Tema oscuro (dark-first). No se encontro soporte para tema claro en el sitio publico.

## Colores Base

| Token | Valor | Uso |
|-------|-------|-----|
| `bg-primary` | `#000000` | Fondo principal de la app |
| `bg-secondary` | `#1a1a1a` | Fondo de cards, sidebar, paneles |
| `bg-tertiary` | `#2d2d2d` | Fondo de inputs, hover states |
| `text-primary` | `#ffffff` | Texto principal sobre fondo oscuro |
| `text-secondary` | `rgba(255,255,255,0.8)` / `white/80` | Texto secundario, descripciones |
| `text-muted` | `rgba(255,255,255,0.5)` / `white/50` | Placeholders, texto deshabilitado |
| `border-default` | `rgba(255,255,255,0.1)` / `white/10` | Bordes sutiles, dividers |
| `border-hover` | `rgba(255,255,255,0.2)` / `white/20` | Bordes en hover |

## Accent / Brand

| Token | Valor | Uso |
|-------|-------|-----|
| `accent-primary` | `#006aff` | CTAs principales, links, highlights |
| `accent-primary-hover` | `#3b82f6` | Hover de botones primarios |
| `accent-gradient` | `linear-gradient(#006aff, #3b82f6)` | Botones hero, badges destacados |

## Status Colors

| Token | Valor aprox. | Uso |
|-------|-------------|-----|
| `status-success` | Verde (green-500) | Won, Entregado, Attended, Completado |
| `status-error` | Rojo (red-500) | Lost, Error, Failed |
| `status-warning` | Amarillo/Naranja (amber-500) | Pending, Unattended, En proceso |
| `status-info` | Azul (blue-400) | AttendedByAI, Info, Notificaciones |

## Gradientes

```css
/* Fondo principal de secciones */
background: linear-gradient(to bottom, #000000, #111827, #000000);
/* Equivalente Tailwind: from-black via-gray-900 to-black */

/* Cards con overlay */
background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8));
border: 1px solid rgba(255,255,255,0.1);
```

## Superficies y Elevacion

Vambe no usa sombras box-shadow tradicionales. La jerarquia visual se logra con:

1. **Opacidad de fondo** — cards mas claras sobre fondo mas oscuro
2. **Bordes semi-transparentes** — `white/5` a `white/20` segun elevacion
3. **Gradientes sutiles** — overlays para profundidad
4. **Sin drop-shadow** — estetica plana, sin elevacion material

## Notas

- Todo el sitio publico usa tema oscuro exclusivamente
- Los colores de status no fueron extraidos como hex exactos (requiere acceso a la app)
- El azul `#006aff` aparece consistentemente como accent en el sitio marketing y pagina /platform
