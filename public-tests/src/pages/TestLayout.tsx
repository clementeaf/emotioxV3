import React from 'react';
import { TestLayoutMain } from '../components/TestLayout';

const TestLayout: React.FC = () => (
  <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
    <TestLayoutMain />
  </div>
);

export default TestLayout;
