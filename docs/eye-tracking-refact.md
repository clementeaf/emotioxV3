Refactoriza completamente el módulo de Eye Tracking bajo una nueva arquitectura basada en zonas y probabilidades, eliminando la dependencia de coordenadas absolutas como fuente principal de verdad.

## Objetivo

El sistema ya no debe intentar determinar el punto exacto donde mira el usuario. En su lugar, debe estimar la atención visual sobre componentes o zonas de la interfaz.

La prioridad es robustez y estabilidad, no precisión de píxel.

## Requerimientos

### 1. Mantener procesamiento 100% client-side

Continuar utilizando:

* BlazeGaze
* One-Euro Filter
* IDW Calibration
* I-DT Fixation Detection
* face-api.js

No agregar procesamiento server-side.

---

### 2. Reemplazar coordenadas por zonas

Cada pantalla deberá definir zonas de interés (AOI - Areas Of Interest).

Ejemplo:

* Hero Image
* Producto 1
* Producto 2
* Botón Comprar
* Menú
* Footer

Cada zona debe obtener automáticamente su posición mediante getBoundingClientRect().

No utilizar grids fijos salvo cuando la pantalla no tenga componentes definidos.

---

### 3. Pipeline nuevo

Raw Gaze

↓

One-Euro Filter

↓

Head Pose Compensation

↓

Calibración IDW

↓

Detección de Fijación (I-DT)

↓

Clasificación de Zona

↓

Confidence Score

↓

Persistencia

Nunca persistir únicamente X,Y.

---

### 4. Clasificador probabilístico

Cada muestra debe transformarse en:

* zona más probable
* confidence
* duración de fijación

Ejemplo:

{
zoneId,
confidence,
fixationDuration,
timestamp
}

---

### 5. Histéresis

No cambiar inmediatamente de zona cuando aparece una nueva predicción.

Implementar histéresis temporal.

Ejemplo:

* mantener zona actual hasta que otra zona supere la confianza durante 150–250 ms.

Esto evita saltos constantes.

---

### 6. Radio de incertidumbre

No tratar el punto como exacto.

Asumir un radio configurable (ej. 100–150 px en desktop, mayor en móvil).

Las zonas dentro de ese radio deben participar en el cálculo probabilístico.

---

### 7. Calibración

Revisar completamente la calibración.

Debe:

* permitir recalibraciones parciales
* detectar puntos deficientes
* recalibrar solamente los puntos con mayor error
* almacenar la calibración localmente
* evitar recalibrar en cada sesión

---

### 8. Adaptación por dispositivo

Desktop:

* priorizar precisión horizontal

Mobile:

* priorizar estabilidad
* aumentar radio de incertidumbre
* tolerar mayor movimiento de cabeza

---

### 9. API interna

El resto de la aplicación nunca debe consumir coordenadas X,Y.

Debe consumir eventos como:

* onZoneEnter
* onZoneLeave
* onFixationStart
* onFixationEnd

y estados como:

{
currentZone,
confidence,
fixationTime,
emotion
}

---

### 10. Persistencia

Guardar únicamente eventos relevantes.

Ejemplo:

* entrada a zona
* salida
* fijaciones
* emoción
* duración
* confianza

No almacenar miles de coordenadas por segundo salvo en modo diagnóstico.

---

### 11. Métricas

Generar automáticamente:

* tiempo total por zona
* primera zona observada
* orden de exploración
* mapa de calor por zonas
* porcentaje de atención
* secuencia de fijaciones

---

El objetivo final es transformar el sistema desde un "cursor ocular" a un sistema de análisis de atención visual robusto, estable y basado en componentes React, donde la unidad principal de análisis sea la zona observada y no la coordenada absoluta.
