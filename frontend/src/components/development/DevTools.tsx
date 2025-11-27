import { Toaster } from 'react-hot-toast';

import { AuthDebugger } from '@/components/auth/AuthDebugger';
import { LogViewer } from '@/components/utils/ErrorLogger';

export const DevTools = () => {
  return (
    <>
      <Toaster position="top-right" />
      <LogViewer />
      <AuthDebugger />
    </>
  );
};
