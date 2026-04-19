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
  // Reusable offscreen canvases — avoid allocating per render
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      renderTransparency(img);
    };
    img.src = imageUrl;
    return () => { img.onload = null; img.src = ''; imgRef.current = null; };
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

    // Reuse offscreen canvas for sharp image
    if (!offscreenRef.current || offscreenRef.current.width !== w || offscreenRef.current.height !== h) {
      offscreenRef.current = document.createElement('canvas');
      offscreenRef.current.width = w;
      offscreenRef.current.height = h;
    }
    const offCtx = offscreenRef.current.getContext('2d');
    if (!offCtx) return;
    offCtx.clearRect(0, 0, w, h);
    offCtx.drawImage(img, 0, 0, w, h);

    // Reuse mask canvas
    if (!maskRef.current || maskRef.current.width !== w || maskRef.current.height !== h) {
      maskRef.current = document.createElement('canvas');
      maskRef.current.width = w;
      maskRef.current.height = h;
    }
    const maskCtx = maskRef.current.getContext('2d');
    if (!maskCtx) return;
    maskCtx.clearRect(0, 0, w, h);

    const maxDur = Math.max(...fixations.map(f => f.duration), 1);

    for (const fix of fixations) {
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
    offCtx.drawImage(maskRef.current, 0, 0);
    offCtx.globalCompositeOperation = 'source-over';

    // Composite revealed areas onto blurred base
    ctx.drawImage(offscreenRef.current, 0, 0);
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
