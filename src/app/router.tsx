import { createBrowserRouter, Navigate } from "react-router-dom";
import FeedPage from "../pages/FeedPage";
import OAuthSuccessPage from "../pages/OAuthSuccessPage";
import BookmarksPage from "../pages/BookmarksPage";
import PostDetailPage from "../pages/PostDetailPage";
import CommentDetailPage from "../pages/CommentDetailPage";
import ExplorePage from "../pages/ExplorePage";
import ProfilePage from "../pages/ProfilePage";
import TermsOfServicePage from "../pages/TermsOfServicePage";
import PrivacyPolicyPage from "../pages/PrivacyPolicyPage";
import ContactPage from "../pages/ContactPage";
import SettingsPage from "../pages/SettingsPage";
import FollowsPage from "../pages/FollowsPage";
import NotificationsPage from "../pages/NotificationsPage";

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
        path: "/terms",
        element: <TermsOfServicePage />,
    },
    {
        path: "/privacy",
        element: <PrivacyPolicyPage />,
    },
    {
        path: "/contact",
        element: <ContactPage />,
    },
    {
        path: "/settings",
        element: <SettingsPage />,
    },
    {
        path: "/follows",
        element: <FollowsPage />,
    },
    {
        path: "/notifications",
        element: <NotificationsPage />,
    },
    {
        path: "*",
        element: <Navigate to="/" replace />,
    },
]);
