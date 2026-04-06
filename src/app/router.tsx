import { createBrowserRouter, Navigate } from "react-router-dom";
import FeedPage from "../pages/FeedPage";
import OAuthSuccessPage from "../pages/OAuthSuccessPage";
import BookmarksPage from "../pages/BookmarksPage";
import PostDetailPage from "../pages/PostDetailPage";
import CommentDetailPage from "../pages/CommentDetailPage";
import ExplorePage from "../pages/ExplorePage";
import ProfilePage from "../pages/ProfilePage";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <FeedPage />,
    },
    {
        path: "/explore",
        element: <ExplorePage />,
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
        path: "/profile/:username",
        element: <ProfilePage />,
    },
    {
        path: "/comments/:id",
        element: <CommentDetailPage />,
    },
    {
        path: "*",
        element: <Navigate to="/" replace />,
    },
]);
