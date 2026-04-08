# Eye Tracking — Heatmap de Zonas de Probabilidad

## Contexto

El tracking pixel-level (punto rojo exacto) no es viable con cámaras estándar de dispositivos y librerías gratuitas. Las soluciones comerciales de precisión cuestan desde 49 USD/mes.

## Solución implementada

Se utiliza **BlazeGaze CNN** (paquete `webeyetrack`, gratuito) para predecir la zona general donde se sitúa la mirada, en vez de un punto exacto.

El resultado es un **heatmap de 3x3 zonas** sobre la imagen del estímulo, donde cada zona muestra el porcentaje de tiempo que la mirada estuvo en esa área.

```
┌──────────┬──────────┬──────────┐
│ Top Left │Top Center│Top Right │
│   12%    │   28%    │    5%    │
├──────────┼──────────┼──────────┤
│Mid Left  │  Center  │Mid Right │
│    8%    │   31%    │    4%    │
├──────────┼──────────┼──────────┤
│Bot Left  │Bot Center│Bot Right │
│    3%    │    7%    │    2%    │
└──────────┴──────────┴──────────┘
```

## Cómo funciona

1. **Calibración**: 9 puntos en pantalla. El participante mira cada punto y hace click. BlazeGaze ajusta su modelo internamente.
2. **Estímulo**: se muestra la imagen durante 10 segundos. La webcam captura la dirección de mirada cada 50ms de forma silenciosa (sin indicador visible).
3. **Clasificación**: cada muestra de mirada se asigna a una de las 9 zonas según su posición en pantalla.
4. **Resultado**: porcentaje de muestras por zona, visualizado con escala de color (azul = baja, verde = media, amarillo = alta, rojo = pico).

## Por dispositivo

| Dispositivo | Método | Entrada |
|-------------|--------|---------|
| Desktop | BlazeGaze CNN via webcam | Predicción de mirada (50ms polling) |
| Tablet/Móvil | Proxy de atención | Taps del participante sobre la imagen |

## Ventajas sobre el punto exacto

- **Robusto** ante cámaras de baja calidad y variaciones de iluminación.
- **Sin costo** de licencia — BlazeGaze es open source.
- **Suficiente para UX research** — las zonas de interés importan más que el píxel exacto.
- **Compatible con AOIs** — el investigador puede definir áreas de interés rectangulares sobre el estímulo para métricas más específicas.
