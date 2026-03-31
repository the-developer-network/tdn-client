import { createBrowserRouter, Navigate } from "react-router-dom";
import FeedPage from "../pages/FeedPage";
import OAuthSuccessPage from "../pages/OAuthSuccessPage";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <FeedPage />,
    },
    {
        path: "*",
        element: <Navigate to="/" replace />,
    },
    {
        path: "/oauth-success",
        element: <OAuthSuccessPage />,
    },
]);
