import React from 'react';

const TestLayoutHeader: React.FC = () => (
  <header className="bg-white shadow-sm border-b border-gray-200 w-full">
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center py-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Test de Participante</h1>
          <p className="text-sm text-gray-500">Completa la investigación siguiendo las instrucciones</p>
        </div>
      </div>
    </div>
  </header>
);

export default TestLayoutHeader;
