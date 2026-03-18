import { useEffect, useRef, useState } from 'react';

interface HeatmapPoint {
    x: number;
    y: number;
    value?: number;
    isCorrect?: boolean;
    timestamp?: number;
}

interface HeatmapRendererProps {
    imageUrl: string;
    data: HeatmapPoint[];
    className?: string;
    radius?: number;
    blur?: number;
}

export const HeatmapRenderer = ({
    imageUrl,
    data,
    className = '',
    radius = 30
}: HeatmapRendererProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => {
            setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
            setImageLoaded(true);
        };
    }, [imageUrl]);

    useEffect(() => {
        if (!imageLoaded || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Load image fully before drawing
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        img.onload = () => {
            canvas.width = naturalSize.width;
            canvas.height = naturalSize.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw background image
            ctx.drawImage(img, 0, 0);

            drawHeatmapOverlay(ctx, canvas, naturalSize, data, radius);
        };

    }, [imageLoaded, naturalSize, data, imageUrl, radius]);

    if (!imageUrl) return <div className="bg-gray-200 h-64 flex items-center justify-center">No Image URL</div>;

    return (
        <div className={`relative overflow-hidden rounded-lg shadow-sm border ${className}`}>
            <canvas
                ref={canvasRef}
                className="max-w-full h-auto block"
                style={{ width: '100%' }}
            />
            {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <span className="text-gray-400">Loading image...</span>
                </div>
            )}
        </div>
    );
};

function drawHeatmapOverlay(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    naturalSize: { width: number; height: number },
    data: Array<{ x: number; y: number; value?: number; isCorrect?: boolean; timestamp?: number }>,
    radius: number
) {
        // --- Heatmap with intensity overlay (alpha channel) ---
        // 1. Build an intensity map on an offscreen canvas (grayscale, additive)
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const offCtx = offscreen.getContext('2d')!;

        data.forEach(point => {
            let x = point.x;
            let y = point.y;

            if (x > 1 && y > 1) {
                x = (x / 100) * naturalSize.width;
                y = (y / 100) * naturalSize.height;
            } else if (x <= 1 && y <= 1) {
                x *= naturalSize.width;
                y *= naturalSize.height;
            }

            // Additive white circle — overlapping circles accumulate intensity
            const gradient = offCtx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(255,255,255,1)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');

            offCtx.globalCompositeOperation = 'lighter';
            offCtx.fillStyle = gradient;
            offCtx.beginPath();
            offCtx.arc(x, y, radius, 0, 2 * Math.PI);
            offCtx.fill();
        });

        // 2. Read the intensity map and colorize: blue→purple→red→yellow→white
        const intensityData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
        const colorized = ctx.createImageData(canvas.width, canvas.height);

        for (let i = 0; i < intensityData.data.length; i += 4) {
            const intensity = intensityData.data[i]; // R channel (white circles → R=G=B)
            if (intensity === 0) continue; // transparent where no clicks

            // Map intensity 0-255 to heatmap gradient: blue → purple → red → yellow → white
            let r: number, g: number, b: number;
            const t = intensity / 255;

            if (t < 0.25) {
                // Blue → Purple
                const p = t / 0.25;
                r = Math.round(80 * p);
                g = 0;
                b = Math.round(180 + 75 * p);
            } else if (t < 0.5) {
                // Purple → Red
                const p = (t - 0.25) / 0.25;
                r = Math.round(80 + 175 * p);
                g = 0;
                b = Math.round(255 - 255 * p);
            } else if (t < 0.75) {
                // Red → Yellow
                const p = (t - 0.5) / 0.25;
                r = 255;
                g = Math.round(200 * p);
                b = 0;
            } else {
                // Yellow → White
                const p = (t - 0.75) / 0.25;
                r = 255;
                g = Math.round(200 + 55 * p);
                b = Math.round(80 * p);
            }

            colorized.data[i] = r;
            colorized.data[i + 1] = g;
            colorized.data[i + 2] = b;
            colorized.data[i + 3] = Math.round(128); // 50% alpha
        }

        // 3. Draw colorized overlay on top of the image
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.width = canvas.width;
        overlayCanvas.height = canvas.height;
        const overlayCtx = overlayCanvas.getContext('2d')!;
        overlayCtx.putImageData(colorized, 0, 0);

        ctx.drawImage(overlayCanvas, 0, 0);
}
