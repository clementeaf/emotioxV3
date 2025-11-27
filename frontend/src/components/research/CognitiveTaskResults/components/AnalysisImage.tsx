'use client';

import React, { useState } from 'react';

interface AnalysisImageProps {
  src: string;
  alt?: string;
  className?: string;
}

export function AnalysisImage({ src, alt = 'Analysis image', className }: AnalysisImageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Modal para la imagen expandida
  const expandedImageModal = isExpanded && (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={toggleExpand}
    >
      <div className="relative max-w-4xl max-h-full">
        <button 
          className="absolute top-4 right-4 bg-white rounded-full p-1 text-gray-800"
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand();
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[90vh] object-contain"
        />
      </div>
    </div>
  );

  return (
    <div className={`relative rounded-md overflow-hidden ${className}`}>
      <div className="relative h-[200px] w-full">
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>
      
      <button 
        onClick={toggleExpand}
        className="w-full py-2 text-center text-neutral-600 hover:text-neutral-800 bg-neutral-100 text-sm flex items-center justify-center gap-2"
      >
        Expand image
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h6v6"></path>
          <path d="M10 14L21 3"></path>
          <path d="M9 21H3v-6"></path>
          <path d="M3 9l6 6"></path>
        </svg>
      </button>
      
      {expandedImageModal}
    </div>
  );
} 