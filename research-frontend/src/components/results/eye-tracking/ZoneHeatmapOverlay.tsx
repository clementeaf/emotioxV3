/** 3×3 zone grid overlay — mirrors HYBRID_AOI_GRID layout (row-major: r0c0..r2c2). */
const ZONE_GRID = [
  { id: 'r0c0', col: 0, row: 0 }, { id: 'r0c1', col: 1, row: 0 }, { id: 'r0c2', col: 2, row: 0 },
  { id: 'r1c0', col: 0, row: 1 }, { id: 'r1c1', col: 1, row: 1 }, { id: 'r1c2', col: 2, row: 1 },
  { id: 'r2c0', col: 0, row: 2 }, { id: 'r2c1', col: 1, row: 2 }, { id: 'r2c2', col: 2, row: 2 },
];

export const ZoneHeatmapOverlay = ({ imageUrl, zoneMass }: { imageUrl: string; zoneMass: Record<string, number> }) => {
  const maxMass = Math.max(...Object.values(zoneMass), 1);

  return (
    <div className="relative rounded-lg overflow-hidden border bg-gray-100 w-fit mx-auto">
      <img src={imageUrl} alt="Eye tracking stimulus" className="max-h-[60vh] w-auto block" draggable={false} />
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
        {ZONE_GRID.map(zone => {
          const mass = zoneMass[zone.id] || 0;
          const intensity = mass / maxMass;
          // Green → yellow → red gradient based on intensity
          const r = Math.round(intensity > 0.5 ? 255 : intensity * 2 * 255);
          const g = Math.round(intensity < 0.5 ? 255 : (1 - intensity) * 2 * 255);
          const alpha = Math.max(0.05, intensity * 0.65);
          return (
            <div
              key={zone.id}
              className="border border-white/10"
              style={{ backgroundColor: `rgba(${r}, ${g}, 0, ${alpha})` }}
              title={`${zone.id}: ${Math.round(intensity * 100)}%`}
            />
          );
        })}
      </div>
    </div>
  );
};
