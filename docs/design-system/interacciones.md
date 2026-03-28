# Patrones de Interaccion — Vambe AI

## Estados de Componentes

### Hover
- Cards: borde pasa de `white/10` a `white/20`, cursor pointer
- Botones: cambio de luminosidad del background
- Filas de tabla: fondo sutil (`white/5`)
- Links: subrayado o cambio de opacidad
- Tooltip descriptivo en icon buttons ("hoverForDetails")

### Focus
- Outline visible para accesibilidad
- Inputs: borde cambia a `accent-primary` (`#006aff`)
- Botones: ring de focus

### Active / Pressed
- Reduccion sutil de escala o cambio de opacidad

### Disabled
- Opacidad reducida (~50%)
- Cursor `not-allowed`
- Basado en sistema de permisos (roles de usuario)

### Loading
- Skeleton screens con `animate-pulse` para carga inicial
- Botones cambian texto: "Save" → "Saving..."
- Spinner para operaciones puntuales

---

## Drag & Drop

### Pipeline Kanban
- Cards arrastrables entre columnas
- Indicador visual de zona de drop (highlight de columna destino)
- Reordenamiento dentro de la misma columna

### Otros contextos
- File upload con zona de drop
- Posible reordenamiento de elementos en listas

---

## Animaciones

### Transiciones CSS
- Duracion estimada: 150-200ms
- Easing: ease-in-out
- Propiedades animadas: opacity, background-color, border-color, transform

### Skeleton Loading
- `animate-pulse` — opacidad oscila entre 50% y 100%
- Placeholders que replican forma del contenido real

### Reduced Motion
- Flag en localStorage: `vambe-reduced-motion`
- Cuando activo, se eliminan animaciones no esenciales

---

## Patrones de Navegacion

### Sidebar
- Click en item → navega a seccion
- Submenu expandible (accordion)
- Badge numerico para items pendientes
- Estado activo: highlight azul en item actual

### Breadcrumb
- Navegacion jerarquica (ej: Pipeline > Contacto > Detalle)
- Click en nivel superior para volver

### Mobile
- Sidebar se convierte en drawer (slide from left)
- Gestos swipe no confirmados
- Bottom navigation no detectada (posiblemente solo sidebar)

---

## Feedback al Usuario

### Notificaciones (Toast)
- Aparecen temporalmente (auto-dismiss ~5s estimado)
- Tipos: success (verde), error (rojo), warning (amarillo), info (azul)
- Sonido configurable (activable/desactivable por usuario)
- Posicion: esquina superior derecha (estimado)

### Confirmacion Destructiva
- Modal de confirmacion antes de eliminar/cancelar
- Boton destructivo en rojo
- Requiere click explicito (no solo Enter)

### Validacion de Formularios
- Mensajes inline bajo el campo con error
- Mensajes identificados en i18n:
  - "Usuario no encontrado"
  - "Cuenta bloqueada por intentos fallidos"
  - "Formato de email invalido"
  - "Credenciales incorrectas"
- Validacion en tiempo real (on-blur o on-change)

### Empty States
- Ilustracion o icono centrado
- Mensaje descriptivo
- CTA para la accion principal ("Crear primer pipeline", etc.)

---

## Patrones de Datos

### Paginacion
- Tablas con paginacion inferior
- Items por pagina configurable

### Busqueda
- Input de busqueda con placeholder "Search..."
- Filtrado en tiempo real (debounced)
- Filtros combinables (canal, status, fecha, tags)

### Tiempo Real
- WebSocket para mensajes de chat entrantes
- Actualizacion automatica de status en pipeline
- Indicadores de "escribiendo..." en chat

---

## Internacionalizacion (i18n)

- **Idiomas soportados:** Espanol (default), Ingles, Portugues
- Selector de idioma en configuracion
- Todas las strings externalizadas en JSON de traduccion
- Soporte de timezone configurable por usuario
- Formato de moneda multi-region (CLP, USD, BRL, etc.)
