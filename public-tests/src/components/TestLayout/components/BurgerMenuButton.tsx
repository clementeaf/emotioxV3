import React from 'react';

interface BurgerMenuButtonProps {
  onClick: () => void;
}

const BurgerMenuButton: React.FC<BurgerMenuButtonProps> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
    aria-label="Abrir menú"
  >
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>
);

export default BurgerMenuButton;
