export const HitZoneOverlay = ({ hitZones }: { hitZones?: Array<{ x: number; y: number; width: number; height: number }> }) => {
  if (!hitZones || hitZones.length === 0) return null;
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      {hitZones.map((hz, idx) => (
        <rect
          key={idx}
          x={hz.x}
          y={hz.y}
          width={hz.width}
          height={hz.height}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3B82F6"
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />
      ))}
    </svg>
  );
};
