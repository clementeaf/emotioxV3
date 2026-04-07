import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const ResearchPage = lazy(() => import('./pages/ResearchPage').then(m => ({ default: m.ResearchPage })));
const EyeTrackingTestPage = lazy(() => import('./pages/EyeTrackingTestPage').then(m => ({ default: m.EyeTrackingTestPage })));
const EyeTrackingHybridPage = lazy(() => import('./pages/EyeTrackingHybridPage').then(m => ({ default: m.EyeTrackingHybridPage })));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

// Use different basename for development vs production
const basename = import.meta.env.DEV ? '/' : '/participant';

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<PageLoader />}>
        <HomePage />
      </Suspense>
    ),
  },
  {
    path: '/research/:researchId',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ResearchPage />
      </Suspense>
    ),
  },
  {
    path: '/eye-tracking-test',
    element: (
      <Suspense fallback={<PageLoader />}>
        <EyeTrackingTestPage />
      </Suspense>
    ),
  },
  {
    path: '/eye-tracking-hybrid',
    element: (
      <Suspense fallback={<PageLoader />}>
        <EyeTrackingHybridPage />
      </Suspense>
    ),
  },
], {
  basename,
});

function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  );
}

export default App;
