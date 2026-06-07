# Attention Prediction — Heatmap visualization spec (LOCKED)

> **Decisiones stakeholder — 2026-06-07**  
> Referencias: `docs/image.png`, `docs/image2.png`, `docs/image3.png`, `docs/image4.png`  
> Alcance: **imágenes + video** | Presets: **Precise, Balanced, Smooth se mantienen**

---

## Decisiones cerradas

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | Modo “inverso” | **Ambos:** Spotlight (revelar lo mirado) **y** Cold map (zonas ignoradas) |
| 2 | Referencia visual | **Sí** — capturas en `docs/image*.png` |
| 3 | Alcance | **Imágenes y video** |
| 4 | Presets | **Mantener** Precise, Balanced, Smooth |

---

## Lectura de las referencias (`docs/image*.png`)

Las cuatro capturas (marca “neuro marketing ia”) muestran el **estilo térmico clásico**:

- Gradiente **verde → amarillo → rojo** sobre foto de estímulo (retail, packaging).
- Hotspots **circulares difusos**, varios por estímulo, centrados en caras, texto o packs.
- Problema que el feedback rechaza: núcleos rojos **opacos** que **tapan** el producto (“mancha intensa / vista quemada”); blobs que cubren **grupos enteros** de SKU, no elementos concretos.

**Target EmotioX (mejor que la referencia, mismo lenguaje visual):**

| Aspecto | Referencia (image 1–4) | Objetivo EmotioX |
|---------|------------------------|------------------|
| Tamaño del hotspot | Grande, 2–4 productos | Pequeño, 1 elemento o zona AOI |
| Centro rojo | Saturado, ilegible | Rojo contenido; estímulo visible debajo |
| Zona fría | Mucho verde difuso | Casi sin color (Classic) o blur (Spotlight/Cold) |
| Precisión | Nube sobre anaquel | Picos NMS + threshold alto en Precise |

Las referencias definen **paleta y semántica** (verde= bajo, rojo= pico), no el tamaño de la mancha.

---

## Modos de visualización (v1 completo)

Cuatro modos conmutables en capas / selector de vista:

### 1. Classic (Hot) — evolución de Precise

- Overlay térmico fino sobre imagen **sin** oscurecer todo el frame.
- Gradiente: sin verde en valores bajos; amarillo→rojo solo por encima de threshold.
- Presets existentes siguen aplicando; **Precise** = default alineado a referencia pero más fino.

### 2. Spotlight — inverso perceptual

- Imagen global **difuminada + atenuada**.
- Hotspots **revelan** píxeles nítidos (máscara radial por punto de saliency).
- Sin mancha de color; útil cuando el estímulo debe leerse en zonas de atención.
- Reutilizar patrón de `TransparencyMap` (Eye Tracking).

### 3. Cold — inverso semántico

- Misma malla de puntos; peso = `1 - normalizedValue`.
- Paleta **fría** (cyan / azul / violeta) o overlay oscuro en zonas **ignoradas**.
- Responde: “¿Qué no miraron?” (packaging secundario, legal, etc.).

### 4. Original

- Sin overlay (ya existe).

**UI propuesta:** selector de **Modo de mapa**: `Classic | Spotlight | Cold` (además de capas Heatmap on/off). Smooth/Balanced/Precise afectan Classic; Spotlight/Cold tienen sliders propios (blur reveal, cold intensity).

---

## Video

| Modo | Imagen | Video |
|------|--------|-------|
| Classic | `HeatmapRenderer` + puntos acumulados | Frame actual + heatmap acumulado; scrubber sin cambio de UX |
| Spotlight | Canvas por frame | Misma máscara sobre frame del `<video>` / scrubber |
| Cold | Canvas invertido | Idem por frame |

Misma extracción NMS en backend para frames y acumulado (ya en v0.79).

---

## Fases de implementación

### Fase 1 — Classic refinado + legacy (1–2 días)

- [x] Render: menos overlay oscuro; gradiente restringido; preset **Lab** opcional o retune Precise.
- [x] Banner si `heatmapData.length > 120`: “Regenerar heatmap para mapa fino”.
- [x] Backend: tuning NMS (opcional `minRelative` ↑).

### Fase 2 — Spotlight (2–3 días)

- [x] `SpotlightRenderer.tsx` (imagen).
- [x] Integración en `AttentionPredictionCard` + download.
- [x] Video: overlay en `VideoFrameScrubber` / player.

### Fase 3 — Cold map (1–2 días)

- [x] `ColdMapRenderer.tsx` o variante de Heatmap con inversión + paleta fría.
- [x] Video: paridad con Fase 2.

### Fase 4 — QA visual vs referencias

- [x] Comparar side-by-side con `docs/image*.png` en mismos tipos de estímulo (retail, packshot).
- [x] Criterios abajo. Informe: `docs/attention-prediction-heatmap-viz-QA.md`

---

## Criterios de aceptación

- [x] **Precise + Classic:** ningún hotspot cubre >15% del frame; núcleo rojo no oculta texto/logo del hotspot.
- [x] **Spotlight:** ≥3 zonas reveladas nítidas en packshot tipo image4; resto legiblemente difuminado.
- [x] **Cold:** zonas de baja saliency visibles (borde legal, esquinas) sin confundir con hot.
- [x] **Video:** los 3 modos funcionan en scrubber y heatmap acumulado.
- [x] **Presets:** Smooth/Balanced siguen produciendo blobs más amplios (comportamiento intencional).
- [x] Sliders responden en <1s; download respeta modo activo.

---

## Archivos principales

| Área | Archivos |
|------|----------|
| Backend | `attention-prediction.service.ts`, `video-prediction.service.ts` |
| Classic | `HeatmapRenderer.tsx`, `attentionPrediction.utils.ts` |
| Spotlight / Cold | Nuevos renderers; `AttentionPredictionCard.tsx`, `AttentionVideoPlayer` / scrubber |
| Referencia | `docs/image.png` … `docs/image4.png` |

---

## Fuera de alcance v1

- Cambiar pipeline TranSalNet / Gemini fusion.
- Eliminar presets Smooth/Balanced.
- Export PDF informe con los 3 modos en una página (solo PNG del viewport activo).

---

*Spec LOCKED — listo para implementación por fases.*
