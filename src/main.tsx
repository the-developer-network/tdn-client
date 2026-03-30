import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';

// Import Pages
import Home from './pages/home/Home';
import Privacy from './pages/privacy/Privacy';
import Terms from './pages/terms/Terms';
import FeedPage from './pages/feed/Feed';

const router = createBrowserRouter([
  { path: '/', element: <FeedPage /> }, 
  { path: '/home', element: <Home /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/terms', element: <Terms /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);