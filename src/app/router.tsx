import { createBrowserRouter, Navigate } from "react-router-dom";
import FeedPage from "../pages/FeedPage";
import OAuthSuccessPage from "../pages/OAuthSuccessPage";
import BookmarksPage from "../pages/BookmarksPage";
import PostDetailPage from "../pages/PostDetailPage";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <FeedPage />,
    },
    {
        path: "/post/:id",
        element: <PostDetailPage />,
    },
    {
        path: "/oauth-success",
        element: <OAuthSuccessPage />,
    },
    {
        path: "/bookmarks",
        element: <BookmarksPage />,
    },
    {
        path: "*",
        element: <Navigate to="/" replace />,
    },
]);
