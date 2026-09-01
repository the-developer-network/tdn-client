import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { PostList } from "../features/feed/components/PostList";
import { useBookmarks } from "../features/feed/hooks/useBookmarks";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { CommentList } from "../features/comment/components/CommentList";
import { ArticleList } from "../features/article/components/ArticleList";
import { useI18n } from "../shared/hooks/useI18n";
import type { TranslationKey } from "../shared/i18n/translations";

type BookmarkTab = "POSTS" | "COMMENTS" | "ARTICLES";

const TABS: { labelKey: TranslationKey; value: BookmarkTab }[] = [
    { labelKey: "bookmarks.tabPosts", value: "POSTS" },
    { labelKey: "bookmarks.tabComments", value: "COMMENTS" },
    { labelKey: "bookmarks.tabArticles", value: "ARTICLES" },
];

export default function BookmarksPage() {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<BookmarkTab>("POSTS");
    const {
        posts,
        isLoading,
        isLoadingMore,
        hasMore,
        error,
        comments,
        articles,
        removePost,
        retry,
        loadMore,
    } = useBookmarks();
    const navigate = useNavigate();

    const { user, isAuthenticated } = useAuthStore();
    const { openModal } = useAuthModalStore();

    useEffect(() => {
        if (!isAuthenticated) {
            openModal();
            navigate("/", { replace: true });
        }
    }, [isAuthenticated, navigate, openModal]);

    if (!isAuthenticated) return null;

    const isEmpty =
        posts.length === 0 && comments.length === 0 && articles.length === 0;

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            {/*  Header */}
            <div className="sticky top-0 z-10 bg-ground/80 backdrop-blur-md border-b border-ink/10">
                <div className="px-4 py-4">
                    <h1 className="text-xl font-bold text-ink">
                        {t("bookmarks.title")}
                    </h1>
                    {/* Username */}
                    <p className="text-sm text-ink/40 mt-1">
                        @{user?.username} ({t("bookmarks.subtitle")})
                    </p>
                </div>

                {/* One list is mounted at a time on purpose: PostList and
                    ArticleList each install their own IntersectionObserver
                    sentinel, and side by side both would call loadMore. */}
                <div className="flex w-full border-b border-ink/5">
                    {TABS.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                                activeTab === tab.value
                                    ? "text-ink"
                                    : "text-ink/40 hover:text-ink/70"
                            }`}
                        >
                            {t(tab.labelKey)}
                            {activeTab === tab.value && (
                                <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-ink rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex justify-center py-16">
                    <div className="w-6 h-6 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
                </div>
            )}

            {/* (Empty State) — nothing saved at all; a tab that is empty on its
                own falls through to the list's own empty state. */}
            {!isLoading && isEmpty && !error ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border-b border-ink/10">
                    <div className="w-16 h-16 rounded-full border border-ink/10 bg-ink/5 flex items-center justify-center mb-4">
                        <svg
                            className="w-8 h-8 text-ink/40"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-ink mb-2">
                        {t("bookmarks.emptyTitle")}
                    </h2>
                    <p className="text-ink/40 text-[15px] max-w-[250px]">
                        {t("bookmarks.emptyBody")}
                    </p>
                </div>
            ) : (
                !isLoading && (
                    <>
                        {activeTab === "POSTS" && (
                            <PostList
                                posts={posts}
                                isLoading={false}
                                isLoadingMore={isLoadingMore}
                                hasMore={hasMore}
                                error={error}
                                onPostDeleted={removePost}
                                onLoadMore={loadMore}
                                onRetry={retry}
                            />
                        )}
                        {activeTab === "COMMENTS" && (
                            <CommentList
                                comments={comments}
                                isLoading={false}
                                error={error}
                                onRetry={retry}
                            />
                        )}
                        {activeTab === "ARTICLES" && (
                            <ArticleList
                                articles={articles}
                                isLoading={false}
                                isLoadingMore={isLoadingMore}
                                hasMore={hasMore}
                                error={error}
                                onLoadMore={loadMore}
                                onRetry={retry}
                            />
                        )}
                    </>
                )
            )}
        </PageShell>
    );
}
