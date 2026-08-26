import { createBrowserRouter, Navigate } from "react-router-dom";
import FeedPage from "../pages/FeedPage";
import OAuthSuccessPage from "../pages/OAuthSuccessPage";
import BookmarksPage from "../pages/BookmarksPage";
import PostDetailPage from "../pages/PostDetailPage";
import CommentDetailPage from "../pages/CommentDetailPage";
import ExplorePage from "../pages/ExplorePage";
import ArticleDetailPage from "../pages/ArticleDetailPage";
import ArticleEditorPage from "../pages/ArticleEditorPage";
import ProfilePage from "../pages/ProfilePage";
import TermsOfServicePage from "../pages/TermsOfServicePage";
import PrivacyPolicyPage from "../pages/PrivacyPolicyPage";
import ContactPage from "../pages/ContactPage";
import SettingsPage from "../pages/SettingsPage";
import FollowsPage from "../pages/FollowsPage";
import NotificationsPage from "../pages/NotificationsPage";
import SocialsPage from "../pages/SocialsPage";
import OnboardingPage from "../pages/OnboardingPage";
import { OnboardingGate } from "./OnboardingGate";

export const router = createBrowserRouter([
    // Outside the gate, or finishing onboarding would bounce back into it.
    {
        path: "/onboarding",
        element: <OnboardingPage />,
    },
    // Pathless layout route: every app route sits behind the gate, which
    // sends an account that follows nobody to /onboarding first.
    {
        element: <OnboardingGate />,
        children: [
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
            // Declared before the slug route for readability; the router ranks the
            // static segment above the dynamic one either way. The cost is that an
            // article whose slug is literally "new" would be unreachable — the server
            // derives slugs from titles, so that is a title of "New" and nothing more.
            {
                path: "/articles/new",
                element: <ArticleEditorPage />,
            },
            {
                path: "/articles/:slug",
                element: <ArticleDetailPage />,
            },
            {
                path: "/articles/:slug/edit",
                element: <ArticleEditorPage />,
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
                path: "/socials",
                element: <SocialsPage />,
            },
            {
                path: "*",
                element: <Navigate to="/" replace />,
            },
        ],
    },
]);
