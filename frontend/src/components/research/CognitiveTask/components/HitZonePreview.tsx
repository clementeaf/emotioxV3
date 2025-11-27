import React from 'react';
import { HitZone, UploadedFile } from 'shared/interfaces/cognitive-task.interface';

import { HitZoneViewer } from '@/components/common/hitzone';

interface HitZonePreviewProps {
  file: UploadedFile;
  hitzones: HitZone[];
}

export const HitZonePreview: React.FC<HitZonePreviewProps> = ({ file, hitzones }) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <img
        src={file.url}
        alt={`Vista previa de ${file.name}`}
        className="max-w-full max-h-full object-contain"
      />
      <div className="absolute top-0 left-0 w-full h-full">
        <HitZoneViewer
          hitzones={hitzones}
          imageNaturalSize={{ width: 800, height: 600 }} // Valores por defecto
          imageRenderedSize={{ width: 800, height: 600 }} // Valores por defecto
        />
      </div>
    </div>
  );
};
