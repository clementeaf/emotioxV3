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

  useEffect(() => {
    const video = videoPlayerRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      const vt = video.currentTime;
      // Show gaze points within ±0.25s of current video time
      const windowMs = 0.25;
      const visible = gazeTimeline
        .filter(p => p.videoTime != null && Math.abs(p.videoTime - vt) < windowMs)
        .map(p => {
          // Convert viewport coords to percentage of video
          const rect = video.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return null;
          return {
            x: ((p.x - rect.left) / rect.width) * 100,
            y: ((p.y - rect.top) / rect.height) * 100,
          };
        })
        .filter((p): p is { x: number; y: number } => p !== null && p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100);

      setCurrentGazePoints(visible);
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, [gazeTimeline]);

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
