import React from 'react';

interface MobileOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileOverlay: React.FC<MobileOverlayProps> = ({ isOpen, onClose }) => (
  <>
    {isOpen && (
      <div
        className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        aria-label="Cerrar menú"
      />
    )}
  </>
);

export default MobileOverlay;
