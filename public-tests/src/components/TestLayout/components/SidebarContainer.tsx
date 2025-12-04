import React from 'react';

interface SidebarContainerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const SidebarContainer: React.FC<SidebarContainerProps> = ({ isOpen, onClose, children }) => (
  <aside className={`
    fixed md:static inset-y-0 left-0 z-40
    w-64 bg-white p-4 transform transition-transform duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
  `}>
    {/* Close button para móvil */}
    <button
      onClick={onClose}
      className="md:hidden absolute top-4 right-4 p-1 text-neutral-500 hover:text-neutral-700 transition-colors"
      aria-label="Cerrar menú"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <div className="mt-8 md:mt-0">
      {children}
    </div>
  </aside>
);

export default SidebarContainer;
