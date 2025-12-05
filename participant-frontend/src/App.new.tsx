import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ResearchPage } from './pages/ResearchPage';
import { HomePage } from './pages/HomePage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/research/:researchId',
    element: <ResearchPage />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
