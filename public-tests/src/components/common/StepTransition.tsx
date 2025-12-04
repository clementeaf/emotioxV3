import React, { useState, useEffect } from 'react';

interface StepTransitionProps {
  isTransitioning: boolean;
  currentStep: string;
  nextStep?: string;
  children: React.ReactNode;
  duration?: number;
}

export const StepTransition: React.FC<StepTransitionProps> = ({
  isTransitioning,
  currentStep,
  nextStep,
  children,
  duration = 300
}) => {
  const [showContent, setShowContent] = useState(true);
  const [transitionClass, setTransitionClass] = useState('');

  useEffect(() => {
    if (isTransitioning) {
      setTransitionClass('opacity-0 transform translate-x-4');
      setShowContent(false);
      
      const timer = setTimeout(() => {
        setTransitionClass('opacity-100 transform translate-x-0');
        setShowContent(true);
      }, duration);
      
      return () => clearTimeout(timer);
    } else {
      setTransitionClass('opacity-100 transform translate-x-0');
      setShowContent(true);
    }
  }, [isTransitioning, currentStep, duration]);

  return (
    <div 
      className={`transition-all duration-${duration} ease-in-out ${transitionClass}`}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {showContent && children}
      
      {isTransitioning && (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-600">
              {nextStep ? `Pasando a ${nextStep}...` : 'Cargando siguiente paso...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepTransition;