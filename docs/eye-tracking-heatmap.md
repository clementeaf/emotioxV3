# Eye Tracking — Heatmap por zonas (atención aproximada)

## Contexto

Con **webcam estándar** y modelos en el navegador, la mirada **no** es equivalente a un eye tracker de laboratorio: lo viable es un **mapa de atención por zonas** (y AOIs definidas por el investigador), no un punto exacto píxel a píxel. Las soluciones de **precisión alta** suelen implicar **hardware dedicado** (p. ej. sensores infrarrojos) o **servicios cloud** con coste e implicaciones de privacidad.

## Dos implementaciones en el repo

| Ámbito | Dónde | Rejilla / salida | Calibración |
|--------|--------|------------------|-------------|
| **Encuesta (producción)** | `EyeTrackingRenderer` | Muestreo de mirada para respuesta `eye-tracking-data` (fixations, etc.) | 9 puntos en **viewport** (rejilla 3×3 en %) |
| **Lab / demo** | `/eye-tracking-hybrid` (`EyeTrackingHybridPage`) | **2×2 (4 cuadrantes)** sobre el **rectángulo del estímulo**; heatmap de % por cuadrante | **4 puntos** al centro de cada cuadrante (% de la imagen, misma vista que el tracking) |

Ambas usan **BlazeGaze** (`webeyetrack`) en desktop; tablet/móvil usan **proxy de atención** (toques sobre la imagen).

## Página híbrida (4 cuadrantes)

1. **Calibración**: cuatro puntos (centro de cada cuadrante) en la imagen del estímulo; el participante mira cada punto verde y hace clic. BlazeGaze adapta con `calibrate` en coordenadas normalizadas alineadas al rectángulo de la imagen. Post-calibración: residuos + campo IDW (`hybridCalibrationField`).
2. **Estímulo**: misma imagen con rejilla **2×2**. En desktop, la mirada se muestrea a ~**50 ms** cuando el modelo está activo; la sesión termina con **Detener** (demo sin duración fija obligatoria).
3. **Clasificación**: cada muestra se proyecta al rectángulo y se asigna a un cuadrante `r{row}c{col}`. Mapeo con correcciones de borde / stretch (ver `hybridZoneGrid.ts`).
4. **Live UI**: cuadrante resaltado = voto por mayoría; anillo dorado = dwell en el mismo cuadrante.
5. **Resultado**: porcentajes aproximados por cuadrante; opcionalmente huecos rellenados con trayectoria mínimo jerk entre muestras válidas (`gazeGapFill.ts`); umbral de ruido `HYBRID_NOISE_THRESHOLD_PCT`.

Ejemplo conceptual 2×2:

```
┌───────────┬───────────┐
│ Sup. izq. │ Sup. der. │
├───────────┼───────────┤
│ Inf. izq. │ Inf. der. │
└───────────┴───────────┘
```

La lógica de mapeo vive en `participant-frontend/src/lib/eyeTracking/hybridZoneGrid.ts`.

## Por dispositivo

| Dispositivo | Método | Entrada |
|-------------|--------|---------|
| Desktop | BlazeGaze CNN vía webcam | Predicción de mirada (~50 ms) |
| Tablet / móvil | Proxy de atención | Toques sobre la imagen |

## Resolución, frames e IA (cómo encaja con el código)

El **cuello de botella** suele ser doble: **pocos píxeles útiles en el ojo** en cada fotograma (distancia, encuadre, foco) y **variabilidad** (luz, parpadeos). **Más frames** ayudan a suavizar y a no perder la señal entre eventos, pero **no sustituyen** por completo la falta de detalle espacial: hay un techo físico por frame.

La **IA ya está en el pipeline**: `webeyetrack` (BlazeGaze) corre un modelo sobre el **vídeo completo** (`ImageData` del frame) y devuelve punto de mirada normalizado; no es solo geometría sobre landmarks del iris. Eso **aprovecha** aprendizaje para mapear apariencia del ojo y cabeza a mirada, dentro del límite del hardware.

En el repo, `participant-frontend/src/hooks/useBlazeGaze.ts`:

- **Una inferencia por vuelta** del bucle `requestAnimationFrame` (~30–60 Hz según pantalla/cámara): cada frame válido llama a `tracker.step(imageData, …)`.
- **Suavizado temporal** opcional (EMA sobre coordenadas de pantalla): `smoothAlpha` (p. ej. más bajo en `EyeTrackingHybridPage` para menos jitter en la rejilla).
- **Calibración por clics** (`handleClick` / `calibrate`): adapta el modelo a la pantalla del usuario; en la página híbrida se combina con **campo IDW** sobre el rect del estímulo (`hybridCalibrationField.ts`).
- **Contadores** (`BlazeGazeFrameStats`): frames inválidos vs. sin mirada vs. con mirada válida; además `captureWidthPx` / `captureHeightPx` (último frame enviado al modelo) para depurar resolución real de la webcam.

En resumen: **sí hay relación con IA** (el modelo es la base), pero **calidad de imagen y tamaño del ojo en píxeles** siguen marcando el techo; el software acerca el rendimiento a ese techo con modelo + temporal + calibración.

**Cámara en código:** `BLAZE_GAZE_MEDIA_STREAM_CONSTRAINTS` pide **ideal 1280×720** (`facingMode: user`); el navegador puede entregar otra resolución. Revisa en resultados del lab la línea “Resolución de captura” para ver el valor real. Si el **lado corto** del frame es menor que `BLAZE_GAZE_CAPTURE_SHORT_EDGE_WARN_PX` (480), se muestra un **aviso no bloqueante** (`isBlazeGazeCaptureResolutionLow`).

## Ventajas frente a “punto exacto”

- Más **robusto** ante cámara e iluminación.
- **Sin licencia** de eye tracker hardware en el flujo web.
- Alineado con **UX research** por regiones y **AOIs** en analytics.
- **Límite explícito**: interpretar como **atención aproximada**, no como métricas de laboratorio.
