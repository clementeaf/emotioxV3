# Eye Tracking — Technical Assessment

**Date:** 2026-03-27
**Status:** Prototype, resultados insuficientes para producción

---

## Qué funciona

| Componente | Estado | Notas |
|------------|--------|-------|
| MediaPipe Face Landmarker | OK | 478 landmarks 3D, iris centers (468/473), 60fps estable |
| Máscara facial (overlay) | OK | Wireframe volumétrico, contornos de ojo, círculos de iris, ajuste correcto con object-contain |
| Feature extraction | OK | 27 features: iris ratios, head pose (rotation 9 + translation 3), polinomios, cruces |
| Ridge regression | OK | Entrena, predice, funciona matemáticamente |
| Calibración 9 puntos | OK | Captura frames, bloquea sin iris, progress visual |
| Validación 9 puntos | OK | Mide error post-calibración |
| Telemetría en vivo | OK | irisRx, irisRy, nose, state, gaze en tiempo real |

## Qué NO funciona

**El punto rojo (predicción de gaze) no sigue la mirada.**

### Evidencia

Prueba de correlación click vs iris (sesión 2026-03-27):

| Click | clickNorm X | irisRx | Delta iris |
|-------|-------------|--------|------------|
| #1 (arriba-izq) | 0.11 | 0.4219 | — |
| #2 (centro-der) | 0.66 | 0.4139 | **0.008** |

**55% de desplazamiento en pantalla → 0.8% de cambio en irisRx.** La señal es ruido.

### Root cause

MediaPipe Face Landmarker detecta la **geometría del ojo** con precisión, pero los **iris-in-eye ratios** tienen un rango dinámico demasiado bajo para mapear a coordenadas de pantalla:

- irisRx rango útil: ~0.35–0.55 (rango total 0.20)
- Pantalla ancho: ~1470px
- Resolución teórica: 0.20 / 1470 = 0.000136 por pixel → irrecuperable con ridge

El iris se mueve **milímetros** dentro de la órbita. En una webcam 640x480 eso son 1-3 píxeles de diferencia, que MediaPipe normaliza a cambios de 0.01 o menos.

**Los 27 features (iris ratios + head pose + polinomios) no contienen suficiente información para resolver la posición de gaze en pantalla.**

### Por qué WebGazer tampoco funcionó bien

WebGazer usa **píxeles crudos de la imagen del ojo** (no landmarks), lo que en teoría da más señal. Pero:
- Su face detection (TF.js) es inferior a MediaPipe
- Necesita muchos más puntos de calibración para converger
- Su UI inyecta DOM difícil de controlar
- En nuestra prueba no mostró mejora significativa

---

## Opciones reales

### Opción A: Modelo CNN entrenado (eye image patches)

En vez de landmarks, recortar la **imagen de los ojos** del frame de video y pasarla por un modelo CNN ligero entrenado para predecir gaze.

- **Pro:** Usa la información visual completa (reflejo corneal, textura, sombras, forma de pupila)
- **Pro:** Modelos pre-entrenados existen (GazeML, ETH-XGaze, MPIIGaze)
- **Con:** Requiere modelo ONNX/TFLite en el browser (~5-20MB)
- **Con:** Aún necesita calibración por usuario
- **Precisión esperada:** ~50-100px con calibración, ~150-200px sin

### Opción B: Modelo híbrido (landmarks + eye patches)

Combinar los 27 features de landmarks con un embedding de la imagen del ojo.

- **Pro:** Mejor que solo landmarks
- **Con:** Complejidad de implementación alta
- **Precisión esperada:** ~40-80px

### Opción C: API de eye tracking nativa del browser

Chrome tiene experimental Eye Tracking API (Origin Trial). Usa el hardware del dispositivo si está disponible.

- **Pro:** Precisión nativa, sin modelos
- **Con:** Solo Chrome, solo dispositivos con hardware compatible, experimental
- **Disponibilidad:** Muy limitada

### Opción D: Hardware dedicado (Tobii, EyeTech)

Usar un eye tracker USB dedicado con SDK JavaScript.

- **Pro:** Precisión ~0.5° (20-30px), la mejor opción por lejos
- **Con:** Hardware adicional ($100-300 USD), no funciona en cualquier equipo
- **Precisión:** ~20-30px

### Opción E: Aceptar la limitación y usar como "attention zone"

En vez de predecir el pixel exacto, predecir la **zona general** donde mira el usuario (9 cuadrantes o 4 cuadrantes).

- **Pro:** Factible con la señal actual de iris + head pose
- **Con:** Baja resolución (solo zona, no punto)
- **Precisión:** ~70-80% de acierto por cuadrante con calibración

---

## Recomendación

**Opción A (CNN pre-entrenado)** es el camino más realista para lograr un punto rojo que siga la mirada de forma útil, sin hardware adicional. Requiere:

1. Modelo pre-entrenado (GazeML o ETH-XGaze) convertido a ONNX
2. ONNX Runtime Web para inferencia en browser
3. Crop de ojos desde los landmarks de MediaPipe (ya lo tenemos)
4. Calibración de ~9 puntos para ajustar al usuario
5. Smoothing + head pose compensation (ya lo tenemos)

Si la resolución por zona (Opción E) es aceptable para el caso de uso de EmotioX, es implementable con lo que ya tenemos hoy.

---

## Stack actual (research-frontend)

```
src/
├── hooks/
│   ├── useFaceDetection.ts    — MediaPipe face detection loop
│   ├── useEyeTracking.ts      — Calibración + ridge + tracking
│   └── useWebcam.ts           — Camera stream management
├── lib/eyeTracking/
│   ├── constants.ts            — Landmarks, calibration points, thresholds
│   ├── faceLandmarker.ts       — MediaPipe init
│   ├── featureExtraction.ts    — 27-dim feature vector
│   ├── headPose.ts             — 4x4 matrix parsing
│   ├── ridgeRegression.ts      — Ridge regression (pure math)
│   ├── validationMetrics.ts    — Error aggregation
│   ├── drawFaceOverlay.ts      — Canvas: wireframe + iris + volume
│   ├── faceOval.ts             — Face contour indices
│   └── types.ts
└── pages/labs/
    ├── EyeTrackingLabPage.tsx  — Main lab page
    ├── EyeTrackingStep.tsx     — Gaze dot overlay
    ├── EyeTrackingCalibrationStep.tsx — (legacy, unused)
    └── FaceDetectionOverlay.tsx — Canvas overlay component
```
