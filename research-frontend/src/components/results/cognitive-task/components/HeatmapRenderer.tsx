import { useEffect, useRef, useState } from 'react';
import simpleheat from 'simpleheat';

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

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        img.onload = () => {
            const w = naturalSize.width;
            const h = naturalSize.height;
            canvas.width = w;
            canvas.height = h;

            // 1. Draw background image
            ctx.drawImage(img, 0, 0);

            // 2. Dark overlay (~55% black)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.fillRect(0, 0, w, h);

            // 3. Draw heatmap on a separate canvas, then composite
            const heatCanvas = document.createElement('canvas');
            heatCanvas.width = w;
            heatCanvas.height = h;

            const heat = simpleheat(heatCanvas);

            // Radius scales with image size
            const r = Math.max(10, Math.round(Math.min(w, h) * 0.04));
            heat.radius(r, r * 0.7);

            // Hotjar-style gradient: green → yellow → red
            heat.gradient({
                0.15: '#0f0',
                0.35: '#8f0',
                0.5: '#ff0',
                0.7: '#f80',
                0.85: '#f00',
                1.0: '#fff',
            });

            // Convert data points to [x, y, intensity]
            const points: Array<[number, number, number]> = data.map(point => {
                let x = point.x;
                let y = point.y;
                if (x > 1 && y > 1) {
                    x = (x / 100) * w;
                    y = (y / 100) * h;
                } else if (x <= 1 && y <= 1) {
                    x *= w;
                    y *= h;
                }
                return [x, y, 1];
            });

            heat.data(points);
            heat.max(Math.max(3, Math.ceil(points.length * 0.05)));
            heat.draw(0.05);

            // 4. Composite heatmap over the darkened image
            ctx.drawImage(heatCanvas, 0, 0);
        };

    }, [imageLoaded, naturalSize, data, imageUrl]);

    if (!imageUrl) return <div className="bg-gray-200 h-64 flex items-center justify-center">No Image URL</div>;

    return (
        <div className={`relative overflow-hidden rounded-lg shadow-sm border ${className}`}>
            <canvas
                ref={canvasRef}
                className="max-h-[700px] w-auto block"
                style={{ maxHeight: '700px' }}
            />
            {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <span className="text-gray-400">Loading image...</span>
                </div>
            )}
        </div>
    );
};
