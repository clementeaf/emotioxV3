# Layout y Spacing — Vambe AI

## Estrategia Responsive

**Mobile-first** con breakpoints Tailwind CSS:

| Breakpoint | Min-width | Uso |
|------------|-----------|-----|
| Default | 0px | Mobile (single column) |
| `sm` | 640px | Mobile landscape / tablet small |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Desktop wide |

## Estructura de Pagina

```
+--------------------------------------------------+
| Sidebar (colapsable)  |  Main Content Area       |
| - Logo               |  +--------------------+   |
| - Nav items          |  | Page Header        |   |
| - Collapse toggle    |  +--------------------+   |
|                      |  | Content             |   |
|                      |  | (grid/list/board)   |   |
|                      |  |                     |   |
|                      |  +--------------------+   |
+--------------------------------------------------+
```

### Sidebar
- **Expandido:** ~240px ancho fijo
- **Colapsado:** ~64px (solo iconos)
- Toggle via boton o breakpoint (mobile = colapsado por defecto)
- Posicion: fixed left, full height

### Main Content
- Ocupa el espacio restante (`flex-1` o `ml-[sidebar-width]`)
- Max-width con `container` para contenido centrado
- Scroll vertical independiente

## Sistema de Spacing

Basado en escala Tailwind (multiplos de 4px):

| Token | Valor | Uso comun |
|-------|-------|-----------|
| `p-1` / `gap-1` | 4px | Spacing minimo entre iconos |
| `p-2` / `gap-2` | 8px | Padding interno de badges, chips |
| `p-3` / `gap-3` | 12px | Padding de inputs compactos |
| `p-4` / `gap-4` | 16px | Padding default de cards, gap entre items |
| `px-6` | 24px | Padding horizontal de secciones (tablet) |
| `px-8` | 32px | Padding horizontal de secciones (desktop) |
| `py-12` | 48px | Separacion vertical entre secciones |
| `py-16` | 64px | Separacion de secciones hero |

## Grid System

### Dashboard / Analytics
- Grid de metricas: `grid-cols-2` (mobile) → `grid-cols-4` (desktop)
- Gap: `gap-4` (16px)

### Pipeline (Kanban)
- Flex horizontal con scroll (`overflow-x-auto`)
- Columnas de ancho fijo (~280-320px estimado)
- Gap entre columnas: `gap-4`

### Chat / Inbox
- Layout 2 paneles: lista de conversaciones (izq) + chat activo (der)
- Mobile: solo un panel visible con navegacion back
- Split estimado: 30% lista / 70% chat

### Tablas
- Full-width dentro del container
- Columnas con ancho adaptativo
- Scroll horizontal en mobile si es necesario

## Border Radius

| Contexto | Valor estimado | Token |
|----------|---------------|-------|
| Botones | 8px | `rounded-lg` |
| Cards | 12px | `rounded-xl` |
| Inputs | 8px | `rounded-lg` |
| Badges/Pills | 9999px | `rounded-full` |
| Modales | 16px | `rounded-2xl` |
| Avatar | 50% | `rounded-full` |

## Z-Index Stack

| Capa | Z-index estimado | Elemento |
|------|-----------------|----------|
| Base | 0 | Contenido principal |
| Sticky | 10 | Headers de seccion sticky |
| Sidebar | 20 | Sidebar navegacion |
| Dropdown | 30 | Menus desplegables |
| Modal overlay | 40 | Fondo oscuro de modales |
| Modal | 50 | Contenido de modales |
| Toast | 60 | Notificaciones |

## Notas de Accesibilidad

- `prefers-reduced-motion` soportado via flag `vambe-reduced-motion` en localStorage
- Focus visible en elementos interactivos
- Skip navigation implicito en sidebar
