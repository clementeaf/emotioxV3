# Plan: Microservicio Python TASED-Net para Video Saliency

> Reemplaza TranSalNet frame-by-frame (Node.js ONNX) por TASED-Net (Python FastAPI) para video UNICAMENTE.
> Imagenes siguen con TranSalNet en Node.js — sin cambios.

## Contexto

| Actual | Propuesto |
|--------|-----------|
| TranSalNet ONNX, frame-by-frame | TASED-Net PyTorch, 32-frame sliding window |
| Sin coherencia temporal | 3D conv (S3D encoder) — temporal nativo |
| ~5s/frame x 15 = ~75s | 32 frames en ~10-15s (CPU, batch) |
| Node.js ONNX Runtime | Python FastAPI + PyTorch |
| Workarounds: IDW + modulacion + 3 capas | Modelo produce mapas coherentes directamente |

### TASED-Net specs

- **Paper:** ICCV 2019, Michigan COG Lab
- **Licencia:** MIT (uso comercial OK)
- **Weights:** Google Drive, 82MB
- **Encoder:** S3D (3D conv)
- **Input:** `(1, 3, 32, 224, 384)` — 1 batch, 3 canales RGB, 32 frames, 224h x 384w
- **Normalizacion:** `(x * 2 - 255) / 255` -> [-1, 1]
- **Output:** Saliency map por frame, Gaussian blur sigma=7, rango 0-255
- **Sliding window:** stride configurable, temporal flip en bordes

### Servidor cPanel verificado

- Python 3.11 en `/opt/alt/python311/bin/python3.11`
- pip 21.3.1 + venv disponible
- 68GB RAM (37GB libre), 22 cores CPU
- Sin GPU — inference CPU only

---

## Arquitectura

```
React (research-frontend)
  |
  | POST /video-predict (igual que hoy)
  v
Node.js Express (API gateway)
  |
  | ENV: VIDEO_SALIENCY_BACKEND=tased|transalnet
  |
  |-- tased ----HTTP POST----> Python FastAPI (localhost:8001)
  |                              |
  |   <--streaming JSON-lines--  TASED-Net PyTorch inference
  |                              32-frame sliding window
  |   post-proceso Node.js       output: raw saliency maps
  |   (autoPresets, gridAOIs,
  |    temporalGrid, NMS)
  |
  |-- transalnet (fallback) --> TranSalNet ONNX (actual, sin cambios)
  |
  v
SSE --> React (progreso + resultado)
```

Node.js mantiene: SSE, auth, post-procesamiento, formato respuesta.
Python solo hace: inference TASED-Net, retorna mapas raw.

---

## Fase 1: Microservicio Python (independiente, 0 impacto)

### Objetivo
FastAPI standalone que recibe paths de frames, ejecuta TASED-Net, retorna saliency maps.

### Archivos nuevos

```
backend/python-saliency/
  app.py              # FastAPI: /health, /predict-video
  model.py            # TASED-Net definicion + carga singleton
  inference.py        # Sliding window, padding, pre/post-proceso
  schemas.py          # Pydantic request/response
  requirements.txt    # torch, torchvision, fastapi, uvicorn, numpy, Pillow, opencv-python-headless
  start.sh            # Activar venv + lanzar uvicorn
  watchdog.sh         # Cron: verificar PID, reiniciar si caido
  tests/
    test_inference.py  # Sliding window, padding, output shape

backend/models/
  tased_net.pth       # Weights 82MB (gitignored, deploy script sincroniza)
```

### API Contract

```
POST /predict-video
Content-Type: application/json

Request:
{
  "frame_paths": ["/abs/path/frame0.png", ...],
  "timestamps": [0.0, 2.0, 4.0, ...],
  "output_width": 384,
  "output_height": 224
}

Response: streaming text/plain (JSON-lines)
{"type": "progress", "frame": 0, "total": 15}
{"type": "progress", "frame": 1, "total": 15}
...
{"type": "result", "maps": ["<base64 Float32 384x224>", ...], "width": 384, "height": 224}
```

### Sliding window — manejo de frames

Nuestro flujo extrae max 15 frames (cada 2s). TASED-Net espera 32.

**Estrategia: padding por repeticion**
```
Input:  15 frames [f0, f1, ..., f14]
Padded: 32 frames [f0, f1, ..., f14, f14, f14, ..., f14]  (repeat last 17x)
Output: tomar solo primeros 15 saliency maps, descartar los 17 padded
```

Si en futuro se aumenta max frames >32:
```
Input:  40 frames
Window 1: frames 0-31  -> maps 0-31
Window 2: frames 8-39  -> maps 8-39
Overlap (8-31): promedio de ambas ventanas
Result: 40 maps con transicion suave
```

### Dependencias (requirements.txt)

```
torch>=2.0.0,<2.6.0
torchvision>=0.15.0
fastapi>=0.100.0
uvicorn[standard]>=0.23.0
numpy>=1.24.0
Pillow>=9.0.0
opencv-python-headless>=4.7.0
```

### Tests Fase 1
- Padding: 1 frame, 15 frames, 32 frames, 40 frames
- Output shape: cada map es (224, 384) float32
- Gaussian blur aplicado (sigma=7)
- Health endpoint retorna modelo cargado
- Benchmark: medir tiempo 15 frames en CPU

---

## Fase 2: Integracion Node.js (feature flag, rollback instantaneo)

### Objetivo
Node.js llama a Python para video, mantiene formato identico, 0 cambios frontend.

### Archivos nuevos

```
backend/src/modules/attention-prediction/tased-client.ts
```

Cliente HTTP streaming:
- POST a `TASED_SERVICE_URL` (default `http://localhost:8001`)
- Parsea JSON-lines
- Callback `onProgress(frame, total)` -> `broadcastProgress()`
- Retorna `Float32Array[]` (saliency maps raw)
- Timeout: 300s
- Fallback: si connection refused, lanza error capturado por caller

### Archivos modificados

**`video-prediction.service.ts`**
- Nueva funcion `predictVideoFramesTased()`
  - Resuelve paths de frames via `getMediaPath()`
  - Llama `tased-client.ts` con paths + timestamps
  - Recibe Float32Array[] raw maps
  - Ejecuta post-proceso existente sobre cada map:
    - `extractHeatmapPoints()` -> `frames[].heatmapData`
    - Acumulado = promedio de todos los maps
    - `computeAutoPresets()` sobre acumulado
    - `computeGriddedAOIs()` sobre acumulado
    - `computeCellAverage()` -> `temporalGrid`
    - `modulateIntensityByAoiProximity()` si hay AOIs manuales
  - Retorna `VideoPredictionResult` identico

**`attention-prediction.controller.ts`** (lineas 638-820)
- Leer `process.env.VIDEO_SALIENCY_BACKEND` (`'tased'` | `'transalnet'`, default `'transalnet'`)
- Si `'tased'`: llamar `predictVideoFramesTased()`
- Si `'transalnet'` o Python no disponible: llamar `predictVideoFrames()` (actual)

**`backend/.env`**
```
TASED_SERVICE_URL=http://localhost:8001
VIDEO_SALIENCY_BACKEND=tased
```

### Formato respuesta (sin cambios)

```ts
VideoPredictionResult {
  accumulatedHeatmapData: [{x, y, value}]    // identico
  autoPresets: {blur, opacity, threshold...}  // identico
  griddedAOIs: [{label, x, y, w, h, attention, rank}]  // identico
  frames: [{mediaId, timestamp, heatmapData}] // identico
  temporalGrid: [{label, row, col, timeSeries}] // identico — MEJOR calidad temporal
  aoiAttention?: {...}                        // identico
  totalFrames, failedFrames, processingTimeMs // identico
}
```

### Fallback automatico

```
try predictVideoFramesTased()
catch (connection error) {
  log.warn('TASED-Net service unavailable, falling back to TranSalNet')
  return predictVideoFrames()  // actual
}
```

### Tests Fase 2
- Mock Python service -> verificar VideoPredictionResult shape
- E2E: upload video, verificar heatmap renderiza
- Fallback: parar Python, verificar TranSalNet activa
- SSE: verificar progreso frame-by-frame llega al frontend

---

## Fase 3: Deploy cPanel + CI/CD

### Objetivo
Python corriendo en produccion, watchdog, CI/CD.

### Setup inicial (una vez)

```bash
ssh cpanel-emotio

# Crear venv con Python 3.11
cd ~/emotioxv3/backend/python-saliency
/opt/alt/python311/bin/python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Descargar weights
cd ~/emotioxv3/backend/models
# wget/curl desde Google Drive -> tased_net.pth (82MB)

# Iniciar
bash start.sh

# Cron watchdog
crontab -e
# */5 * * * * bash ~/emotioxv3/backend/python-saliency/watchdog.sh >> ~/emotioxv3/backend/python-saliency/logs/watchdog.log 2>&1
```

### start.sh

```bash
#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
source venv/bin/activate
nohup uvicorn app:app --host 127.0.0.1 --port 8001 --workers 1 --timeout-keep-alive 300 \
  >> logs/uvicorn.log 2>&1 &
echo $! > pid.txt
echo "Started TASED-Net service PID $(cat pid.txt)"
```

### watchdog.sh

```bash
#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$DIR/pid.txt"
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  exit 0
fi
echo "$(date): Restarting TASED-Net service" >> "$DIR/logs/watchdog.log"
bash "$DIR/start.sh"
```

### Archivos nuevos

```
scripts/deploy-python-saliency-cpanel.sh     # rsync + restart
scripts/setup-python-saliency.sh             # setup inicial venv + weights

.github/workflows/deploy-python-saliency-cpanel.yml
  trigger: backend/python-saliency/**
  steps: rsync, restart via SSH
```

### Archivos modificados

```
scripts/deploy-backend-cpanel.sh  # Agregar sync de python-saliency/ + restart
docs/cpanel-runbook.md            # Documentar servicio Python
.gitignore                        # backend/models/tased_net.pth
```

### Estructura remota

```
~/emotioxv3/backend/
  python-saliency/
    venv/                # Python 3.11 virtual env
    app.py
    model.py
    inference.py
    schemas.py
    logs/
      uvicorn.log
      watchdog.log
    pid.txt
  models/
    transalnet_res.onnx  # Existente (imagenes)
    tased_net.pth        # Nuevo (video, 82MB)
```

### Tests Fase 3
- Health endpoint desde produccion
- Video prediction E2E en produccion
- Kill proceso -> verificar watchdog reinicia en <5min
- Monitorear memoria 24h (PyTorch + TASED-Net ~300MB estimado)
- Verificar no conflicto con Node.js (puerto distinto)

---

## Fase 4 (opcional, diferida): Simplificar frontend

### Objetivo
Aprovechar coherencia temporal nativa de TASED-Net para simplificar rendering.

### Cambios potenciales

- **Eliminar `buildModulatedThermal`**: TASED-Net ya produce mapas per-frame coherentes. La modulacion artificial sobre el acumulado se vuelve innecesaria.
- **Simplificar `VideoThermalGrid`**: Dos capas en vez de tres (video + thermal per-frame, sin modulacion intermedia).
- **Mejorar `extractVideoFrames.ts`**: Posible aumentar max frames si TASED-Net procesa rapido.

### Prerequisito
Validar calidad visual en produccion antes de tocar frontend.

---

## Riesgos y mitigaciones

| Riesgo | Prob | Impacto | Mitigacion |
|--------|------|---------|------------|
| CPU inference lento (>60s para 32 frames) | Media | Alto | Benchmark temprano. Si lento: half-precision (`model.half()`), reducir a 16 frames |
| cPanel mata proceso Python | Baja | Medio | Watchdog cron. Medir estabilidad 24h |
| Weights Google Drive no descargable | Baja | Alto | Descargar local, rsync manual. Backup: re-hostear en S3 propio |
| TASED-Net calidad inferior a TranSalNet | Baja | Medio | Feature flag permite A/B. Ambos backends disponibles |
| Memoria excede limite cPanel | Baja | Alto | 300MB estimado vs 37GB libre. Monitorear. Fallback: quantizacion |
| 15 frames + padding produce bordes borrosos | Media | Bajo | Los 17 frames padded se descartan. Solo afecta si <5 frames |

## Rollback

```
# Instantaneo (sin deploy):
# En backend/.env:
VIDEO_SALIENCY_BACKEND=transalnet

# Limpieza completa:
ssh cpanel-emotio "kill \$(cat ~/emotioxv3/backend/python-saliency/pid.txt); crontab -l | grep -v watchdog | crontab -"
# Revertir cambios en video-prediction.service.ts y controller
```

## Secuencia y dependencias

```
Fase 1 (Python service)  <-- arrancar YA, 0 dependencias
  |
  v
Fase 2 (Node.js wiring)  <-- depende de API contract de Fase 1
  |
  v
Fase 3 (Deploy cPanel)   <-- depende de Fase 2 funcionando local
  |
  v
Fase 4 (Frontend)        <-- depende de validacion en produccion
```

Fases 1 y 2 pueden solaparse: definir API contract primero, luego construir en paralelo.
