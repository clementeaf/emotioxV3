import React from 'react';

interface TransparentOverlayProps {
  color?: string;
  opacity?: number;
  zIndex?: number;
}

export const TransparentOverlay: React.FC<TransparentOverlayProps> = ({
  color = 'bg-blue-500',
  opacity = 30,
  zIndex = 5
}) => {
  return (
    <div
      className={`absolute inset-0 ${color} pointer-events-none`}
      style={{
        opacity: opacity / 100,
        zIndex
      }}
    />
  );
};
