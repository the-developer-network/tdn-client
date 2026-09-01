import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, LinkIcon, Settings } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { PostList } from "../features/feed/components/PostList";
import { ArticleList } from "../features/article/components/ArticleList";
import { FollowListModal } from "../features/profile/components/FollowListModal";
import { EditProfileModal } from "../features/profile/components/EditProfileModal";
import { useProfile } from "../features/profile/hooks/useProfile";
import { useUserPosts } from "../features/profile/hooks/useUserPosts";
import { useArticles } from "../features/article/hooks/useArticles";
import { useMyArticles } from "../features/article/hooks/useMyArticles";
import type { ArticleStatus } from "../features/article/api/article.types";
import { useFollowAction } from "../features/profile/hooks/useFollowAction";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import type { Profile } from "../features/profile/api/profile.types";
import { SEO } from "../shared/components/ui/SEO";
import { Button } from "../shared/components/ui/Button";
import { useI18n } from "../shared/hooks/useI18n";

export default function ProfilePage() {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const { t, locale } = useI18n();

    const [followModal, setFollowModal] = useState<
        "followers" | "following" | null
    >(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [tab, setTab] = useState<"posts" | "articles">("posts");
    const [articleStatus, setArticleStatus] =
        useState<ArticleStatus>("PUBLISHED");
    const [localProfile, setLocalProfile] = useState<Profile | null>(null);

    const updateUser = useAuthStore((state) => state.updateUser);
    const openModal = useAuthModalStore((state) => state.openModal);

    const {
        profile,
        isLoading: profileLoading,
        error: profileError,
        retry: retryProfile,
    } = useProfile(username ?? "");

    useEffect(() => {
        if (
            profileError &&
            /token|expired|session|unauthorized/i.test(profileError)
        ) {
            openModal();
        }
    }, [profileError, openModal]);

    const {
        isFollowing,
        followersCount,
        isLoading: followLoading,
        handleFollow,
    } = useFollowAction(
        profile?.id ?? profile?.userId ?? "",
        profile?.isFollowing ?? false,
        profile?.followersCount ?? 0,
    );

    // Sync auth store when viewing own profile so sidebar avatar stays fresh
    useEffect(() => {
        if (profile?.isMe) {
            updateUser({
                avatarUrl: profile.avatarUrl,
                fullName: profile.fullName,
            });
        }
    }, [profile, updateUser]);
    const {
        posts,
        isLoading: postsLoading,
        isLoadingMore,
        error: postsError,
        hasMore,
        loadMore,
        retry: retryPosts,
        removePost,
    } = useUserPosts(username ?? "");

    // There is no per-author articles endpoint; the ordinary list narrowed by
    // `authorUsername` is it, and it returns published articles only, so a
    // reader never sees someone else's drafts here.
    const {
        articles,
        isLoading: articlesLoading,
        isLoadingMore: articlesLoadingMore,
        error: articlesError,
        loadMoreError: articlesLoadMoreError,
        hasMore: hasMoreArticles,
        fetchArticles,
        loadMore: loadMoreArticles,
        retry: retryArticles,
        retryLoadMore: retryLoadMoreArticles,
    } = useArticles();

    /**
     * Your own profile reads from `/articles/me`, which is the only endpoint
     * that returns drafts — the public list is filtered to published rows at
     * the repository, so it cannot show them however it is asked.
     */
    const mine = useMyArticles();

    // `localProfile` wins because editing your profile updates it before the
    // fetched copy catches up. Derived once, so the articles tab and the
    // header cannot disagree about whose profile this is.
    const displayProfile = useMemo(
        () => localProfile ?? profile,
        [localProfile, profile],
    );
    const isOwnProfile = displayProfile?.isMe === true;

    // Unfollowing from your own Following list moves a number this page is
    // already showing. Nobody else's `followingCount` changes when you follow
    // or unfollow, so the modal is only handed this on your own list.
    const handleFollowingChange = useCallback(
        (delta: 1 | -1) => {
            setLocalProfile((prev) => {
                const base = prev ?? profile;
                if (!base) return prev;
                return {
                    ...base,
                    followingCount: (base.followingCount ?? 0) + delta,
                };
            });
        },
        [profile],
    );

    // Deferred until the tab is opened: most visits never leave Posts, and
    // both endpoints are rate limited alongside every other read.
    useEffect(() => {
        if (tab !== "articles" || !username) return;
        if (isOwnProfile) {
            mine.fetchMine(articleStatus);
            return;
        }
        fetchArticles({ authorUsername: username });
        // `mine` is a fresh object each render; only its fetch identity is
        // stable, and depending on the whole hook would refetch every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        tab,
        username,
        fetchArticles,
        isOwnProfile,
        articleStatus,
        mine.fetchMine,
    ]);

    const articleList = isOwnProfile
        ? {
              articles: mine.articles,
              isLoading: mine.isLoading,
              isLoadingMore: mine.isLoadingMore,
              error: mine.error,
              loadMoreError: mine.loadMoreError,
              hasMore: mine.hasMore,
              onLoadMore: mine.loadMore,
              onRetry: mine.retry,
              onRetryLoadMore: mine.retryLoadMore,
          }
        : {
              articles,
              isLoading: articlesLoading,
              isLoadingMore: articlesLoadingMore,
              error: articlesError,
              loadMoreError: articlesLoadMoreError,
              hasMore: hasMoreArticles,
              onLoadMore: loadMoreArticles,
              onRetry: retryArticles,
              onRetryLoadMore: retryLoadMoreArticles,
          };

    // A session error is handled by reopening the auth modal above, so it must
    // not also render as an inline failure.
    const hasProfileError =
        !!profileError &&
        !profileLoading &&
        !/token|expired|session|unauthorized/i.test(profileError);

    // The profile and its posts are two requests with one common cause of
    // failure, so a single retry has to restart both.
    const handleRetry = useCallback(() => {
        retryProfile();
        retryPosts();
    }, [retryProfile, retryPosts]);

    if (!username) {
        navigate("/", { replace: true });
        return null;
    }

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            <SEO
                title={
                    displayProfile
                        ? displayProfile.fullName ||
                          `@${displayProfile.username}`
                        : username
                }
                description={displayProfile?.bio ?? undefined}
                canonical={`/profile/${username}`}
            />
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex-1">
                        {profileLoading ? (
                            <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
                        ) : (
                            <h1 className="text-base font-bold text-white leading-tight">
                                {displayProfile?.fullName || username}
                            </h1>
                        )}
                        <p className="text-xs text-white/40">
                            {posts.length > 0
                                ? `${posts.length} ${t("profile.posts")}`
                                : "\u00a0"}
                        </p>
                    </div>
                    {displayProfile?.isMe && (
                        <button
                            onClick={() => navigate("/settings")}
                            // Below `md` there is no sidebar to reach Settings
                            // through, and `BottomNav` has no room for it.
                            className="md:hidden p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                            aria-label={t("profile.settings")}
                        >
                            <Settings size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Profile error — the page-level failure state. The posts list is
                hidden below so its identical error does not render twice. */}
            {hasProfileError && (
                <div className="p-10 text-center flex flex-col items-center gap-4">
                    <p className="text-red-400/60 text-sm">{profileError}</p>
                    <Button variant="outline" size="sm" onClick={handleRetry}>
                        {t("common.tryAgain")}
                    </Button>
                </div>
            )}

            {/* Profile skeleton */}
            {profileLoading && (
                <div className="animate-pulse">
                    <div className="h-24 sm:h-32 md:h-40 bg-zinc-900" />
                    <div className="px-4 pb-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-zinc-800 border-4 border-black -mt-10 mb-3" />
                        <div className="h-5 w-40 bg-zinc-800 rounded mb-2" />
                        <div className="h-4 w-24 bg-zinc-800 rounded mb-3" />
                        <div className="h-4 w-64 bg-zinc-800 rounded" />
                    </div>
                </div>
            )}

            {/* Profile content */}
            {!profileLoading && displayProfile && (
                <>
                    {/* Banner */}
                    <div className="relative h-24 sm:h-32 md:h-40 bg-zinc-900 overflow-hidden">
                        {displayProfile.bannerUrl && (
                            <img
                                src={displayProfile.bannerUrl}
                                alt="Banner"
                                className="w-full h-full object-cover"
                            />
                        )}
                    </div>

                    {/* Avatar + actions row — relative z-10 ensures it renders above the positioned banner */}
                    <div className="relative z-10 px-4 flex items-end justify-between -mt-10 mb-3">
                        <img
                            src={
                                displayProfile.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${displayProfile.username}&size=80`
                            }
                            alt={displayProfile.username}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-black object-cover shrink-0 bg-zinc-900"
                        />

                        {displayProfile.isMe ? (
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="mt-8 sm:mt-12 rounded-full border border-white/20 px-5 py-1.5 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
                            >
                                {t("profile.editProfile")}
                            </button>
                        ) : (
                            <button
                                onClick={handleFollow}
                                disabled={followLoading}
                                className={`mt-8 sm:mt-12 rounded-full border px-5 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                                    isFollowing
                                        ? "border-white/20 text-white/70 bg-transparent hover:border-red-500/50 hover:text-red-400"
                                        : "border-white bg-white text-black hover:bg-white/90"
                                }`}
                            >
                                {followLoading
                                    ? "..."
                                    : isFollowing
                                      ? t("profile.following")
                                      : t("profile.follow")}
                            </button>
                        )}
                    </div>

                    {/* Bio section */}
                    <div className="px-4 pb-4 border-b border-white/10">
                        <h2 className="text-xl font-bold text-white leading-tight">
                            {displayProfile.fullName || displayProfile.username}
                        </h2>
                        <p className="text-sm text-white/50 mt-0.5">
                            @{displayProfile.username}
                        </p>

                        {displayProfile.bio && (
                            <p className="mt-3 text-sm text-white/80 leading-relaxed">
                                {displayProfile.bio}
                            </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-white/40">
                            {displayProfile.location && (
                                <span className="flex items-center gap-1">
                                    <MapPin size={12} />
                                    {displayProfile.location}
                                </span>
                            )}
                            {displayProfile.createdAt && (
                                <span className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    {t("profile.joined")}{" "}
                                    {new Date(
                                        displayProfile.createdAt,
                                    ).toLocaleDateString(locale, {
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </span>
                            )}
                            {displayProfile.socials &&
                                Object.entries(displayProfile.socials)
                                    .filter(([, v]) => v)
                                    .slice(0, 2)
                                    .map(([key, value]) => (
                                        <a
                                            key={key}
                                            href={value}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-1 text-blue-400 hover:underline"
                                        >
                                            <LinkIcon size={12} />
                                            {key}
                                        </a>
                                    ))}
                        </div>

                        {/* Followers / Following counts */}
                        <div className="mt-4 flex gap-5 text-sm">
                            <button
                                onClick={() => setFollowModal("following")}
                                className="hover:underline text-left"
                            >
                                <span className="font-bold text-white">
                                    {(
                                        displayProfile.followingCount ?? 0
                                    ).toLocaleString()}
                                </span>{" "}
                                <span className="text-white/40">
                                    {t("profile.followingCount")}
                                </span>
                            </button>
                            <button
                                onClick={() => setFollowModal("followers")}
                                className="hover:underline text-left"
                            >
                                <span className="font-bold text-white">
                                    {followersCount.toLocaleString()}
                                </span>{" "}
                                <span className="text-white/40">
                                    {t("profile.followers")}
                                </span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Posts list — suppressed while the profile itself is failing, so
                only the page-level error above is shown. */}
            {!hasProfileError && (
                <>
                    <div className="flex w-full border-b border-white/10">
                        {(["posts", "articles"] as const).map((value) => (
                            <button
                                key={value}
                                onClick={() => setTab(value)}
                                className={`relative flex-1 py-3 text-sm font-medium transition-colors ${
                                    tab === value
                                        ? "text-white"
                                        : "text-white/40 hover:text-white/70"
                                }`}
                            >
                                {t(
                                    value === "posts"
                                        ? "profile.tabPosts"
                                        : "profile.tabArticles",
                                )}
                                {tab === value && (
                                    <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-white" />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {!hasProfileError && tab === "articles" && (
                <>
                    {/* Status filters are yours alone: a visitor has nothing
                        to filter, since the public list only ever returns
                        published articles. */}
                    {isOwnProfile && (
                        <div className="flex items-center gap-2 overflow-x-auto px-4 py-2">
                            {(
                                [
                                    "PUBLISHED",
                                    "DRAFT",
                                    "ARCHIVED",
                                ] as ArticleStatus[]
                            ).map((value) => (
                                <button
                                    key={value}
                                    onClick={() => setArticleStatus(value)}
                                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                        articleStatus === value
                                            ? "bg-white text-black"
                                            : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80"
                                    }`}
                                >
                                    {t(
                                        value === "PUBLISHED"
                                            ? "editor.statusPublished"
                                            : value === "DRAFT"
                                              ? "editor.statusDraft"
                                              : "editor.statusArchived",
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                    <ArticleList {...articleList} />
                </>
            )}

            {!hasProfileError && tab === "posts" && (
                <>
                    <PostList
                        posts={posts}
                        isLoading={postsLoading && posts.length === 0}
                        isLoadingMore={isLoadingMore}
                        hasMore={hasMore}
                        error={postsError}
                        onPostDeleted={removePost}
                        onLoadMore={loadMore}
                        onRetry={retryPosts}
                    />

                    {/* Load more */}
                    {hasMore && !isLoadingMore && posts.length > 0 && (
                        <div className="flex justify-center py-6">
                            <button
                                onClick={loadMore}
                                className="rounded-full border border-white/20 px-6 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                            >
                                {t("common.loadMore")}
                            </button>
                        </div>
                    )}

                    {isLoadingMore && (
                        <div className="flex justify-center py-6">
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        </div>
                    )}
                </>
            )}

            {/* Followers / Following modal */}
            <FollowListModal
                isOpen={followModal !== null}
                onClose={() => setFollowModal(null)}
                username={username}
                type={followModal ?? "followers"}
                onFollowChange={
                    isOwnProfile && followModal === "following"
                        ? handleFollowingChange
                        : undefined
                }
            />

            {/* Edit Profile modal */}
            {displayProfile?.isMe && displayProfile && (
                <EditProfileModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    profile={displayProfile}
                    username={username}
                    onSuccess={(updated) => {
                        setLocalProfile(updated);
                        updateUser({
                            fullName: updated.fullName,
                            avatarUrl: updated.avatarUrl,
                        });
                    }}
                    onAvatarUpdate={(avatarUrl) => {
                        setLocalProfile((prev) =>
                            prev ? { ...prev, avatarUrl } : null,
                        );
                        updateUser({ avatarUrl });
                    }}
                    onBannerUpdate={(bannerUrl) => {
                        setLocalProfile((prev) =>
                            prev ? { ...prev, bannerUrl } : null,
                        );
                    }}
                />
            )}
        </PageShell>
    );
}
