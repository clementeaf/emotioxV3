import { useState, useEffect, useCallback, useRef } from 'react';
import type { EyeTrackingStimulus } from '../../../services/analytics.service';

export const TransparencyMap = ({
  imageUrl,
  fixations,
}: {
  imageUrl: string;
  fixations: EyeTrackingStimulus['fixations'];
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blurAmount, setBlurAmount] = useState(20);
  const [revealRadius, setRevealRadius] = useState(40);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      renderTransparency(img);
    };
    img.src = imageUrl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  useEffect(() => {
    if (imgRef.current) renderTransparency(imgRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixations, blurAmount, revealRadius]);

  const renderTransparency = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw blurred image as base
    ctx.filter = `blur(${blurAmount}px)`;
    ctx.drawImage(img, 0, 0, w, h);
    ctx.filter = 'none';

    // Dark overlay on blurred
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);

    // Create reveal mask: draw sharp image, masked by fixation circles
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    // Draw sharp image
    offCtx.drawImage(img, 0, 0, w, h);

    // Create circular mask
    const mask = document.createElement('canvas');
    mask.width = w;
    mask.height = h;
    const maskCtx = mask.getContext('2d');
    if (!maskCtx) return;

    const maxDur = Math.max(...fixations.map(f => f.duration), 1);

    for (const fix of fixations) {
      // Radius proportional to duration
      const baseR = (revealRadius / 100) * Math.min(w, h) * 0.1;
      const durScale = 0.5 + (fix.duration / maxDur) * 0.5;
      const r = baseR * durScale;

      const gradient = maskCtx.createRadialGradient(fix.x, fix.y, 0, fix.x, fix.y, r);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.7, 'rgba(255,255,255,0.6)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      maskCtx.fillStyle = gradient;
      maskCtx.fillRect(fix.x - r, fix.y - r, r * 2, r * 2);
    }

    // Apply mask to sharp image
    offCtx.globalCompositeOperation = 'destination-in';
    offCtx.drawImage(mask, 0, 0);

    // Composite revealed areas onto blurred base
    ctx.drawImage(offscreen, 0, 0);
  }, [fixations, blurAmount, revealRadius]);

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <label className="text-xs text-gray-500 flex items-center gap-2">
          Blur
          <input
            type="range"
            min={5}
            max={50}
            value={blurAmount}
            onChange={e => setBlurAmount(Number(e.target.value))}
            className="w-20 h-1 accent-blue-600"
          />
          <span className="text-xs text-gray-400 w-8">{blurAmount}px</span>
        </label>
        <label className="text-xs text-gray-500 flex items-center gap-2">
          Reveal
          <input
            type="range"
            min={10}
            max={100}
            value={revealRadius}
            onChange={e => setRevealRadius(Number(e.target.value))}
            className="w-20 h-1 accent-blue-600"
          />
          <span className="text-xs text-gray-400 w-8">{revealRadius}%</span>
        </label>
        <span className="text-xs text-gray-400">{fixations.length} fixations</span>
      </div>
      <div className="rounded-lg overflow-hidden border bg-gray-100 w-fit mx-auto">
        <canvas
          ref={canvasRef}
          className="max-h-[60vh] w-auto block"
        />
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        Sharp areas = where participants looked. Blurred = unseen.
      </p>
    </div>
  );
};
