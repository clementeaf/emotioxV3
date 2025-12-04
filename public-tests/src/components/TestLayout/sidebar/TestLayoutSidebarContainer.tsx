import React from 'react';
import { SidebarStep } from '../types';
import TestLayoutSidebar from './TestLayoutSidebar';

interface Props {
  onStepsReady?: (steps: SidebarStep[]) => void;
}

const TestLayoutSidebarContainer: React.FC<Props> = ({ onStepsReady }) => {

  return (
    <TestLayoutSidebar
      onStepsReady={onStepsReady}
    />
  );
};

export default TestLayoutSidebarContainer;
