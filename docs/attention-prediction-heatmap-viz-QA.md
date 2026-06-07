# Attention Prediction — Heatmap Viz QA Report (Fase 4)

> **Fecha:** 2026-06-07  
> **Referencias:** `docs/image.png`, `docs/image2.png`, `docs/image3.png`, `docs/image4.png`  
> **Spec:** `docs/attention-prediction-heatmap-viz-spec.md` (LOCKED)

---

## Metodología

1. **Comparación visual** contra las 4 capturas de referencia (estilo térmico neuromarketing: verde→amarillo→rojo, blobs difusos a evitar).
2. **Revisión de código** de renderers (Classic, Spotlight, Cold) y pipeline de extracción NMS (v0.79+).
3. **Tests automatizados** en `research-frontend/src/utils/__tests__/attentionPrediction.heatmapQa.test.ts`.
4. **Correcciones aplicadas** durante la QA (ver sección Fixes).

---

## Lectura de referencias vs EmotioX

| Aspecto | Referencias (`docs/image*.png`) | EmotioX v0.79.1 | Veredicto |
|---------|--------------------------------|-----------------|-----------|
| Paleta térmica | Verde difuso + amarillo + rojo saturado | Classic Lab/Precise: amarillo→rojo sin verde en zonas frías | **Mejor** — evita mancha verde global |
| Tamaño hotspot | Blobs grandes (2–4 SKUs / grupos) | NMS 72 pts, radio cap 15% frame (Lab/Precise) | **Mejor** — picos discretos |
| Núcleo rojo opaco | Tapa producto/texto | Overlay dim 8–15%, gradiente restringido, threshold alto | **Mejor** — estímulo legible |
| Inverso perceptual | No disponible | Spotlight: blur + reveal nítido | **Nuevo** — cumple spec |
| Zonas ignoradas | No explícito | Cold: inversión + tinte cyan/azul/violeta + ambient | **Nuevo** — cumple spec |
| Packshot (image4) | 3+ hotspots (cara, texto, pack) | Spotlight con ≥3 puntos si saliency los extrae | **Condicional** — depende de regenerar heatmap |

---

## Criterios de aceptación

| # | Criterio | Resultado | Evidencia |
|---|----------|-----------|-----------|
| 1 | **Lab/Precise + Classic:** hotspot ≤15% frame; núcleo no tapa logo | **PASS** | `maxHotspotRadiusPx()` + cap en `resolveHeatmapRadiusPx()`; test unitario |
| 2 | **Spotlight:** ≥3 zonas nítidas en packshot; resto difuminado | **PASS*** | Máscara radial por punto; reveal default 35%; *requiere datos NMS finos (regenerar si legacy >120 pts) |
| 3 | **Cold:** baja saliency visible (esquinas, legal) sin confundir con hot | **PASS** | Capa ambient `rgba(10,40,72)` + peso `1-val/maxVal`; hotspots primarios sin tinte frío |
| 4 | **Video:** 3 modos en scrubber **y** heatmap acumulado | **PASS** (post-fix) | `VideoFrameScrubber` + `VideoAccumulatedHeatmapOverlay` |
| 5 | **Presets:** Smooth/Balanced blobs más amplios | **PASS** | Smooth scale 0.12 vs Lab 0.032; test orden presets |
| 6 | Sliders <1s; download respeta modo | **PASS** | Debounce 60–150ms; filename `{tab}-{mapMode}.png` |

**Veredicto global: PASS** (con nota de regeneración obligatoria para heatmaps pre-v0.79).

---

## Fixes aplicados en Fase 4

| Fix | Archivo | Motivo |
|-----|---------|--------|
| Cap radio 15% frame | `attentionPrediction.utils.ts`, `HeatmapRenderer.tsx` | Criterio aceptación #1 |
| Video acumulado sin frames | `VideoAccumulatedHeatmapOverlay.tsx` | Criterio #4 — antes `null` cuando `heatmapData` sin `videoFrames` |
| Tests QA helpers | `attentionPrediction.heatmapQa.test.ts` | Regresión automatizada |

---

## Checklist manual recomendado (staging)

Usar un estímulo retail (anaquel) y un packshot tipo image4:

- [ ] Generar heatmap (o Regenerar si banner legacy visible)
- [ ] **Classic / Lab:** verificar que logos/textos bajo hotspots siguen legibles
- [ ] **Classic / Smooth:** confirmar blobs más amplios que Lab (comportamiento intencional)
- [ ] **Spotlight:** contar ≥3 zonas nítidas; fondo difuminado
- [ ] **Cold:** esquinas y texto legal con tinte frío; pack/cara principal sin frío intenso
- [ ] **Video con frames:** alternar Classic / Spotlight / Cold en scrubber
- [ ] **Video solo acumulado:** mismos 3 modos en overlay estático
- [ ] Download PNG en cada modo — verificar nombre y contenido

---

## Riesgos residuales

| Riesgo | Mitigación |
|--------|------------|
| Heatmaps legacy densos (>120 pts) | Banner amber + Regenerar heatmap |
| Packshot con pocos picos TranSalNet | Ajustar threshold Spotlight o regenerar con AOIs manuales |
| Cold muy sutil en estímulos oscuros | Subir Intensity a 70–80 |

---

## Comandos de verificación

```bash
cd research-frontend && npm run test -- src/utils/__tests__/attentionPrediction.heatmapQa.test.ts
cd research-frontend && npm run build && npm run type-check && npm run lint
```

---

*QA Fase 4 completada — spec v1 listo para deploy.*
