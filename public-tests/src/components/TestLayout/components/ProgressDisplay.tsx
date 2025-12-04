import React from 'react';
import { useEyeTrackingConfigQuery } from '../../../hooks/useEyeTrackingConfigQuery';
import { useTestStore } from '../../../stores/useTestStore';

interface ProgressDisplayProps {
  current: number;
  total: number;
}

const ProgressDisplay: React.FC<ProgressDisplayProps> = ({ current, total }) => {
  const { researchId } = useTestStore();
  const { data: eyeTrackingConfig } = useEyeTrackingConfigQuery(researchId || '');
  const shouldShowProgressBar = eyeTrackingConfig?.linkConfig?.showProgressBar ?? false;

  if (!shouldShowProgressBar) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="font-semibold text-neutral-700 text-base mb-2">Progreso</div>
      <div className="text-primary-500 font-semibold mb-4">
        {current} de {total}
      </div>
    </div>
  );
};

export default ProgressDisplay;
