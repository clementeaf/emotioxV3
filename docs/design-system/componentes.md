# Componentes UI — Vambe AI

Catalogo de componentes identificados a partir del sitio publico, pagina /platform, y archivos i18n.

---

## Navegacion

### Sidebar
- Colapsable / expandible (toggle con icono)
- Secciones principales: Chat, Pipeline, Assistant, Analytics, Connect
- Indicadores de items no leidos (badge numerico)
- Estado activo con highlight accent azul
- Fondo `bg-secondary` (`#1a1a1a`)

### Breadcrumb
- Navegacion jerarquica con separador `/` o `>`
- Links clickeables para niveles superiores
- Ultimo nivel como texto sin link (current)

---

## Botones

### Primary
- Background: `#006aff` (accent azul)
- Texto: blanco
- Border-radius: redondeado (estimado `rounded-lg` / 8px)
- Hover: `#3b82f6` (azul mas claro)
- Padding: `px-4 py-2` estimado

### Secondary / Outline
- Background: transparente
- Borde: `white/20`
- Texto: blanco
- Hover: fondo `white/5`

### Destructive
- Para acciones de eliminacion (Delete, Cancel)
- Rojo como accent
- Requiere confirmacion via modal

### Icon Button
- Solo icono, sin texto
- Tamano compacto
- Tooltip en hover

### Estados
- **Default** — color base
- **Hover** — ligero cambio de luminosidad
- **Loading** — texto cambia a "Saving...", "Creating...", etc.
- **Disabled** — opacidad reducida, no clickeable

---

## Cards

### Pipeline Card (Kanban)
- Fondo: `bg-secondary` o `bg-tertiary`
- Borde: `white/10`
- Contenido: nombre contacto, canal, monto, fecha
- Badge de status (color segun estado)
- Draggable entre columnas
- Click para detalle

### Chat Card (Inbox)
- Avatar del contacto
- Nombre + ultimo mensaje (truncado)
- Timestamp relativo ("hace 5 min")
- Indicador canal (WhatsApp, IG, etc.)
- Badge no-leido
- Estado: Attended / Unattended / AttendedByAI

### Metric Card
- Numero grande (KPI)
- Label descriptivo
- Variacion porcentual vs periodo anterior
- Icono de tendencia (up/down)

---

## Tablas

- Headers con fondo ligeramente diferenciado
- Sorting clickeable por columna
- Filtros inline o dropdown
- Filas con hover state
- Acciones por fila (icono menu o botones)
- Paginacion inferior

---

## Formularios

### Text Input
- Fondo: `bg-tertiary` (`#2d2d2d`)
- Borde: `white/10`, focus `accent-primary`
- Placeholder: `text-muted`
- Border-radius: redondeado

### Select / Combobox
- Dropdown con busqueda integrada
- Multi-select con tags/chips

### Date/Time Picker
- Selector de fecha con calendario
- Selector de hora
- Soporte timezone

### File Upload
- Zona de drop (drag & drop)
- Preview de archivo subido
- Progress bar durante upload

---

## Modales / Dialogs

- Overlay oscuro semi-transparente (`black/50`)
- Card centrada con fondo `bg-secondary`
- Header con titulo + boton cerrar (X)
- Body con contenido
- Footer con botones (Cancel / Confirm)
- Confirmacion obligatoria para acciones destructivas

---

## Badges / Tags

### Status Badge
- Pill shape (`rounded-full`)
- Color de fondo segun status (ver colores.md)
- Texto pequeno (14px) en semibold
- Ejemplos: "Open", "Pending", "Completed", "Failed", "Won", "Lost"

### Channel Badge
- Icono del canal (WhatsApp verde, IG gradiente, FB azul)
- Puede ser solo icono o icono + texto

### Tag Custom
- Colores configurables por el usuario
- Usados para etiquetar contactos/leads

---

## Pipeline / Kanban

- Columnas horizontales scrolleables
- Header de columna con nombre + count
- Cards arrastrables (drag & drop)
- Columnas representan etapas del embudo de ventas
- Vista tipo board (no lista)

---

## Notificaciones

- Toast notifications (esquina superior derecha estimado)
- Sonido configurable
- Tipos: success, error, warning, info
- Auto-dismiss con timer

---

## Loading States

- Skeleton screens con `animate-pulse`
- Placeholders que replican la forma del contenido
- Spinner para acciones puntuales
- Texto dinamico en botones ("Saving...", "Creating...")

---

## Iconografia

- Estilo: outlined / line icons (no filled)
- Tamano consistente por contexto (16px UI, 20px nav, 24px hero)
- Iconos identificados:
  - Canales: WhatsApp, Instagram, Facebook, Webchat, SMS
  - Acciones: download, copy, edit, delete, send, search
  - Navegacion: menu, chevron, arrow-back, expand/collapse
  - Status: check, x-mark, clock, alert
- Libreria probable: Lucide, Heroicons, o custom SVG
