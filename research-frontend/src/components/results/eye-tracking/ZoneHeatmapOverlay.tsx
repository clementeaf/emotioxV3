export const ZoneHeatmapOverlay = ({ imageUrl, zoneMass }: { imageUrl: string; zoneMass: Record<string, number> }) => {
  const maxMass = Math.max(...Object.values(zoneMass), 1);

  return (
    <div className="relative rounded-lg overflow-hidden border bg-gray-100">
      <img src={imageUrl} alt="Eye tracking stimulus" className="w-full h-full object-contain block" draggable={false} />
      <div className="absolute inset-0 flex flex-col">
        {[0, 1, 2].map(row => (
          <div key={row} className="flex flex-1">
            {[0, 1, 2].map(col => {
              const zoneId = `r${row}c${col}`;
              const mass = zoneMass[zoneId] || 0;
              const intensity = Math.sqrt(mass / maxMass);
              const r = Math.round(intensity > 0.5 ? 255 : intensity * 2 * 255);
              const g = Math.round(intensity < 0.5 ? 255 : (1 - intensity) * 2 * 255);
              const alpha = Math.max(0.15, intensity * 0.7);
              return (
                <div
                  key={zoneId}
                  className="flex-1 border border-white/10"
                  style={{ backgroundColor: `rgba(${r}, ${g}, 0, ${alpha})` }}
                  title={`${zoneId}: ${Math.round(intensity * 100)}%`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
