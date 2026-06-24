# -*- coding: utf-8 -*-
"""
EmotioX Video Heatmap Generator — Google Colab notebook.

1. Upload video + logo
2. DINO ViT-B/16 attention prediction per frame
3. Side-by-side output (original | heatmap+grid) with logo footer
4. Auto-upload result to EmotioX platform

Usage: Run in Google Colab. Each cell is a step.
"""

# ─── Cell 1: Install dependencies ────────────────────────────────────
# !pip install transformers timm opencv-python-headless --quiet

# ─── Cell 2: Upload files ────────────────────────────────────────────
from google.colab import files
print("Sube el VIDEO (mp4) y opcionalmente un LOGO (png/jpg)")
uploaded = files.upload()

video_path = None
logo_path = None
for name in uploaded:
    ext = name.lower().split('.')[-1]
    if ext in ('mp4', 'webm', 'mov'):
        video_path = name
    elif ext in ('png', 'jpg', 'jpeg'):
        logo_path = name

assert video_path, "No se encontro archivo de video"
print(f"Video: {video_path}")
print(f"Logo: {logo_path or 'ninguno'}")

# ─── Cell 3: Configuration ───────────────────────────────────────────
#@title Configuracion
EMOTIOX_URL = "https://emotio.cx"  #@param {type:"string"}
RESEARCH_ID = ""  #@param {type:"string"}
STIMULUS_MEDIA_ID = ""  #@param {type:"string"}
UPLOAD_SECRET = "emotiox-heatmap-2026"  #@param {type:"string"}
ROTATE_90_CW = True  #@param {type:"boolean"}
FLIP_HEATMAP_V = True  #@param {type:"boolean"}
FOOTER_HEIGHT = 100  #@param {type:"integer"}

# ─── Cell 4: Load model + process video ──────────────────────────────
import cv2
import torch
import numpy as np
from transformers import AutoImageProcessor, AutoModel
from PIL import Image
import os

# Load DINO
print("Cargando modelo DINO ViT-B/16...")
model_name = "facebook/dino-vitb16"
feature_extractor = AutoImageProcessor.from_pretrained(model_name)
model = AutoModel.from_pretrained(model_name)
model.eval()
print("Modelo cargado")

def get_attention_map(image):
    inputs = feature_extractor(images=image, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)
        patch_tokens = outputs.last_hidden_state[0, 1:]
        attention = torch.mean(patch_tokens, dim=-1)
        side = int(attention.shape[0] ** 0.5)
        return attention[:side*side].reshape(side, side).numpy()

def normalize(arr):
    lo, hi = arr.min(), arr.max()
    return np.zeros_like(arr) if hi == lo else (arr - lo) / (hi - lo)

def compute_quadrants(attention, rows=3, cols=3):
    h, w = attention.shape
    total = float(np.sum(attention)) or 1.0
    ch, cw = h // rows, w // cols
    quads = {}
    for idx in range(rows * cols):
        r, c = divmod(idx, cols)
        y1, y2 = r * ch, (h if r == rows - 1 else (r + 1) * ch)
        x1, x2 = c * cw, (w if c == cols - 1 else (c + 1) * cw)
        pct = float(np.sum(attention[y1:y2, x1:x2])) / total * 100
        quads[str(idx + 1)] = {'percentage': round(pct, 1), 'bounds': (x1, y1, x2, y2)}
    return quads

def draw_heatmap_with_grid(frame, heatmap, quadrants):
    overlay = cv2.addWeighted(frame, 0.4, heatmap, 0.6, 0)
    h, w = overlay.shape[:2]
    qh, qw = h // 3, w // 3
    WHITE, GREEN, BLACK = (255,255,255), (0,255,0), (0,0,0)
    FONT = cv2.FONT_HERSHEY_SIMPLEX

    for i in range(1, 3):
        cv2.line(overlay, (0, i*qh), (w, i*qh), WHITE, 2)
        cv2.line(overlay, (i*qw, 0), (i*qw, h), WHITE, 2)

    for qid, data in quadrants.items():
        pct = data['percentage']
        x1, y1, x2, y2 = data['bounds']
        cx, by = (x1+x2)//2, y2-10
        text = f"Q{qid}: {pct}%"
        (tw, th), _ = cv2.getTextSize(text, FONT, 0.8, 2)
        cv2.rectangle(overlay, (cx-tw//2-5, by-th-5), (cx+tw//2+5, by+5), BLACK, -1)
        cv2.putText(overlay, text, (cx-tw//2, by), FONT, 0.8, GREEN, 2)
    return overlay

# Load logo
logo_data = None
if logo_path and os.path.exists(logo_path):
    raw = cv2.imread(logo_path, cv2.IMREAD_UNCHANGED)
    if raw is not None:
        has_alpha = raw.ndim == 3 and raw.shape[2] == 4
        bgr = raw[:, :, :3]
        alpha = raw[:, :, 3] if has_alpha else None
        max_h = FOOTER_HEIGHT - 20
        scale = min(1.0, max_h / bgr.shape[0])
        new_size = (int(bgr.shape[1] * scale), int(bgr.shape[0] * scale))
        bgr = cv2.resize(bgr, new_size)
        alpha = cv2.resize(alpha, new_size) if alpha is not None else None
        logo_data = (bgr, alpha)
        print(f"Logo cargado: {new_size[0]}x{new_size[1]}")

# Open video
cap = cv2.VideoCapture(video_path)
assert cap.isOpened(), f"No se pudo abrir: {video_path}"
fps = cap.get(cv2.CAP_PROP_FPS)
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
ow, oh = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

fw, fh = (oh, ow) if ROTATE_90_CW else (ow, oh)
content_w, content_h = fw * 2, fh
final_w = content_w
final_h = content_h + FOOTER_HEIGHT

print(f"Video: {ow}x{oh} @ {fps}fps, {total} frames")
print(f"Output: {final_w}x{final_h}")

# Build footer once
footer = np.zeros((FOOTER_HEIGHT, final_w, 3), dtype=np.uint8)
if logo_data:
    bgr, alpha = logo_data
    lh, lw = bgr.shape[:2]
    x, y = (final_w - lw) // 2, (FOOTER_HEIGHT - lh) // 2
    if x >= 0 and y >= 0:
        if alpha is not None:
            a = alpha.astype(np.float32)[:, :, np.newaxis] / 255.0
            region = footer[y:y+lh, x:x+lw].astype(np.float32)
            footer[y:y+lh, x:x+lw] = (region * (1-a) + bgr.astype(np.float32) * a).astype(np.uint8)
        else:
            footer[y:y+lh, x:x+lw] = bgr

# Process
output_path = 'output_heatmap.mp4'
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(output_path, fourcc, fps, (final_w, final_h))
assert out.isOpened()

count = 0
while True:
    ok, raw_frame = cap.read()
    if not ok:
        break

    frame = cv2.rotate(raw_frame, cv2.ROTATE_90_CLOCKWISE) if ROTATE_90_CW else raw_frame
    h, w = frame.shape[:2]

    img_pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    attention = get_attention_map(img_pil)
    normed = normalize(attention)
    resized = cv2.resize(normed, (w, h), interpolation=cv2.INTER_CUBIC)
    heatmap = cv2.applyColorMap(np.uint8(resized * 255), cv2.COLORMAP_JET)

    if FLIP_HEATMAP_V:
        heatmap = cv2.flip(heatmap, 0)
        resized = np.flip(resized, 0).copy()

    quads = compute_quadrants(resized)
    overlay = draw_heatmap_with_grid(frame, heatmap, quads)
    content = np.hstack((frame, overlay))

    if content.shape[1] != content_w or content.shape[0] != content_h:
        content = cv2.resize(content, (content_w, content_h))

    final = np.vstack((content, footer))
    out.write(final)
    count += 1

    if count % 30 == 0:
        print(f"  {count}/{total} ({count/total*100:.0f}%)")

cap.release()
out.release()
size_mb = os.path.getsize(output_path) / (1024*1024)
print(f"\nVideo generado: {output_path} ({size_mb:.1f}MB, {count} frames)")

# ─── Cell 5: Preview (optional) ──────────────────────────────────────
from IPython.display import HTML
from base64 import b64encode

mp4_data = open(output_path, 'rb').read()
b64 = b64encode(mp4_data).decode()
HTML(f'<video controls width="640"><source src="data:video/mp4;base64,{b64}" type="video/mp4"></video>')

# ─── Cell 6: Upload to EmotioX ───────────────────────────────────────
import requests

assert RESEARCH_ID, "Configura RESEARCH_ID en Cell 3"
assert STIMULUS_MEDIA_ID, "Configura STIMULUS_MEDIA_ID en Cell 3"

url = f"{EMOTIOX_URL}/api/attention-prediction/upload-heatmap-video"

with open(output_path, 'rb') as f:
    resp = requests.post(url, files={'file': (output_path, f, 'video/mp4')}, data={
        'researchId': RESEARCH_ID,
        'stimulusMediaId': STIMULUS_MEDIA_ID,
        'secret': UPLOAD_SECRET,
    })

print(f"Status: {resp.status_code}")
print(resp.json())

if resp.status_code == 200:
    print(f"\nHeatmap subido exitosamente a EmotioX")
    print(f"Recarga la pagina del estudio para ver el resultado")
else:
    print(f"\nError al subir. Verifica RESEARCH_ID y STIMULUS_MEDIA_ID")
