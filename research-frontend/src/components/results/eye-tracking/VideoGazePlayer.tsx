import { useState, useEffect, useRef } from 'react';
import type { EyeTrackingStimulus } from '../../../services/analytics.service';

export const VideoGazePlayer = ({
  videoUrl,
  gazeTimeline,
}: {
  videoUrl: string;
  gazeTimeline: NonNullable<EyeTrackingStimulus['gazeTimeline']>;
}) => {
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentGazePoints, setCurrentGazePoints] = useState<Array<{ x: number; y: number }>>([]);
  const rafRef = useRef(0);
  const lastUpdateRef = useRef(0);

  // Pre-sort timeline by videoTime for faster filtering
  const sortedTimeline = useRef(gazeTimeline);
  useEffect(() => {
    sortedTimeline.current = [...gazeTimeline]
      .filter(p => p.videoTime != null)
      .sort((a, b) => (a.videoTime ?? 0) - (b.videoTime ?? 0));
  }, [gazeTimeline]);

  useEffect(() => {
    const video = videoPlayerRef.current;
    if (!video) return;

    const updateGaze = () => {
      if (!video || video.paused) { rafRef.current = 0; return; }

      const now = performance.now();
      // Throttle to ~15fps (67ms) — sufficient for gaze overlay, saves CPU
      if (now - lastUpdateRef.current < 67) {
        rafRef.current = requestAnimationFrame(updateGaze);
        return;
      }
      lastUpdateRef.current = now;

      const vt = video.currentTime;
      const windowMs = 0.25;
      const rect = video.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        rafRef.current = requestAnimationFrame(updateGaze);
        return;
      }

      // Binary search for window start in sorted timeline
      const timeline = sortedTimeline.current;
      let lo = 0;
      let hi = timeline.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if ((timeline[mid].videoTime ?? 0) < vt - windowMs) lo = mid + 1;
        else hi = mid;
      }

      const visible: Array<{ x: number; y: number }> = [];
      for (let i = lo; i < timeline.length; i++) {
        const pvt = timeline[i].videoTime ?? 0;
        if (pvt > vt + windowMs) break;
        const x = ((timeline[i].x - rect.left) / rect.width) * 100;
        const y = ((timeline[i].y - rect.top) / rect.height) * 100;
        if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
          visible.push({ x, y });
        }
      }

      setCurrentGazePoints(visible);
      rafRef.current = requestAnimationFrame(updateGaze);
    };

    const onPlay = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(updateGaze);
    };
    const onPause = () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    };
    // Also handle seeking while paused
    const onSeeked = () => {
      if (video.paused) updateGaze();
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    };
  }, []);

  return (
    <div>
      <div ref={containerRef} className="relative rounded-lg overflow-hidden border bg-gray-100 w-fit mx-auto">
        <video
          ref={videoPlayerRef}
          src={videoUrl}
          controls
          className="max-h-[60vh] w-auto block"
          playsInline
        />
        {/* Gaze overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {currentGazePoints.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="1.2"
              fill="rgba(59, 130, 246, 0.5)"
              stroke="rgba(59, 130, 246, 0.8)"
              strokeWidth="0.3"
            />
          ))}
        </svg>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        {gazeTimeline.length.toLocaleString()} gaze points synced to video timeline
      </p>
    </div>
  );
};
