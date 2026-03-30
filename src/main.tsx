import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';

// Import Pages
import Home from './pages/home/Home';
import Privacy from './pages/privacy/Privacy';
import Terms from './pages/terms/Terms';
import Feed from './pages/feed/Feed';
import OAuthSuccess from './pages/auth/components/OAuthSuccess';

const router = createBrowserRouter([
  { path: '/', element: <Feed /> }, 
  { path: '/home', element: <Home /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/terms', element: <Terms /> },
  { path: '/oauth-success/*', element: <OAuthSuccess /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);