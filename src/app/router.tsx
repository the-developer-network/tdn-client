import { createBrowserRouter, Navigate } from "react-router-dom";
import FeedPage from "../pages/FeedPage";
import OAuthSuccessPage from "../pages/OAuthSuccessPage";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <FeedPage />,
    },
    {
        path: "/oauth-success",
        element: <OAuthSuccessPage />,
    },
    {
        path: "*",
        element: <Navigate to="/" replace />,
    },
]);
