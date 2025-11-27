import React from 'react';

interface ProgressBarProps {
  value: number;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  className = ''
}) => {
  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}>
      <div 
        className="h-full bg-blue-600 transition-all" 
        style={{ width: `${value}%` }}
      />
    </div>
  );
}; 