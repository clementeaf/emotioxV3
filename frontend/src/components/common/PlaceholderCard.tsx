import React from 'react';

interface PlaceholderCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'coming-soon' | 'empty-state';
}

export const PlaceholderCard: React.FC<PlaceholderCardProps> = ({
  title,
  description,
  icon,
  className = '',
  variant = 'default'
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'coming-soon':
        return {
          container: 'p-6 bg-blue-50 rounded-lg border border-blue-200',
          title: 'text-xl font-semibold mb-4 text-blue-900',
          description: 'text-blue-700'
        };
      case 'empty-state':
        return {
          container: 'p-6 bg-gray-50 rounded-lg border border-gray-200',
          title: 'text-xl font-semibold mb-4 text-gray-900',
          description: 'text-gray-600'
        };
      default:
        return {
          container: 'p-6 bg-gray-50 rounded-lg',
          title: 'text-xl font-semibold mb-4 text-gray-900',
          description: 'text-gray-600'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`${styles.container} ${className}`}>
      {icon && (
        <div className="flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
    </div>
  );
};

export default PlaceholderCard;
