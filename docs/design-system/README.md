# Design System Research — Vambe AI

Investigacion del design system de [Vambe AI](https://www.vambe.ai/) (Mercur Platform), startup chilena de comercio conversacional con IA.

**Fecha de investigacion:** 2026-03-20
**Fuentes:** sitio publico vambe.ai, vambeai.com, archivos de configuracion i18n expuestos.
**Limitacion:** no se accedio a la app autenticada (app.vambeai.com). El analisis se basa en el sitio marketing, la pagina /platform, y los bundles JS publicos.

## Revision 2026-03-29

- **Nomenclatura:** En documentacion interna de proyecto se usa a veces **"Mercur"** como nombre de referencia al producto; en la web publica de [Vambe AI](https://www.vambe.ai) predominan la marca **Vambe** y nombres de producto (p. ej. Connect, Ads). No son marcas en conflicto: Mercur es nomenclatura de referencia, no el titular comercial en landing.
- **Financiamiento:** Para cifras oficiales (rondas, totales) usar una sola fuente: pagina [Sobre nosotros / About](https://www.vambe.ai/about) o notas de prensa enlazadas desde el sitio. Los documentos de esta carpeta pueden citar Serie A (~$14M) y totales (~$18M+) segun epoca; conviene alinear con la fuente vigente al publicar.
- **EmotioX vs Vambe:** La implementacion visual de **EmotioX V3** no copia la UI oscura de Vambe. La spec aplicable al producto es [emotiox-palette.md](./emotiox-palette.md) (tema claro). Los archivos `colores.md`, `tipografia.md`, etc. describen la **investigacion** sobre Vambe como referencia de inspiracion.

## Indice

| Archivo | Contenido |
|---------|-----------|
| [colores.md](./colores.md) | Paleta de colores, gradientes, estados |
| [tipografia.md](./tipografia.md) | Font families, escalas, line heights |
| [componentes.md](./componentes.md) | Catalogo de componentes UI identificados |
| [layout.md](./layout.md) | Grid, spacing, breakpoints, navegacion |
| [interacciones.md](./interacciones.md) | Estados, animaciones, patrones UX |
| [referencia-producto.md](./referencia-producto.md) | Features, arquitectura de producto, especificaciones tecnicas |

## Contexto

Vambe AI es una plataforma CRM + IA conversacional que opera en WhatsApp, Instagram, Facebook y Webchat. Su producto principal ("Mercur") incluye:

- **Chat/Inbox** unificado multi-canal
- **Pipeline** de ventas tipo Kanban
- **Asistentes IA** conversacionales 24/7
- **Automatizaciones** no-code con logica condicional
- **Analytics** con atribucion de revenue a conversaciones

La plataforma atiende 1,500+ usuarios con SLA 99.95% y 50+ integraciones nativas.
