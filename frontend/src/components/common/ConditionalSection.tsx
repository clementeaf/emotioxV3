import React from 'react';

interface ConditionalSectionProps {
  isVisible: boolean;
  children: React.ReactNode;
  className?: string;
  animation?: boolean;
  fadeIn?: boolean;
  slideDown?: boolean;
}

export const ConditionalSection: React.FC<ConditionalSectionProps> = ({
  isVisible,
  children,
  className = '',
  animation = true,
  fadeIn = true,
  slideDown = false
}) => {
  if (!isVisible) return null;

  const getAnimationClasses = () => {
    if (!animation) return '';
    
    const baseClasses = 'transition-all duration-300 ease-in-out';
    const fadeClasses = fadeIn ? 'animate-in fade-in-0' : '';
    const slideClasses = slideDown ? 'animate-in slide-in-from-top-2' : '';
    
    return `${baseClasses} ${fadeClasses} ${slideClasses}`;
  };

  return (
    <div className={`${getAnimationClasses()} ${className}`}>
      {children}
    </div>
  );
};

export default ConditionalSection;
