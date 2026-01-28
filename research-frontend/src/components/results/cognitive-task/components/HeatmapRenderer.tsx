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
    radius = 25
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

        // Set canvas dimensions to match image natural size for accurate coordinate mapping
        canvas.width = naturalSize.width;
        canvas.height = naturalSize.height;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background image
        const img = new Image();
        img.src = imageUrl;
        ctx.drawImage(img, 0, 0);

        // Draw Heatmap Points
        // Simple implementation: Radial gradients for each point
        data.forEach(point => {
            ctx.beginPath();
            // Assuming point.x and point.y are percentages (0-100)
            let x = point.x;
            let y = point.y;

            // Convert percentage (0-100) to pixel coordinates
            if (x > 1 && y > 1) {
                // Already in percentage format (0-100)
                x = (x / 100) * naturalSize.width;
                y = (y / 100) * naturalSize.height;
            } else if (x <= 1 && y <= 1) {
                // Normalized format (0-1)
                x *= naturalSize.width;
                y *= naturalSize.height;
            }

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

            // Color based on correctness: Green for correct, Red for incorrect
            if (point.isCorrect === true) {
                gradient.addColorStop(0, 'rgba(34, 197, 94, 0.6)'); // Green center
                gradient.addColorStop(0.5, 'rgba(134, 239, 172, 0.4)'); // Light green
                gradient.addColorStop(1, 'rgba(134, 239, 172, 0)'); // Transparent
            } else if (point.isCorrect === false) {
                gradient.addColorStop(0, 'rgba(239, 68, 68, 0.6)'); // Red center
                gradient.addColorStop(0.5, 'rgba(252, 165, 165, 0.4)'); // Light red
                gradient.addColorStop(1, 'rgba(252, 165, 165, 0)'); // Transparent
            } else {
                // Default yellow for unknown
                gradient.addColorStop(0, 'rgba(255, 0, 0, 0.6)'); // Red center
                gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.4)'); // Yellow
                gradient.addColorStop(1, 'rgba(255, 255, 0, 0)'); // Transparent
            }

            ctx.fillStyle = gradient;
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fill();
        });

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
